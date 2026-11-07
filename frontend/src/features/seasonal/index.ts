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
  SeasonalCalendarSource,
  StaticThemeSource,
  defaultSeasonalSource,
} from "./source";
export {
  ANNIVERSARY_END_EXCLUSIVE,
  ANNIVERSARY_SCHEDULE,
  ANNIVERSARY_START,
  EARLY_FALL_THEME_ID,
  LATE_FALL_THEME_ID,
  SEASONAL_SCHEDULES,
} from "./schedule";
export {
  resolveSeasonalSchedule,
  type ResolvedSchedule,
  type SeasonalScheduleWindow,
} from "./schedule-resolver";
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
  SeasonalRendererId,
  SeasonalSlotName,
  SeasonalSlotRendererProps,
  SeasonalSnapshot,
  SeasonalTokens,
  ThemeSource,
} from "./types";
