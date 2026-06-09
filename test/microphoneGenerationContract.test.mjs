import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  capabilityPromptSections,
  getCapabilityContract,
  inferCapabilityIdsFromPrompt,
  listCapabilityContracts,
  resolveCapabilityContracts,
  validateCapabilityIds
} from "../src/capabilities/index.mjs";

test("initial capability registry exposes core Linux device platform contracts", () => {
  const ids = listCapabilityContracts().map(contract => contract.id);

  assert.deepEqual(ids, [
    "mic.browser-rms",
    "screen.kiosk-480x360",
    "status.board-http",
    "hardware-result.python"
  ]);
});

test("mic browser RMS capability exposes the board microphone handling contract", () => {
  const contract = getCapabilityContract("mic.browser-rms");
  const prompt = capabilityPromptSections(["mic.browser-rms"]);

  assert.equal(contract.id, "mic.browser-rms");
  assert.match(prompt, /getUserMedia\(\{ audio: true \}\)/);
  assert.match(prompt, /getFloatTimeDomainData\(\)/);
  assert.match(prompt, /first 90 animation frames/);
  assert.match(prompt, /Math\.max\(0\.0045, noiseFloor \* 0\.55\)/);
  assert.match(prompt, /Math\.pow\(adjusted \* 12, 0\.75\) \* 100/);
  assert.match(prompt, /peak > noiseFloor \* 5\.8 \+ startGate/);
  assert.match(prompt, /peak \* 120/);
  assert.match(prompt, /vol >= smoothVolume \? 0\.32 : 0\.12/);
});

test("voice prompts select the mic browser RMS capability", () => {
  assert.deepEqual(inferCapabilityIdsFromPrompt("做一个通过麦克风控制表情的应用"), ["mic.browser-rms"]);
  assert.deepEqual(inferCapabilityIdsFromPrompt("show weather and time"), []);
});

test("non-mic prompts do not select the mic browser RMS capability", () => {
  assert.deepEqual(inferCapabilityIdsFromPrompt("show device status on the 480x360 kiosk screen"), [
    "screen.kiosk-480x360",
    "status.board-http"
  ]);
  assert.deepEqual(inferCapabilityIdsFromPrompt("run python hardware code and show result"), [
    "hardware-result.python"
  ]);
});

test("capability prompt sections ignore unknown ids and deduplicate selected contracts", () => {
  const prompt = capabilityPromptSections([
    "mic.browser-rms",
    "unknown.capability",
    "screen.kiosk-480x360",
    "mic.browser-rms",
    "screen.kiosk-480x360"
  ]);

  assert.equal((prompt.match(/Microphone capability contract/g) || []).length, 1);
  assert.equal((prompt.match(/Screen capability contract/g) || []).length, 1);
  assert.doesNotMatch(prompt, /unknown.capability/);
});

test("capability resolution and validation reject unknown ids predictably", () => {
  const ids = ["status.board-http", "unknown.capability", "status.board-http"];

  assert.deepEqual(resolveCapabilityContracts(ids).map(contract => contract.id), ["status.board-http"]);
  assert.deepEqual(validateCapabilityIds(ids), {
    validIds: ["status.board-http"],
    unknownIds: ["unknown.capability"]
  });
});

test("LLM prompt uses capability contracts instead of hardcoding mic rules in server", async () => {
  const source = await readFile(new URL("../server.mjs", import.meta.url), "utf8");

  assert.match(source, /capabilityPromptSections/);
  assert.doesNotMatch(source, /Microphone and audio requirements/);
});
