import {
  SEASONAL_SNAPSHOT_VERSION,
  type SeasonalSnapshot,
  type ThemeSource,
} from "./types";
import {
  ANNIVERSARY_THEME_ID,
  getAnniversaryTransition,
  isAnniversaryActive,
} from "./schedule";

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
    const current = this.now();
    const timestamp = current.getTime();
    const snapshot: SeasonalSnapshot = {
      version: SEASONAL_SNAPSHOT_VERSION,
      themeId: isAnniversaryActive(timestamp) ? ANNIVERSARY_THEME_ID : "none",
      effectsEnabled: true,
    };
    const nextTransitionAt = getAnniversaryTransition(timestamp);
    if (nextTransitionAt) snapshot.nextTransitionAt = nextTransitionAt;
    return snapshot;
  }
}

export const defaultSeasonalSource: ThemeSource = new AnniversaryThemeSource();
