"use client";

// Ambient backdrop — isolated client component for pointer-events-none overlay.
// Uses a fixed pseudo-element pattern: never attached to a scrolling container.
export function AppAmbient() {
  return (
    <>
      {/* Radial gradient wash — very subtle, top-left origin */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at -5% 0%, oklch(0.72 0.18 75 / 0.04) 0%, transparent 70%), " +
            "radial-gradient(ellipse 60% 40% at 105% 90%, oklch(0.22 0.08 264 / 0.05) 0%, transparent 70%)",
        }}
      />

      {/* Dot-grid overlay — SVG pattern, fixed, doesn't repaint on scroll */}
      <svg
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 h-full w-full opacity-[0.018]"
        style={{ mixBlendMode: "multiply" }}
      >
        <defs>
          <pattern
            id="dot-grid"
            x="0"
            y="0"
            width="24"
            height="24"
            patternUnits="userSpaceOnUse"
          >
            <circle cx="1.5" cy="1.5" r="1.2" fill="oklch(0.22 0.08 264)" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#dot-grid)" />
      </svg>
    </>
  );
}
