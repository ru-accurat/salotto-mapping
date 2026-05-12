import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import SpriteText from "three-spritetext";
import type { ViewSettings, NodeColors } from "./settings";

interface GraphNode {
  id: string;
  name: string;
  class: string;
  shape: string;
  size?: number;
  _displayColor?: string;
  [key: string]: unknown;
}

interface GraphEdge {
  source: string;
  target: string;
  color: string;
  width: number;
  kind?: string;
  [key: string]: unknown;
}

const MAX_LABELS = 300;

function nodeClassKey(n: GraphNode): keyof NodeColors {
  if (n.class === "salotto") return "salotto";
  if (n.class === "org") return "org";
  if (n.class === "ambient") return "ambient";
  if (n.class === "member") return "member";
  return "guest";
}

function nodeRadius(n: GraphNode): number {
  const s = n.size || 3;
  return Math.cbrt(s) * 0.8;
}

export default function Graph3D({
  nodes, edges, settings,
}: {
  nodes: GraphNode[];
  edges: GraphEdge[];
  settings: ViewSettings;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const graphRef = useRef<any>(null);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const [error, setError] = useState<string | null>(null);

  // Full rebuild when data changes
  useEffect(() => {
    if (!containerRef.current) return;

    let destroyed = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let cleanup: (() => void) | null = null;

    (async () => {
      try {
        // Dynamic import — avoids top-level module resolution issues that can
        // silently break the component on cold loads in some bundler configs
        const mod = await import("3d-force-graph");
        if (destroyed) return;

        // Runtime exports a factory fn, not a class constructor
        const ForceGraph3DFactory = mod.default as unknown as (
          configOptions?: object,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ) => (element: HTMLElement) => any;

        const labelSprites = new Map<string, THREE.Sprite>();
        const s = settingsRef.current;
        let starFieldObj: THREE.Points | null = null;

        const graph = ForceGraph3DFactory()(containerRef.current!)
          .backgroundColor(s.backgroundColor)
          .nodeId("id")
          .nodeLabel("")
          .nodeThreeObject((n: GraphNode) => {
            const color = n._displayColor || s.nodeColors[nodeClassKey(n)];
            const r = nodeRadius(n);
            const isOrg = n.shape === "hexagon";
            const group = new THREE.Group();

            const geo = isOrg
              ? new THREE.DodecahedronGeometry(r, 0)
              : new THREE.SphereGeometry(r, 16, 12);
            const mat = new THREE.MeshLambertMaterial({ color, transparent: true, opacity: 0.95 });
            group.add(new THREE.Mesh(geo, mat));

            const sprite = new SpriteText(n.name, 1.2, color);
            sprite.fontFace = "Helvetica Neue, Helvetica, Arial, sans-serif";
            sprite.fontWeight = "400";
            sprite.backgroundColor = "rgba(0,0,0,0)";
            sprite.padding = 0.3;
            sprite.position.set(0, r + 1.5, 0);
            sprite.visible = false;
            group.add(sprite);

            labelSprites.set(n.id, sprite);
            return group;
          })
          .linkSource("source")
          .linkTarget("target")
          .linkColor((e: GraphEdge) => e.color)
          .linkWidth((e: GraphEdge) => e.width * 1.5)
          .linkOpacity(0.5)
          .linkCurvature(0.35)
          .linkCurveRotation((e: GraphEdge) => {
            const src = typeof e.source === "object" ? (e.source as GraphNode).id : e.source;
            const tgt = typeof e.target === "object" ? (e.target as GraphNode).id : e.target;
            return (src + tgt).split("").reduce((a, c) => a + c.charCodeAt(0), 0) * 0.5;
          })
          .d3AlphaDecay(0.02)
          .d3VelocityDecay(0.3)
          .showNavInfo(false)
          .graphData({
            // Build clean node objects — strip everything that could conflict
            // with d3-force internals (index, x, y, vx, vy, fx, fy, etc.)
            nodes: nodes.map((n) => ({
              id: n.id,
              name: n.name,
              class: n.class,
              shape: n.shape,
              size: n.size,
              _displayColor: n._displayColor,
            })),
            links: edges.map((e) => ({
              source: e.source,
              target: e.target,
              color: e.color,
              width: e.width,
              kind: e.kind,
            })),
          });

        if (destroyed) {
          graph._destructor();
          return;
        }

        graphRef.current = graph;

        // Create star field
        const createStarField = () => {
          const sf = settingsRef.current.starField;
          if (starFieldObj) {
            graph.scene().remove(starFieldObj);
            starFieldObj.geometry.dispose();
            (starFieldObj.material as THREE.PointsMaterial).dispose();
            starFieldObj = null;
          }
          if (!sf.enabled) return;

          const starGeo = new THREE.BufferGeometry();
          const positions = new Float32Array(sf.count * 3);
          const radius = 800;
          for (let i = 0; i < sf.count; i++) {
            const u = Math.random();
            const v = Math.random();
            const theta = 2 * Math.PI * u;
            const phi = Math.acos(2 * v - 1);
            const r = radius * (0.6 + 0.4 * Math.random());
            positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
            positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
            positions[i * 3 + 2] = r * Math.cos(phi);
          }
          starGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));

          const starMat = new THREE.PointsMaterial({
            color: sf.color,
            size: sf.size,
            sizeAttenuation: true,
            transparent: true,
            opacity: 0.8,
          });

          starFieldObj = new THREE.Points(starGeo, starMat);
          graph.scene().add(starFieldObj);
        };

        setTimeout(createStarField, 100);

        const updateLabels = () => {
          const showLabels = settingsRef.current.showLabels;
          if (!showLabels) {
            for (const [, sprite] of labelSprites) sprite.visible = false;
            return;
          }

          const camera = graph.camera();
          const cameraPos = camera.position;
          const frustum = new THREE.Frustum();
          const proj = new THREE.Matrix4();
          proj.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
          frustum.setFromProjectionMatrix(proj);

          const graphNodes = graph.graphData().nodes as (GraphNode & { x?: number; y?: number; z?: number })[];
          const visible: { id: string; dist: number }[] = [];
          for (const n of graphNodes) {
            if (n.x == null) continue;
            const pos = new THREE.Vector3(n.x, n.y, n.z);
            if (frustum.containsPoint(pos)) {
              visible.push({ id: n.id, dist: cameraPos.distanceTo(pos) });
            }
          }
          visible.sort((a, b) => a.dist - b.dist);
          const showSet = new Set(visible.slice(0, MAX_LABELS).map((v) => v.id));
          for (const [id, sprite] of labelSprites) {
            sprite.visible = showSet.has(id);
          }
        };

        const controls = graph.controls() as { addEventListener?: (event: string, cb: () => void) => void };
        if (controls.addEventListener) {
          controls.addEventListener("change", updateLabels);
        }
        const interval = setInterval(updateLabels, 500);

        const handleResize = () => {
          graph.width(window.innerWidth);
          graph.height(window.innerHeight);
        };
        window.addEventListener("resize", handleResize);

        cleanup = () => {
          clearInterval(interval);
          window.removeEventListener("resize", handleResize);
          graph._destructor();
          graphRef.current = null;
        };
      } catch (err) {
        console.error("Graph3D initialization failed:", err);
        if (!destroyed) {
          setError(err instanceof Error ? err.message : String(err));
        }
      }
    })();

    return () => {
      destroyed = true;
      cleanup?.();
    };
  }, [nodes, edges]);

  // React to gravity changes without full rebuild
  useEffect(() => {
    if (!graphRef.current) return;
    graphRef.current.d3Force("charge")?.strength(-30 * (1 + settings.gravity));
    graphRef.current.d3ReheatSimulation();
  }, [settings.gravity]);

  // React to background color changes
  useEffect(() => {
    if (!graphRef.current) return;
    graphRef.current.backgroundColor(settings.backgroundColor);
  }, [settings.backgroundColor]);

  // React to star field changes
  useEffect(() => {
    if (!graphRef.current) return;
    const scene = graphRef.current.scene() as THREE.Scene;
    const existing = scene.children.find((c: THREE.Object3D) => c instanceof THREE.Points && c.userData._starField);
    if (existing) {
      scene.remove(existing);
      (existing as THREE.Points).geometry.dispose();
      ((existing as THREE.Points).material as THREE.PointsMaterial).dispose();
    }
    if (!settings.starField.enabled) return;

    const sf = settings.starField;
    const starGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(sf.count * 3);
    const radius = 800;
    for (let i = 0; i < sf.count; i++) {
      const u = Math.random();
      const v = Math.random();
      const theta = 2 * Math.PI * u;
      const phi = Math.acos(2 * v - 1);
      const r = radius * (0.6 + 0.4 * Math.random());
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
    }
    starGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const starMat = new THREE.PointsMaterial({
      color: sf.color,
      size: sf.size,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.8,
    });
    const stars = new THREE.Points(starGeo, starMat);
    stars.userData._starField = true;
    scene.add(stars);
  }, [settings.starField.enabled, settings.starField.count, settings.starField.size, settings.starField.color]);

  if (error) {
    return (
      <div style={{
        width: "100vw", height: "100vh", display: "flex",
        alignItems: "center", justifyContent: "center",
        color: "#ff6b6b", fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
        flexDirection: "column", gap: 12,
      }}>
        <div style={{ fontSize: 16 }}>3D view failed to load</div>
        <div style={{ fontSize: 12, color: "#ffffff66", maxWidth: 400, textAlign: "center" }}>{error}</div>
        <button
          onClick={() => { setError(null); }}
          style={{
            marginTop: 8, padding: "6px 16px", background: "rgba(95,230,200,0.15)",
            color: "#5fe6c8", border: "1px solid rgba(95,230,200,0.3)", borderRadius: 4,
            cursor: "pointer", fontFamily: "inherit",
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  return <div ref={containerRef} style={{ width: "100vw", height: "100vh" }} />;
}
