import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  activePreset,
  applyDifficulty,
  burstChanceFor,
  createDefaultSettings,
  describeDifficulty,
  colorsAreReadable,
  directionCueWord,
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
    assert.ok(hard.feintCount > easy.feintCount);
    assert.equal(easy.feintCount, 0);
    assert.equal(feelForLevel(8).feintCount, 3);
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
    assert.equal(next.directions.length, 8);
    assert.equal(next.arrowColor, "black");
    assert.equal(next.backgroundColor, "white");
    assert.equal(next.gapMin, feelForLevel(8).gapMin);
    assert.equal(next.feintCount, feelForLevel(8).feintCount);
    assert.equal(next.respond, false);
    assert.equal(next.record, true);
    assert.equal(activePreset(next), "match");
    assert.equal(activePreset({ ...next, feintCount: 0 }), "custom");
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
      "Choose at least 1 cue.",
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
    assert.equal(
      startBlockReason({ ...settings, arrowColor: "yellow", backgroundColor: "white" })
        ?.message,
      "That arrow is too close to the background.",
    );
    assert.equal(
      startBlockReason({ ...settings, arrowColor: "white", backgroundColor: "white" })
        ?.code,
      "contrast",
    );
    assert.equal(colorsAreReadable("orange", "white"), true);
    assert.equal(colorsAreReadable("black", "yellow"), true);
  });
});

describe("cues", () => {
  it("keeps feints off the previous arrow and off the real one at the end", () => {
    let twos = 0;
    let threes = 0;
    for (let i = 0; i < 400; i += 1) {
      const cue = planCue(
        ["left", "right", "back", "forward", "back-left", "forward-right"],
        100,
        3,
        Math.random,
      );
      assert.ok(cue.feints.length >= 1 && cue.feints.length <= 3);
      assert.notEqual(cue.feints[cue.feints.length - 1], cue.real);
      for (let index = 1; index < cue.feints.length; index += 1) {
        assert.notEqual(cue.feints[index], cue.feints[index - 1]);
      }
      if (cue.feints.length === 2) twos += 1;
      if (cue.feints.length === 3) threes += 1;
    }
    assert.ok(twos > 0);
    assert.ok(threes > 0);

    const planned = planCue(
      ["left", "right", "back", "forward"],
      100,
      3,
      sequence([0, 0, 0.9, 0.3, 0, 0]),
    );
    assert.deepEqual(planned, { real: "left", feints: ["right", "left", "right"] });
  });

  it("skips feints when the count is zero, chance is zero, or only one direction is on", () => {
    const single = planCue(["back"], 100, 3, () => 0);
    assert.equal(single.real, "back");
    assert.deepEqual(single.feints, []);
    const none = planCue(["left", "right"], 0, 3, () => 0);
    assert.deepEqual(none.feints, []);
    const off = planCue(["left", "right"], 100, 0, () => 0);
    assert.deepEqual(off.feints, []);
    const one = planCue(["left", "right", "back"], 100, 1, () => 0);
    assert.equal(one.feints.length, 1);
    assert.notEqual(one.feints[0], one.real);
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
      feints: ["left"],
      fellDuringFake: true,
      rt: 248.4,
    });
    assert.deepEqual(early, { hit: 248, miss: false, feint: true });

    const bitten = scoreLiveAnswer({
      pressed: "left",
      real: "right",
      feints: ["left"],
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
    assert.equal(directionFromKey("q"), "back-left");
    assert.equal(directionFromKey("E"), "back-right");
    assert.equal(directionFromKey("ArrowDown"), "forward");
    assert.equal(directionFromKey("s"), "forward");
    assert.equal(directionFromKey("z"), "forward-left");
    assert.equal(directionFromKey("c"), "forward-right");
    assert.equal(directionFromKey("x"), null);
    assert.equal(directionCueWord("back-left"), "BACK LEFT");
    assert.equal(directionCueWord("forward"), "FORWARD");
    assert.equal(directionCueWord("left"), null);
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
