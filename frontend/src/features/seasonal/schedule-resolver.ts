const CHINA_STANDARD_TIME_OFFSET_MS = 8 * 60 * 60 * 1000;

interface AnnualScheduleWindow {
  kind: "annual";
  themeId: string;
  start: readonly [month: number, day: number];
  end: readonly [month: number, day: number];
  priority: number;
}

interface FixedScheduleWindow {
  kind: "fixed";
  themeId: string;
  start: string;
  end: string;
  priority: number;
}

export type SeasonalScheduleWindow = AnnualScheduleWindow | FixedScheduleWindow;

interface ScheduleOccurrence {
  themeId: string;
  start: number;
  end: number;
  priority: number;
}

export interface ResolvedSchedule {
  themeId: string | null;
  nextTransitionAt?: string;
}

function chinaTimestamp(year: number, [month, day]: readonly [number, number]): number {
  return Date.UTC(year, month - 1, day) - CHINA_STANDARD_TIME_OFFSET_MS;
}

function isCrossYear(window: AnnualScheduleWindow): boolean {
  const [startMonth, startDay] = window.start;
  const [endMonth, endDay] = window.end;
  return endMonth < startMonth || (endMonth === startMonth && endDay <= startDay);
}

function getOccurrences(
  window: SeasonalScheduleWindow,
  chinaYear: number
): ScheduleOccurrence[] {
  if (window.kind === "fixed") {
    return [{ ...window, start: Date.parse(window.start), end: Date.parse(window.end) }];
  }

  // Adjacent years cover cross-year themes such as December through February.
  return [chinaYear - 1, chinaYear, chinaYear + 1].map((startYear) => ({
    themeId: window.themeId,
    start: chinaTimestamp(startYear, window.start),
    end: chinaTimestamp(startYear + (isCrossYear(window) ? 1 : 0), window.end),
    priority: window.priority,
  }));
}

export function resolveSeasonalSchedule(
  schedules: readonly SeasonalScheduleWindow[],
  now: Date | number = new Date()
): ResolvedSchedule {
  const timestamp = now instanceof Date ? now.getTime() : now;
  if (!Number.isFinite(timestamp)) return { themeId: null };

  const chinaYear = new Date(
    timestamp + CHINA_STANDARD_TIME_OFFSET_MS
  ).getUTCFullYear();
  const occurrences = schedules.flatMap((window) => getOccurrences(window, chinaYear));
  const active = occurrences
    .filter(({ start, end }) => timestamp >= start && timestamp < end)
    .sort((a, b) => b.priority - a.priority || b.start - a.start)[0];
  const nextBoundary = occurrences
    .flatMap(({ start, end }) => [start, end])
    .filter((boundary) => Number.isFinite(boundary) && boundary > timestamp)
    .sort((a, b) => a - b)[0];

  return {
    themeId: active?.themeId ?? null,
    ...(nextBoundary === undefined
      ? {}
      : { nextTransitionAt: new Date(nextBoundary).toISOString() }),
  };
}
