"use client";

import type { SeasonalSlotRendererProps } from "../types";
import { getFallVisualConfig } from "../themes/fall";

export default function FallFormDecoration({
  themeId,
  motionLevel,
}: SeasonalSlotRendererProps) {
  const visual = getFallVisualConfig(themeId);
  if (!visual) return null;
  const src = `${visual.assetRoot}/${visual.formCorner}`;

  return (
    <picture
      className="seasonal-fall-form"
      data-theme={themeId}
      data-composition={visual.composition}
      data-motion={motionLevel}
    >
      <source srcSet={`${src}.webp`} type="image/webp" />
      <img src={`${src}.png`} alt="" draggable={false} />
    </picture>
  );
}
