import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";

import {
  buildDeployPaths,
  buildDeployRemoteCommand,
  buildDeployUploadEntries,
  buildPostDeployVerificationFailure,
  parseDeployErrorOutput,
  parseDeployOutput
} from "../src/deskDeployer.mjs";

const board = {
  targetStatic: "/home/linaro/workspace/taishan-screen/static",
  appRoot: "/home/linaro/workspace/taishan-screen",
  releaseRoot: "/home/linaro/workspace/vibeboard-deploy/releases",
  backupRoot: "/home/linaro/workspace/vibeboard-deploy/backups",
  service: "taishan-screen.service"
};

const build = {
  id: "vb-mpyabc12-a1b2c3",
  dir: "/tmp/generated/current"
};

test("buildDeployPaths derives release backup compile and program paths", () => {
  assert.deepEqual(buildDeployPaths(board, build.id), {
    release: "/home/linaro/workspace/vibeboard-deploy/releases/vb-mpyabc12-a1b2c3",
    backup: "/home/linaro/workspace/vibeboard-deploy/backups/static-vb-mpyabc12-a1b2c3",
    compilePath: "/home/linaro/workspace/vibeboard-deploy/releases/vb-mpyabc12-a1b2c3/compile.log",
    programPath: "/home/linaro/workspace/vibeboard-deploy/releases/vb-mpyabc12-a1b2c3/hardware-result.json"
  });
});

test("buildDeployUploadEntries maps generated files and kiosk script", () => {
  const entries = buildDeployUploadEntries({
    currentBuild: build,
    board,
    runtimeDir: "/repo/runtime"
  });

  assert.deepEqual(entries, [
    "index.html",
    "style.css",
    "app.js",
    "hardware_app.py",
    "manifest.json"
  ].map(name => ({
    localPath: path.join(build.dir, name),
    remotePath: `${board.releaseRoot}/${build.id}/${name}`
  })).concat({
    localPath: "/repo/runtime/start-kiosk.sh",
    remotePath: "/home/linaro/workspace/taishan-screen/start-kiosk.sh",
    mode: "0755"
  }));
});

test("buildDeployRemoteCommand preserves board-side deploy workflow", () => {
  const command = buildDeployRemoteCommand({ board, buildId: build.id });

  assert.match(command, /^set -u\n/);
  assert.match(command, /target='\/home\/linaro\/workspace\/taishan-screen\/static'/);
  assert.match(command, /release='\/home\/linaro\/workspace\/vibeboard-deploy\/releases\/vb-mpyabc12-a1b2c3'/);
  assert.match(command, /backup='\/home\/linaro\/workspace\/vibeboard-deploy\/backups\/static-vb-mpyabc12-a1b2c3'/);
  assert.match(command, /python3 -m py_compile "\$release\/hardware_app.py"/);
  assert.match(command, /d\.setdefault\('build_id','vb-mpyabc12-a1b2c3'\)/);
  assert.match(command, /fail\(\) \{ code="\$1"; step="\$2";/);
  assert.match(command, /python3 "\$release\/hardware_app.py" >"\$program_result" 2>>"\$compile_log" \|\| fail 17 hardware-program/);
  assert.match(command, /sudo systemctl restart 'taishan-screen.service' \|\| fail 20 restart-service/);
  assert.match(command, /nohup .*\/home\/linaro\/workspace\/taishan-screen\/start-kiosk\.sh/);
  assert.match(command, /http_get http:\/\/127\.0\.0\.1:8765\/ >\/tmp\/vibeboard-deploy-check\.html/);
  assert.match(command, /command -v curl/);
  assert.match(command, /command -v wget/);
  assert.match(command, /printf 'service=%s\\nbackup=%s\\ncompile=%s\\nprogram=%s\\nkiosk=%s\\n'/);
});

test("buildDeployRemoteCommand can launch kiosk as the desktop audio user", () => {
  const command = buildDeployRemoteCommand({
    board: {
      ...board,
      appRoot: "/home/lckfb/workspace/taishan-screen",
      kioskUser: "lckfb",
      kioskHome: "/home/lckfb",
      xAuthority: "/home/lckfb/.Xauthority",
      xdgRuntimeDir: "/run/user/1000",
      dbusSessionBusAddress: "unix:path=/run/user/1000/bus"
    },
    buildId: build.id
  });

  assert.match(command, /kiosk_user='lckfb'/);
  assert.match(command, /su -s \/bin\/sh "\$kiosk_user" -c "\$kiosk_launch"/);
  assert.match(command, /\/home\/lckfb\/workspace\/taishan-screen\/start-kiosk\.sh/);
  assert.match(command, /\/home\/lckfb\/\.cache\/taishan-screen-chromium\/logs\/reload\.log/);
  assert.match(command, /XDG_RUNTIME_DIR=\/run\/user\/1000/);
  assert.match(command, /DBUS_SESSION_BUS_ADDRESS=unix:path=\/run\/user\/1000\/bus/);
});

test("parseDeployOutput extracts backup path", () => {
  assert.deepEqual(parseDeployOutput("service=active\nbackup=/tmp/backup\n"), {
    backup: "/tmp/backup"
  });
  assert.deepEqual(parseDeployOutput(""), { backup: "" });
});

test("parseDeployErrorOutput extracts board-side failure metadata", () => {
  assert.deepEqual(parseDeployErrorOutput([
    "deploy_error_code=17",
    "deploy_error_step=hardware-program",
    "compile=/releases/vb-1/compile.log",
    "program=/releases/vb-1/hardware-result.json"
  ].join("\n")), {
    code: "17",
    step: "hardware-program",
    compilePath: "/releases/vb-1/compile.log",
    programPath: "/releases/vb-1/hardware-result.json"
  });
});

test("buildPostDeployVerificationFailure creates a golden-loop compatible failure", () => {
  const result = buildPostDeployVerificationFailure({
    buildId: build.id,
    route: "frp:150.158.146.192:6223",
    error: new Error("connection closed"),
    checkedAt: "2026-06-05T00:00:00.000Z"
  });

  assert.equal(result.id, build.id);
  assert.equal(result.ok, false);
  assert.equal(result.route, "frp:150.158.146.192:6223");
  assert.deepEqual(result.raw, {});
  assert.deepEqual(result.checks, [{
    id: "post-deploy-ssh",
    label: "post deploy verification connection",
    ok: false,
    evidence: "connection closed"
  }]);
});
