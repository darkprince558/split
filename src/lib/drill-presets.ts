import { type Settings, resolvedReps, resolvedTimerSeconds } from "./drill.ts";
import { readSavedSettings } from "./preferences.ts";
import { presetNameError } from "./direction-presets.ts";

export const DRILL_PRESETS_KEY = "split.drill-presets.v1";
export type DrillPreset = { id: string; name: string; settings: Settings };

export function readDrillPresets(raw: string | null): DrillPreset[] {
  try {
    const saved = JSON.parse(raw ?? "null");
    if (saved?.version !== 1 || !Array.isArray(saved.presets)) return [];
    const presets: DrillPreset[] = [];
    for (const item of saved.presets) {
      if (!item || typeof item.id !== "string" || !item.id || typeof item.name !== "string" || presets.some((preset) => preset.id === item.id) || presetNameError(item.name, presets)) continue;
      const settings = readSavedSettings(JSON.stringify({ version: 1, settings: item.settings }));
      if (settings) presets.push({ id: item.id, name: item.name.trim(), settings });
    }
    return presets;
  } catch { return []; }
}

export function settingsMatch(a: Settings, b: Settings): boolean {
  return Object.keys(a).every((key) => {
    if (key === "directions") return a.directions.length === b.directions.length && a.directions.every((direction) => b.directions.includes(direction));
    return a[key as keyof Settings] === b[key as keyof Settings];
  });
}

export function drillPresetSummary(settings: Settings) {
  const length = settings.mode === "reps" ? `${resolvedReps(settings)} cues` : settings.mode === "timer" ? `${resolvedTimerSeconds(settings)}s` : "Open session";
  return `Level ${settings.difficulty} · ${length} · ${settings.directions.length} directions`;
}
