export interface NodeColors {
  salotto: string;
  member: string;
  guest: string;
  ambient: string;
  org: string;
}


export interface ViewSettings {
  mode: "2d" | "3d";

  // Edge appearance
  salottoEdgeColor: string;
  networkEdgeColor: string;
  salottoEdgeWidth: number; // multiplier 0.1–3
  networkEdgeWidth: number; // multiplier 0.1–3

  // Node appearance (per class)
  nodeColors: NodeColors;
  nodeSizeMultipliers: Record<keyof NodeColors, number>; // 0.2–3

  // Labels
  showLabels: boolean;

  // Physics
  gravity: number; // 0–2

  // Edge weight contrast (exponent applied to normalized weight)
  weightContrast: number; // 0.2–5
}

export const DEFAULT_SETTINGS: ViewSettings = {
  mode: "3d",

  salottoEdgeColor: "#d4915a",
  networkEdgeColor: "#4466bb",
  salottoEdgeWidth: 1,
  networkEdgeWidth: 1,

  nodeColors: {
    salotto: "#d4915a",
    member: "#5fe6c8",
    guest: "#ffffff",
    ambient: "#c8c8e0",
    org: "#7a7a8e",
  },
  nodeSizeMultipliers: {
    salotto: 1,
    member: 1,
    guest: 1,
    ambient: 1,
    org: 1,
  },

  showLabels: true,
  gravity: 0.5,
  weightContrast: 1,
};
