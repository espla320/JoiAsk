import type { ComponentType } from "react";
import type {
  SeasonalEffectId,
  SeasonalMotionLevel,
  SeasonalTokens,
} from "../types";

export interface SeasonalEffectProps {
  motion: Exclude<SeasonalMotionLevel, "off">;
  tokens: SeasonalTokens;
}

export interface SeasonalEffectDefinition {
  id: SeasonalEffectId;
  component: ComponentType<SeasonalEffectProps>;
}
