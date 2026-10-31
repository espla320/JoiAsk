export const ANNIVERSARY_THEME_ID = "anniversary";

// The anniversary lasts for both complete natural days in China Standard Time.
// The exclusive end avoids millisecond-boundary ambiguity.
export const ANNIVERSARY_START = "2026-10-31T00:00:00+08:00";
export const ANNIVERSARY_END_EXCLUSIVE = "2026-11-02T00:00:00+08:00";

const ANNIVERSARY_START_MS = Date.parse(ANNIVERSARY_START);
const ANNIVERSARY_END_MS = Date.parse(ANNIVERSARY_END_EXCLUSIVE);

export function isAnniversaryActive(now: Date | number = new Date()): boolean {
  const timestamp = now instanceof Date ? now.getTime() : now;
  return (
    Number.isFinite(timestamp) &&
    timestamp >= ANNIVERSARY_START_MS &&
    timestamp < ANNIVERSARY_END_MS
  );
}

/**
 * Returns the next date at which this fixed window changes state. There is no
 * transition after the window closes because this is a one-off anniversary.
 */
export function getAnniversaryTransition(now: Date | number = new Date()): string | undefined {
  const timestamp = now instanceof Date ? now.getTime() : now;
  if (!Number.isFinite(timestamp)) return undefined;
  if (timestamp < ANNIVERSARY_START_MS) return ANNIVERSARY_START;
  if (timestamp < ANNIVERSARY_END_MS) return ANNIVERSARY_END_EXCLUSIVE;
  return undefined;
}
