export const SEASONAL_SNAPSHOT_VERSION = 1 as const;

export type SeasonalCategory = "season" | "festival";

export const SEASONAL_SLOT_NAMES = [
  "navbar-accent",
  "post-card-corner",
  "submit-success",
] as const;

export type SeasonalSlotName = (typeof SEASONAL_SLOT_NAMES)[number];

export const SEASONAL_EFFECT_IDS = ["demo-petals"] as const;

export type SeasonalEffectId = (typeof SEASONAL_EFFECT_IDS)[number];

export type SeasonalMotionLevel = "full" | "reduced" | "off";

/**
 * Theme state handed to the runtime by an external source (static for now, an
 * API-backed source later). `themeId` is untrusted input and must always be
 * validated against the registry.
 */
export interface SeasonalSnapshot {
  version: typeof SEASONAL_SNAPSHOT_VERSION;
  themeId: string;
  effectsEnabled: boolean;
  revision?: number;
  nextTransitionAt?: string;
}

/** Only seasonal visual parameters live here; never core site theme tokens. */
export interface SeasonalTokens {
  accent: string;
  glow: string;
  particle: string;
  opacity: number;
}

export interface SeasonalManifest {
  id: string;
  name: string;
  category: SeasonalCategory;
  tokens: SeasonalTokens;
  /** Optional, must be a bundled local path (for example /seasonal/bg.svg). */
  backgroundAsset?: string;
  slots: SeasonalSlotName[];
  effects: SeasonalEffectId[];
}

export interface SeasonalPreferences {
  decorationsEnabled: boolean;
  motion: SeasonalMotionLevel;
}

export interface ResolvedSeasonalState {
  themeId: string;
  manifest: SeasonalManifest | null;
  decorationsEnabled: boolean;
  animationsEnabled: boolean;
  motionLevel: SeasonalMotionLevel;
}

export interface SeasonalSlotRendererProps {
  themeId: string;
  motionLevel: SeasonalMotionLevel;
  tokens: SeasonalTokens;
}

export interface ThemeSource {
  getSnapshot(signal?: AbortSignal): Promise<SeasonalSnapshot>;
}
