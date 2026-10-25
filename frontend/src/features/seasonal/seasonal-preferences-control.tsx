"use client";

import { useEffect, useRef, useState } from "react";
import { Sparkles, X } from "lucide-react";
import { getTheme } from "./registry";
import { useSeasonal } from "./seasonal-provider";
import type { SeasonalMotionLevel } from "./types";

const MOTION_OPTIONS: Array<{ value: SeasonalMotionLevel; label: string }> = [
  { value: "full", label: "完整" },
  { value: "reduced", label: "减少" },
  { value: "off", label: "关闭" },
];

/**
 * Small visitor-facing control. It only appears while a seasonal theme is
 * available, so the default "none" experience is untouched.
 */
export function SeasonalPreferencesControl() {
  const {
    state,
    snapshot,
    preferences,
    previewThemeId,
    setDecorationsEnabled,
    setMotion,
  } = useSeasonal();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  // Keep the control reachable while decorations are disabled but a theme is
  // still available, otherwise the visitor could not turn them back on.
  const availableThemeId = previewThemeId ?? snapshot.themeId;
  const themeAvailable = Boolean(state.manifest) || Boolean(getTheme(availableThemeId));
  if (!themeAvailable) return null;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded text-primary-foreground hover:bg-white/10"
        title="节日装扮设置"
        aria-label="节日装扮设置"
        aria-expanded={open}
      >
        <Sparkles className="h-4 w-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-[1000] mt-2 w-60 rounded border-2 border-dashed border-[var(--fabric-stitch)] bg-card p-3 text-left text-sm text-foreground shadow-lg">
          <div className="mb-2 flex items-center justify-between">
            <span className="font-medium">节日装扮</span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex h-7 w-7 items-center justify-center rounded hover:bg-accent"
              aria-label="关闭设置"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              className="h-4 w-4 accent-[var(--primary)]"
              checked={preferences.decorationsEnabled}
              onChange={(event) => setDecorationsEnabled(event.target.checked)}
            />
            显示装扮
          </label>
          <div className="mt-3">
            <span className="mb-1 block text-xs text-muted-foreground">动画</span>
            <div className="flex gap-1">
              {MOTION_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setMotion(option.value)}
                  disabled={!preferences.decorationsEnabled}
                  aria-pressed={preferences.motion === option.value}
                  className={`flex-1 rounded px-2 py-1 text-xs transition-colors ${
                    preferences.motion === option.value
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-secondary-foreground hover:bg-accent"
                  } disabled:cursor-not-allowed disabled:opacity-50`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
