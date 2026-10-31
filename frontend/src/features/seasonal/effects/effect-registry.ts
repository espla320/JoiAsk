"use client";

import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import { SEASONAL_EFFECT_IDS, type SeasonalEffectId } from "../types";
import type { SeasonalEffectProps } from "./effect-types";

// Keep effect bundles out of the initial chunk; they load only when mounted.
const DemoPetals = dynamic(() => import("./demo-petals"), {
  ssr: false,
  loading: () => null,
});

const AnniversaryStars = dynamic(() => import("./anniversary-stars"), {
  ssr: false,
  loading: () => null,
});

const EFFECT_COMPONENTS: Record<SeasonalEffectId, ComponentType<SeasonalEffectProps>> = {
  "demo-petals": DemoPetals,
  "anniversary-stars": AnniversaryStars,
};

export function isSeasonalEffectId(value: unknown): value is SeasonalEffectId {
  return (
    typeof value === "string" &&
    (SEASONAL_EFFECT_IDS as readonly string[]).includes(value)
  );
}

export function getSeasonalEffectComponent(
  effectId: string
): ComponentType<SeasonalEffectProps> | null {
  if (!isSeasonalEffectId(effectId)) return null;
  return EFFECT_COMPONENTS[effectId] ?? null;
}
