import {
  ANNIVERSARY_THEME_ID,
  EARLY_FALL_THEME_ID,
  LATE_FALL_THEME_ID,
} from "./theme-ids";
import type { SeasonalScheduleWindow } from "./schedule-resolver";

export {
  ANNIVERSARY_THEME_ID,
  EARLY_FALL_THEME_ID,
  LATE_FALL_THEME_ID,
} from "./theme-ids";

export const ANNIVERSARY_START = "2026-10-31T00:00:00+08:00";
export const ANNIVERSARY_END_EXCLUSIVE = "2026-11-02T00:00:00+08:00";

export const ANNIVERSARY_SCHEDULE: SeasonalScheduleWindow = {
  kind: "fixed",
  themeId: ANNIVERSARY_THEME_ID,
  start: ANNIVERSARY_START,
  end: ANNIVERSARY_END_EXCLUSIVE,
  priority: 100,
};

/** Higher priority wins when windows overlap. Annual dates use China time. */
export const SEASONAL_SCHEDULES: readonly SeasonalScheduleWindow[] = [
  {
    kind: "annual",
    themeId: EARLY_FALL_THEME_ID,
    start: [9, 1],
    end: [10, 15],
    priority: 10,
  },
  {
    kind: "annual",
    themeId: LATE_FALL_THEME_ID,
    start: [10, 15],
    end: [12, 1],
    priority: 10,
  },
  ANNIVERSARY_SCHEDULE,
];
