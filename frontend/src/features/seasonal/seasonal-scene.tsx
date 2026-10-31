"use client";

import type { ComponentType } from "react";
import { getSeasonalEffectComponent } from "./effects/effect-registry";
import type { SeasonalEffectProps } from "./effects/effect-types";
import { useSeasonal } from "./seasonal-provider";

/**
 * The single global decoration layer. It is fixed, non-interactive and painted
 * behind page content, so it cannot cover the navbar, cards or dialogs.
 */
export function SeasonalScene() {
  const { state } = useSeasonal();
  const { manifest, motionLevel } = state;
  if (!manifest) return null;

  // Effects may keep a static version when motion is off; each renderer owns
  // that decision so the global scene can retain non-animated decorations.
  const effects = manifest.effects
    .map((effectId) => getSeasonalEffectComponent(effectId))
    .filter((component): component is ComponentType<SeasonalEffectProps> => component !== null);

  return (
    <div
      className="seasonal-scene"
      data-theme={manifest.id}
      data-motion={motionLevel}
      aria-hidden="true"
    >
      {manifest.backgroundAsset ? (
        <div
          className="seasonal-scene__backdrop"
          style={{
            backgroundImage: `url(${manifest.backgroundAsset})`,
            opacity: manifest.tokens.opacity,
          }}
        />
      ) : null}
      {effects.map((Effect, index) => (
        <Effect
          key={`${manifest.id}-${index}`}
          motion={motionLevel}
          tokens={manifest.tokens}
        />
      ))}
    </div>
  );
}
