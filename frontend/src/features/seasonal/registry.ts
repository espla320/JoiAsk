import {
  SEASONAL_EFFECT_IDS,
  SEASONAL_SLOT_NAMES,
  type SeasonalEffectId,
  type SeasonalManifest,
  type SeasonalSlotName,
} from "./types";

export const DEFAULT_THEME_ID = "none";
export const DEMO_THEME_ID = "demo";

const THEME_ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,63}$/;
const LOCAL_ASSET_PATTERN = /^\/[A-Za-z0-9._~!$&'()*+,;=:@%/-]*$/;

const registry = new Map<string, SeasonalManifest>();

function assertNonEmptyString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`[seasonal] ${field} must be a non-empty string`);
  }
  return value;
}

function assertLocalAsset(value: string, field: string): void {
  if (value.startsWith("//") || !LOCAL_ASSET_PATTERN.test(value)) {
    throw new Error(`[seasonal] ${field} must be a bundled local path`);
  }
}

function assertTokens(tokens: SeasonalManifest["tokens"]): void {
  if (!tokens || typeof tokens !== "object") {
    throw new Error("[seasonal] tokens must be an object");
  }
  for (const key of ["accent", "glow", "particle"] as const) {
    assertNonEmptyString(tokens[key], `tokens.${key}`);
  }
  if (
    typeof tokens.opacity !== "number" ||
    !Number.isFinite(tokens.opacity) ||
    tokens.opacity < 0 ||
    tokens.opacity > 1
  ) {
    throw new Error("[seasonal] tokens.opacity must be a number between 0 and 1");
  }
}

function assertSlotNames(value: unknown): SeasonalSlotName[] {
  if (!Array.isArray(value)) {
    throw new Error("[seasonal] slots must be an array");
  }
  const slots: SeasonalSlotName[] = [];
  for (const slot of value) {
    if (!SEASONAL_SLOT_NAMES.includes(slot as SeasonalSlotName)) {
      throw new Error(`[seasonal] unknown slot: ${String(slot)}`);
    }
    if (!slots.includes(slot as SeasonalSlotName)) slots.push(slot as SeasonalSlotName);
  }
  return slots;
}

function assertEffectIds(value: unknown): SeasonalEffectId[] {
  if (!Array.isArray(value)) {
    throw new Error("[seasonal] effects must be an array");
  }
  const effects: SeasonalEffectId[] = [];
  for (const effect of value) {
    if (!SEASONAL_EFFECT_IDS.includes(effect as SeasonalEffectId)) {
      throw new Error(`[seasonal] unknown effect: ${String(effect)}`);
    }
    if (!effects.includes(effect as SeasonalEffectId)) effects.push(effect as SeasonalEffectId);
  }
  return effects;
}

export function isValidThemeId(themeId: unknown): themeId is string {
  return (
    typeof themeId === "string" &&
    themeId !== DEFAULT_THEME_ID &&
    THEME_ID_PATTERN.test(themeId)
  );
}

/**
 * Registers a pre-built theme. Only explicit, local manifests are accepted; no
 * dynamic imports or remote assets are allowed.
 */
export function registerTheme(manifest: SeasonalManifest): void {
  if (!manifest || typeof manifest !== "object") {
    throw new Error("[seasonal] manifest must be an object");
  }
  if (!isValidThemeId(manifest.id)) {
    throw new Error(`[seasonal] invalid theme id: ${String(manifest.id)}`);
  }
  if (registry.has(manifest.id)) {
    throw new Error(`[seasonal] theme already registered: ${manifest.id}`);
  }
  assertNonEmptyString(manifest.name, "name");
  if (manifest.category !== "season" && manifest.category !== "festival") {
    throw new Error("[seasonal] category must be season or festival");
  }
  assertTokens(manifest.tokens);
  if (manifest.backgroundAsset !== undefined) {
    assertNonEmptyString(manifest.backgroundAsset, "backgroundAsset");
    assertLocalAsset(manifest.backgroundAsset, "backgroundAsset");
  }
  const slots = assertSlotNames(manifest.slots);
  const effects = assertEffectIds(manifest.effects);

  registry.set(
    manifest.id,
    Object.freeze({
      ...manifest,
      tokens: Object.freeze({ ...manifest.tokens }),
      slots: Object.freeze(slots) as SeasonalSlotName[],
      effects: Object.freeze(effects) as SeasonalEffectId[],
    })
  );
}

/** Safe lookup: unknown ids and the "none" sentinel resolve to null. */
export function getTheme(themeId: string | null | undefined): SeasonalManifest | null {
  if (!themeId || themeId === DEFAULT_THEME_ID) return null;
  return registry.get(themeId) ?? null;
}

export function getRegisteredThemeIds(): string[] {
  return [...registry.keys()];
}

// The only built-in theme of this PR. It stays opt-in (preview only); the
// production default is themeId "none".
registerTheme({
  id: DEMO_THEME_ID,
  name: "樱花微光（示例）",
  category: "season",
  tokens: {
    accent: "#c77b97",
    glow: "rgba(199, 123, 151, 0.35)",
    particle: "#efb7cb",
    opacity: 0.45,
  },
  backgroundAsset: "/seasonal/demo-backdrop.svg",
  slots: ["navbar-accent"],
  effects: ["demo-petals"],
});
