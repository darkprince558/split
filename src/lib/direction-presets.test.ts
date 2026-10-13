import { test } from "node:test";
import assert from "node:assert/strict";
import { readDirectionPresets, presetNameError } from "./direction-presets.ts";

test("saved presets restore unique valid directions while rejecting corrupt entries", () => {
  const preset = {id:"one",name:" Back court ",directions:["back-right","back","back","back-left"]};
  const rows = readDirectionPresets(JSON.stringify({ version:1, presets:[preset,{...preset,id:"two"},{id:"bad",name:"No",directions:["invalid"]},null,{id:"empty",name:"empty",directions:[]}] }));
  assert.deepEqual(rows,[{id:"one",name:"Back court",directions:["back","back-left","back-right"]}]);
  assert.deepEqual(readDirectionPresets("{"),[]);
  assert.deepEqual(readDirectionPresets(JSON.stringify({version:2,presets:[preset]})),[]);
});

test("saving never silently overwrites an existing preset", () => {
  const presets = [{id:"one",name:"Back court",directions:["back" as const]}];
  assert.match(presetNameError(" back COURT ",presets) ?? "", /already saved/);
  assert.match(presetNameError(" ",presets) ?? "",/name/);
  assert.equal(presetNameError("Corners",presets),null);
});
