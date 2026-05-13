export interface NodeColors {
  salotto: string;
  member: string;
  guest: string;
  ambient: string;
  org: string;
}


export interface StarFieldSettings {
  enabled: boolean;
  count: number;      // 100–10000
  size: number;       // 0.1–5
  color: string;
}

export interface ViewSettings {
  mode: "2d" | "3d";

  // Background
  backgroundColor: string;
  starField: StarFieldSettings;

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

  // Glow
  nodeGlow: number; // 0–2 (0 = off)
  edgeGlow: number; // 0–2 (0 = off)

  // Depth of field (animation only)
  dofAmount: number; // 0–1 (0 = off)

  // Motion blur (animation only)
  motionBlur: number; // 0–1 (0 = off)

  // Vignette (animation only)
  vignette: boolean;
}

export const DEFAULT_SETTINGS: ViewSettings = {
  mode: "3d",

  backgroundColor: "#000000",
  starField: {
    enabled: true,
    count: 2000,
    size: 0.8,
    color: "#ffffff",
  },

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
  nodeGlow: 0,
  edgeGlow: 0,
  dofAmount: 0,
  motionBlur: 0.3,
  vignette: true,
};

/** Encode settings into a compact URL search string */
export function settingsToParams(settings: ViewSettings, autoplay = false): string {
  const p = new URLSearchParams();

  // Only encode values that differ from defaults to keep URL short
  const d = DEFAULT_SETTINGS;
  if (settings.mode !== d.mode) p.set("mode", settings.mode);
  if (settings.backgroundColor !== d.backgroundColor) p.set("bg", settings.backgroundColor);
  if (settings.starField.enabled !== d.starField.enabled) p.set("sf", settings.starField.enabled ? "1" : "0");
  if (settings.starField.count !== d.starField.count) p.set("sfc", String(settings.starField.count));
  if (settings.starField.size !== d.starField.size) p.set("sfs", String(settings.starField.size));
  if (settings.starField.color !== d.starField.color) p.set("sfcl", settings.starField.color);
  if (settings.salottoEdgeColor !== d.salottoEdgeColor) p.set("sec", settings.salottoEdgeColor);
  if (settings.networkEdgeColor !== d.networkEdgeColor) p.set("nec", settings.networkEdgeColor);
  if (settings.salottoEdgeWidth !== d.salottoEdgeWidth) p.set("sew", String(settings.salottoEdgeWidth));
  if (settings.networkEdgeWidth !== d.networkEdgeWidth) p.set("new", String(settings.networkEdgeWidth));
  if (settings.showLabels !== d.showLabels) p.set("lb", settings.showLabels ? "1" : "0");
  if (settings.gravity !== d.gravity) p.set("g", String(settings.gravity));
  if (settings.weightContrast !== d.weightContrast) p.set("wc", String(settings.weightContrast));
  if (settings.nodeGlow !== d.nodeGlow) p.set("ng", String(settings.nodeGlow));
  if (settings.edgeGlow !== d.edgeGlow) p.set("eg", String(settings.edgeGlow));
  if (settings.dofAmount !== d.dofAmount) p.set("dof", String(settings.dofAmount));
  if (settings.motionBlur !== d.motionBlur) p.set("mb", String(settings.motionBlur));
  if (settings.vignette !== d.vignette) p.set("vig", settings.vignette ? "1" : "0");

  // Node colors (only if different from default)
  for (const cls of Object.keys(d.nodeColors) as (keyof NodeColors)[]) {
    if (settings.nodeColors[cls] !== d.nodeColors[cls]) p.set(`nc_${cls}`, settings.nodeColors[cls]);
    if (settings.nodeSizeMultipliers[cls] !== d.nodeSizeMultipliers[cls]) p.set(`ns_${cls}`, String(settings.nodeSizeMultipliers[cls]));
  }

  if (autoplay) p.set("play", "1");

  return p.toString();
}

/** Decode URL search params into settings (merged over defaults) */
export function paramsToSettings(search: string): { settings: ViewSettings; autoplay: boolean } {
  const p = new URLSearchParams(search);
  const s: ViewSettings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));

  if (p.has("mode")) s.mode = p.get("mode") as "2d" | "3d";
  if (p.has("bg")) s.backgroundColor = p.get("bg")!;
  if (p.has("sf")) s.starField.enabled = p.get("sf") === "1";
  if (p.has("sfc")) s.starField.count = Number(p.get("sfc"));
  if (p.has("sfs")) s.starField.size = Number(p.get("sfs"));
  if (p.has("sfcl")) s.starField.color = p.get("sfcl")!;
  if (p.has("sec")) s.salottoEdgeColor = p.get("sec")!;
  if (p.has("nec")) s.networkEdgeColor = p.get("nec")!;
  if (p.has("sew")) s.salottoEdgeWidth = Number(p.get("sew"));
  if (p.has("new")) s.networkEdgeWidth = Number(p.get("new"));
  if (p.has("lb")) s.showLabels = p.get("lb") === "1";
  if (p.has("g")) s.gravity = Number(p.get("g"));
  if (p.has("wc")) s.weightContrast = Number(p.get("wc"));
  if (p.has("ng")) s.nodeGlow = Number(p.get("ng"));
  if (p.has("eg")) s.edgeGlow = Number(p.get("eg"));
  if (p.has("dof")) s.dofAmount = Number(p.get("dof"));
  if (p.has("mb")) s.motionBlur = Number(p.get("mb"));
  if (p.has("vig")) s.vignette = p.get("vig") === "1";

  for (const cls of Object.keys(DEFAULT_SETTINGS.nodeColors) as (keyof NodeColors)[]) {
    if (p.has(`nc_${cls}`)) s.nodeColors[cls] = p.get(`nc_${cls}`)!;
    if (p.has(`ns_${cls}`)) s.nodeSizeMultipliers[cls] = Number(p.get(`ns_${cls}`));
  }

  return { settings: s, autoplay: p.get("play") === "1" };
}
