import test from "node:test";
import assert from "node:assert/strict";

import {
  deviceCapabilityIds,
  getLinuxDeviceProfile,
  listLinuxDeviceProfiles,
  publicLinuxDeviceProfile,
  resolveLinuxDeviceProfile
} from "../src/deviceProfiles/index.mjs";

test("listLinuxDeviceProfiles exposes the initial Taishan Linux devices", () => {
  const profiles = listLinuxDeviceProfiles();

  assert.deepEqual(profiles.map(profile => profile.id), [
    "taishan-transparent",
    "taishan-gray",
    "taishan-black"
  ]);
  assert.deepEqual(profiles.map(profile => profile.display), [
    { width: 480, height: 360 },
    { width: 480, height: 360 },
    { width: 480, height: 360 }
  ]);
});

test("resolveLinuxDeviceProfile accepts deviceId or boardId and falls back safely", () => {
  assert.equal(resolveLinuxDeviceProfile({ deviceId: "taishan-black" }).id, "taishan-black");
  assert.equal(resolveLinuxDeviceProfile({ boardId: "taishan-transparent" }).id, "taishan-transparent");
  assert.equal(resolveLinuxDeviceProfile({ deviceId: "unknown" }, "taishan-black").id, "taishan-black");
  assert.equal(resolveLinuxDeviceProfile({}, "unknown").id, "taishan-gray");
});

test("publicLinuxDeviceProfile hides internal runtime environment details", () => {
  const profile = getLinuxDeviceProfile("taishan-black");
  const publicProfile = publicLinuxDeviceProfile(profile);

  assert.equal(publicProfile.id, "taishan-black");
  assert.equal(publicProfile.label, "亮黑版");
  assert.equal(publicProfile.targetStatic, "/home/lckfb/workspace/taishan-screen/static");
  assert.deepEqual(publicProfile.capabilityIds, [
    "screen.kiosk-480x360",
    "status.board-http",
    "hardware-result.python",
    "mic.browser-rms"
  ]);
  assert.equal(Object.hasOwn(publicProfile, "dbusSessionBusAddress"), false);
  assert.equal(Object.hasOwn(publicProfile, "xdgRuntimeDir"), false);
  assert.equal(Object.hasOwn(publicProfile, "xAuthority"), false);
});

test("taishan-black profile preserves deployment paths and kiosk runtime facts", () => {
  const profile = getLinuxDeviceProfile("taishan-black");

  assert.equal(profile.host, "150.158.146.192");
  assert.equal(profile.port, "6279");
  assert.equal(profile.frpHost, "150.158.146.192");
  assert.equal(profile.frpPort, "6279");
  assert.equal(profile.targetStatic, "/home/lckfb/workspace/taishan-screen/static");
  assert.equal(profile.appRoot, "/home/lckfb/workspace/taishan-screen");
  assert.equal(profile.releaseRoot, "/home/lckfb/workspace/vibeboard-deploy/releases");
  assert.equal(profile.backupRoot, "/home/lckfb/workspace/vibeboard-deploy/backups");
  assert.equal(profile.xAuthority, "/home/lckfb/.Xauthority");
  assert.equal(profile.kioskUser, "lckfb");
  assert.equal(profile.kioskHome, "/home/lckfb");
  assert.equal(profile.xdgRuntimeDir, "/run/user/1000");
  assert.equal(profile.dbusSessionBusAddress, "unix:path=/run/user/1000/bus");
});

test("deviceCapabilityIds reports common Taishan capabilities plus black-board microphone support", () => {
  assert.deepEqual(deviceCapabilityIds(getLinuxDeviceProfile("taishan-gray")), [
    "screen.kiosk-480x360",
    "status.board-http",
    "hardware-result.python"
  ]);
  assert.deepEqual(deviceCapabilityIds(getLinuxDeviceProfile("taishan-black")), [
    "screen.kiosk-480x360",
    "status.board-http",
    "hardware-result.python",
    "mic.browser-rms"
  ]);
});
