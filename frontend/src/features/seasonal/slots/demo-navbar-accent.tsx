"use client";

import type { SeasonalSlotRendererProps } from "../types";

export default function DemoNavbarAccent({
  motionLevel,
  tokens,
}: SeasonalSlotRendererProps) {
  return (
    <span className="seasonal-navbar-accent" data-motion={motionLevel} aria-hidden="true">
      <span
        className="seasonal-navbar-accent__dot"
        style={{ backgroundColor: tokens.accent }}
      />
      <span
        className="seasonal-navbar-accent__dot seasonal-navbar-accent__dot--small"
        style={{ backgroundColor: tokens.particle }}
      />
    </span>
  );
}
