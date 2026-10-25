"use client";

import type { ReactNode } from "react";
import { SeasonalProvider } from "./seasonal-provider";
import { SeasonalScene } from "./seasonal-scene";
import type { ThemeSource } from "./types";

interface SeasonalRootProps {
  children: ReactNode;
  source?: ThemeSource;
}

/**
 * Client entry point: one provider and one global scene for the whole site.
 * It renders no wrapper element, so existing layout/sticky behaviour is kept.
 */
export function SeasonalRoot({ children, source }: SeasonalRootProps) {
  return (
    <SeasonalProvider source={source}>
      <SeasonalScene />
      {children}
    </SeasonalProvider>
  );
}
