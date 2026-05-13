/**
 * Vignette — a strong elliptical vignette overlay that fades to the background color at the edges.
 * Rendered as a CSS radial-gradient overlay, fully transparent at center.
 * The `opacity` prop controls an additional fade layer for the animation envelope.
 */

export default function Vignette({
  opacity = 1,
  color = "#000000",
}: {
  opacity?: number;
  color?: string;
}) {
  return (
    <>
      {/* Elliptical vignette — always present */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          zIndex: 10,
          background: `radial-gradient(ellipse 55% 50% at 50% 50%, transparent 0%, ${hexToRgba(color, 0.2)} 35%, ${hexToRgba(color, 0.65)} 55%, ${hexToRgba(color, 0.92)} 70%, ${color} 82%)`,
        }}
      />
      {/* Fade layer — controlled by animation */}
      {opacity < 1 && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            pointerEvents: "none",
            zIndex: 11,
            backgroundColor: color,
            opacity: 1 - opacity,
            transition: "opacity 0.1s linear",
          }}
        />
      )}
    </>
  );
}

/** Convert hex color to rgba string */
function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}
