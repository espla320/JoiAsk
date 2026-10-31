import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_SEASONAL_PREFERENCES } from "../resolve";
import {
  SEASONAL_PREFERENCES_KEY,
  parseSeasonalPreferences,
  readSeasonalPreferences,
  writeSeasonalPreferences,
  type PreferenceStorage,
} from "../storage";

function memoryStorage(initial: Record<string, string> = {}): PreferenceStorage & {
  values: Record<string, string>;
} {
  const values = { ...initial };
  return {
    values,
    getItem(key: string) {
      return key in values ? values[key] : null;
    },
    setItem(key: string, value: string) {
      values[key] = value;
    },
  };
}

test("uses defaults for missing or malformed values", () => {
  assert.deepEqual(parseSeasonalPreferences(null), DEFAULT_SEASONAL_PREFERENCES);
  assert.deepEqual(parseSeasonalPreferences(""), DEFAULT_SEASONAL_PREFERENCES);
  assert.deepEqual(parseSeasonalPreferences("{not json"), DEFAULT_SEASONAL_PREFERENCES);
  assert.deepEqual(parseSeasonalPreferences("null"), DEFAULT_SEASONAL_PREFERENCES);
  assert.deepEqual(parseSeasonalPreferences('{"decorationsEnabled":"nope","motion":"x"}'), DEFAULT_SEASONAL_PREFERENCES);
});

test("reads validated preferences from storage", () => {
  const storage = memoryStorage({
    [SEASONAL_PREFERENCES_KEY]: JSON.stringify({ decorationsEnabled: false, motion: "reduced" }),
  });
  assert.deepEqual(readSeasonalPreferences(storage), {
    decorationsEnabled: false,
    motion: "reduced",
  });
});

test("falls back to defaults when storage is unavailable or throws", () => {
  assert.deepEqual(readSeasonalPreferences(null), DEFAULT_SEASONAL_PREFERENCES);
  const throwing: PreferenceStorage = {
    getItem() {
      throw new Error("blocked");
    },
    setItem() {
      throw new Error("blocked");
    },
  };
  assert.deepEqual(readSeasonalPreferences(throwing), DEFAULT_SEASONAL_PREFERENCES);
  assert.doesNotThrow(() => writeSeasonalPreferences(DEFAULT_SEASONAL_PREFERENCES, throwing));
});

test("writes normalized preferences and round-trips them", () => {
  const storage = memoryStorage();
  writeSeasonalPreferences({ decorationsEnabled: false, motion: "off" }, storage);
  assert.deepEqual(readSeasonalPreferences(storage), {
    decorationsEnabled: false,
    motion: "off",
  });
  // Invalid values are normalized on write as well.
  writeSeasonalPreferences({ decorationsEnabled: true, motion: "wild" } as never, storage);
  assert.deepEqual(readSeasonalPreferences(storage), DEFAULT_SEASONAL_PREFERENCES);
});
