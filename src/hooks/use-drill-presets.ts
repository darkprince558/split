"use client";
import { useSyncExternalStore } from "react";
import { DRILL_PRESETS_KEY, readDrillPresets, type DrillPreset } from "@/lib/drill-presets";
const empty: DrillPreset[] = [];
let current: DrillPreset[] | undefined;
const listeners = new Set<() => void>();
function snapshot() {
  if (!current) {
    try { current = readDrillPresets(localStorage.getItem(DRILL_PRESETS_KEY)); }
    catch { current = []; }
  }
  return current;
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  const sync = (event: StorageEvent) => {
    if (event.key !== DRILL_PRESETS_KEY && event.key !== null) return;
    current = readDrillPresets(event.newValue);
    listeners.forEach((notify) => notify());
  };
  window.addEventListener("storage", sync);
  return () => { listeners.delete(listener); window.removeEventListener("storage", sync); };
}
function save(next: DrillPreset[]) {
  try { localStorage.setItem(DRILL_PRESETS_KEY, JSON.stringify({version:1,presets:next})); }
  catch { return false; }
  current = next;
  listeners.forEach((notify) => notify());
  return true;
}
export function useDrillPresets() {
  return [useSyncExternalStore(subscribe, snapshot, () => empty), save] as const;
}
