import {
  EARLY_FALL_THEME_ID,
  LATE_FALL_THEME_ID,
} from "../theme-ids";
import type { SeasonalManifest } from "../types";

const FALL_ASSET_ROOT = "/seasonal/fall";

export const FALL_THEME_IDS = [EARLY_FALL_THEME_ID, LATE_FALL_THEME_ID] as const;
export type FallThemeId = (typeof FALL_THEME_IDS)[number];

interface FallVisualConfig {
  composition: "early" | "late";
  assetRoot: string;
  hero: string;
  wordmark: string;
  ground: string;
  navbarAccent: string;
  formCorner: string;
  cardCorner: string;
  particles: readonly string[];
}

export const FALL_VISUALS: Readonly<Record<FallThemeId, FallVisualConfig>> = {
  [EARLY_FALL_THEME_ID]: {
    composition: "early",
    assetRoot: `${FALL_ASSET_ROOT}/early-fall`,
    hero: "branches/osmanthus-main-branch",
    wordmark: "wordmarks/fall-wordmark",
    ground: "corners/card-corner-bottom-left",
    navbarAccent: "flowers/osmanthus-sprig",
    formCorner: "corners/form-corner-top-right",
    cardCorner: "corners/card-corner-bottom-left",
    particles: [
      "leaves/maple-orange-01",
      "leaves/maple-orange-02",
      "leaves/ginkgo-yellow",
      "leaves/plane-yellow",
      "flowers/osmanthus-flower-05",
      "flowers/osmanthus-flower-08",
    ],
  },
  [LATE_FALL_THEME_ID]: {
    composition: "late",
    assetRoot: `${FALL_ASSET_ROOT}/late-fall`,
    hero: "branches/osmanthus-sparse-branch",
    wordmark: "wordmarks/late-fall-wordmark",
    ground: "corners/card-corner-bottom-right",
    navbarAccent: "leaves/maple-red-07",
    formCorner: "branches/plane-gold-branch",
    cardCorner: "corners/card-corner-bottom-right",
    particles: [
      "leaves/maple-red-01",
      "leaves/maple-red-03",
      "leaves/maple-red-07",
      "leaves/plane-fallen-small",
      "leaves/olive-brown-leaf-01",
      "leaves/olive-brown-leaf-06",
    ],
  },
};

export function getFallVisualConfig(themeId: string): FallVisualConfig | null {
  return FALL_THEME_IDS.includes(themeId as FallThemeId)
    ? FALL_VISUALS[themeId as FallThemeId]
    : null;
}

export const FALL_THEME_MANIFESTS: readonly SeasonalManifest[] = [
  {
    id: EARLY_FALL_THEME_ID,
    name: "早秋桂香",
    category: "season",
    renderer: "fall",
    tokens: {
      accent: "#c98135",
      glow: "rgba(224, 166, 84, 0.28)",
      particle: "#e3a33e",
      opacity: 0.82,
    },
    slots: ["navbar-accent", "ask-form-decoration", "post-card-corner"],
    effects: ["fall-leaves"],
  },
  {
    id: LATE_FALL_THEME_ID,
    name: "晚秋枫影",
    category: "season",
    renderer: "fall",
    tokens: {
      accent: "#a94f31",
      glow: "rgba(177, 92, 52, 0.24)",
      particle: "#bc5c35",
      opacity: 0.86,
    },
    slots: ["navbar-accent", "ask-form-decoration", "post-card-corner"],
    effects: ["fall-leaves"],
  },
];
