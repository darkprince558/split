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
export function readPreferences(raw: string | null): Settings {
  const defaults = createDefaultSettings();
  if (!raw) return defaults;
  try {
    const saved = JSON.parse(raw);
    if (
      saved?.version !== 1 ||
      !saved.settings ||
      typeof saved.settings !== "object"
    )
      return defaults;
    const value = saved.settings;
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
      return defaults;
    if (!["reps", "timer", "unlimited"].includes(value.mode)) return defaults;
    if (![30, 60, 120, 300, "custom"].includes(value.timerChoice))
      return defaults;
    if (![20, 50, 100, 200, "custom"].includes(value.repsChoice))
      return defaults;
    if (
      ["sound", "respond", "record"].some(
        (key) => typeof value[key] !== "boolean",
      )
    )
      return defaults;
    if (
      ![value.arrowColor, value.backgroundColor].every((color) =>
        SWATCHES.some((swatch) => swatch.id === color),
      )
    )
      return defaults;
    if (
      !Array.isArray(value.directions) ||
      !value.directions.every((direction: unknown) =>
        DIRECTIONS.some((item) => item === direction),
      )
    )
      return defaults;
    const restored = Object.fromEntries(
      Object.keys(defaults).map((key) => [key, value[key]]),
    ) as Settings;
    restored.directions = [...new Set(restored.directions)];
    return startBlockReason(restored) ? defaults : restored;
  } catch {
    return defaults;
  }
}
