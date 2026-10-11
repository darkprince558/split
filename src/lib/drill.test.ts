import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyDifficulty,
  burstChanceFor,
  createDefaultSettings,
  describeDifficulty,
  directionFromKey,
  feelForLevel,
  planCue,
  planGap,
  presetForLevel,
  scoreLiveAnswer,
  scoreTimeout,
  startBlockReason,
  summarize,
} from "./drill.ts";

function sequence(values: number[]) {
  let index = 0;
  return () => {
    const value = values[index] ?? values[values.length - 1] ?? 0;
    index += 1;
    return value;
  };
}

describe("difficulty", () => {
  it("gets tighter as the level rises", () => {
    const easy = feelForLevel(1);
    const hard = feelForLevel(10);
    assert.ok(hard.gapMin < easy.gapMin);
    assert.ok(hard.gapMax < easy.gapMax);
    assert.ok(hard.holdMs < easy.holdMs);
    assert.ok(hard.fakeoutChance > easy.fakeoutChance);
    assert.ok(hard.fakeoutMs < easy.fakeoutMs);
    assert.ok(hard.burstChance > easy.burstChance);
    assert.equal(easy.burstChance, 0);
  });

  it("names presets and marks everything else custom", () => {
    assert.equal(presetForLevel(2), "warmup");
    assert.equal(presetForLevel(5), "club");
    assert.equal(presetForLevel(8), "match");
    assert.equal(presetForLevel(6), "custom");
    assert.match(describeDifficulty(2), /rare feints/i);
  });

  it("writes the feel onto settings without dropping the mode", () => {
    const next = applyDifficulty(createDefaultSettings(), 8);
    assert.equal(next.difficulty, 8);
    assert.equal(next.mode, "reps");
    assert.equal(next.repsChoice, 20);
    assert.deepEqual(next.directions, ["left", "right", "back"]);
    assert.equal(next.gapMin, feelForLevel(8).gapMin);
    assert.ok(burstChanceFor(next) > 0.3);
  });
});

describe("start blocking", () => {
  it("requires a direction and a real rep count", () => {
    const settings = createDefaultSettings();
    assert.equal(startBlockReason(settings), null);
    assert.equal(
      startBlockReason({ ...settings, directions: [] })?.message,
      "Pick at least one direction.",
    );
    assert.equal(
      startBlockReason({ ...settings, repsChoice: "custom", repsCustom: 0 })?.message,
      "Reps must be at least 1.",
    );
    assert.equal(
      startBlockReason({
        ...settings,
        mode: "timer",
        timerChoice: "custom",
        timerCustomSeconds: 0,
      })?.message,
      "Time must be at least 1 second.",
    );
    assert.match(
      startBlockReason({ ...settings, gapMin: 900, gapMax: 400 })?.message ?? "",
      /longer than the maximum/,
    );
  });
});

describe("cues", () => {
  it("never fakes the real direction", () => {
    for (let i = 0; i < 200; i += 1) {
      const cue = planCue(["left", "right", "back"], 100, Math.random);
      assert.notEqual(cue.fake, cue.real);
      assert.ok(cue.fake);
    }
  });

  it("skips feints when only one direction is on or chance is zero", () => {
    const single = planCue(["back"], 100, () => 0);
    assert.equal(single.real, "back");
    assert.equal(single.fake, null);
    const none = planCue(["left", "right"], 0, () => 0);
    assert.equal(none.fake, null);
  });

  it("chains a short gap after a burst starts", () => {
    const opened = planGap({
      gapMin: 1000,
      gapMax: 2000,
      burstChance: 1,
      burstLeft: 0,
      rng: sequence([0, 0, 0.1]),
    });
    assert.equal(opened.gapMs, 1000);
    assert.equal(opened.burstLeft, 1);

    const linked = planGap({
      gapMin: 1000,
      gapMax: 2000,
      burstChance: 1,
      burstLeft: opened.burstLeft,
      rng: sequence([0]),
    });
    assert.ok(linked.gapMs < 200);
    assert.equal(linked.burstLeft, 0);
  });
});

describe("scoring", () => {
  it("times the real arrow and counts a feint without double-counting", () => {
    const early = scoreLiveAnswer({
      pressed: "right",
      real: "right",
      fake: "left",
      fellDuringFake: true,
      rt: 248.4,
    });
    assert.deepEqual(early, { hit: 248, miss: false, feint: true });

    const bitten = scoreLiveAnswer({
      pressed: "left",
      real: "right",
      fake: "left",
      fellDuringFake: false,
      rt: 300,
    });
    assert.deepEqual(bitten, { hit: null, miss: true, feint: true });

    const late = scoreTimeout(true, true);
    assert.deepEqual(late, { miss: true, feint: true });
    assert.deepEqual(scoreTimeout(true, false), { miss: false, feint: false });
  });

  it("maps keys and leaves an empty average when every cue was missed", () => {
    assert.equal(directionFromKey("ArrowLeft"), "left");
    assert.equal(directionFromKey("w"), "back");
    assert.equal(directionFromKey("ArrowDown"), null);
    const summary = summarize({
      hits: [],
      misses: 3,
      feints: 1,
      reps: 3,
      respond: true,
      stoppedEarly: false,
    });
    assert.equal(summary.averageMs, null);
    assert.equal(summary.bestMs, null);
    const timed = summarize({
      hits: [300, 240],
      misses: 1,
      feints: 0,
      reps: 3,
      respond: true,
      stoppedEarly: false,
    });
    assert.equal(timed.averageMs, 270);
    assert.equal(timed.bestMs, 240);
  });
});
