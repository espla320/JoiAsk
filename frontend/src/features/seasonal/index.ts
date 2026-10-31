export { SeasonalRoot } from "./seasonal-root";
export { SeasonalScene } from "./seasonal-scene";
export { SeasonalSlot } from "./seasonal-slot";
export { SeasonalProvider, useSeasonal } from "./seasonal-provider";
export type { SeasonalContextValue } from "./seasonal-provider";
export { SeasonalPreferencesControl } from "./seasonal-preferences-control";

export {
  DEFAULT_THEME_ID,
  DEMO_THEME_ID,
  ANNIVERSARY_THEME_ID,
  getRegisteredThemeIds,
  getTheme,
  isValidThemeId,
  registerTheme,
} from "./registry";
export {
  DEFAULT_SEASONAL_PREFERENCES,
  isValidSnapshot,
  normalizePreferences,
  resolveSeasonalState,
  type ResolveSeasonalInput,
} from "./resolve";
export {
  AnniversaryThemeSource,
  DEFAULT_SEASONAL_SNAPSHOT,
  StaticThemeSource,
  defaultSeasonalSource,
} from "./source";
export {
  ANNIVERSARY_END_EXCLUSIVE,
  ANNIVERSARY_START,
  getAnniversaryTransition,
  isAnniversaryActive,
} from "./schedule";
export {
  SEASONAL_PREFERENCES_KEY,
  parseSeasonalPreferences,
  readSeasonalPreferences,
  writeSeasonalPreferences,
  type PreferenceStorage,
} from "./storage";
export type {
  ResolvedSeasonalState,
  SeasonalCategory,
  SeasonalEffectId,
  SeasonalManifest,
  SeasonalMotionLevel,
  SeasonalPreferences,
  SeasonalSlotName,
  SeasonalSlotRendererProps,
  SeasonalSnapshot,
  SeasonalTokens,
  ThemeSource,
} from "./types";
