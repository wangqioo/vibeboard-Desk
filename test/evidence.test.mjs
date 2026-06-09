import test from "node:test";
import assert from "node:assert/strict";

import {
  EVIDENCE_STATUS,
  createVerificationReport,
  normalizeEvidenceItem,
  summarizeVerificationReport
} from "../src/evidence/index.mjs";

const expectedBuildId = "vb-mpyabc12-a1b2c3";

function completeEvidence(overrides = []) {
  return [
    { key: "static.buildId", value: expectedBuildId },
    { key: "boardStatus", value: { hostname: "taishan", services: ["desk"] } },
    {
      key: "hardwareResult",
      value: { build_id: expectedBuildId, runtime: "executed_on_board" }
    },
    {
      key: "kioskProcess",
      value: {
        present: true,
        user: "lckfb",
        args: "chromium --kiosk --window-size=480,360 --use-fake-ui-for-media-stream"
      }
    },
    { key: "capability.screen.kiosk-480x360", value: { viewport: "480x360" } },
    { key: "capability.status.board-http", value: { reachable: true } },
    { key: "capability.hardware-result.python", value: { runtime: "executed_on_board" } },
    ...overrides
  ];
}

test("normalizeEvidenceItem keeps generic evidence fields stable", () => {
  const item = normalizeEvidenceItem({
    key: " static.buildId ",
    status: "success",
    value: expectedBuildId,
    required: false,
    label: " Static Build Id ",
    source: "golden-loop"
  });

  assert.deepEqual(item, {
    key: "static.buildId",
    label: "Static Build Id",
    status: EVIDENCE_STATUS.SUCCESS,
    value: expectedBuildId,
    required: false,
    source: "golden-loop"
  });
});

test("createVerificationReport returns success when required device evidence matches", () => {
  const report = createVerificationReport({
    expectedBuildId,
    deviceId: "taishan-black",
    capabilityIds: [
      "screen.kiosk-480x360",
      "status.board-http",
      "hardware-result.python"
    ],
    evidence: completeEvidence()
  });

  assert.equal(report.status, "success");
  assert.equal(report.deviceId, "taishan-black");
  assert.equal(report.expectedBuildId, expectedBuildId);
  assert.deepEqual(report.capabilityIds, [
    "screen.kiosk-480x360",
    "status.board-http",
    "hardware-result.python"
  ]);
  assert.equal(report.failedChecks.length, 0);
  assert.equal(report.checks.every(check => check.ok), true);
});

test("createVerificationReport returns failure when static build id mismatches", () => {
  const report = createVerificationReport({
    expectedBuildId,
    deviceId: "taishan-black",
    capabilityIds: ["screen.kiosk-480x360"],
    evidence: completeEvidence([{ key: "static.buildId", value: "vb-wrong-a1b2c3" }])
  });

  assert.equal(report.status, "failure");
  assert.equal(report.failedChecks.length, 1);
  assert.equal(report.failedChecks[0].id, "static-build-id");
  assert.match(report.failedChecks[0].evidence, /vb-wrong-a1b2c3/);
});

test("createVerificationReport returns partial success when optional capability evidence is missing", () => {
  const report = createVerificationReport({
    expectedBuildId,
    deviceId: "taishan-black",
    capabilityIds: ["screen.kiosk-480x360", "mic.browser-rms"],
    evidence: completeEvidence()
  });

  assert.equal(report.status, "partial_success");
  assert.equal(report.failedChecks.length, 1);
  assert.equal(report.failedChecks[0].id, "capability:mic.browser-rms");
  assert.equal(report.failedChecks[0].severity, "optional");
});

test("summarizeVerificationReport includes failed checks", () => {
  const report = createVerificationReport({
    expectedBuildId,
    deviceId: "taishan-black",
    capabilityIds: ["screen.kiosk-480x360", "mic.browser-rms"],
    evidence: completeEvidence([{ key: "static.buildId", value: "vb-wrong-a1b2c3" }])
  });

  const summary = summarizeVerificationReport(report);

  assert.match(summary, /failure/);
  assert.match(summary, /static build id matches/);
  assert.match(summary, /capability evidence present: mic.browser-rms/);
});
