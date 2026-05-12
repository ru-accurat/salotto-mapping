/**
 * Vignette — a strong elliptical vignette overlay that fades to black at the edges.
 * Rendered as a CSS radial-gradient overlay, fully transparent at center.
 * The `opacity` prop controls an additional fade-to-black for the animation envelope.
 */

export default function Vignette({ opacity = 1 }: { opacity?: number }) {
  return (
    <>
      {/* Elliptical vignette — always present */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          zIndex: 10,
          background: "radial-gradient(ellipse 70% 65% at 50% 50%, transparent 0%, rgba(0,0,0,0.15) 40%, rgba(0,0,0,0.6) 65%, rgba(0,0,0,0.9) 80%, #000000 100%)",
        }}
      />
      {/* Fade-to-black layer — controlled by animation */}
      {opacity < 1 && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            pointerEvents: "none",
            zIndex: 11,
            backgroundColor: "#000000",
            opacity: 1 - opacity,
            transition: "opacity 0.1s linear",
          }}
        />
      )}
    </>
  );
}
