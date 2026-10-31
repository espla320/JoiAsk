import { getTheme } from "./registry";
import {
  SEASONAL_SNAPSHOT_VERSION,
  type ResolvedSeasonalState,
  type SeasonalMotionLevel,
  type SeasonalPreferences,
  type SeasonalSnapshot,
} from "./types";

export const DEFAULT_SEASONAL_PREFERENCES: SeasonalPreferences = {
  decorationsEnabled: true,
  motion: "full",
};

const NONE_STATE: ResolvedSeasonalState = Object.freeze({
  themeId: "none",
  manifest: null,
  decorationsEnabled: false,
  animationsEnabled: false,
  motionLevel: "off" as SeasonalMotionLevel,
});

/** Coerces arbitrary stored values into safe preferences. */
export function normalizePreferences(value: unknown): SeasonalPreferences {
  if (!value || typeof value !== "object") {
    return { ...DEFAULT_SEASONAL_PREFERENCES };
  }
  const candidate = value as Partial<SeasonalPreferences>;
  const decorationsEnabled =
    typeof candidate.decorationsEnabled === "boolean"
      ? candidate.decorationsEnabled
      : DEFAULT_SEASONAL_PREFERENCES.decorationsEnabled;
  const motion: SeasonalMotionLevel =
    candidate.motion === "full" || candidate.motion === "reduced" || candidate.motion === "off"
      ? candidate.motion
      : DEFAULT_SEASONAL_PREFERENCES.motion;
  return { decorationsEnabled, motion };
}

export function isValidSnapshot(value: unknown): value is SeasonalSnapshot {
  if (!value || typeof value !== "object") return false;
  const snapshot = value as Partial<SeasonalSnapshot>;
  if (snapshot.version !== SEASONAL_SNAPSHOT_VERSION) return false;
  if (
    typeof snapshot.themeId !== "string" ||
    snapshot.themeId.length === 0 ||
    snapshot.themeId.length > 64
  ) {
    return false;
  }
  if (typeof snapshot.effectsEnabled !== "boolean") return false;
  if (
    snapshot.revision !== undefined &&
    (typeof snapshot.revision !== "number" || !Number.isFinite(snapshot.revision))
  ) {
    return false;
  }
  if (
    snapshot.nextTransitionAt !== undefined &&
    (typeof snapshot.nextTransitionAt !== "string" ||
      Number.isNaN(Date.parse(snapshot.nextTransitionAt)))
  ) {
    return false;
  }
  return true;
}

export interface ResolveSeasonalInput {
  snapshot: unknown;
  preferences: unknown;
  systemReducedMotion?: boolean;
}

/**
 * Pure resolution of the effective seasonal state. No browser APIs and no date
 * logic: scheduling belongs to a future scheduler module.
 */
export function resolveSeasonalState({
  snapshot,
  preferences,
  systemReducedMotion = false,
}: ResolveSeasonalInput): ResolvedSeasonalState {
  const prefs = normalizePreferences(preferences);
  if (!prefs.decorationsEnabled) return NONE_STATE;
  if (!isValidSnapshot(snapshot)) return NONE_STATE;

  const manifest = getTheme(snapshot.themeId);
  if (!manifest) return NONE_STATE;

  let motion: SeasonalMotionLevel = prefs.motion;
  if (systemReducedMotion && motion === "full") motion = "reduced";
  if (!snapshot.effectsEnabled) motion = "off";

  return {
    themeId: manifest.id,
    manifest,
    decorationsEnabled: true,
    animationsEnabled: motion !== "off",
    motionLevel: motion,
  };
}
