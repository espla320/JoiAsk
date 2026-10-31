import assert from "node:assert/strict";
import test from "node:test";
import {
  ANNIVERSARY_END_EXCLUSIVE,
  ANNIVERSARY_START,
  getAnniversaryTransition,
  isAnniversaryActive,
} from "../schedule";
import { AnniversaryThemeSource } from "../source";

test("anniversary covers both complete days in China Standard Time", () => {
  assert.equal(isAnniversaryActive(new Date("2026-10-30T15:59:59.999Z")), false);
  assert.equal(isAnniversaryActive(new Date("2026-10-30T16:00:00.000Z")), true);
  assert.equal(isAnniversaryActive(new Date("2026-11-01T15:59:59.999Z")), true);
  assert.equal(isAnniversaryActive(new Date("2026-11-01T16:00:00.000Z")), false);
});

test("reports the next anniversary boundary", () => {
  assert.equal(
    getAnniversaryTransition(new Date("2026-10-01T00:00:00+08:00")),
    ANNIVERSARY_START
  );
  assert.equal(
    getAnniversaryTransition(new Date("2026-10-31T12:00:00+08:00")),
    ANNIVERSARY_END_EXCLUSIVE
  );
  assert.equal(
    getAnniversaryTransition(new Date("2026-11-02T00:00:00+08:00")),
    undefined
  );
});

test("anniversary source returns the scheduled theme and transition", async () => {
  const source = new AnniversaryThemeSource(
    () => new Date("2026-10-31T12:00:00+08:00")
  );
  assert.deepEqual(await source.getSnapshot(), {
    version: 1,
    themeId: "anniversary-2026",
    effectsEnabled: true,
    nextTransitionAt: ANNIVERSARY_END_EXCLUSIVE,
  });
});

test("anniversary source safely falls back to none outside the window", async () => {
  const source = new AnniversaryThemeSource(
    () => new Date("2026-11-02T00:00:00+08:00")
  );
  assert.deepEqual(await source.getSnapshot(), {
    version: 1,
    themeId: "none",
    effectsEnabled: true,
  });
});
