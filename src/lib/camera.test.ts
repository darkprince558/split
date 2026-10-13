import { test } from "node:test";
import assert from "node:assert/strict";
import { CueCamera } from "./camera.ts";

// A deferred permission response reproduces the timeout/cancel race without accessing a real camera.
test("closing during a pending permission request stops a stream that arrives later", async (context) => {
  const oldNavigator = Object.getOwnPropertyDescriptor(globalThis, "navigator");
  const oldRecorder = Object.getOwnPropertyDescriptor(
    globalThis,
    "MediaRecorder",
  );
  context.after(() => {
    if (oldNavigator)
      Object.defineProperty(globalThis, "navigator", oldNavigator);
    if (oldRecorder)
      Object.defineProperty(globalThis, "MediaRecorder", oldRecorder);
    else Reflect.deleteProperty(globalThis, "MediaRecorder");
  });
  let finish: (stream: MediaStream) => void = () => {};
  const permission = new Promise<MediaStream>((resolve) => {
    finish = resolve;
  });
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: { mediaDevices: { getUserMedia: () => permission } },
  });
  Object.defineProperty(globalThis, "MediaRecorder", {
    configurable: true,
    value: class {},
  });
  let stopped = 0;
  const stream = {
    getTracks: () => [
      {
        stop: () => {
          stopped += 1;
        },
      },
    ],
  } as unknown as MediaStream;
  const camera = new CueCamera();
  const opening = camera.open();
  camera.close();
  finish(stream);
  assert.equal(await opening, false);
  assert.equal(stopped, 1);
  assert.equal(camera.active, false);
});

import { CueRecording } from "./camera.ts";
import type { TestContext } from "node:test";

function recorderFixture(context: TestContext) {
  const old = Object.getOwnPropertyDescriptor(globalThis, "MediaRecorder");
  context.after(() => old ? Object.defineProperty(globalThis, "MediaRecorder", old) : Reflect.deleteProperty(globalThis, "MediaRecorder"));
  let now = 0;
  context.mock.method(performance, "now", () => now);
  context.mock.timers.enable({ apis: ["setTimeout"] });
  class Recorder {
    static isTypeSupported() { return true; }
    state = "inactive";
    mimeType = "video/webm";
    ondataavailable: (event: { data: Blob }) => void = () => {};
    onstop = () => {};
    onerror = () => {};
    start() { this.state = "recording"; }
    pause() { this.state = "paused"; }
    resume() { this.state = "recording"; }
    stop() {
      this.state = "inactive";
      this.ondataavailable({ data: new Blob(["test video"]) });
      this.onstop();
    }
  }
  Object.defineProperty(globalThis, "MediaRecorder", { configurable: true, value: Recorder });
  return { stream: {} as MediaStream, advance(ms: number) { now += ms; context.mock.timers.tick(ms); } };
}

test("cue markers and reaction tails exclude pause time", async (context) => {
  const { stream, advance } = recorderFixture(context);
  const clip = new CueRecording(stream, () => {});
  advance(200);
  clip.pause();
  advance(3000);
  clip.resume();
  advance(100);
  clip.markRealCue();
  advance(450);
  let complete = false;
  const finished = clip.finish().then((value) => { complete = true; return value; });
  advance(749);
  await Promise.resolve();
  assert.equal(complete, false);
  advance(1);
  const result = await finished;
  assert.equal(result?.realCueMs, 300);
  assert.equal(result?.durationMs, 1500);
  assert.ok(result?.blob.size);
});

test("overlapping reaction tails keep each clip and marker independent", async (context) => {
  const { stream, advance } = recorderFixture(context);
  const first = new CueRecording(stream, () => {});
  first.markRealCue();
  advance(450);
  const a = first.finish();
  const second = new CueRecording(stream, () => {});
  advance(70);
  second.markRealCue();
  const b = second.finish();
  advance(680);
  assert.equal((await a)?.durationMs, 1200);
  advance(520);
  assert.equal((await b)?.realCueMs, 70);
});

test("ending paused or discarding an unfinished feint saves immediately without resuming", async (context) => {
  const { stream, advance } = recorderFixture(context);
  const paused = new CueRecording(stream, () => {});
  paused.markRealCue();
  advance(200);
  paused.pause();
  advance(5000);
  assert.equal((await paused.finish())?.durationMs, 200);
  const discarded = new CueRecording(stream, () => {});
  advance(50);
  assert.equal((await discarded.finish(false))?.realCueMs, undefined);
});

test("closing a pending tail resolves the save and cancels its timer", async (context) => {
  const { stream, advance } = recorderFixture(context);
  let completions = 0;
  const clip = new CueRecording(stream, () => { completions++; });
  clip.markRealCue();
  advance(100);
  const result = clip.finish();
  clip.abort();
  assert.equal((await result)?.durationMs, 100);
  advance(5000);
  assert.equal(completions, 1);
});

test("longer clips retain three seconds after the real cue without changing its marker", async (context) => {
  const { stream, advance } = recorderFixture(context);
  const clip = new CueRecording(stream, () => {}, 3000);
  advance(200);
  clip.markRealCue();
  const result = clip.finish();
  advance(3000);
  const saved = await result;
  assert.equal(saved?.realCueMs, 200);
  assert.equal(saved?.durationMs, 3200);
});

test("camera selection requests the exact device and releases it on close", async (context) => {
  const oldNavigator = Object.getOwnPropertyDescriptor(globalThis, "navigator");
  context.after(() => { if (oldNavigator) Object.defineProperty(globalThis,"navigator",oldNavigator); });
  recorderFixture(context);
  let constraints: MediaStreamConstraints | undefined;
  let stopped = false;
  const stream = {getVideoTracks:()=>[{readyState:"live"}],getTracks:()=>[{stop:()=>{stopped=true;}}]} as unknown as MediaStream;
  Object.defineProperty(globalThis,"navigator",{configurable:true,value:{mediaDevices:{getUserMedia:async (value: MediaStreamConstraints)=>{constraints=value;return stream;}}}});
  const camera = new CueCamera();
  assert.equal(await camera.open("external-camera"),true);
  assert.deepEqual(constraints,{video:{deviceId:{exact:"external-camera"}},audio:false});
  assert.equal(camera.previewStream,stream);
  assert.equal(camera.active,true);
  camera.close();
  assert.equal(stopped,true);
  assert.equal(camera.active,false);
});
