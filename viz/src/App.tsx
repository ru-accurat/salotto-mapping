import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { Cosmograph, CosmographPointColorStrategy, CosmographLinkWidthStrategy, CosmographLinkColorStrategy } from "@cosmograph/react";
import type { CosmographRef } from "@cosmograph/react";

const Graph3D = lazy(() => import("./Graph3D"));

interface Node {
  id: string;
  name: string;
  class: string;
  shape: string;
  member_status?: string;
  degree: number;
  x: number;
  y: number;
  primary_role?: string;
  org_type?: string;
  relevance?: string;
  size?: number;
  shapeValue?: string;
  _index?: number;
  [key: string]: unknown;
}

interface Edge {
  source: string;
  target: string;
  type: string;
  confidence: number;
  kind: string;
  weight: number;
  width: number;
  color: string;
  status?: string;
  sourceIndex: number;
  targetIndex: number;
  [key: string]: unknown;
}

interface NetworkData {
  nodes: Node[];
  edges: Edge[];
  bfs_order: string[];
  seed: string;
}

function getNodeSize(node: Node): number {
  if (node.id === "SALOTTO") return 12;
  if (node.class === "org") return Math.max(2, Math.min(node.degree * 0.8, 6));
  if (node.member_status === "co_founder") return 8;
  if (node.member_status === "member") return 6;
  if (node.class === "ambient") return 2.5;
  return Math.max(3, Math.min(3 + node.degree * 0.3, 5));
}

export default function App() {
  const [data, setData] = useState<NetworkData | null>(null);
  const [mode, setMode] = useState<"2d" | "3d">("2d");
  const cosmographRef = useRef<CosmographRef>(undefined);

  useEffect(() => {
    fetch("/network.json")
      .then((r) => r.json())
      .then((d: NetworkData) => {
        d.nodes.forEach((n, i) => {
          n.size = getNodeSize(n);
          n.shapeValue = n.shape === "hexagon" ? "hexagon" : "circle";
          n._index = i;
        });
        setData(d);
      });
  }, []);

  useEffect(() => {
    if (!data) return;
    const timer = setTimeout(() => {
      cosmographRef.current?.fitView();
    }, 3000);
    return () => clearTimeout(timer);
  }, [data]);

  if (!data) {
    return (
      <div style={{ background: "#000", width: "100vw", height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "#5fe6c8", fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}>
        Loading network…
      </div>
    );
  }

  const toggleButton = (
    <button
      onClick={() => setMode(mode === "2d" ? "3d" : "2d")}
      style={{
        position: "fixed",
        top: 16,
        right: 16,
        zIndex: 1000,
        background: "rgba(255,255,255,0.08)",
        border: "1px solid rgba(255,255,255,0.2)",
        borderRadius: 6,
        color: "#ffffffcc",
        padding: "6px 14px",
        fontSize: 13,
        fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
        cursor: "pointer",
        backdropFilter: "blur(8px)",
        transition: "background 0.2s",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.15)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.08)")}
    >
      {mode === "2d" ? "3D" : "2D"}
    </button>
  );

  if (mode === "3d") {
    return (
      <div style={{ width: "100vw", height: "100vh", background: "#000" }}>
        {toggleButton}
        <Suspense fallback={null}>
          <Graph3D nodes={data.nodes} edges={data.edges} />
        </Suspense>
      </div>
    );
  }

  return (
    <div style={{ width: "100vw", height: "100vh", background: "#000" }}>
      {toggleButton}
      <Cosmograph
        ref={cosmographRef}
        backgroundColor="#000000"
        enableSimulation={true}
        simulationGravity={0.5}
        simulationCenter={0.5}
        simulationRepulsion={0.5}
        simulationLinkDistance={5}
        points={data.nodes}
        pointIdBy="id"
        pointIndexBy="_index"
        pointColorBy="class"
        pointColorByMap={{
          salotto: "#d4915a",
          member: "#5fe6c8",
          guest: "#ffffff",
          ambient: "#c8c8e0",
          org: "#7a7a8e",
        }}
        pointColorStrategy={CosmographPointColorStrategy.Map}
        pointSizeBy="size"
        pointShapeBy="shapeValue"
        pointSizeRange={[2, 10]}
        pointLabelBy="name"
        pointLabelColor="#ffffffcc"
        pointLabelFontSize={11}
        pointLabelClassName="salotto-label"
        showLabels={true}
        showDynamicLabels={true}
        showDynamicLabelsLimit={400}
        showTopLabels={true}
        showTopLabelsLimit={400}
        showHoveredPointLabel={true}
        links={data.edges}
        linkSourceBy="source"
        linkTargetBy="target"
        linkSourceIndexBy="sourceIndex"
        linkTargetIndexBy="targetIndex"
        renderLinks={true}
        linkColorBy="color"
        linkColorStrategy={CosmographLinkColorStrategy.Direct}
        linkDefaultColor="#4466bb"
        linkWidthBy="width"
        linkWidthStrategy={CosmographLinkWidthStrategy.Direct}
        linkDefaultWidth={0.5}
        linkOpacity={0.6}
        linkWidthScale={1}
        linkVisibilityDistanceRange={[0, 99999]}
        linkVisibilityMinTransparency={0}
        curvedLinks={true}
        curvedLinkSegments={5}
        curvedLinkWeight={0.5}
        curvedLinkControlPointDistance={0.5}
        scaleLinksOnZoom={false}
        pointOpacity={1.0}
        fitViewOnInit={true}
        fitViewPadding={0.1}
        renderHoveredPointRing={true}
        hoveredPointRingColor="#5fe6c8"
        scalePointsOnZoom={false}
      />
    </div>
  );
}
