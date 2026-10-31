import assert from "node:assert/strict";
import test from "node:test";
import { DEMO_THEME_ID } from "../registry";
import {
  DEFAULT_SEASONAL_PREFERENCES,
  isValidSnapshot,
  normalizePreferences,
  resolveSeasonalState,
} from "../resolve";

const snapshot = {
  version: 1 as const,
  themeId: DEMO_THEME_ID,
  effectsEnabled: true,
};

test("resolves a registered theme with full animation", () => {
  const state = resolveSeasonalState({
    snapshot,
    preferences: { decorationsEnabled: true, motion: "full" },
  });
  assert.equal(state.themeId, DEMO_THEME_ID);
  assert.ok(state.manifest);
  assert.equal(state.animationsEnabled, true);
  assert.equal(state.motionLevel, "full");
});

test("falls back to none for unknown themes or invalid snapshots", () => {
  for (const invalid of [
    null,
    undefined,
    {},
    { ...snapshot, version: 2 },
    { ...snapshot, themeId: "unknown-theme" },
    { ...snapshot, themeId: 42 },
    { ...snapshot, effectsEnabled: "yes" },
    { ...snapshot, nextTransitionAt: "not-a-date" },
  ]) {
    const state = resolveSeasonalState({ snapshot: invalid, preferences: DEFAULT_SEASONAL_PREFERENCES });
    assert.equal(state.themeId, "none");
    assert.equal(state.manifest, null);
    assert.equal(state.animationsEnabled, false);
    assert.equal(state.motionLevel, "off");
  }
});

test("disabled decorations render no theme at all", () => {
  const state = resolveSeasonalState({
    snapshot,
    preferences: { decorationsEnabled: false, motion: "full" },
  });
  assert.equal(state.themeId, "none");
  assert.equal(state.manifest, null);
  assert.equal(state.animationsEnabled, false);
});

test("motion off keeps static decorations", () => {
  const state = resolveSeasonalState({
    snapshot,
    preferences: { decorationsEnabled: true, motion: "off" },
  });
  assert.equal(state.themeId, DEMO_THEME_ID);
  assert.ok(state.manifest);
  assert.equal(state.animationsEnabled, false);
  assert.equal(state.motionLevel, "off");
});

test("system reduced motion downgrades full motion", () => {
  const state = resolveSeasonalState({
    snapshot,
    preferences: { decorationsEnabled: true, motion: "full" },
    systemReducedMotion: true,
  });
  assert.equal(state.motionLevel, "reduced");
  assert.equal(state.animationsEnabled, true);
});

test("snapshot effectsEnabled=false disables animations", () => {
  const state = resolveSeasonalState({
    snapshot: { ...snapshot, effectsEnabled: false },
    preferences: { decorationsEnabled: true, motion: "full" },
  });
  assert.equal(state.themeId, DEMO_THEME_ID);
  assert.equal(state.animationsEnabled, false);
  assert.equal(state.motionLevel, "off");
});

test("normalizes preferences and validates snapshots", () => {
  assert.deepEqual(normalizePreferences(null), DEFAULT_SEASONAL_PREFERENCES);
  assert.deepEqual(normalizePreferences({ decorationsEnabled: "no", motion: "wild" }), {
    decorationsEnabled: true,
    motion: "full",
  });
  assert.deepEqual(normalizePreferences({ decorationsEnabled: false, motion: "reduced" }), {
    decorationsEnabled: false,
    motion: "reduced",
  });

  assert.equal(isValidSnapshot(snapshot), true);
  assert.equal(isValidSnapshot({ ...snapshot, revision: 3 }), true);
  assert.equal(isValidSnapshot({ ...snapshot, revision: "3" }), false);
  assert.equal(isValidSnapshot({ ...snapshot, themeId: "" }), false);
});
