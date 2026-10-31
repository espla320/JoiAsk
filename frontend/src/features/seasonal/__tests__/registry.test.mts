import assert from "node:assert/strict";
import test from "node:test";
import {
  ANNIVERSARY_THEME_ID,
  DEFAULT_THEME_ID,
  DEMO_THEME_ID,
  getRegisteredThemeIds,
  getTheme,
  isValidThemeId,
  registerTheme,
} from "../registry";
import type { SeasonalManifest } from "../types";

function manifest(id: string): SeasonalManifest {
  return {
    id,
    name: "Test theme",
    category: "season",
    tokens: {
      accent: "#123456",
      glow: "rgba(0, 0, 0, 0.2)",
      particle: "#abcdef",
      opacity: 0.5,
    },
    slots: ["navbar-accent"],
    effects: ["demo-petals"],
  };
}

test("looks up the registered demo theme", () => {
  const demo = getTheme(DEMO_THEME_ID);
  assert.ok(demo);
  assert.equal(demo.id, DEMO_THEME_ID);
  assert.deepEqual(demo.effects, ["demo-petals"]);
  assert.ok(getRegisteredThemeIds().includes(DEMO_THEME_ID));
});

test("looks up the registered anniversary theme", () => {
  const anniversary = getTheme(ANNIVERSARY_THEME_ID);
  assert.ok(anniversary);
  assert.equal(anniversary.name, "2026 周年纪念");
  assert.deepEqual(anniversary.effects, ["anniversary-stars"]);
  assert.ok(anniversary.slots.includes("ask-form-decoration"));
});

test("unknown and sentinel theme ids resolve to null", () => {
  assert.equal(getTheme("does-not-exist"), null);
  assert.equal(getTheme(DEFAULT_THEME_ID), null);
  assert.equal(getTheme(null), null);
  assert.equal(getTheme(undefined), null);
});

test("rejects duplicate, malformed and remote manifests", () => {
  assert.throws(() => registerTheme(manifest(DEMO_THEME_ID)), /already registered/);
  assert.throws(() => registerTheme(manifest("Bad Id")), /invalid theme id/);
  assert.throws(
    () => registerTheme({ ...manifest("remote-background"), backgroundAsset: "https://example.com/bg.svg" }),
    /local path/
  );
  assert.throws(
    () => registerTheme({ ...manifest("unknown-effect"), effects: ["nope"] as never }),
    /unknown effect/
  );
  assert.throws(
    () => registerTheme({ ...manifest("unknown-slot"), slots: ["nope"] as never }),
    /unknown slot/
  );
});

test("accepts a valid explicitly registered manifest", () => {
  registerTheme(manifest("test-theme"));
  assert.ok(getTheme("test-theme"));
  assert.ok(isValidThemeId("test-theme"));
  assert.equal(isValidThemeId("none"), false);
  assert.equal(isValidThemeId("../escape"), false);
});
