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
