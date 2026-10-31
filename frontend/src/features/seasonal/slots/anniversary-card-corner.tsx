"use client";

import type { SeasonalSlotRendererProps } from "../types";

export default function AnniversaryCardCorner({
  motionLevel,
}: SeasonalSlotRendererProps) {
  return (
    <div
      className="seasonal-anniversary-card"
      data-motion={motionLevel}
      aria-hidden="true"
    >
      <span className="seasonal-anniversary-card__frame" />
      <span className="seasonal-anniversary-card__star" />
    </div>
  );
}
