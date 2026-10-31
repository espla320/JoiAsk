"use client";

import type { SeasonalSlotRendererProps } from "../types";

export default function AnniversaryNavbarAccent({
  motionLevel,
}: SeasonalSlotRendererProps) {
  return (
    <span
      className="seasonal-anniversary-navbar"
      data-motion={motionLevel}
      aria-hidden="true"
    >
      <span className="seasonal-anniversary-navbar__star seasonal-anniversary-navbar__star--large" />
      <span className="seasonal-anniversary-navbar__star seasonal-anniversary-navbar__star--small" />
    </span>
  );
}
