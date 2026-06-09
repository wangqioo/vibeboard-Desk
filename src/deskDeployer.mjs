import path from "node:path";

import { makeCheck } from "./goldenLoop.mjs";
import { shQuote } from "./remoteRunner.mjs";

export const DEPLOY_FILE_NAMES = [
  "index.html",
  "style.css",
  "app.js",
  "hardware_app.py",
  "manifest.json"
];

export function buildDeployPaths(board, buildId) {
  const release = `${board.releaseRoot}/${buildId}`;
  return {
    release,
    backup: `${board.backupRoot}/static-${buildId}`,
    compilePath: `${release}/compile.log`,
    programPath: `${release}/hardware-result.json`
  };
}

export function buildDeployUploadEntries({
  currentBuild,
  board,
  runtimeDir,
  fileNames = DEPLOY_FILE_NAMES
}) {
  const { release } = buildDeployPaths(board, currentBuild.id);
  return [
    ...fileNames.map(name => ({
      localPath: path.join(currentBuild.dir, name),
      remotePath: `${release}/${name}`
    })),
    {
      localPath: path.join(runtimeDir, "start-kiosk.sh"),
      remotePath: `${board.appRoot}/start-kiosk.sh`,
      mode: "0755"
    }
  ];
}

export function buildDeployRemoteCommand({ board, buildId }) {
  const { release, backup } = buildDeployPaths(board, buildId);
  const kioskLog = board.kioskHome
    ? `${board.kioskHome}/.cache/taishan-screen-chromium/logs/reload.log`
    : "/tmp/vibeboard-kiosk-reload-request.log";
  const kioskEnv = [
    "DISPLAY=:0",
    board.xAuthority ? `XAUTHORITY=${board.xAuthority}` : "",
    board.kioskHome ? `HOME=${board.kioskHome}` : "",
    board.xdgRuntimeDir ? `XDG_RUNTIME_DIR=${board.xdgRuntimeDir}` : "",
    board.dbusSessionBusAddress ? `DBUS_SESSION_BUS_ADDRESS=${board.dbusSessionBusAddress}` : "",
    board.kioskHome ? `TAISHAN_SCREEN_CHROMIUM_PROFILE=${board.kioskHome}/.cache/taishan-screen-chromium` : "",
    board.kioskHome ? `TAISHAN_SCREEN_LOG_DIR=${board.kioskHome}/.cache/taishan-screen-chromium/logs` : ""
  ].filter(Boolean).join(" ");
  const kioskLaunch = `${kioskEnv} nohup ${shQuote(`${board.appRoot}/start-kiosk.sh`)} >${shQuote(kioskLog)} 2>&1 </dev/null &`;
  return [
    "set -u",
    `target=${shQuote(board.targetStatic)}`,
    `release=${shQuote(release)}`,
    `backup=${shQuote(backup)}`,
    `app_root=${shQuote(board.appRoot)}`,
    `kiosk_user=${shQuote(board.kioskUser || "")}`,
    `kiosk_launch=${shQuote(kioskLaunch)}`,
    "compile_log=\"$release/compile.log\"",
    "program_result=\"$release/hardware-result.json\"",
    "fail() { code=\"$1\"; step=\"$2\"; echo \"deploy_error_code=$code\"; echo \"deploy_error_step=$step\"; echo \"compile=$compile_log\"; echo \"program=$program_result\"; exit \"$code\"; }",
    "http_get() { url=\"$1\"; if command -v curl >/dev/null 2>&1; then curl -fsS \"$url\"; elif command -v wget >/dev/null 2>&1; then wget -qO- \"$url\"; else python3 -c \"import sys,urllib.request;sys.stdout.write(urllib.request.urlopen(sys.argv[1], timeout=8).read().decode())\" \"$url\"; fi; }",
    "mkdir -p \"$backup\" || fail 10 mkdir-backup",
    "python3 -m py_compile \"$release/hardware_app.py\" >\"$compile_log\" 2>&1 || fail 16 py-compile",
    "echo \"board py_compile ok: $release/hardware_app.py\" >>\"$compile_log\"",
    "python3 \"$release/hardware_app.py\" >\"$program_result\" 2>>\"$compile_log\" || fail 17 hardware-program",
    "echo \"board program executed: $program_result\" >>\"$compile_log\"",
    `grep -q '"runtime"' "$program_result" || python3 -c "import json,sys;p=sys.argv[1];d=json.load(open(p));d['runtime']='executed_on_board';d.setdefault('build_id','${buildId}');json.dump(d,open(p,'w'),indent=2)" "$program_result" && echo "injected runtime" >>"$compile_log" || echo "inject-failed" >>"$compile_log"`,
    "cp -a \"$target/.\" \"$backup/\" || fail 11 backup-static",
    "cp \"$release/index.html\" \"$target/index.html\" || fail 12 copy-index",
    "cp \"$release/style.css\" \"$target/style.css\" || fail 13 copy-style",
    "cp \"$release/app.js\" \"$target/app.js\" || fail 14 copy-app",
    "cp \"$release/manifest.json\" \"$target/manifest.json\" || fail 15 copy-manifest",
    "cp \"$program_result\" \"$target/hardware-result.json\" || fail 18 copy-program-result",
    "chmod +x \"$app_root/start-kiosk.sh\" || fail 15 chmod-kiosk",
    `sudo systemctl restart ${shQuote(board.service)} || fail 20 restart-service`,
    "sleep 5",
    `state=$(systemctl is-active ${shQuote(board.service)} || true)`,
    "if [ \"$state\" != \"active\" ]; then systemctl status taishan-screen.service --no-pager || true; fail 21 service-not-active; fi",
    "pkill -9 chromium-bin 2>/dev/null || true",
    "pkill -9 chromium 2>/dev/null || true",
    "sleep 1",
    "if [ -n \"$kiosk_user\" ]; then su -s /bin/sh \"$kiosk_user\" -c \"$kiosk_launch\"; else sh -c \"$kiosk_launch\"; fi",
    "sleep 5",
    "kiosk=$( { ps -C chromium -o pid=,args= 2>/dev/null; ps -C chromium-bin -o pid=,args= 2>/dev/null; } | head -n 1 || true )",
    "http_get http://127.0.0.1:8765/ >/tmp/vibeboard-deploy-check.html || fail 30 local-http-check",
    "printf 'service=%s\\nbackup=%s\\ncompile=%s\\nprogram=%s\\nkiosk=%s\\n' \"$state\" \"$backup\" \"$compile_log\" \"$program_result\" \"$kiosk\""
  ].join("\n");
}

export function parseDeployOutput(output) {
  return {
    backup: (String(output || "").match(/^backup=(.*)$/m) || [])[1] || ""
  };
}

export function parseDeployErrorOutput(output) {
  const text = String(output || "");
  return {
    code: (text.match(/^deploy_error_code=(.*)$/m) || [])[1] || "",
    step: (text.match(/^deploy_error_step=(.*)$/m) || [])[1] || "",
    compilePath: (text.match(/^compile=(.*)$/m) || [])[1] || "",
    programPath: (text.match(/^program=(.*)$/m) || [])[1] || ""
  };
}

export function buildPostDeployVerificationFailure({
  buildId,
  route = "",
  error,
  checkedAt = new Date().toISOString()
}) {
  return {
    id: buildId,
    ok: false,
    checkedAt,
    route,
    checks: [makeCheck("post-deploy-ssh", "post deploy verification connection", false, error?.message || error)],
    raw: {}
  };
}
