import test from "node:test";
import assert from "node:assert/strict";

import { buildDeskManifestMetadata, mergeProfileMetadata } from "../src/appGeneration/index.mjs";
import { getLinuxDeviceProfile } from "../src/deviceProfiles/index.mjs";

test("buildDeskManifestMetadata creates Desk platform manifest metadata from prompt and profile", () => {
  const metadata = buildDeskManifestMetadata({
    prompt: "做一个通过麦克风控制表情的应用",
    profile: getLinuxDeviceProfile("taishan-black"),
    appName: "Voice Mood"
  });

  assert.equal(metadata.deskApp.schemaVersion, 1);
  assert.equal(metadata.deskApp.deviceId, "taishan-black");
  assert.equal(metadata.deskApp.appName, "voice-mood");
  assert.deepEqual(metadata.deskApp.screen, { width: 480, height: 360 });
  assert.deepEqual(metadata.deskApp.capabilityIds, [
    "mic.browser-rms",
    "screen.kiosk-480x360",
    "status.board-http",
    "hardware-result.python"
  ]);
  assert.equal(metadata.deskApp.allowedWriteSurface, "generated-app-files-only");
  assert.deepEqual(metadata.capabilityIds, metadata.deskApp.capabilityIds);
});

test("buildDeskManifestMetadata falls back to profile capabilities when prompt selects none", () => {
  const metadata = buildDeskManifestMetadata({
    prompt: "做一个天气和设备状态小屏",
    profile: getLinuxDeviceProfile("taishan-gray"),
    appName: "Status Screen"
  });

  assert.deepEqual(metadata.deskApp.capabilityIds, [
    "screen.kiosk-480x360",
    "status.board-http",
    "hardware-result.python"
  ]);
});

test("mergeProfileMetadata keeps runtime board overrides and platform capabilities", () => {
  const profile = mergeProfileMetadata({
    id: "taishan-black",
    targetStatic: "/override/static"
  });

  const metadata = buildDeskManifestMetadata({
    prompt: "做一个麦克风音量条",
    profile,
    appName: "Mic Meter"
  });

  assert.equal(profile.targetStatic, "/override/static");
  assert.deepEqual(metadata.deskApp.screen, { width: 480, height: 360 });
  assert.deepEqual(metadata.deskApp.capabilityIds, [
    "mic.browser-rms",
    "screen.kiosk-480x360",
    "status.board-http",
    "hardware-result.python"
  ]);
});
