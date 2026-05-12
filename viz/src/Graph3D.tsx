import { useEffect, useRef } from "react";
import ForceGraph3DImport from "3d-force-graph";
// Types declare a class constructor but runtime exports a factory function
const ForceGraph3D = ForceGraph3DImport as unknown as (configOptions?: object) => (element: HTMLElement) => any;
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

  // Full rebuild when data changes
  useEffect(() => {
    if (!containerRef.current) return;

    const labelSprites = new Map<string, THREE.Sprite>();
    const s = settingsRef.current;

    const graph = ForceGraph3D()(containerRef.current)
      .backgroundColor("#000000")
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
        // Strip pre-computed 2D positions so the 3D force simulation
        // generates a proper three-dimensional layout
        nodes: JSON.parse(JSON.stringify(nodes)).map((n: any) => {
          delete n.x;
          delete n.y;
          return n;
        }),
        links: JSON.parse(JSON.stringify(edges)),
      });

    graphRef.current = graph;

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

    return () => {
      clearInterval(interval);
      window.removeEventListener("resize", handleResize);
      graph._destructor();
      graphRef.current = null;
    };
  }, [nodes, edges]);

  // React to gravity changes without full rebuild
  useEffect(() => {
    if (!graphRef.current) return;
    graphRef.current.d3Force("charge")?.strength(-30 * (1 + settings.gravity));
    graphRef.current.d3ReheatSimulation();
  }, [settings.gravity]);

  return <div ref={containerRef} style={{ width: "100vw", height: "100vh" }} />;
}
