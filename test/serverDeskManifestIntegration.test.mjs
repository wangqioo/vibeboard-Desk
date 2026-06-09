import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("server manifest generation attaches Desk App Manifest metadata", async () => {
  const source = await readFile(new URL("../server.mjs", import.meta.url), "utf8");

  assert.match(source, /buildDeskManifestMetadata/);
  assert.match(source, /const deskMetadata = buildDeskManifestMetadata/);
  assert.match(source, /\.\.\.deskMetadata/);
});

test("server deploy and verify responses include platform plans and verification reports", async () => {
  const source = await readFile(new URL("../server.mjs", import.meta.url), "utf8");

  assert.match(source, /createDeployPlan/);
  assert.match(source, /createRuntimeVerificationReport/);
  assert.match(source, /verificationReport/);
  assert.match(source, /deployPlan/);
});

test("server exposes repair context for evidence-driven AI fixes", async () => {
  const source = await readFile(new URL("../server.mjs", import.meta.url), "utf8");

  assert.match(source, /buildRepairRequest/);
  assert.match(source, /buildRepairMessages/);
  assert.match(source, /\/api\/repair-context/);
  assert.match(source, /normalizeRepairModelOutput/);
  assert.match(source, /repairCurrentBuild/);
  assert.match(source, /\/api\/repair/);
  assert.match(source, /classifyFailure/);
  assert.match(source, /Code repair blocked/);
});
