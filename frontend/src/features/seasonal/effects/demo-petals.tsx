"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import type { SeasonalEffectProps } from "./effect-types";

// Deliberately small: decorations must stay cheap on mobile.
const PETAL_COUNT = 12;

interface Petal {
  id: number;
  left: number;
  top: number;
  size: number;
  delay: number;
  duration: number;
  drift: number;
}

export default function DemoPetals({ motion, tokens }: SeasonalEffectProps) {
  const [paused, setPaused] = useState(false);

  // Pause continuous animation while the tab is hidden.
  useEffect(() => {
    const update = () => setPaused(document.visibilityState !== "visible");
    update();
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);

  const petals = useMemo<Petal[]>(
    () =>
      Array.from({ length: PETAL_COUNT }, (_, index) => ({
        id: index,
        left: (index * 37 + 11) % 100,
        top: 12 + ((index * 23) % 70),
        size: 6 + (index % 4) * 3,
        delay: (index * 0.9) % 7,
        duration: 9 + (index % 5) * 2,
        drift: ((index % 3) - 1) * 28,
      })),
    []
  );

  if (motion === "off") return null;

  return (
    <div
      className="seasonal-effect seasonal-effect--petals"
      data-motion={motion}
      data-paused={paused ? "true" : undefined}
      aria-hidden="true"
    >
      {petals.map((petal) => {
        const style: CSSProperties & Record<string, string | number> = {
          left: `${petal.left}%`,
          width: petal.size,
          height: Math.round(petal.size * 1.3),
          backgroundColor: tokens.particle,
        };
        if (motion === "reduced") {
          style.top = `${petal.top}%`;
          style.opacity = 0.35;
        } else {
          style.animationDelay = `${petal.delay}s`;
          style.animationDuration = `${petal.duration}s`;
          style["--seasonal-petal-drift"] = `${petal.drift}px`;
        }
        return <span key={petal.id} className="seasonal-petal" style={style} />;
      })}
    </div>
  );
}
