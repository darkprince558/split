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
