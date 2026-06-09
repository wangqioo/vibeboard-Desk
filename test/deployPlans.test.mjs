import test from "node:test";
import assert from "node:assert/strict";

import { getLinuxDeviceProfile } from "../src/deviceProfiles/index.mjs";
import {
  createDeployPlan,
  createKioskLaunchPlan,
  validateDeployPlan
} from "../src/deployPlans/index.mjs";

const manifest = Object.freeze({
  id: "screen-clock",
  title: "Screen Clock",
  files: ["index.html", "style.css", "app.js", "manifest.json", "hardware_app.py"]
});

test("createDeployPlan builds gray-board deploy plan basics", () => {
  const profile = getLinuxDeviceProfile("taishan-gray");
  const plan = createDeployPlan({
    profile,
    manifest,
    buildId: "vb-test-001",
    timestamp: "2026-06-10T08:30:00.000Z"
  });

  assert.equal(plan.deviceId, "taishan-gray");
  assert.equal(plan.buildId, "vb-test-001");
  assert.equal(plan.releasePath, "/home/linaro/workspace/vibeboard-deploy/releases/vb-test-001");
  assert.equal(plan.backupPath, "/home/linaro/workspace/vibeboard-deploy/backups/static-vb-test-001-20260610T083000000Z");
  assert.equal(plan.staticPath, "/home/linaro/workspace/taishan-screen/static");
  assert.equal(plan.appRoot, "/home/linaro/workspace/taishan-screen");
  assert.equal(plan.service, "taishan-screen.service");
  assert.deepEqual(plan.display, { width: 480, height: 360 });
  assert.deepEqual(plan.ownership, { deployUser: "root", chownUser: "linaro", chownTarget: "/home/linaro/workspace/taishan-screen" });
  assert.deepEqual(plan.capabilityProbeIds, ["board-http-status", "static-build-id", "kiosk-process"]);
  assert.deepEqual(plan.uploadFiles, [
    { name: "index.html", releasePath: "/home/linaro/workspace/vibeboard-deploy/releases/vb-test-001/index.html", staticPath: "/home/linaro/workspace/taishan-screen/static/index.html" },
    { name: "style.css", releasePath: "/home/linaro/workspace/vibeboard-deploy/releases/vb-test-001/style.css", staticPath: "/home/linaro/workspace/taishan-screen/static/style.css" },
    { name: "app.js", releasePath: "/home/linaro/workspace/vibeboard-deploy/releases/vb-test-001/app.js", staticPath: "/home/linaro/workspace/taishan-screen/static/app.js" },
    { name: "manifest.json", releasePath: "/home/linaro/workspace/vibeboard-deploy/releases/vb-test-001/manifest.json", staticPath: "/home/linaro/workspace/taishan-screen/static/manifest.json" },
    { name: "hardware_app.py", releasePath: "/home/linaro/workspace/vibeboard-deploy/releases/vb-test-001/hardware_app.py" }
  ]);
  assert.equal(validateDeployPlan(plan).ok, true);
});

test("createKioskLaunchPlan builds black-board desktop user environment", () => {
  const kiosk = createKioskLaunchPlan(getLinuxDeviceProfile("taishan-black"));

  assert.equal(kiosk.user, "lckfb");
  assert.equal(kiosk.appRoot, "/home/lckfb/workspace/taishan-screen");
  assert.deepEqual(kiosk.environment, {
    HOME: "/home/lckfb",
    DISPLAY: ":0",
    XAUTHORITY: "/home/lckfb/.Xauthority",
    XDG_RUNTIME_DIR: "/run/user/1000",
    DBUS_SESSION_BUS_ADDRESS: "unix:path=/run/user/1000/bus",
    TAISHAN_SCREEN_CHROMIUM_PROFILE: "/home/lckfb/.cache/taishan-screen-chromium",
    TAISHAN_SCREEN_LOG_DIR: "/home/lckfb/.cache/taishan-screen-chromium/logs",
    BROWSER_MEDIA_PERMISSION_MODE: "fake-ui"
  });
});

test("createDeployPlan uses timestamp for deterministic backup paths", () => {
  const profile = getLinuxDeviceProfile("taishan-black");

  const first = createDeployPlan({
    profile,
    manifest,
    buildId: "vb-test-002",
    timestamp: "2026-06-10T08:30:00.000Z"
  });
  const second = createDeployPlan({
    profile,
    manifest,
    buildId: "vb-test-002",
    timestamp: "2026-06-10T08:31:00.000Z"
  });

  assert.equal(first.releasePath, "/home/lckfb/workspace/vibeboard-deploy/releases/vb-test-002");
  assert.equal(second.releasePath, "/home/lckfb/workspace/vibeboard-deploy/releases/vb-test-002");
  assert.equal(first.backupPath, "/home/lckfb/workspace/vibeboard-deploy/backups/static-vb-test-002-20260610T083000000Z");
  assert.equal(second.backupPath, "/home/lckfb/workspace/vibeboard-deploy/backups/static-vb-test-002-20260610T083100000Z");
});

test("validateDeployPlan rejects missing build profile and static path", () => {
  assert.deepEqual(validateDeployPlan({}), {
    ok: false,
    errors: [
      "deviceId is required",
      "buildId is required",
      "releasePath is required",
      "backupPath is required",
      "staticPath is required",
      "appRoot is required"
    ]
  });

  const plan = createDeployPlan({
    profile: { ...getLinuxDeviceProfile("taishan-gray"), targetStatic: "" },
    manifest,
    buildId: "vb-test-003",
    timestamp: "2026-06-10T08:30:00.000Z"
  });

  assert.deepEqual(validateDeployPlan(plan), {
    ok: false,
    errors: ["staticPath is required"]
  });
});
