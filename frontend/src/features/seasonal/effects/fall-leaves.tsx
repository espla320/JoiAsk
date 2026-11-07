"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { getFallVisualConfig } from "../themes/fall";
import type { SeasonalEffectProps } from "./effect-types";

const PARTICLES = [
  [8, 24, 30, -2.4, 16, 72, -12],
  [18, 67, 20, -7.1, 21, -48, 18],
  [30, 12, 13, -10.4, 18, 56, -20],
  [42, 72, 25, -5.8, 22, -78, 10],
  [55, 20, 17, -13.2, 20, 46, 24],
  [66, 78, 14, -8.7, 17, -54, -18],
  [76, 32, 28, -1.6, 23, 82, 12],
  [87, 60, 19, -12.1, 19, -42, -26],
  [94, 16, 12, -4.5, 18, -64, 20],
  [24, 44, 16, -15.4, 24, 62, -8],
  [61, 52, 22, -3.8, 21, -70, 26],
  [81, 84, 15, -9.6, 17, 48, -16],
] as const;

function FallPicture({
  src,
  className,
  style,
}: {
  src: string;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <picture className={className} style={style}>
      <source srcSet={`${src}.webp`} type="image/webp" />
      <img src={`${src}.png`} alt="" draggable={false} />
    </picture>
  );
}

export default function FallLeaves({ themeId, motion }: SeasonalEffectProps) {
  const [paused, setPaused] = useState(false);
  const visual = getFallVisualConfig(themeId);

  useEffect(() => {
    const update = () => setPaused(document.visibilityState !== "visible");
    update();
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);

  if (!visual) return null;

  const particles = PARTICLES.map(
    ([left, top, size, delay, duration, drift, rotation], index) => ({
      id: index,
      left,
      top,
      size,
      delay,
      duration,
      drift,
      rotation,
      asset: visual.particles[index % visual.particles.length],
    })
  );

  return (
    <div
      className="seasonal-effect seasonal-effect--fall"
      data-theme={themeId}
      data-composition={visual.composition}
      data-motion={motion}
      data-paused={paused ? "true" : undefined}
      aria-hidden="true"
    >
      <FallPicture
        src={`${visual.assetRoot}/${visual.hero}`}
        className="seasonal-fall-scene-art seasonal-fall-scene-art--hero"
      />
      <FallPicture
        src={`${visual.assetRoot}/${visual.wordmark}`}
        className="seasonal-fall-scene-art seasonal-fall-scene-art--wordmark"
      />
      <FallPicture
        src={`${visual.assetRoot}/${visual.ground}`}
        className="seasonal-fall-scene-art seasonal-fall-scene-art--ground"
      />
      <span className="seasonal-fall-wind seasonal-fall-wind--left" />
      <span className="seasonal-fall-wind seasonal-fall-wind--right" />
      {motion !== "off" &&
        particles.map((particle) => {
          const style = {
            left: `${particle.left}%`,
            top: motion === "reduced" ? `${particle.top}%` : undefined,
            width: particle.size,
            "--seasonal-fall-delay": `${particle.delay}s`,
            "--seasonal-fall-duration": `${particle.duration}s`,
            "--seasonal-fall-drift": `${particle.drift}px`,
            "--seasonal-fall-rotation": `${particle.rotation}deg`,
          } as CSSProperties;
          return (
            <FallPicture
              key={particle.id}
              src={`${visual.assetRoot}/${particle.asset}`}
              className="seasonal-fall-particle"
              style={style}
            />
          );
        })}
    </div>
  );
}
