"use client";
import { useSyncExternalStore } from "react";
import { DIRECTION_PRESETS_KEY, readDirectionPresets, type DirectionPreset } from "@/lib/direction-presets";
const empty: DirectionPreset[] = [];
let current: DirectionPreset[] | undefined;
const listeners = new Set<() => void>();
function snapshot() {
  if (!current) {
    try { current = readDirectionPresets(localStorage.getItem(DIRECTION_PRESETS_KEY)); }
    catch { current = []; }
  }
  return current;
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  const sync = (event: StorageEvent) => {
    if (event.key !== DIRECTION_PRESETS_KEY && event.key !== null) return;
    current = readDirectionPresets(event.newValue);
    listeners.forEach((notify) => notify());
  };
  window.addEventListener("storage", sync);
  return () => { listeners.delete(listener); window.removeEventListener("storage", sync); };
}
function save(next: DirectionPreset[]) {
  try { localStorage.setItem(DIRECTION_PRESETS_KEY, JSON.stringify({version:1,presets:next})); }
  catch { return false; }
  current = next;
  listeners.forEach((notify) => notify());
  return true;
}
export function useDirectionPresets() {
  return [useSyncExternalStore(subscribe, snapshot, () => empty), save] as const;
}
