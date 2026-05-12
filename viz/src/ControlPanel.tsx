import { useState } from "react";
import type { ViewSettings, NodeColors, StarFieldSettings } from "./settings";

interface Preset {
  name: string;
  settings: ViewSettings;
  createdAt: number;
}

const PRESETS_KEY = "salotto-mapping-presets";

function loadPresets(): Preset[] {
  try {
    const raw = localStorage.getItem(PRESETS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function savePresets(presets: Preset[]) {
  localStorage.setItem(PRESETS_KEY, JSON.stringify(presets));
}

const FONT = "'Helvetica Neue', Helvetica, Arial, sans-serif";

const CLASS_LABELS: Record<keyof NodeColors, string> = {
  salotto: "Salotto",
  member: "Members",
  guest: "Guests",
  ambient: "Ambient",
  org: "Organizations",
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "#ffffff66", marginBottom: 6 }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function SliderRow({ label, value, min, max, step, onChange }: {
  label: string; value: number; min: number; max: number; step: number;
  onChange: (v: number) => void;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
      <span style={{ fontSize: 11, color: "#ffffffaa", minWidth: 90, flexShrink: 0 }}>{label}</span>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{ flex: 1, accentColor: "#5fe6c8", height: 3 }} />
      <span style={{ fontSize: 10, color: "#ffffff66", minWidth: 30, textAlign: "right" }}>{value.toFixed(step < 1 ? 1 : 0)}</span>
    </div>
  );
}

function ColorRow({ label, value, onChange }: {
  label: string; value: string; onChange: (v: string) => void;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
      <span style={{ fontSize: 11, color: "#ffffffaa", minWidth: 90, flexShrink: 0 }}>{label}</span>
      <input type="color" value={value} onChange={(e) => onChange(e.target.value)}
        style={{ width: 24, height: 18, border: "none", background: "none", cursor: "pointer", padding: 0 }} />
      <span style={{ fontSize: 10, color: "#ffffff44", fontFamily: "monospace" }}>{value}</span>
    </div>
  );
}

export default function ControlPanel({
  settings,
  onChange,
  onPlay,
}: {
  settings: ViewSettings;
  onChange: (s: ViewSettings) => void;
  onPlay?: () => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [presets, setPresets] = useState<Preset[]>(loadPresets);
  const [presetName, setPresetName] = useState("");
  const [showSaveInput, setShowSaveInput] = useState(false);

  const handleSavePreset = () => {
    const name = presetName.trim();
    if (!name) return;
    const next = [...presets, { name, settings: { ...settings }, createdAt: Date.now() }];
    savePresets(next);
    setPresets(next);
    setPresetName("");
    setShowSaveInput(false);
  };

  const handleDeletePreset = (index: number) => {
    const next = presets.filter((_, i) => i !== index);
    savePresets(next);
    setPresets(next);
  };

  const handleLoadPreset = (preset: Preset) => {
    onChange({ ...preset.settings });
  };

  const update = (partial: Partial<ViewSettings>) => onChange({ ...settings, ...partial });
  const updateNodeColor = (cls: keyof NodeColors, color: string) =>
    update({ nodeColors: { ...settings.nodeColors, [cls]: color } });
  const updateNodeSize = (cls: keyof NodeColors, val: number) =>
    update({ nodeSizeMultipliers: { ...settings.nodeSizeMultipliers, [cls]: val } });
  const updateStarField = (partial: Partial<StarFieldSettings>) =>
    update({ starField: { ...settings.starField, ...partial } });

  return (
    <div style={{
      position: "fixed", top: 12, right: 12, zIndex: 1000,
      fontFamily: FONT, color: "#ffffffcc",
      background: "rgba(10,10,18,0.85)",
      border: "1px solid rgba(255,255,255,0.1)",
      borderRadius: 8,
      backdropFilter: "blur(12px)",
      width: collapsed ? "auto" : 300,
      maxHeight: "calc(100vh - 24px)",
      overflow: collapsed ? "visible" : "hidden",
      display: "flex", flexDirection: "column",
    }}>
      {/* Header */}
      <div
        style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "8px 12px",
          cursor: "pointer", userSelect: "none",
          borderBottom: collapsed ? "none" : "1px solid rgba(255,255,255,0.06)",
        }}
        onClick={() => setCollapsed(!collapsed)}
      >
        <span style={{ fontSize: 12, fontWeight: 500 }}>Controls</span>
        <span style={{ fontSize: 14, color: "#ffffff66", transform: collapsed ? "rotate(-90deg)" : "rotate(0)", transition: "transform 0.2s" }}>▾</span>
      </div>

      {!collapsed && (
        <div style={{ padding: "10px 12px", overflowY: "auto", flex: 1 }}>
          {/* View mode */}
          <Section title="View">
            <div style={{ display: "flex", gap: 4, marginBottom: 4 }}>
              {(["2d", "3d"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => update({ mode: m })}
                  style={{
                    flex: 1, padding: "4px 0", fontSize: 12, cursor: "pointer",
                    border: "1px solid rgba(255,255,255,0.15)", borderRadius: 4,
                    background: settings.mode === m ? "rgba(95,230,200,0.15)" : "transparent",
                    color: settings.mode === m ? "#5fe6c8" : "#ffffff88",
                    fontFamily: FONT, fontWeight: 500,
                  }}
                >
                  {m.toUpperCase()}
                </button>
              ))}
            </div>
          </Section>

          {/* Presets */}
          <Section title="Presets">
            {presets.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 2, marginBottom: 6 }}>
                {presets.map((p, i) => (
                  <div key={i} style={{
                    display: "flex", alignItems: "center", gap: 4,
                    padding: "3px 6px", borderRadius: 4,
                    background: "rgba(255,255,255,0.04)",
                    cursor: "pointer",
                  }}>
                    <span
                      onClick={() => handleLoadPreset(p)}
                      style={{
                        flex: 1, fontSize: 11, color: "#ffffffcc",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}
                      title={`Load "${p.name}"`}
                    >
                      {p.name}
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeletePreset(i); }}
                      style={{
                        background: "none", border: "none", color: "#ffffff44",
                        cursor: "pointer", fontSize: 12, padding: "0 2px",
                        lineHeight: 1, flexShrink: 0,
                      }}
                      title="Delete preset"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
            {showSaveInput ? (
              <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                <input
                  autoFocus
                  type="text"
                  value={presetName}
                  onChange={(e) => setPresetName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSavePreset();
                    if (e.key === "Escape") { setShowSaveInput(false); setPresetName(""); }
                  }}
                  placeholder="Preset name…"
                  style={{
                    flex: 1, fontSize: 11, padding: "3px 6px",
                    background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)",
                    borderRadius: 4, color: "#ffffffcc", outline: "none",
                    fontFamily: FONT,
                  }}
                />
                <button
                  onClick={handleSavePreset}
                  disabled={!presetName.trim()}
                  style={{
                    fontSize: 11, padding: "3px 8px", cursor: presetName.trim() ? "pointer" : "default",
                    border: "1px solid rgba(95,230,200,0.3)", borderRadius: 4,
                    background: presetName.trim() ? "rgba(95,230,200,0.15)" : "transparent",
                    color: presetName.trim() ? "#5fe6c8" : "#ffffff44",
                    fontFamily: FONT, fontWeight: 500,
                  }}
                >
                  Save
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowSaveInput(true)}
                style={{
                  width: "100%", padding: "4px 0", fontSize: 11, cursor: "pointer",
                  border: "1px solid rgba(255,255,255,0.15)", borderRadius: 4,
                  background: "transparent", color: "#ffffff88",
                  fontFamily: FONT, fontWeight: 500,
                }}
              >
                + Save current
              </button>
            )}
          </Section>

          {/* Background */}
          <Section title="Background">
            <ColorRow label="Color" value={settings.backgroundColor}
              onChange={(v) => update({ backgroundColor: v })} />
          </Section>

          {/* Star field (3D only) */}
          {settings.mode === "3d" && (
            <Section title="Star field">
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 11, color: "#ffffffaa" }}>Enabled</span>
                <input type="checkbox" checked={settings.starField.enabled}
                  onChange={(e) => updateStarField({ enabled: e.target.checked })}
                  style={{ accentColor: "#5fe6c8" }} />
              </div>
              {settings.starField.enabled && (
                <>
                  <SliderRow label="Count" value={settings.starField.count}
                    min={100} max={10000} step={100} onChange={(v) => updateStarField({ count: v })} />
                  <SliderRow label="Size" value={settings.starField.size}
                    min={0.1} max={5} step={0.1} onChange={(v) => updateStarField({ size: v })} />
                  <ColorRow label="Color" value={settings.starField.color}
                    onChange={(v) => updateStarField({ color: v })} />
                </>
              )}
            </Section>
          )}

          {/* Edges */}
          <Section title="Edges">
            <ColorRow label="Salotto" value={settings.salottoEdgeColor}
              onChange={(v) => update({ salottoEdgeColor: v })} />
            <SliderRow label="Salotto width" value={settings.salottoEdgeWidth}
              min={0.1} max={3} step={0.1} onChange={(v) => update({ salottoEdgeWidth: v })} />
            <ColorRow label="Network" value={settings.networkEdgeColor}
              onChange={(v) => update({ networkEdgeColor: v })} />
            <SliderRow label="Network width" value={settings.networkEdgeWidth}
              min={0.1} max={3} step={0.1} onChange={(v) => update({ networkEdgeWidth: v })} />
          </Section>

          {/* Nodes */}
          <Section title="Nodes">
            {(Object.keys(CLASS_LABELS) as (keyof NodeColors)[]).map((cls) => (
              <div key={cls} style={{ marginBottom: 6 }}>
                <ColorRow label={CLASS_LABELS[cls]} value={settings.nodeColors[cls]}
                  onChange={(v) => updateNodeColor(cls, v)} />
                <SliderRow label={`${CLASS_LABELS[cls]} size`} value={settings.nodeSizeMultipliers[cls]}
                  min={0.2} max={3} step={0.1} onChange={(v) => updateNodeSize(cls, v)} />
              </div>
            ))}
          </Section>

          {/* Labels */}
          <Section title="Labels">
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 11, color: "#ffffffaa" }}>Visible</span>
              <input type="checkbox" checked={settings.showLabels}
                onChange={(e) => update({ showLabels: e.target.checked })}
                style={{ accentColor: "#5fe6c8" }} />
            </div>
          </Section>

          {/* Physics */}
          <Section title="Physics">
            <SliderRow label="Gravity" value={settings.gravity}
              min={0} max={2} step={0.1} onChange={(v) => update({ gravity: v })} />
          </Section>

          {/* Weight contrast */}
          <Section title="Edge contrast">
            <SliderRow label="Contrast" value={settings.weightContrast}
              min={0.2} max={5} step={0.1} onChange={(v) => update({ weightContrast: v })} />
            <div style={{ fontSize: 9, color: "#ffffff44", marginTop: 2 }}>
              1 = linear · &gt;1 amplifies difference · &lt;1 flattens
            </div>
          </Section>

          {/* Animation (3D only) */}
          {settings.mode === "3d" && onPlay && (
            <Section title="Animation">
              <button
                onClick={onPlay}
                style={{
                  width: "100%", padding: "6px 0", fontSize: 12, cursor: "pointer",
                  border: "1px solid rgba(95,230,200,0.3)", borderRadius: 4,
                  background: "rgba(95,230,200,0.15)", color: "#5fe6c8",
                  fontFamily: FONT, fontWeight: 500,
                }}
              >
                ▶ Play animation
              </button>
              <div style={{ fontSize: 9, color: "#ffffff44", marginTop: 4 }}>
                2-min camera flight with vignette. Press ESC to stop.
              </div>
            </Section>
          )}
        </div>
      )}
    </div>
  );
}
