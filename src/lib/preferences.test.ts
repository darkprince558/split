import { test } from "node:test";
import assert from "node:assert/strict";
import { createDefaultSettings } from "./drill.ts";
import { readPreferences } from "./preferences.ts";

test("restores saved court settings, including camera choice and custom timing", () => {
  const settings = {
    ...createDefaultSettings(),
    record: false,
    gapMin: 750,
    directions: ["left", "right"],
  };
  assert.deepEqual(
    readPreferences(JSON.stringify({ version: 1, settings })),
    settings,
  );
});

test("corrupt, outdated and unsafe preferences fall back to usable defaults", () => {
  const defaults = createDefaultSettings();
  for (const raw of [
    null,
    "{",
    "null",
    JSON.stringify({ version: 2, settings: defaults }),
    ...[
      { directions: [] },
      { directions: ["up"] },
      { gapMin: 5000 },
      { gapMax: 40 },
      { arrowColor: "white" },
      { record: "false" },
      { mode: "other" },
      { feintCount: 4 },
    ].map((change) =>
      JSON.stringify({ version: 1, settings: { ...defaults, ...change } }),
    ),
  ]) {
    assert.deepEqual(readPreferences(raw), defaults);
  }
});


test("both interval handles can reach six seconds and survive a reload", () => {
  const settings = { ...createDefaultSettings(), gapMin: 5990, gapMax: 6000 };
  assert.deepEqual(readPreferences(JSON.stringify({ version: 1, settings })), settings);
});


test("older millisecond timings are aligned with the visible slider precision", () => {
  const settings = { ...createDefaultSettings(), gapMin: 1098, gapMax: 2289, holdMs: 978, fakeoutMs: 198 };
  const result = readPreferences(JSON.stringify({ version: 1, settings }));
  assert.equal(result.gapMin, 1100);
  assert.equal(result.gapMax, 2290);
  assert.equal(result.holdMs, 980);
  assert.equal(result.fakeoutMs, 200);
});
