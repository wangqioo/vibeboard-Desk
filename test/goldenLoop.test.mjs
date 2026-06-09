import test from "node:test";
import assert from "node:assert/strict";

import {
  buildGoldenLoopResult,
  buildGoldenLoopRemoteCommand,
  makeCheck,
  parseFirstBuildId,
  parseGoldenLoopSections,
  parseJsonSafe
} from "../src/goldenLoop.mjs";

const expectedId = "vb-mpyabc12-a1b2c3";

test("parseFirstBuildId extracts the first VibeBoard build id", () => {
  assert.equal(parseFirstBuildId(`foo ${expectedId} bar vb-other-ffffff`), expectedId);
  assert.equal(parseFirstBuildId("missing"), "");
});

test("parseJsonSafe returns null for invalid JSON", () => {
  assert.deepEqual(parseJsonSafe('{"ok":true}'), { ok: true });
  assert.equal(parseJsonSafe("not json"), null);
  assert.equal(parseJsonSafe(""), null);
});

test("makeCheck normalizes booleans and truncates evidence", () => {
  const check = makeCheck("id", "Label", 1, "x".repeat(600));
  assert.equal(check.id, "id");
  assert.equal(check.label, "Label");
  assert.equal(check.ok, true);
  assert.equal(check.evidence.length, 500);
});

test("parseGoldenLoopSections splits remote command output into named sections", () => {
  const sections = parseGoldenLoopSections([
    "__SECTION__:service",
    "active",
    "",
    "__SECTION__:manifest",
    '{"id":"x"}'
  ].join("\n"));
  assert.deepEqual(sections, {
    service: "active",
    manifest: '{"id":"x"}'
  });
});

test("buildGoldenLoopRemoteCommand builds the read-only board verification script", () => {
  const command = buildGoldenLoopRemoteCommand({
    targetStatic: "/home/linaro/work dir/static",
    service: "desk's-screen.service",
    xAuthority: "/home/test/.Xauthority"
  });

  assert.match(command, /^set -u\n/);
  assert.match(command, /target='\/home\/linaro\/work dir\/static'/);
  assert.match(command, /service='desk'"'"'s-screen.service'/);
  assert.match(command, /__SECTION__:service/);
  assert.match(command, /__SECTION__:http_index_id/);
  assert.match(command, /__SECTION__:static_index_id/);
  assert.match(command, /__SECTION__:manifest/);
  assert.match(command, /__SECTION__:program/);
  assert.match(command, /__SECTION__:status/);
  assert.match(command, /__SECTION__:geometry/);
  assert.match(command, /__SECTION__:kiosk/);
  assert.match(command, /http_get http:\/\/127\.0\.0\.1:8765\/app\.js/);
  assert.match(command, /command -v curl/);
  assert.match(command, /command -v wget/);
  assert.match(command, /xauthority='\/home\/test\/\.Xauthority'/);
  assert.match(command, /DISPLAY=:0 XAUTHORITY="\$xauthority" xwininfo -root/);
});

test("buildGoldenLoopResult marks a complete board verification as ok", () => {
  const sections = {
    service: "active",
    http_index_id: expectedId,
    static_index_id: `/path/index.html:${expectedId}`,
    manifest: JSON.stringify({ id: expectedId }),
    program: JSON.stringify({ build_id: expectedId, runtime: "executed_on_board", hostname: "taishan" }),
    status: JSON.stringify({ hostname: "taishan" }),
    geometry: "Width: 480\nHeight: 360",
    kiosk: "chromium --window-size=480,360 --force-device-scale-factor=1"
  };

  const result = buildGoldenLoopResult({
    expectedId,
    sections,
    route: "frp:150.158.146.192:6278",
    serviceName: "taishan-screen.service",
    checkedAt: "2026-06-04T00:00:00.000Z"
  });

  assert.equal(result.id, expectedId);
  assert.equal(result.ok, true);
  assert.equal(result.route, "frp:150.158.146.192:6278");
  assert.equal(result.checks.length, 9);
  assert.equal(result.checks.every(check => check.ok), true);
});

test("buildGoldenLoopResult reports failed checks with evidence", () => {
  const result = buildGoldenLoopResult({
    expectedId,
    sections: {
      service: "inactive",
      http_index_id: "missing",
      static_index_id: "",
      manifest: "{}",
      program: "{}",
      status: "{}",
      geometry: "Width: 800\nHeight: 600",
      kiosk: "chromium"
    },
    serviceName: "desk.service",
    checkedAt: "2026-06-04T00:00:00.000Z"
  });

  assert.equal(result.ok, false);
  assert.equal(result.checks.find(check => check.id === "service-active").label, "desk.service active");
  assert.equal(result.checks.find(check => check.id === "program-build-id").evidence, "missing");
});
