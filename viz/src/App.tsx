import { Component, lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ErrorInfo, ReactNode } from "react";
import { Cosmograph, CosmographPointColorStrategy, CosmographLinkWidthStrategy, CosmographLinkColorStrategy } from "@cosmograph/react";
import type { CosmographRef } from "@cosmograph/react";
import ControlPanel from "./ControlPanel";
import Vignette from "./Vignette";
import { DEFAULT_SETTINGS } from "./settings";
import type { ViewSettings } from "./settings";

const Graph3D = lazy(() => import("./Graph3D"));

class Graph3DErrorBoundary extends Component<
  { children: ReactNode; onReset?: () => void },
  { hasError: boolean; error: string }
> {
  constructor(props: { children: ReactNode; onReset?: () => void }) {
    super(props);
    this.state = { hasError: false, error: "" };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Graph3D error boundary caught:", error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          width: "100vw", height: "100vh", display: "flex",
          alignItems: "center", justifyContent: "center",
          color: "#ff6b6b", fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
          flexDirection: "column", gap: 12,
        }}>
          <div style={{ fontSize: 16 }}>3D view crashed</div>
          <div style={{ fontSize: 12, color: "#ffffff66", maxWidth: 400, textAlign: "center" }}>
            {this.state.error}
          </div>
          <button
            onClick={() => this.setState({ hasError: false, error: "" })}
            style={{
              marginTop: 8, padding: "6px 16px", background: "rgba(95,230,200,0.15)",
              color: "#5fe6c8", border: "1px solid rgba(95,230,200,0.3)", borderRadius: 4,
              cursor: "pointer",
            }}
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

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
  _baseSize?: number;
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
  _baseWidth?: number;
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

function nodeClassKey(node: Node): keyof ViewSettings["nodeColors"] {
  if (node.class === "salotto") return "salotto";
  if (node.class === "org") return "org";
  if (node.class === "ambient") return "ambient";
  if (node.class === "member") return "member";
  return "guest";
}

export default function App() {
  const [rawData, setRawData] = useState<NetworkData | null>(null);
  const [settings, setSettings] = useState<ViewSettings>(DEFAULT_SETTINGS);
  const [animating, setAnimating] = useState(false);
  const [animOpacity, setAnimOpacity] = useState(1);
  const cosmographRef = useRef<CosmographRef>(undefined);

  useEffect(() => {
    fetch("/network.json")
      .then((r) => r.json())
      .then((d: NetworkData) => {
        d.nodes.forEach((n, i) => {
          n._baseSize = getNodeSize(n);
          n.size = n._baseSize;
          n.shapeValue = n.shape === "hexagon" ? "hexagon" : "circle";
          n._index = i;
        });
        const maxWeight = Math.max(...d.edges.map((e) => e.weight), 1);
        d.edges.forEach((e) => {
          e._baseWidth = 0.1 + (e.weight / maxWeight) * 0.9;
          e.width = e._baseWidth;
        });
        setRawData(d);
      });
  }, []);

  // ESC to stop animation
  useEffect(() => {
    if (!animating) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setAnimating(false);
        setAnimOpacity(1);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [animating]);

  const handlePlay = useCallback(() => setAnimating(true), []);
  const handleAnimationOpacity = useCallback((o: number) => setAnimOpacity(o), []);

  // Derive display data
  const data = useMemo(() => {
    if (!rawData) return null;

    const maxWeight = Math.max(...rawData.edges.map((e) => e.weight), 1);

    const nodes = rawData.nodes.map((n) => {
      const cls = nodeClassKey(n);
      const sizeMultiplier = settings.nodeSizeMultipliers[cls];
      return {
        ...n,
        size: (n._baseSize || 3) * sizeMultiplier,
        _displayColor: settings.nodeColors[cls],
      };
    });

    const edges = rawData.edges.map((e) => {
      const normalizedWeight = e.weight / maxWeight;
      const contrastedWeight = Math.pow(normalizedWeight, 1 / settings.weightContrast);
      const baseWidth = 0.1 + contrastedWeight * 0.9;
      const isSalotto = e.kind === "salotto";
      const widthMul = isSalotto ? settings.salottoEdgeWidth : settings.networkEdgeWidth;
      return {
        ...e,
        width: baseWidth * widthMul,
        color: isSalotto ? settings.salottoEdgeColor : settings.networkEdgeColor,
      };
    });

    return { ...rawData, nodes, edges };
  }, [rawData, settings]);

  useEffect(() => {
    if (!data || settings.mode !== "2d") return;
    const timer = setTimeout(() => {
      cosmographRef.current?.fitView();
    }, 3000);
    return () => clearTimeout(timer);
  }, [data, settings.mode]);

  if (!data) {
    return (
      <div style={{ background: "#000", width: "100vw", height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "#5fe6c8", fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}>
        Loading network…
      </div>
    );
  }

  const panel = !animating && (
    <ControlPanel settings={settings} onChange={setSettings} onPlay={handlePlay} />
  );

  if (settings.mode === "3d") {
    return (
      <div style={{ width: "100vw", height: "100vh", background: settings.backgroundColor }}>
        {panel}
        {animating && <Vignette opacity={animOpacity} />}
        <Graph3DErrorBoundary>
          <Suspense fallback={null}>
            <Graph3D
              nodes={data.nodes}
              edges={data.edges}
              settings={settings}
              animating={animating}
              onAnimationOpacity={handleAnimationOpacity}
            />
          </Suspense>
        </Graph3DErrorBoundary>
      </div>
    );
  }

  return (
    <div style={{ width: "100vw", height: "100vh", background: settings.backgroundColor }}>
      {panel}
      <Cosmograph
        ref={cosmographRef}
        backgroundColor={settings.backgroundColor}
        enableSimulation={true}
        simulationGravity={settings.gravity}
        simulationCenter={0.5}
        simulationRepulsion={0.5}
        simulationLinkDistance={5}
        points={data.nodes}
        pointIdBy="id"
        pointIndexBy="_index"
        pointColorBy="_displayColor"
        pointColorStrategy={CosmographPointColorStrategy.Direct}
        pointSizeBy="size"
        pointShapeBy="shapeValue"
        pointSizeRange={[2, 10]}
        pointLabelBy="name"
        pointLabelColor="#ffffffcc"
        pointLabelFontSize={11}
        pointLabelClassName="salotto-label"
        showLabels={settings.showLabels}
        showDynamicLabels={settings.showLabels}
        showDynamicLabelsLimit={400}
        showTopLabels={settings.showLabels}
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
        linkDefaultColor={settings.networkEdgeColor}
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
