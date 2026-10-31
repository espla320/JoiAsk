"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { getTheme } from "./registry";
import {
  DEFAULT_SEASONAL_PREFERENCES,
  normalizePreferences,
  resolveSeasonalState,
} from "./resolve";
import { DEFAULT_SEASONAL_SNAPSHOT, defaultSeasonalSource } from "./source";
import { readSeasonalPreferences, writeSeasonalPreferences } from "./storage";
import type {
  ResolvedSeasonalState,
  SeasonalMotionLevel,
  SeasonalPreferences,
  SeasonalSnapshot,
  ThemeSource,
} from "./types";

const PREVIEW_PARAM = "seasonalPreview";

export interface SeasonalContextValue {
  state: ResolvedSeasonalState;
  snapshot: SeasonalSnapshot;
  preferences: SeasonalPreferences;
  systemReducedMotion: boolean;
  previewThemeId: string | null;
  previewAvailable: boolean;
  setDecorationsEnabled: (enabled: boolean) => void;
  setMotion: (motion: SeasonalMotionLevel) => void;
  setPreviewTheme: (themeId: string | null) => void;
  refresh: () => Promise<void>;
}

const SeasonalContext = createContext<SeasonalContextValue | null>(null);

function readPreviewTheme(): string | null {
  if (process.env.NODE_ENV === "production" || typeof window === "undefined") {
    return null;
  }
  try {
    const value = new URLSearchParams(window.location.search).get(PREVIEW_PARAM);
    return value && getTheme(value) ? value : null;
  } catch {
    return null;
  }
}

interface SeasonalProviderProps {
  children: ReactNode;
  source?: ThemeSource;
}

/**
 * The single source of truth for seasonal state. It performs the only
 * localStorage read, the only snapshot fetch and the only root attribute
 * mutation; decoration components just consume the context.
 */
export function SeasonalProvider({ children, source = defaultSeasonalSource }: SeasonalProviderProps) {
  const [preferences, setPreferencesState] = useState<SeasonalPreferences>({
    ...DEFAULT_SEASONAL_PREFERENCES,
  });
  const [snapshot, setSnapshot] = useState<SeasonalSnapshot>(DEFAULT_SEASONAL_SNAPSHOT);
  const [systemReducedMotion, setSystemReducedMotion] = useState(false);
  const [previewThemeId, setPreviewThemeIdState] = useState<string | null>(null);

  // Browser-only state is restored after hydration so the first client render
  // matches the statically exported HTML (theme "none").
  useEffect(() => {
    setPreferencesState(readSeasonalPreferences());
    setPreviewThemeIdState(readPreviewTheme());

    if (typeof window.matchMedia !== "function") return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    setSystemReducedMotion(media.matches);
    const handleChange = (event: MediaQueryListEvent) => setSystemReducedMotion(event.matches);
    media.addEventListener?.("change", handleChange);
    return () => media.removeEventListener?.("change", handleChange);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const next = await source.getSnapshot();
      setSnapshot(next);
    } catch (error) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("[seasonal] failed to load snapshot", error);
      }
    }
  }, [source]);

  useEffect(() => {
    const controller = new AbortController();
    source
      .getSnapshot(controller.signal)
      .then((next) => {
        if (!controller.signal.aborted) setSnapshot(next);
      })
      .catch((error) => {
        if (!controller.signal.aborted && process.env.NODE_ENV !== "production") {
          console.warn("[seasonal] failed to load snapshot", error);
        }
      });
    return () => controller.abort();
  }, [source]);

  // Refresh exactly after a scheduled boundary so an open page can leave the
  // anniversary window at midnight without a reload.
  useEffect(() => {
    if (!snapshot.nextTransitionAt) return;
    const delay = Date.parse(snapshot.nextTransitionAt) - Date.now();
    if (!Number.isFinite(delay)) return;
    const timer = window.setTimeout(() => {
      void refresh();
    }, Math.max(50, delay + 50));
    return () => window.clearTimeout(timer);
  }, [snapshot.nextTransitionAt, refresh]);

  const effectiveSnapshot = useMemo<SeasonalSnapshot>(
    () => (previewThemeId ? { ...snapshot, themeId: previewThemeId } : snapshot),
    [snapshot, previewThemeId]
  );

  const state = useMemo(
    () =>
      resolveSeasonalState({
        snapshot: effectiveSnapshot,
        preferences,
        systemReducedMotion,
      }),
    [effectiveSnapshot, preferences, systemReducedMotion]
  );

  useEffect(() => {
    const root = document.documentElement;
    if (state.manifest) {
      root.dataset.seasonalTheme = state.themeId;
      root.dataset.seasonalMotion = state.motionLevel;
    } else {
      delete root.dataset.seasonalTheme;
      delete root.dataset.seasonalMotion;
    }
    return () => {
      delete root.dataset.seasonalTheme;
      delete root.dataset.seasonalMotion;
    };
  }, [state.manifest, state.motionLevel, state.themeId]);

  const setDecorationsEnabled = useCallback(
    (enabled: boolean) => {
      setPreferencesState((current) => {
        const next = normalizePreferences({ ...current, decorationsEnabled: enabled });
        writeSeasonalPreferences(next);
        return next;
      });
    },
    []
  );

  const setMotion = useCallback((motion: SeasonalMotionLevel) => {
    setPreferencesState((current) => {
      const next = normalizePreferences({ ...current, motion });
      writeSeasonalPreferences(next);
      return next;
    });
  }, []);

  const setPreviewTheme = useCallback((themeId: string | null) => {
    if (process.env.NODE_ENV === "production") return;
    const next = themeId && getTheme(themeId) ? themeId : null;
    setPreviewThemeIdState(next);
    try {
      const url = new URL(window.location.href);
      if (next) url.searchParams.set(PREVIEW_PARAM, next);
      else url.searchParams.delete(PREVIEW_PARAM);
      window.history.replaceState(window.history.state, "", url);
    } catch {
      // URL rewriting is a convenience only.
    }
  }, []);

  const value = useMemo<SeasonalContextValue>(
    () => ({
      state,
      snapshot,
      preferences,
      systemReducedMotion,
      previewThemeId,
      previewAvailable: process.env.NODE_ENV !== "production",
      setDecorationsEnabled,
      setMotion,
      setPreviewTheme,
      refresh,
      // Keep a single reference so decoration components do not re-render
      // unless the resolved state or the preferences actually change.
    }),
    [
      state,
      snapshot,
      preferences,
      systemReducedMotion,
      previewThemeId,
      setDecorationsEnabled,
      setMotion,
      setPreviewTheme,
      refresh,
    ]
  );

  return <SeasonalContext.Provider value={value}>{children}</SeasonalContext.Provider>;
}

export function useSeasonal(): SeasonalContextValue {
  const value = useContext(SeasonalContext);
  if (!value) {
    throw new Error("useSeasonal must be used within a SeasonalProvider");
  }
  return value;
}
