"use client";

import { useSyncExternalStore } from "react";
import { PREFERENCES_KEY, readPreferences } from "@/lib/preferences";
import { createDefaultSettings, type Settings } from "@/lib/drill";

const defaults = createDefaultSettings();
let current: Settings | undefined;
const listeners = new Set<() => void>();
const serverSnapshot = () => defaults;

function getSnapshot() {
  if (!current) {
    try {
      current = readPreferences(localStorage.getItem(PREFERENCES_KEY));
    } catch {
      current = createDefaultSettings();
    }
  }
  return current;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const sync = (event: StorageEvent) => {
    if (event.key !== PREFERENCES_KEY && event.key !== null) return;
    current = readPreferences(event.newValue);
    listeners.forEach((notify) => notify());
  };
  window.addEventListener("storage", sync);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", sync);
  };
}

function changeSettings(next: Settings) {
  // Keep in-progress edits (including invalid input) so the UI can explain how to fix them.
  current = next;
  try {
    localStorage.setItem(
      PREFERENCES_KEY,
      JSON.stringify({ version: 1, settings: next }),
    );
  } catch {
    /* Retain settings for this visit if storage is unavailable. */
  }
  listeners.forEach((notify) => notify());
}

export function useSettings() {
  const settings = useSyncExternalStore(subscribe, getSnapshot, serverSnapshot);
  return [settings, changeSettings] as const;
}
