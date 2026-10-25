import {
  SEASONAL_SNAPSHOT_VERSION,
  type SeasonalSnapshot,
  type ThemeSource,
} from "./types";

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

export const defaultSeasonalSource: ThemeSource = new StaticThemeSource();
