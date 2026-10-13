import { DIRECTIONS, type Direction } from "./drill.ts";

export const DIRECTION_PRESETS_KEY = "split.direction-presets.v1";
export const MAX_DIRECTION_PRESETS = 12;
export type DirectionPreset = { id: string; name: string; directions: Direction[] };

export function readDirectionPresets(raw: string | null): DirectionPreset[] {
  try {
    const saved = JSON.parse(raw ?? "null");
    if (saved?.version !== 1 || !Array.isArray(saved.presets)) return [];
    const ids = new Set<string>();
    const names = new Set<string>();
    return saved.presets.filter((item: DirectionPreset) => {
      if (!item || typeof item.id !== "string" || !item.id || typeof item.name !== "string" || !item.name.trim() || item.name.trim().length > 32 || !Array.isArray(item.directions) || item.directions.length === 0 || !item.directions.every((direction) => DIRECTIONS.includes(direction))) return false;
      const name = item.name.trim().toLocaleLowerCase();
      if (ids.has(item.id) || names.has(name)) return false;
      ids.add(item.id); names.add(name); return true;
    }).slice(0, MAX_DIRECTION_PRESETS).map((item: DirectionPreset) => ({ id: item.id, name: item.name.trim(), directions: DIRECTIONS.filter((direction) => item.directions.includes(direction)) }));
  } catch { return []; }
}

export function presetNameError(name: string, presets: DirectionPreset[]) {
  const trimmed = name.trim();
  if (!trimmed) return "Give this preset a name.";
  if (trimmed.length > 32) return "Use 32 characters or fewer.";
  if (presets.some((item) => item.name.toLocaleLowerCase() === trimmed.toLocaleLowerCase())) return "That name is already saved. Choose another name.";
  if (presets.length >= MAX_DIRECTION_PRESETS) return "You have 12 presets. Remove one to save another.";
  return null;
}
