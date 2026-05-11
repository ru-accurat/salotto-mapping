import { useEffect, useRef } from "react";
import ForceGraph3DImport from "3d-force-graph";
// Types declare a class constructor but runtime exports a factory function
const ForceGraph3D = ForceGraph3DImport as unknown as (configOptions?: object) => (element: HTMLElement) => any;
import * as THREE from "three";
import SpriteText from "three-spritetext";

interface GraphNode {
  id: string;
  name: string;
  class: string;
  shape: string;
  size?: number;
  [key: string]: unknown;
}

interface GraphEdge {
  source: string;
  target: string;
  color: string;
  width: number;
  [key: string]: unknown;
}

const COLOR_MAP: Record<string, string> = {
  salotto: "#d4915a",
  member: "#5fe6c8",
  guest: "#ffffff",
  ambient: "#c8c8e0",
  org: "#7a7a8e",
};

const MAX_LABELS = 300;

function nodeRadius(n: GraphNode): number {
  const s = n.size || 3;
  return Math.cbrt(s) * 0.8;
}

function makeNodeObject(n: GraphNode): THREE.Object3D {
  const color = COLOR_MAP[n.class as string] || "#ffffff";
  const r = nodeRadius(n);
  const isOrg = n.shape === "hexagon";

  let mesh: THREE.Mesh;
  if (isOrg) {
    const geo = new THREE.DodecahedronGeometry(r, 0);
    const mat = new THREE.MeshLambertMaterial({ color, transparent: true, opacity: 0.95 });
    mesh = new THREE.Mesh(geo, mat);
  } else {
    const geo = new THREE.SphereGeometry(r, 16, 12);
    const mat = new THREE.MeshLambertMaterial({ color, transparent: true, opacity: 0.95 });
    mesh = new THREE.Mesh(geo, mat);
  }

  return mesh;
}

export default function Graph3D({ nodes, edges }: { nodes: GraphNode[]; edges: GraphEdge[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const graphRef = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const labelSprites = new Map<string, THREE.Sprite>();

    const graph = ForceGraph3D()(containerRef.current)
      .backgroundColor("#000000")
      .nodeId("id")
      .nodeLabel("")
      .nodeThreeObject((n: GraphNode) => {
        const group = new THREE.Group();
        group.add(makeNodeObject(n));

        const sprite = new SpriteText(n.name, 1.2, COLOR_MAP[n.class as string] || "#ffffffcc");
        sprite.fontFace = "Helvetica Neue, Helvetica, Arial, sans-serif";
        sprite.fontWeight = "400";
        sprite.backgroundColor = "rgba(0,0,0,0)";
        sprite.padding = 0.3;
        const r = nodeRadius(n);
        sprite.position.set(0, r + 1.5, 0);
        sprite.visible = false;
        group.add(sprite);

        labelSprites.set(n.id, sprite);
        return group;
      })
      .linkSource("source")
      .linkTarget("target")
      .linkColor((e: GraphEdge) => e.color || "#4466bb")
      .linkWidth((e: GraphEdge) => e.width * 1.5)
      .linkOpacity(0.5)
      .linkCurvature(0.35)
      .linkCurveRotation((e: GraphEdge) => {
        const s = typeof e.source === "object" ? (e.source as GraphNode).id : e.source;
        const t = typeof e.target === "object" ? (e.target as GraphNode).id : e.target;
        return (s + t).split("").reduce((a, c) => a + c.charCodeAt(0), 0) * 0.5;
      })
      .showNavInfo(false)
      .graphData({
        nodes: JSON.parse(JSON.stringify(nodes)),
        links: JSON.parse(JSON.stringify(edges)),
      });

    graphRef.current = graph;

    const updateLabels = () => {
      const camera = graph.camera();
      const cameraPos = camera.position;

      const frustum = new THREE.Frustum();
      const projScreenMatrix = new THREE.Matrix4();
      projScreenMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
      frustum.setFromProjectionMatrix(projScreenMatrix);

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

  return <div ref={containerRef} style={{ width: "100vw", height: "100vh" }} />;
}
