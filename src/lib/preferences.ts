import {
  DIRECTIONS,
  RANGES,
  SWATCHES,
  createDefaultSettings,
  startBlockReason,
  type Settings,
} from "./drill.ts";

export const PREFERENCES_KEY = "split.settings.v1";

// Stored preferences are untrusted: old or damaged data must never break a drill.
export function readSavedSettings(raw: string | null): Settings | null {
  const defaults = createDefaultSettings();
  if (!raw) return null;
  try {
    const saved = JSON.parse(raw);
    if (
      saved?.version !== 1 ||
      !saved.settings ||
      typeof saved.settings !== "object"
    )
      return null;
    const value = { ...saved.settings, clipLength: saved.settings.clipLength ?? "standard" };
    if (!["standard", "longer"].includes(value.clipLength)) return null;
    const ranges = {
      difficulty: { min: 1, max: 10 },
      timerCustomSeconds: { min: 1, max: 3600 },
      repsCustom: { min: 1, max: 10000 },
      gapMin: RANGES.gapMin,
      gapMax: RANGES.gapMax,
      holdMs: RANGES.holdMs,
      fakeoutChance: RANGES.fakeoutChance,
      fakeoutMs: RANGES.fakeoutMs,
      feintCount: RANGES.feintCount,
    };
    if (
      Object.entries(ranges).some(
        ([key, range]) =>
          !Number.isInteger(value[key]) ||
          value[key] < range.min ||
          value[key] > range.max,
      )
    )
      return null;
    if (!["reps", "timer", "unlimited"].includes(value.mode)) return null;
    if (![30, 60, 120, 300, "custom"].includes(value.timerChoice))
      return null;
    if (![20, 50, 100, 200, "custom"].includes(value.repsChoice))
      return null;
    if (
      ["sound", "respond", "record"].some(
        (key) => typeof value[key] !== "boolean",
      )
    )
      return null;
    if (
      ![value.arrowColor, value.backgroundColor].every((color) =>
        SWATCHES.some((swatch) => swatch.id === color),
      )
    )
      return null;
    if (
      !Array.isArray(value.directions) ||
      !value.directions.every((direction: unknown) =>
        DIRECTIONS.some((item) => item === direction),
      )
    )
      return null;
    const restored = Object.fromEntries(
      Object.keys(defaults).map((key) => [key, value[key]]),
    ) as Settings;
    // Match the visible hundredth-second precision and slider increments.
    for (const key of ["gapMin", "gapMax", "holdMs", "fakeoutMs"] as const) {
      restored[key] = Math.round(restored[key] / 10) * 10;
    }
    restored.directions = [...new Set(restored.directions)];
    return startBlockReason(restored) ? null : restored;
  } catch {
    return null;
  }
}

export function readPreferences(raw: string | null): Settings {
  return readSavedSettings(raw) ?? createDefaultSettings();
}
