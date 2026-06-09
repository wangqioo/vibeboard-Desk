import test from "node:test";
import assert from "node:assert/strict";

import {
  createRuntimeVerificationReport,
  evidenceFromGoldenLoop
} from "../src/runtimeEvidence.mjs";

const buildId = "vb-runtime-a1b2c3";

test("evidenceFromGoldenLoop maps golden-loop raw sections into platform evidence", () => {
  const evidence = evidenceFromGoldenLoop({
    raw: {
      static_index_id: buildId,
      status: JSON.stringify({ hostname: "taishan", services: { display: "active" } }),
      program: JSON.stringify({ build_id: buildId, runtime: "executed_on_board" }),
      kiosk: "1234 chromium --window-size=480,360 --force-device-scale-factor=1",
      geometry: "Width: 480\nHeight: 360"
    },
    kioskUser: "linaro"
  });

  assert.deepEqual(evidence.map(item => item.key), [
    "static.buildId",
    "boardStatus",
    "hardwareResult",
    "kioskProcess",
    "capability.mic.browser-rms",
    "capability.screen.kiosk-480x360",
    "capability.status.board-http",
    "capability.hardware-result.python"
  ]);
});

test("createRuntimeVerificationReport returns a platform report from golden-loop result", () => {
  const report = createRuntimeVerificationReport({
    expectedBuildId: buildId,
    deviceId: "taishan-gray",
    kioskUser: "linaro",
    capabilityIds: [
      "mic.browser-rms",
      "screen.kiosk-480x360",
      "status.board-http",
      "hardware-result.python"
    ],
    goldenLoop: {
      raw: {
        static_index_id: buildId,
        status: JSON.stringify({ hostname: "taishan", services: { display: "active" } }),
        program: JSON.stringify({
          build_id: buildId,
          runtime: "executed_on_board",
          microphone_active: true,
          volume_monitor: "enabled"
        }),
        kiosk: "1234 chromium --window-size=480,360 --force-device-scale-factor=1",
        geometry: "Width: 480\nHeight: 360"
      }
    }
  });

  assert.equal(report.status, "success");
  assert.equal(report.deviceId, "taishan-gray");
  assert.equal(report.expectedBuildId, buildId);
  assert.deepEqual(report.failedChecks, []);
});

test("createRuntimeVerificationReport maps board microphone runtime into mic capability evidence", () => {
  const report = createRuntimeVerificationReport({
    expectedBuildId: buildId,
    deviceId: "taishan-black",
    kioskUser: "lckfb",
    capabilityIds: [
      "mic.browser-rms",
      "screen.kiosk-480x360",
      "status.board-http",
      "hardware-result.python"
    ],
    goldenLoop: {
      raw: {
        static_index_id: buildId,
        status: JSON.stringify({ hostname: "taishan-black", services: { display: "active" } }),
        program: JSON.stringify({
          build_id: buildId,
          runtime: "executed_on_board",
          microphone_active: true,
          volume_monitor: "enabled"
        }),
        kiosk: "1234 chromium --window-size=480,360 --force-device-scale-factor=1",
        geometry: "Width: 480\nHeight: 360"
      }
    }
  });

  assert.equal(report.status, "success");
  assert.equal(report.failedChecks.length, 0);
});

test("createRuntimeVerificationReport accepts static build id evidence with a source path prefix", () => {
  const report = createRuntimeVerificationReport({
    expectedBuildId: buildId,
    deviceId: "taishan-black",
    kioskUser: "lckfb",
    capabilityIds: [
      "screen.kiosk-480x360",
      "status.board-http",
      "hardware-result.python"
    ],
    goldenLoop: {
      raw: {
        static_index_id: `/home/lckfb/workspace/taishan-screen/static/index.html:${buildId}`,
        status: JSON.stringify({ hostname: "taishan-black", services: { display: "active" } }),
        program: JSON.stringify({ build_id: buildId, runtime: "executed_on_board" }),
        kiosk: "1234 chromium --window-size=480,360 --force-device-scale-factor=1",
        geometry: "Width: 480\nHeight: 360"
      }
    }
  });

  assert.equal(report.status, "success");
  assert.equal(report.failedChecks.length, 0);
});
