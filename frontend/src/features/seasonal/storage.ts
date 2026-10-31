import {
  DEFAULT_SEASONAL_PREFERENCES,
  normalizePreferences,
} from "./resolve";
import type { SeasonalPreferences } from "./types";

export const SEASONAL_PREFERENCES_KEY = "joiask:seasonal:preferences:v1";

export type PreferenceStorage = Pick<Storage, "getItem" | "setItem">;

export function getSafePreferenceStorage(): PreferenceStorage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    // Storage can be blocked (privacy mode, sandboxed iframe, ...).
    return null;
  }
}

export function parseSeasonalPreferences(raw: string | null | undefined): SeasonalPreferences {
  if (!raw) return { ...DEFAULT_SEASONAL_PREFERENCES };
  try {
    return normalizePreferences(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_SEASONAL_PREFERENCES };
  }
}

export function readSeasonalPreferences(
  storage: PreferenceStorage | null = getSafePreferenceStorage()
): SeasonalPreferences {
  if (!storage) return { ...DEFAULT_SEASONAL_PREFERENCES };
  try {
    return parseSeasonalPreferences(storage.getItem(SEASONAL_PREFERENCES_KEY));
  } catch {
    return { ...DEFAULT_SEASONAL_PREFERENCES };
  }
}

export function writeSeasonalPreferences(
  preferences: SeasonalPreferences,
  storage: PreferenceStorage | null = getSafePreferenceStorage()
): void {
  if (!storage) return;
  try {
    storage.setItem(SEASONAL_PREFERENCES_KEY, JSON.stringify(normalizePreferences(preferences)));
  } catch {
    // Quota exceeded or storage disabled: preferences are best-effort only.
  }
}
