import test from "node:test";
import assert from "node:assert/strict";

import {
  boardEndpoints,
  createBoardConfig,
  deviceIdFrom,
  endpointLabel,
  publicBoardConfig,
  publicDeviceProfiles
} from "../src/devices.mjs";

test("publicDeviceProfiles exposes the three Taishan devices", () => {
  const profiles = publicDeviceProfiles({});
  assert.deepEqual(profiles.map(profile => profile.id), [
    "taishan-transparent",
    "taishan-gray",
    "taishan-black",
    "taishan-investor"
  ]);
  assert.deepEqual(profiles.map(profile => profile.label), ["透明版", "灰色版", "亮黑版", "投资人版"]);
});

test("createBoardConfig defaults to taishan-gray", () => {
  const board = createBoardConfig(undefined, {});
  assert.equal(board.id, "taishan-gray");
  assert.equal(board.label, "灰色版");
  assert.equal(board.host, "150.158.146.192");
  assert.equal(board.port, "6278");
  assert.equal(board.user, "root");
});

test("createBoardConfig uses the transparent board profile user", () => {
  const board = createBoardConfig("taishan-transparent", {});
  assert.equal(board.id, "taishan-transparent");
  assert.equal(board.user, "linaro");
  assert.equal(board.port, "6223");
});

test("createBoardConfig uses the black board lckfb runtime paths", () => {
  const board = createBoardConfig("taishan-black", {});
  assert.equal(board.id, "taishan-black");
  assert.equal(board.user, "root");
  assert.equal(board.targetStatic, "/home/lckfb/workspace/taishan-screen/static");
  assert.equal(board.appRoot, "/home/lckfb/workspace/taishan-screen");
  assert.equal(board.releaseRoot, "/home/lckfb/workspace/vibeboard-deploy/releases");
  assert.equal(board.backupRoot, "/home/lckfb/workspace/vibeboard-deploy/backups");
  assert.equal(board.xAuthority, "/home/lckfb/.Xauthority");
  assert.equal(board.kioskUser, "lckfb");
  assert.equal(board.kioskHome, "/home/lckfb");
  assert.equal(board.xdgRuntimeDir, "/run/user/1000");
  assert.equal(board.dbusSessionBusAddress, "unix:path=/run/user/1000/bus");
});

test("createBoardConfig uses the investor board FRP endpoint and linaro user", () => {
  const board = createBoardConfig("taishan-investor", {});
  assert.equal(board.id, "taishan-investor");
  assert.equal(board.label, "投资人版");
  assert.equal(board.host, "150.158.146.192");
  assert.equal(board.port, "6292");
  assert.equal(board.frpHost, "150.158.146.192");
  assert.equal(board.frpPort, "6292");
  assert.equal(board.user, "linaro");
  assert.equal(board.targetStatic, "/home/linaro/workspace/taishan-screen/static");
  assert.equal(board.appRoot, "/home/linaro/workspace/taishan-screen");
});

test("publicDeviceProfiles exposes per-device static targets", () => {
  const profiles = publicDeviceProfiles({});
  assert.equal(
    profiles.find(profile => profile.id === "taishan-transparent").targetStatic,
    "/home/linaro/workspace/taishan-screen/static"
  );
  assert.equal(
    profiles.find(profile => profile.id === "taishan-black").targetStatic,
    "/home/lckfb/workspace/taishan-screen/static"
  );
  assert.equal(
    profiles.find(profile => profile.id === "taishan-investor").targetStatic,
    "/home/linaro/workspace/taishan-screen/static"
  );
});

test("createBoardConfig applies gray board environment overrides", () => {
  const board = createBoardConfig("taishan-gray", {
    VIBEBOARD_BOARD_HOST: "10.0.0.8",
    VIBEBOARD_BOARD_PORT: "2222",
    VIBEBOARD_FRP_HOST: "frp.example",
    VIBEBOARD_FRP_PORT: "6622",
    VIBEBOARD_BOARD_USER: "linaro",
    VIBEBOARD_BOARD_LABEL: "灰色测试机",
    VIBEBOARD_TARGET_STATIC: "/opt/static",
    VIBEBOARD_APP_ROOT: "/opt/app",
    VIBEBOARD_RELEASE_ROOT: "/opt/releases",
    VIBEBOARD_BACKUP_ROOT: "/opt/backups",
    VIBEBOARD_BOARD_SERVICE: "desk.service"
  });
  assert.equal(board.id, "taishan-gray");
  assert.equal(board.label, "灰色测试机");
  assert.equal(board.host, "10.0.0.8");
  assert.equal(board.port, "2222");
  assert.equal(board.frpHost, "frp.example");
  assert.equal(board.frpPort, "6622");
  assert.equal(board.user, "linaro");
  assert.equal(board.targetStatic, "/opt/static");
  assert.equal(board.appRoot, "/opt/app");
  assert.equal(board.releaseRoot, "/opt/releases");
  assert.equal(board.backupRoot, "/opt/backups");
  assert.equal(board.service, "desk.service");
});

test("deviceIdFrom falls back to the supplied fallback device", () => {
  assert.equal(deviceIdFrom({ deviceId: "taishan-black" }, "taishan-gray"), "taishan-black");
  assert.equal(deviceIdFrom({ boardId: "taishan-transparent" }, "taishan-gray"), "taishan-transparent");
  assert.equal(deviceIdFrom({ deviceId: "unknown" }, "taishan-black"), "taishan-black");
  assert.equal(deviceIdFrom({}, "taishan-transparent"), "taishan-transparent");
});

test("publicBoardConfig exposes safe runtime state without password values", () => {
  const board = createBoardConfig("taishan-gray", { VIBEBOARD_BOARD_USER: "linaro" });
  const config = publicBoardConfig(board, {
    passwordConfigured: true,
    activeEndpoint: { name: "frp", host: "150.158.146.192", port: 6278 }
  });
  assert.equal(config.id, "taishan-gray");
  assert.equal(config.user, "linaro");
  assert.equal(config.passwordConfigured, true);
  assert.equal(config.activeRoute, "frp:150.158.146.192:6278");
  assert.equal(Object.hasOwn(config, "password"), false);
});

test("boardEndpoints prefers frp, then configured, and deduplicates equal endpoints", () => {
  const deduped = boardEndpoints({
    host: "150.158.146.192",
    port: "6278",
    frpHost: "150.158.146.192",
    frpPort: "6278"
  });
  assert.deepEqual(deduped, [{ name: "frp", host: "150.158.146.192", port: 6278 }]);

  const ordered = boardEndpoints({
    host: "10.0.0.8",
    port: "22",
    frpHost: "150.158.146.192",
    frpPort: "6278"
  });
  assert.deepEqual(ordered, [
    { name: "frp", host: "150.158.146.192", port: 6278 },
    { name: "configured", host: "10.0.0.8", port: 22 }
  ]);
  assert.equal(endpointLabel(ordered[1]), "configured:10.0.0.8:22");
});
