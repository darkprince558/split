import assert from "node:assert/strict";
import test from "node:test";
import { createDefaultSettings } from "./drill.ts";
import { readDrillPresets, settingsMatch } from "./drill-presets.ts";

test("a saved drill restores the entire customized setup after serialization", () => {
  const settings = { ...createDefaultSettings(), mode: "timer" as const, timerChoice: "custom" as const, timerCustomSeconds: 75, directions: ["left", "right"] as const, gapMin: 1230, gapMax: 3450, holdMs: 870, sound: false, respond: true, record: false, clipLength: "longer" as const };
  const result = readDrillPresets(JSON.stringify({ version: 1, presets: [{ id: "one", name: "Court warm-up", settings }] }));
  assert.equal(result.length, 1);
  assert.deepEqual(result[0].settings, settings);
});

test("corrupt presets are skipped rather than silently replaced with a default drill", () => {
  const settings = createDefaultSettings();
  const presets = [
    { id: "bad", name: "Invalid", settings: { ...settings, directions: [] } },
    { id: "one", name: "Warm-up", settings },
    { id: "two", name: "warm-UP", settings },
    { id: "one", name: "Duplicate ID", settings },
    { id: "missing", name: "Missing", settings: {} },
  ];
  assert.deepEqual(readDrillPresets(JSON.stringify({ version: 1, presets })).map((preset) => preset.id), ["one"]);
  assert.deepEqual(readDrillPresets("not json"), []);
});

test("matching ignores direction order and detects edited settings", () => {
  const settings = createDefaultSettings();
  assert.ok(settingsMatch(settings, { ...settings, directions: [...settings.directions].reverse() }));
  assert.equal(settingsMatch(settings, { ...settings, sound: !settings.sound }), false);
  assert.equal(settingsMatch(settings, { ...settings, gapMin: settings.gapMin + 10 }), false);
});
