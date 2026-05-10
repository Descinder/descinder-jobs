"use client";

import { useRef, useState } from "react";
import { cn } from "@/lib/utils";

/** Spotlight-border Bento card — tracks cursor and illuminates the border edge. */
export function BentoCard({
  children,
  className,
  style,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({ x: 50, y: 50 });
  const [hovered, setHovered] = useState(false);

  function handleMove(e: React.MouseEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setCoords({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    });
  }

  return (
    <div
      ref={ref}
      onMouseMove={handleMove}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={cn(
        "relative overflow-hidden rounded-[2.5rem] border border-slate-200/50",
        "bg-white p-8 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)]",
        "transition-shadow duration-300 hover:shadow-[0_24px_48px_-12px_rgba(0,0,0,0.08)]",
        className
      )}
      style={{
        ...style,
        ...(hovered && {
          background: `radial-gradient(circle at ${coords.x}% ${coords.y}%, oklch(0.72 0.18 75 / 0.05), transparent 55%), white`,
        }),
      }}
    >
      {/* Spotlight border edge */}
      {hovered && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-px rounded-[2.4rem]"
          style={{
            background: `radial-gradient(circle at ${coords.x}% ${coords.y}%, oklch(0.72 0.18 75 / 0.18), transparent 50%)`,
            border: "1px solid oklch(0.72 0.18 75 / 0.22)",
            WebkitMaskImage: "none",
          }}
        />
      )}
      {children}
    </div>
  );
}
