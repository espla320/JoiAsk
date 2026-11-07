import assert from "node:assert/strict";
import test from "node:test";
import {
  ANNIVERSARY_SCHEDULE,
  EARLY_FALL_THEME_ID,
  LATE_FALL_THEME_ID,
  SEASONAL_SCHEDULES,
} from "../schedule";
import {
  resolveSeasonalSchedule,
  type SeasonalScheduleWindow,
} from "../schedule-resolver";
import { AnniversaryThemeSource, SeasonalCalendarSource } from "../source";

test("anniversary covers both complete days in China Standard Time", () => {
  const resolve = (date: string) =>
    resolveSeasonalSchedule([ANNIVERSARY_SCHEDULE], new Date(date)).themeId;
  assert.equal(resolve("2026-10-30T15:59:59.999Z"), null);
  assert.equal(resolve("2026-10-30T16:00:00.000Z"), "anniversary-2026");
  assert.equal(resolve("2026-11-01T15:59:59.999Z"), "anniversary-2026");
  assert.equal(resolve("2026-11-01T16:00:00.000Z"), null);
});

test("reports the next anniversary boundary", () => {
  assert.equal(
    resolveSeasonalSchedule(
      [ANNIVERSARY_SCHEDULE],
      new Date("2026-10-01T00:00:00+08:00")
    ).nextTransitionAt,
    "2026-10-30T16:00:00.000Z"
  );
  assert.equal(
    resolveSeasonalSchedule(
      [ANNIVERSARY_SCHEDULE],
      new Date("2026-10-31T12:00:00+08:00")
    ).nextTransitionAt,
    "2026-11-01T16:00:00.000Z"
  );
  assert.equal(
    resolveSeasonalSchedule(
      [ANNIVERSARY_SCHEDULE],
      new Date("2026-11-02T00:00:00+08:00")
    ).nextTransitionAt,
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
    nextTransitionAt: "2026-11-01T16:00:00.000Z",
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

test("fall schedule switches from early to late fall in China Standard Time", () => {
  assert.equal(
    resolveSeasonalSchedule(
      SEASONAL_SCHEDULES,
      new Date("2026-08-31T23:59:59+08:00")
    ).themeId,
    null
  );
  assert.equal(
    resolveSeasonalSchedule(
      SEASONAL_SCHEDULES,
      new Date("2026-09-01T00:00:00+08:00")
    ).themeId,
    EARLY_FALL_THEME_ID
  );
  assert.equal(
    resolveSeasonalSchedule(
      SEASONAL_SCHEDULES,
      new Date("2026-10-14T23:59:59+08:00")
    ).themeId,
    EARLY_FALL_THEME_ID
  );
  assert.equal(
    resolveSeasonalSchedule(
      SEASONAL_SCHEDULES,
      new Date("2026-10-15T00:00:00+08:00")
    ).themeId,
    LATE_FALL_THEME_ID
  );
  assert.equal(
    resolveSeasonalSchedule(
      SEASONAL_SCHEDULES,
      new Date("2026-12-01T00:00:00+08:00")
    ).themeId,
    null
  );
});

test("fall schedule reports annual boundaries", () => {
  assert.equal(
    resolveSeasonalSchedule(
      SEASONAL_SCHEDULES,
      new Date("2026-08-01T00:00:00+08:00")
    ).nextTransitionAt,
    "2026-08-31T16:00:00.000Z"
  );
  assert.equal(
    resolveSeasonalSchedule(
      SEASONAL_SCHEDULES,
      new Date("2026-09-15T00:00:00+08:00")
    ).nextTransitionAt,
    "2026-10-14T16:00:00.000Z"
  );
  assert.equal(
    resolveSeasonalSchedule(
      SEASONAL_SCHEDULES,
      new Date("2026-11-07T00:00:00+08:00")
    ).nextTransitionAt,
    "2026-11-30T16:00:00.000Z"
  );
});

test("generic resolver supports priority and cross-year annual themes", () => {
  const schedules: SeasonalScheduleWindow[] = [
    {
      kind: "annual",
      themeId: "winter",
      start: [12, 15],
      end: [2, 15],
      priority: 10,
    },
    {
      kind: "fixed",
      themeId: "new-year",
      start: "2027-01-01T00:00:00+08:00",
      end: "2027-01-02T00:00:00+08:00",
      priority: 100,
    },
  ];
  assert.deepEqual(
    resolveSeasonalSchedule(schedules, new Date("2026-12-20T12:00:00+08:00")),
    { themeId: "winter", nextTransitionAt: "2026-12-31T16:00:00.000Z" }
  );
  assert.equal(
    resolveSeasonalSchedule(schedules, new Date("2027-01-01T12:00:00+08:00")).themeId,
    "new-year"
  );
  assert.equal(
    resolveSeasonalSchedule(schedules, new Date("2027-01-02T12:00:00+08:00")).themeId,
    "winter"
  );
});

test("calendar source gives anniversary priority, then resumes late fall", async () => {
  const duringAnniversary = new SeasonalCalendarSource(
    () => new Date("2026-10-31T12:00:00+08:00")
  );
  assert.deepEqual(await duringAnniversary.getSnapshot(), {
    version: 1,
    themeId: "anniversary-2026",
    effectsEnabled: true,
    nextTransitionAt: "2026-11-01T16:00:00.000Z",
  });

  const afterAnniversary = new SeasonalCalendarSource(
    () => new Date("2026-11-07T12:00:00+08:00")
  );
  assert.deepEqual(await afterAnniversary.getSnapshot(), {
    version: 1,
    themeId: LATE_FALL_THEME_ID,
    effectsEnabled: true,
    nextTransitionAt: "2026-11-30T16:00:00.000Z",
  });
});
