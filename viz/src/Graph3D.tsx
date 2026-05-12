import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import SpriteText from "three-spritetext";
import type { ViewSettings, NodeColors } from "./settings";
import { CameraDirector, createDefaultChoreography } from "./director";
import type { GraphNode3D } from "./director";

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
/** Distance threshold for label fade during animation */
const LABEL_FADE_NEAR = 30;
const LABEL_FADE_FAR = 120;

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

export interface Graph3DHandle {
  play: () => void;
  stop: () => void;
  preview: () => void;
  exportVideo: () => void;
}

export default function Graph3D({
  nodes, edges, settings, animating, onAnimationOpacity,
}: {
  nodes: GraphNode[];
  edges: GraphEdge[];
  settings: ViewSettings;
  animating?: boolean;
  onAnimationOpacity?: (opacity: number) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const graphRef = useRef<any>(null);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const animatingRef = useRef(animating ?? false);
  animatingRef.current = animating ?? false;
  const onAnimationOpacityRef = useRef(onAnimationOpacity);
  onAnimationOpacityRef.current = onAnimationOpacity;
  const [error, setError] = useState<string | null>(null);
  const directorRef = useRef<CameraDirector | null>(null);
  const animStartRef = useRef<number>(0);
  const animFrameRef = useRef<number>(0);
  const labelSpritesRef = useRef<Map<string, THREE.Sprite>>(new Map());
  const composerRef = useRef<EffectComposer | null>(null);
  const bloomPassRef = useRef<UnrealBloomPass | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const origRenderRef = useRef<((...args: any[]) => void) | null>(null);

  // Full rebuild when data changes
  useEffect(() => {
    if (!containerRef.current) return;

    let destroyed = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let cleanup: (() => void) | null = null;

    (async () => {
      try {
        const mod = await import("3d-force-graph");
        if (destroyed) return;

        const ForceGraph3DFactory = mod.default as unknown as (
          configOptions?: object,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ) => (element: HTMLElement) => any;

        const labelSprites = new Map<string, THREE.Sprite>();
        labelSpritesRef.current = labelSprites;
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
            sprite.fontWeight = "700";
            sprite.backgroundColor = "rgba(0,0,0,0)";
            sprite.padding = 0.3;
            sprite.position.set(0, r + 1.5, 0);
            sprite.visible = false;
            // Store as a property for opacity control
            (sprite as unknown as { _baseColor: string })._baseColor = color;
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

        // Label update — works in both normal and animation mode
        const updateLabels = () => {
          const showLabels = settingsRef.current.showLabels;
          const isAnimating = animatingRef.current;

          if (!showLabels && !isAnimating) {
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

          if (isAnimating) {
            // During animation: same behavior as regular 3D — show closest N in frustum
            const showSet = new Set(visible.slice(0, MAX_LABELS).map((v) => v.id));
            for (const [id, sprite] of labelSprites) {
              sprite.visible = showSet.has(id);
              const mat = sprite.material as THREE.SpriteMaterial;
              if (mat) mat.opacity = 1;
            }
          } else {
            // Normal mode: show/hide based on showLabels setting
            if (!showLabels) {
              for (const [, sprite] of labelSprites) sprite.visible = false;
              return;
            }
            const showSet = new Set(visible.slice(0, MAX_LABELS).map((v) => v.id));
            for (const [id, sprite] of labelSprites) {
              sprite.visible = showSet.has(id);
              const mat = sprite.material as THREE.SpriteMaterial;
              if (mat) mat.opacity = 1;
            }
          }
        };

        const controls = graph.controls() as {
          addEventListener?: (event: string, cb: () => void) => void;
          enabled?: boolean;
        };
        if (controls.addEventListener) {
          controls.addEventListener("change", updateLabels);
        }
        const interval = setInterval(updateLabels, 200);

        const handleResize = () => {
          graph.width(window.innerWidth);
          graph.height(window.innerHeight);
        };
        window.addEventListener("resize", handleResize);

        cleanup = () => {
          clearInterval(interval);
          window.removeEventListener("resize", handleResize);
          if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
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

  // Start/stop animation when animating prop changes
  useEffect(() => {
    const graph = graphRef.current;
    if (!graph) return;

    if (animating) {
      // Dampen simulation for gentle breathing
      graph.d3AlphaDecay(0.08);
      graph.d3VelocityDecay(0.6);

      // Disable orbit controls
      const controls = graph.controls() as { enabled?: boolean };
      if (controls) controls.enabled = false;

      // Create director
      const choreo = createDefaultChoreography();
      const director = new CameraDirector(choreo.waypoints, choreo.fadeIn, choreo.fadeOut);

      // Resolve targets from current node positions
      const graphNodes = graph.graphData().nodes as GraphNode3D[];
      director.resolveTargets(graphNodes);
      directorRef.current = director;
      animStartRef.current = performance.now();

      // Animation loop
      const animate = () => {
        if (!animatingRef.current || !graphRef.current) return;

        const elapsed = (performance.now() - animStartRef.current) / 1000;
        const state = director.update(elapsed);

        // Move camera
        const camera = graphRef.current.camera() as THREE.PerspectiveCamera;
        camera.position.copy(state.position);
        camera.lookAt(state.lookAt);

        // Report opacity for vignette fade
        onAnimationOpacityRef.current?.(state.opacity);

        animFrameRef.current = requestAnimationFrame(animate);
      };

      animFrameRef.current = requestAnimationFrame(animate);

      return () => {
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);

        // Restore controls
        if (graph) {
          const c = graph.controls() as { enabled?: boolean };
          if (c) c.enabled = true;
          graph.d3AlphaDecay(0.02);
          graph.d3VelocityDecay(0.3);
        }
        directorRef.current = null;
        onAnimationOpacityRef.current?.(1);
      };
    }
  }, [animating]);

  // React to gravity changes without full rebuild
  useEffect(() => {
    if (!graphRef.current || animatingRef.current) return;
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

  // React to glow/bloom changes — intercepts the renderer to add bloom
  useEffect(() => {
    const graph = graphRef.current;
    if (!graph) return;

    const totalGlow = Math.max(settings.nodeGlow, settings.edgeGlow);
    const renderer = graph.renderer() as THREE.WebGLRenderer;

    if (totalGlow <= 0) {
      // Restore original render method if we patched it
      if (origRenderRef.current) {
        renderer.render = origRenderRef.current;
        origRenderRef.current = null;
      }
      if (composerRef.current) {
        composerRef.current.dispose();
        composerRef.current = null;
        bloomPassRef.current = null;
      }
      return;
    }

    const scene = graph.scene() as THREE.Scene;
    const camera = graph.camera() as THREE.Camera;

    if (!composerRef.current) {
      const composer = new EffectComposer(renderer);
      composer.addPass(new RenderPass(scene, camera));

      const bloomPass = new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        totalGlow * 1.0,
        0.6,    // radius
        0.1,    // threshold — low so colors bloom
      );
      composer.addPass(bloomPass);

      composerRef.current = composer;
      bloomPassRef.current = bloomPass;

      // Intercept the renderer.render call: when the library renders,
      // we run the bloom composer instead
      if (!origRenderRef.current) {
        origRenderRef.current = renderer.render.bind(renderer);
      }
      renderer.render = ((_scene: THREE.Object3D, _camera: THREE.Camera) => {
        if (composerRef.current) {
          composerRef.current.render();
        } else if (origRenderRef.current) {
          origRenderRef.current(_scene, _camera);
        }
      }) as typeof renderer.render;
    }

    // Update bloom strength live
    if (bloomPassRef.current) {
      bloomPassRef.current.strength = totalGlow * 1.0;
    }
  }, [settings.nodeGlow, settings.edgeGlow]);

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
