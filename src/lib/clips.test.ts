import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { clipFilename, clipsCsv } from "./drill.ts";
import { recordingSessions } from "./clips.ts";
import { crc32, createZip } from "./zip.ts";

describe("clip names", () => {
  it("includes the index, the real direction, and feints when they happened", () => {
    assert.equal(clipFilename(3, "left", ["right", "back"]), "03-left-feints-right-back.webm");
    assert.equal(clipFilename(3, "left", []), "03-left.webm");
    assert.equal(
      clipFilename(12, "back-left", ["forward"]),
      "12-back-left-feints-forward.webm",
    );
  });

  it("writes a csv of clip, real direction, and feints", () => {
    const csv = clipsCsv([
      { filename: "03-left-feints-right-back.webm", direction: "left", feints: ["right", "back"], realCueMs: 398.4 },
      { filename: "04-forward.webm", direction: "forward", feints: [] },
    ]);
    assert.equal(
      csv,
      "clip,real,feints,real_cue_seconds\n03-left-feints-right-back.webm,Left,Right; Back,0.398\n04-forward.webm,Forward,,\n",
    );
  });
});

describe("session zip", () => {
  it("packs a stored zip the browser can download", async () => {
    const zip = createZip([
      { name: "clips.csv", data: new TextEncoder().encode("clip,real,feints\n") },
      { name: "01-left.webm", data: Uint8Array.from([1, 2, 3, 4]) },
    ]);
    const bytes = new Uint8Array(await zip.arrayBuffer());
    assert.equal(String.fromCharCode(bytes[0], bytes[1]), "PK");
    assert.equal(crc32(Uint8Array.from([1, 2, 3, 4])), 3057449933);
  });
});


describe("recording library", () => {
  it("groups all sessions newest first, without mixing clips", () => {
    assert.deepEqual(recordingSessions([
      { sessionId: "older", createdAt: 100 },
      { sessionId: "newer", createdAt: 500 },
      { sessionId: "older", createdAt: 200 },
      { sessionId: "newer", createdAt: 400 },
    ]), [
      { id: "newer", createdAt: 400, count: 2 },
      { id: "older", createdAt: 100, count: 2 },
    ]);
    assert.deepEqual(recordingSessions([]), []);
  });

  it("uses the actual video format for exported filenames", () => {
    assert.equal(clipFilename(1, "left", [], "video/mp4;codecs=avc1"), "01-left.mp4");
    assert.equal(clipFilename(2, "right", ["left"], "video/webm;codecs=vp8"), "02-right-feints-left.webm");
  });
});
