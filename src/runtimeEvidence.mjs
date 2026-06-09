import { createVerificationReport } from "./evidence/index.mjs";
import { parseJsonSafe } from "./goldenLoop.mjs";

function cleanString(value) {
  return String(value || "").trim();
}

function parseKioskProcess(value = "", user = "") {
  const text = cleanString(value);
  const firstLine = text.split(/\r?\n/).map(line => line.trim()).find(Boolean) || "";
  const match = firstLine.match(/^(\d+)\s+(.*)$/);
  return {
    present: Boolean(firstLine),
    pid: match?.[1] || "",
    user: cleanString(user),
    args: match?.[2] || firstLine
  };
}

function has480x360Geometry(value = "") {
  const text = cleanString(value);
  return /Width:\s*480\b/.test(text) && /Height:\s*360\b/.test(text);
}

function microphoneRuntimeEvidence(value) {
  if (!value || typeof value === "string") return "";
  if (value.microphone_active || value.microphoneActive) {
    return {
      active: true,
      volumeMonitor: value.volume_monitor || value.volumeMonitor || value.volume || "available"
    };
  }
  if (value.volume_monitor || value.volumeMonitor) {
    return {
      active: true,
      volumeMonitor: value.volume_monitor || value.volumeMonitor
    };
  }
  return "";
}

export function evidenceFromGoldenLoop(goldenLoop = {}) {
  const raw = goldenLoop.raw || {};
  const status = parseJsonSafe(raw.status) || cleanString(raw.status);
  const hardwareResult = parseJsonSafe(raw.program) || cleanString(raw.program);
  const kioskProcess = parseKioskProcess(raw.kiosk, goldenLoop.kioskUser);

  return [
    { key: "static.buildId", value: cleanString(raw.static_index_id || raw.http_index_id) },
    { key: "boardStatus", value: status },
    { key: "hardwareResult", value: hardwareResult },
    { key: "kioskProcess", value: kioskProcess },
    { key: "capability.mic.browser-rms", value: microphoneRuntimeEvidence(hardwareResult) },
    { key: "capability.screen.kiosk-480x360", value: { viewport: has480x360Geometry(raw.geometry) ? "480x360" : "" } },
    { key: "capability.status.board-http", value: status },
    { key: "capability.hardware-result.python", value: hardwareResult }
  ];
}

export function createRuntimeVerificationReport({
  expectedBuildId = "",
  deviceId = "",
  kioskUser = "",
  capabilityIds = [],
  goldenLoop,
  checkedAt
} = {}) {
  const goldenLoopWithProfile = {
    ...(goldenLoop || {}),
    kioskUser
  };
  return createVerificationReport({
    expectedBuildId,
    deviceId,
    capabilityIds,
    evidence: evidenceFromGoldenLoop(goldenLoopWithProfile),
    checkedAt: checkedAt || goldenLoopWithProfile.checkedAt
  });
}
