import {
  SEASONAL_SNAPSHOT_VERSION,
  type SeasonalSnapshot,
  type ThemeSource,
} from "./types";
import {
  ANNIVERSARY_SCHEDULE,
  SEASONAL_SCHEDULES,
} from "./schedule";
import { resolveSeasonalSchedule } from "./schedule-resolver";

export const DEFAULT_SEASONAL_SNAPSHOT: SeasonalSnapshot = Object.freeze({
  version: SEASONAL_SNAPSHOT_VERSION,
  themeId: "none",
  effectsEnabled: true,
});

/**
 * Default, backend-free source. A future HttpThemeSource only needs to
 * implement ThemeSource; the provider does not change.
 */
export class StaticThemeSource implements ThemeSource {
  private readonly snapshot: SeasonalSnapshot;

  constructor(snapshot: SeasonalSnapshot = DEFAULT_SEASONAL_SNAPSHOT) {
    this.snapshot = { ...snapshot };
  }

  async getSnapshot(): Promise<SeasonalSnapshot> {
    return { ...this.snapshot };
  }
}

/**
 * Date-driven source for the one-off anniversary. It keeps scheduling out of
 * the resolver and returns the safe "none" theme outside the configured window.
 */
export class AnniversaryThemeSource implements ThemeSource {
  constructor(private readonly now: () => Date = () => new Date()) {}

  async getSnapshot(): Promise<SeasonalSnapshot> {
    const resolved = resolveSeasonalSchedule([ANNIVERSARY_SCHEDULE], this.now());
    const snapshot: SeasonalSnapshot = {
      version: SEASONAL_SNAPSHOT_VERSION,
      themeId: resolved.themeId ?? "none",
      effectsEnabled: true,
    };
    if (resolved.nextTransitionAt) snapshot.nextTransitionAt = resolved.nextTransitionAt;
    return snapshot;
  }
}

/**
 * Default calendar source. The one-off anniversary temporarily takes priority
 * over the annual fall theme, then late fall resumes after the festival ends.
 */
export class SeasonalCalendarSource implements ThemeSource {
  constructor(private readonly now: () => Date = () => new Date()) {}

  async getSnapshot(): Promise<SeasonalSnapshot> {
    const resolved = resolveSeasonalSchedule(SEASONAL_SCHEDULES, this.now());
    const snapshot: SeasonalSnapshot = {
      version: SEASONAL_SNAPSHOT_VERSION,
      themeId: resolved.themeId ?? "none",
      effectsEnabled: true,
    };
    if (resolved.nextTransitionAt) snapshot.nextTransitionAt = resolved.nextTransitionAt;
    return snapshot;
  }
}

export const defaultSeasonalSource: ThemeSource = new SeasonalCalendarSource();
