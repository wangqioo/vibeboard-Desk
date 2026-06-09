const CATEGORY_ACTIONS = Object.freeze({
  deploy_chain_failure: "diagnose_deploy_chain",
  device_runtime_failure: "diagnose_device_runtime",
  generated_code_failure: "repair_generated_code",
  unknown_failure: "collect_more_evidence"
});

function cleanString(value) {
  return String(value || "").trim();
}

function failedChecks(report = {}) {
  return Array.isArray(report.failedChecks) ? report.failedChecks : [];
}

function combinedFailureText(checks = [], goldenLoop = {}) {
  return [
    ...checks.map(check => `${check.id || ""} ${check.label || ""} ${check.evidence || ""}`),
    JSON.stringify(goldenLoop.raw || {})
  ].join("\n").toLowerCase();
}

export function repairPolicyForClassification(classification = {}) {
  const category = classification.category || "unknown_failure";
  return {
    allowCodeRepair: category === "generated_code_failure",
    action: CATEGORY_ACTIONS[category] || CATEGORY_ACTIONS.unknown_failure
  };
}

export function classifyFailure({
  verificationReport = {},
  goldenLoop = {}
} = {}) {
  const checks = failedChecks(verificationReport);
  const text = combinedFailureText(checks, goldenLoop);

  let category = "unknown_failure";
  let reason = "Failure evidence is incomplete; collect deploy and verification evidence before repair.";

  if (/missing-device-evidence|device evidence is available|run deploy or verify|unable to reach|ssh|frp|scp|upload|connect|authentication|permission denied/.test(text)) {
    category = "deploy_chain_failure";
    reason = "The evidence points to deploy connectivity or missing device evidence, not generated app code.";
  } else if (/kiosk|chromium|xauthority|dbus|xdg_runtime_dir|microphone|mic\.browser-rms|media stream|service-not-active|systemd|display/.test(text)) {
    category = "device_runtime_failure";
    reason = "The evidence points to device runtime, kiosk, service, display, or microphone environment behavior.";
  } else if (/generated-code|generated app|app\.js|hardware_app\.py|window\.vibeboardhardware|build_id|available_apis|syntax|py_compile|node --check/.test(text)) {
    category = "generated_code_failure";
    reason = "The evidence points to generated file contract or syntax problems.";
  }

  const policy = repairPolicyForClassification({ category });
  return {
    category,
    reason: cleanString(reason),
    failedCheckIds: checks.map(check => cleanString(check.id)).filter(Boolean),
    ...policy
  };
}
