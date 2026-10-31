"use client";

import type { SeasonalSlotRendererProps } from "../types";

export default function AnniversaryFormDecoration({
  motionLevel,
}: SeasonalSlotRendererProps) {
  return (
    <div
      className="seasonal-anniversary-form"
      data-motion={motionLevel}
      aria-hidden="true"
    >
      <span className="seasonal-anniversary-form__wing seasonal-anniversary-form__wing--left" />
      <span className="seasonal-anniversary-form__wing seasonal-anniversary-form__wing--right" />
    </div>
  );
}
