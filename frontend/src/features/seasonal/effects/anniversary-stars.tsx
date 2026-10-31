"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import type { SeasonalEffectProps } from "./effect-types";

const STAR_POSITIONS = [
  [7, 18, 12, 0.2, 5.6],
  [13, 72, 8, 1.7, 6.8],
  [30, 34, 7, 3.1, 5.2],
  [51, 14, 10, 1.1, 7.4],
  [68, 68, 8, 2.8, 6.2],
  [78, 24, 12, 0.6, 5.8],
  [91, 57, 9, 3.8, 7.1],
  [86, 86, 6, 1.3, 5.4],
  [39, 86, 5, 4.2, 6.6],
  [59, 46, 5, 2.2, 5.1],
] as const;

const FEATHERS = [
  ["anniversary-feather--far-left", "18%", "52%", "142px", "20deg"],
  ["anniversary-feather--top-center", "42%", "10%", "104px", "128deg"],
  ["anniversary-feather--right", "76%", "42%", "148px", "-24deg"],
  ["anniversary-feather--bottom-left", "25%", "83%", "112px", "49deg"],
  ["anniversary-feather--bottom-right", "72%", "78%", "104px", "156deg"],
] as const;

function Decoration({
  name,
  className,
  style,
}: {
  name: string;
  className: string;
  style?: CSSProperties;
}) {
  return (
    <picture className={`seasonal-anniversary-decoration ${className}`} style={style}>
      <source srcSet={`/seasonal/anniversary/${name}.webp`} type="image/webp" />
      <img src={`/seasonal/anniversary/${name}.png`} alt="" draggable={false} />
    </picture>
  );
}

export default function AnniversaryStars({ motion, tokens }: SeasonalEffectProps) {
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const update = () => setPaused(document.visibilityState !== "visible");
    update();
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);

  const stars = useMemo(
    () =>
      STAR_POSITIONS.map(([left, top, size, delay, duration], index) => ({
        id: index,
        left,
        top,
        size,
        delay,
        duration,
      })),
    []
  );
  const feathers = useMemo(
    () =>
      FEATHERS.map(([className, left, top, width, rotation]) => ({
        className,
        style: {
          left,
          top,
          width,
          transform: `rotate(${rotation})`,
        } satisfies CSSProperties,
      })),
    []
  );

  return (
    <div
      className="seasonal-effect seasonal-effect--anniversary-stars"
      data-motion={motion}
      data-paused={paused ? "true" : undefined}
      aria-hidden="true"
    >
      <div className="seasonal-anniversary-art">
        <span className="seasonal-anniversary-art__halo" />
        <picture className="seasonal-anniversary-art__title">
          <source
            srcSet="/seasonal/anniversary/happy-anniversary.webp"
            type="image/webp"
          />
          <img
            src="/seasonal/anniversary/happy-anniversary.png"
            alt=""
            draggable={false}
          />
        </picture>
        <span className="seasonal-anniversary-art__stars" />
      </div>
      <Decoration
        name="lace-bow-left"
        className="seasonal-anniversary-decoration--lace-left"
      />
      <Decoration
        name="lace-bow-right"
        className="seasonal-anniversary-decoration--lace-right"
      />
      <Decoration
        name="rose-ribbon"
        className="seasonal-anniversary-decoration--rose"
      />
      <Decoration
        name="golden-stars"
        className="seasonal-anniversary-decoration--stars-left"
      />
      <Decoration
        name="golden-stars"
        className="seasonal-anniversary-decoration--stars-right"
      />
      {feathers.map(({ className, style }) => (
        <Decoration
          key={className}
          name="floating-feathers"
          className={`seasonal-anniversary-decoration--feather ${className}`}
          style={style}
        />
      ))}
      {stars.map((star) => {
        const style: CSSProperties = {
          left: `${star.left}%`,
          top: `${star.top}%`,
          width: star.size,
          height: star.size,
          color: tokens.particle,
        };
        if (motion === "full") {
          style.animationDelay = `${star.delay}s`;
          style.animationDuration = `${star.duration}s`;
        }
        return <span key={star.id} className="seasonal-anniversary-star" style={style} />;
      })}
    </div>
  );
}
