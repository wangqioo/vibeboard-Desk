export const EVIDENCE_STATUS = Object.freeze({
  SUCCESS: "success",
  MISSING: "missing",
  FAILURE: "failure",
  UNKNOWN: "unknown"
});

const REPORT_STATUS = Object.freeze({
  SUCCESS: "success",
  PARTIAL_SUCCESS: "partial_success",
  FAILURE: "failure"
});

function cleanString(value) {
  return String(value || "").trim();
}

function normalizeStatus(status, value) {
  const normalized = cleanString(status).toLowerCase();
  if (Object.values(EVIDENCE_STATUS).includes(normalized)) return normalized;
  if (value === undefined || value === null || value === "") return EVIDENCE_STATUS.MISSING;
  return EVIDENCE_STATUS.SUCCESS;
}

function evidenceText(value) {
  if (value === undefined || value === null || value === "") return "missing";
  if (typeof value === "string") return value.trim() || "missing";
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function normalizeArgs(args) {
  if (Array.isArray(args)) return args.join(" ");
  return cleanString(args);
}

function hasEvidenceValue(item) {
  if (!item) return false;
  if (item.status === EVIDENCE_STATUS.FAILURE || item.status === EVIDENCE_STATUS.MISSING) return false;
  return item.value !== undefined && item.value !== null && item.value !== "";
}

function makeReportCheck(id, label, ok, evidence, severity = "required") {
  return {
    id,
    label,
    ok: Boolean(ok),
    severity,
    evidence: evidenceText(evidence).slice(0, 500)
  };
}

function evidenceMap(items) {
  const byKey = new Map();
  for (const item of items) {
    byKey.set(item.key, item);
  }
  return byKey;
}

function getFirstEvidence(byKey, keys) {
  for (const key of keys) {
    const item = byKey.get(key);
    if (item) return item;
  }
  return null;
}

function buildIdFromHardwareResult(value) {
  if (typeof value === "string") return value;
  return value?.build_id || value?.buildId || value?.id || "";
}

function buildIdFromEvidenceValue(value) {
  const text = cleanString(value);
  const matches = text.match(/vb-[a-z0-9]+-[a-f0-9]+/gi);
  return matches?.at(-1) || text;
}

function boardStatusReachable(value) {
  if (!value) return false;
  if (value === true) return true;
  if (typeof value === "string") return value.length > 0 && value !== "missing";
  return Boolean(value.ok || value.reachable || value.hostname || value.network || value.services);
}

function kioskPresent(value) {
  if (!value) return false;
  if (typeof value === "string") return /chromium|kiosk/i.test(value);
  return Boolean(value.present || value.pid || value.args || value.command);
}

function kioskUser(value) {
  if (!value || typeof value === "string") return "";
  return cleanString(value.user || value.username);
}

function kioskArgs(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  return normalizeArgs(value.args || value.argv || value.command);
}

function capabilityEvidenceKeys(capabilityId) {
  return [
    `capability.${capabilityId}`,
    `capabilities.${capabilityId}`,
    capabilityId
  ];
}

export function normalizeEvidenceItem(item = {}) {
  const key = cleanString(item.key || item.id || item.name);
  const value = item.value ?? item.data ?? item.result;
  return {
    key,
    label: cleanString(item.label || key),
    status: normalizeStatus(item.status, value),
    value,
    required: item.required !== false,
    source: cleanString(item.source)
  };
}

export function createVerificationReport({
  expectedBuildId = "",
  deviceId = "",
  capabilityIds = [],
  evidence = [],
  checkedAt = new Date().toISOString()
} = {}) {
  const normalizedEvidence = evidence.map(normalizeEvidenceItem).filter(item => item.key);
  const byKey = evidenceMap(normalizedEvidence);
  const expected = cleanString(expectedBuildId);
  const normalizedCapabilityIds = [...new Set(capabilityIds.map(cleanString).filter(Boolean))];

  const staticBuildId = getFirstEvidence(byKey, ["static.buildId", "staticBuildId", "http.buildId"]);
  const boardStatus = getFirstEvidence(byKey, ["boardStatus", "board.status", "status"]);
  const hardwareResult = getFirstEvidence(byKey, ["hardwareResult", "hardware-result", "hardware.result"]);
  const kioskProcess = getFirstEvidence(byKey, ["kioskProcess", "kiosk.process", "kiosk"]);

  const checks = [
    makeReportCheck(
      "static-build-id",
      "static build id matches",
      hasEvidenceValue(staticBuildId) && buildIdFromEvidenceValue(staticBuildId.value) === expected,
      staticBuildId?.value
    ),
    makeReportCheck(
      "board-status-reachable",
      "board status reachable",
      hasEvidenceValue(boardStatus) && boardStatusReachable(boardStatus.value),
      boardStatus?.value
    ),
    makeReportCheck(
      "hardware-result-build-id",
      "hardware result build id matches",
      hasEvidenceValue(hardwareResult) && cleanString(buildIdFromHardwareResult(hardwareResult.value)) === expected,
      hardwareResult?.value
    ),
    makeReportCheck(
      "kiosk-process-present",
      "kiosk process present",
      hasEvidenceValue(kioskProcess) && kioskPresent(kioskProcess.value),
      kioskProcess?.value
    ),
    makeReportCheck(
      "kiosk-process-user",
      "kiosk process user captured",
      hasEvidenceValue(kioskProcess) && Boolean(kioskUser(kioskProcess.value)),
      kioskUser(kioskProcess?.value) || kioskProcess?.value
    ),
    makeReportCheck(
      "kiosk-process-args",
      "kiosk process args captured",
      hasEvidenceValue(kioskProcess) && Boolean(kioskArgs(kioskProcess.value)),
      kioskArgs(kioskProcess?.value) || kioskProcess?.value
    ),
    ...normalizedCapabilityIds.map(capabilityId => {
      const item = getFirstEvidence(byKey, capabilityEvidenceKeys(capabilityId));
      return makeReportCheck(
        `capability:${capabilityId}`,
        `capability evidence present: ${capabilityId}`,
        hasEvidenceValue(item),
        item?.value,
        "optional"
      );
    })
  ];

  const failedChecks = checks.filter(check => !check.ok);
  const failedRequiredChecks = failedChecks.filter(check => check.severity === "required");
  const status = failedRequiredChecks.length > 0
    ? REPORT_STATUS.FAILURE
    : failedChecks.length > 0
      ? REPORT_STATUS.PARTIAL_SUCCESS
      : REPORT_STATUS.SUCCESS;

  return {
    status,
    checkedAt,
    expectedBuildId: expected,
    deviceId: cleanString(deviceId),
    capabilityIds: normalizedCapabilityIds,
    evidence: normalizedEvidence,
    checks,
    failedChecks
  };
}

export function summarizeVerificationReport(report = {}) {
  const status = cleanString(report.status || REPORT_STATUS.FAILURE);
  const deviceId = cleanString(report.deviceId || "unknown-device");
  const expectedBuildId = cleanString(report.expectedBuildId || "unknown-build");
  const failedChecks = report.failedChecks || [];

  if (failedChecks.length === 0) {
    return `${status}: ${deviceId} verified ${expectedBuildId}; all checks passed.`;
  }

  const failures = failedChecks
    .map(check => `${check.label} (${check.id}): ${check.evidence}`)
    .join("; ");
  return `${status}: ${deviceId} verification for ${expectedBuildId} failed checks: ${failures}`;
}
