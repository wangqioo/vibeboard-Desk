import test from "node:test";
import assert from "node:assert/strict";

import {
  buildRepairMessages,
  buildRepairRequest,
  normalizeRepairModelOutput,
  summarizeFailedChecks
} from "../src/repairLoop.mjs";

const verificationReport = Object.freeze({
  status: "failure",
  deviceId: "taishan-black",
  expectedBuildId: "vb-repair-a1b2c3",
  failedChecks: [
    {
      id: "static-build-id",
      label: "static build id matches",
      evidence: "vb-old-build"
    },
    {
      id: "capability:mic.browser-rms",
      label: "capability evidence present: mic.browser-rms",
      evidence: "missing"
    }
  ]
});

const files = Object.freeze({
  "index.html": "<html><link rel=\"stylesheet\" href=\"./style.css\"><script src=\"./app.js\"></script></html>",
  "style.css": "html, body { width: 480px; height: 360px; }",
  "app.js": "const BUILD_ID = 'vb-repair-a1b2c3'; const PROMPT = 'voice'; window.VibeBoardHardware = {}; fetch('/api/status'); fetch('./hardware-result.json');",
  "hardware_app.py": "print({'available_apis':['/api/status','./hardware-result.json']})"
});

test("summarizeFailedChecks keeps failure labels and evidence compact", () => {
  const summary = summarizeFailedChecks(verificationReport);

  assert.match(summary, /static build id matches/);
  assert.match(summary, /vb-old-build/);
  assert.match(summary, /mic.browser-rms/);
});

test("buildRepairRequest includes current files, device evidence, and write-surface guardrails", () => {
  const request = buildRepairRequest({
    prompt: "修复亮黑板上的麦克风应用",
    buildId: "vb-repair-a1b2c3",
    files,
    manifest: { capabilityIds: ["mic.browser-rms"], deskApp: { allowedWriteSurface: "generated-app-files-only" } },
    deployPlan: { deviceId: "taishan-black", staticPath: "/home/lckfb/workspace/taishan-screen/static" },
    goldenLoop: { raw: { kiosk: "123 chromium", status: "{\"hostname\":\"taishan-black\"}" } },
    verificationReport
  });

  assert.equal(request.buildId, "vb-repair-a1b2c3");
  assert.deepEqual(request.allowedFiles, ["index.html", "style.css", "app.js", "hardware_app.py"]);
  assert.equal(request.failedChecks.length, 2);
  assert.match(request.context, /generated-app-files-only/);
  assert.match(request.context, /taishan-black/);
  assert.match(request.context, /static build id matches/);
  assert.match(request.context, /index\.html/);
});

test("buildRepairMessages asks the model to return only generated app files JSON", () => {
  const messages = buildRepairMessages(buildRepairRequest({
    prompt: "repair",
    buildId: "vb-repair-a1b2c3",
    files,
    verificationReport
  }));

  assert.equal(messages.length, 2);
  assert.equal(messages[0].role, "system");
  assert.match(messages[0].content, /Return ONLY a JSON object/);
  assert.match(messages[0].content, /index\.html/);
  assert.match(messages[0].content, /Do not change BUILD_ID/);
  assert.match(messages[1].content, /vb-repair-a1b2c3/);
  assert.match(messages[1].content, /Current generated files/);
});

test("normalizeRepairModelOutput accepts only generated repair files", () => {
  const output = normalizeRepairModelOutput({
    files: {
      ...files,
      "manifest.json": "{}",
      "../escape": "bad"
    },
    notes: "patched mic handling"
  });

  assert.deepEqual(Object.keys(output.files), ["index.html", "style.css", "app.js", "hardware_app.py"]);
  assert.equal(output.notes, "patched mic handling");
});

test("normalizeRepairModelOutput rejects missing required repair files", () => {
  assert.throws(() => normalizeRepairModelOutput({
    files: {
      "index.html": files["index.html"],
      "style.css": files["style.css"]
    }
  }), /missing app\.js/);
});
