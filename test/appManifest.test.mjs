import test from "node:test";
import assert from "node:assert/strict";

import {
  DEFAULT_DESK_APP_FILES,
  DESK_APP_MANIFEST_SCHEMA_VERSION,
  normalizeDeskAppManifest,
  validateDeskAppManifest
} from "../src/appManifest/index.mjs";

function validManifest(overrides = {}) {
  return {
    schemaVersion: DESK_APP_MANIFEST_SCHEMA_VERSION,
    deviceId: "taishan-black",
    appName: " Voice Mood ",
    screen: { width: 480, height: 360 },
    capabilityIds: ["screen.kiosk-480x360", "mic.browser-rms"],
    files: DEFAULT_DESK_APP_FILES,
    runtimeServices: ["chromium-kiosk", "board-http"],
    acceptanceChecks: ["screen serves expected build id"],
    allowedWriteSurface: "generated-app-files-only",
    ...overrides
  };
}

test("normalizeDeskAppManifest returns a normalized valid manifest", () => {
  const manifest = normalizeDeskAppManifest(validManifest({
    appName: " Voice Mood ",
    capabilityIds: ["mic.browser-rms", "screen.kiosk-480x360", "mic.browser-rms"]
  }));

  assert.equal(manifest.schemaVersion, 1);
  assert.equal(manifest.deviceId, "taishan-black");
  assert.equal(manifest.appName, "voice-mood");
  assert.deepEqual(manifest.screen, { width: 480, height: 360 });
  assert.deepEqual(manifest.capabilityIds, ["mic.browser-rms", "screen.kiosk-480x360"]);
  assert.deepEqual(manifest.files, DEFAULT_DESK_APP_FILES);
  assert.deepEqual(manifest.runtimeServices, ["chromium-kiosk", "board-http"]);
  assert.deepEqual(manifest.acceptanceChecks, ["screen serves expected build id"]);
  assert.equal(manifest.allowedWriteSurface, "generated-app-files-only");
});

test("validateDeskAppManifest rejects a missing deviceId", () => {
  assert.throws(
    () => validateDeskAppManifest(validManifest({ deviceId: "" })),
    /deviceId is required/
  );
});

test("validateDeskAppManifest rejects unknown or unsafe file paths", () => {
  assert.throws(
    () => validateDeskAppManifest(validManifest({
      files: [
        ...DEFAULT_DESK_APP_FILES,
        { path: "../secrets.txt", role: "metadata" }
      ]
    })),
    /files may only include/
  );
});

test("validateDeskAppManifest rejects missing required files", () => {
  assert.throws(
    () => validateDeskAppManifest(validManifest({
      files: DEFAULT_DESK_APP_FILES.filter(file => file.path !== "hardware_app.py")
    })),
    /missing required file: hardware_app.py/
  );
});

test("validateDeskAppManifest rejects duplicate capability ids", () => {
  assert.throws(
    () => validateDeskAppManifest(validManifest({
      capabilityIds: ["mic.browser-rms", "mic.browser-rms"]
    })),
    /capabilityIds must be unique/
  );
});

test("validateDeskAppManifest rejects invalid allowedWriteSurface", () => {
  assert.throws(
    () => validateDeskAppManifest(validManifest({
      allowedWriteSurface: "workspace"
    })),
    /allowedWriteSurface must be generated-app-files-only/
  );
});
