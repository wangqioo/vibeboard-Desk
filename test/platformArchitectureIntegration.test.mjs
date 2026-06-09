import test from "node:test";
import assert from "node:assert/strict";

import {
  DEFAULT_DESK_APP_FILES,
  DESK_APP_MANIFEST_SCHEMA_VERSION,
  validateDeskAppManifest
} from "../src/appManifest/index.mjs";
import { validateCapabilityIds } from "../src/capabilities/index.mjs";
import {
  deviceCapabilityIds,
  getLinuxDeviceProfile,
  listLinuxDeviceProfiles
} from "../src/deviceProfiles/index.mjs";
import {
  createDeployPlan,
  validateDeployPlan
} from "../src/deployPlans/index.mjs";
import { createVerificationReport } from "../src/evidence/index.mjs";

test("Linux device profiles only reference registered capability contracts", () => {
  for (const profile of listLinuxDeviceProfiles()) {
    const result = validateCapabilityIds(deviceCapabilityIds(profile));

    assert.deepEqual(result.unknownIds, [], `${profile.id} has unknown capability ids`);
  }
});

test("Desk App Manifest accepts capability ids declared by a Linux device profile", () => {
  for (const profile of listLinuxDeviceProfiles()) {
    const manifest = validateDeskAppManifest({
      schemaVersion: DESK_APP_MANIFEST_SCHEMA_VERSION,
      deviceId: profile.id,
      appName: `${profile.id}-acceptance`,
      screen: profile.display,
      capabilityIds: deviceCapabilityIds(profile),
      files: DEFAULT_DESK_APP_FILES,
      runtimeServices: ["chromium-kiosk", "board-http", "python-probe"],
      acceptanceChecks: ["screen serves the expected build id"],
      allowedWriteSurface: "generated-app-files-only"
    });

    assert.equal(manifest.deviceId, profile.id);
    assert.deepEqual(manifest.capabilityIds, deviceCapabilityIds(profile));
  }
});

test("Linux device profile and Desk App Manifest feed deploy plan and verification report", () => {
  const profile = getLinuxDeviceProfile("taishan-black");
  const buildId = "vb-platform-001";
  const manifest = validateDeskAppManifest({
    schemaVersion: DESK_APP_MANIFEST_SCHEMA_VERSION,
    deviceId: profile.id,
    appName: "voice-mood",
    screen: profile.display,
    capabilityIds: deviceCapabilityIds(profile),
    files: DEFAULT_DESK_APP_FILES,
    runtimeServices: ["chromium-kiosk", "board-http", "python-probe"],
    acceptanceChecks: ["screen serves the expected build id"],
    allowedWriteSurface: "generated-app-files-only"
  });

  const deployPlan = createDeployPlan({
    profile,
    manifest,
    buildId,
    timestamp: "2026-06-10T09:00:00.000Z"
  });

  assert.equal(validateDeployPlan(deployPlan).ok, true);
  assert.equal(deployPlan.kioskLaunch.user, "lckfb");
  assert.equal(deployPlan.staticPath, "/home/lckfb/workspace/taishan-screen/static");

  const report = createVerificationReport({
    expectedBuildId: buildId,
    deviceId: profile.id,
    capabilityIds: manifest.capabilityIds,
    evidence: [
      { key: "static.buildId", value: buildId },
      { key: "boardStatus", value: { hostname: "taishan-black", reachable: true } },
      { key: "hardwareResult", value: { build_id: buildId, runtime: "executed_on_board" } },
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
      { key: "capability.mic.browser-rms", value: { rms: 0.022, gate: 0.0045 } }
    ]
  });

  assert.equal(report.status, "success");
  assert.equal(report.failedChecks.length, 0);
});
