import type { ComponentType } from "react";
import type {
  SeasonalEffectId,
  SeasonalMotionLevel,
  SeasonalTokens,
} from "../types";

export interface SeasonalEffectProps {
  themeId: string;
  motion: SeasonalMotionLevel;
  tokens: SeasonalTokens;
}

export interface SeasonalEffectDefinition {
  id: SeasonalEffectId;
  component: ComponentType<SeasonalEffectProps>;
}
