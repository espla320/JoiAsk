"use client";

import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import { useSeasonal } from "./seasonal-provider";
import type { SeasonalSlotName, SeasonalSlotRendererProps } from "./types";

interface SeasonalSlotProps {
  name: SeasonalSlotName;
}

// Only explicitly registered slot components can be rendered.
const SLOT_REGISTRY: Partial<
  Record<string, Partial<Record<SeasonalSlotName, ComponentType<SeasonalSlotRendererProps>>>>
> = {
  demo: {
    "navbar-accent": dynamic(() => import("./slots/demo-navbar-accent"), {
      ssr: false,
      loading: () => null,
    }),
  },
  "anniversary-2026": {
    "navbar-accent": dynamic(() => import("./slots/anniversary-navbar-accent"), {
      ssr: false,
      loading: () => null,
    }),
    "ask-form-decoration": dynamic(() => import("./slots/anniversary-form-decoration"), {
      ssr: false,
      loading: () => null,
    }),
    "post-card-corner": dynamic(() => import("./slots/anniversary-card-corner"), {
      ssr: false,
      loading: () => null,
    }),
  },
};

export function SeasonalSlot({ name }: SeasonalSlotProps) {
  const { state } = useSeasonal();
  const { manifest, decorationsEnabled, motionLevel } = state;

  if (!manifest || !decorationsEnabled || !manifest.slots.includes(name)) {
    return null;
  }

  const SlotComponent = SLOT_REGISTRY[manifest.id]?.[name];
  if (!SlotComponent) return null;

  return (
    <SlotComponent
      themeId={manifest.id}
      motionLevel={motionLevel}
      tokens={manifest.tokens}
    />
  );
}
