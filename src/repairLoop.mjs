const REPAIR_FILE_NAMES = Object.freeze([
  "index.html",
  "style.css",
  "app.js",
  "hardware_app.py"
]);

function cleanString(value) {
  return String(value || "").trim();
}

function truncate(value, limit = 12000) {
  const text = typeof value === "string" ? value : JSON.stringify(value, null, 2);
  return text.length > limit ? `${text.slice(0, limit)}\n...[truncated]` : text;
}

function stableJson(value) {
  return JSON.stringify(value ?? null, null, 2);
}

function selectedFiles(files = {}) {
  return Object.fromEntries(REPAIR_FILE_NAMES.map(name => [name, cleanString(files[name])]));
}

export function normalizeRepairModelOutput(raw = {}) {
  const payload = raw.files && typeof raw.files === "object" ? raw.files : raw;
  const files = {};
  for (const name of REPAIR_FILE_NAMES) {
    if (typeof payload[name] === "string" && payload[name].trim()) {
      files[name] = payload[name];
    }
  }

  for (const name of REPAIR_FILE_NAMES) {
    if (!files[name]) throw new Error(`Repair output is missing ${name}.`);
  }

  return {
    files,
    notes: cleanString(raw.notes)
  };
}

export function summarizeFailedChecks(report = {}) {
  const failedChecks = Array.isArray(report.failedChecks) ? report.failedChecks : [];
  if (!failedChecks.length) return "No failed checks were reported.";

  return failedChecks.map(check => (
    `- ${cleanString(check.label || check.id)} (${cleanString(check.id)}): ${cleanString(check.evidence || "missing")}`
  )).join("\n");
}

export function buildRepairRequest({
  prompt = "",
  buildId = "",
  files = {},
  manifest = {},
  deployPlan = {},
  goldenLoop = {},
  verificationReport = {}
} = {}) {
  const failedChecks = Array.isArray(verificationReport.failedChecks)
    ? verificationReport.failedChecks
    : [];
  const allowedFiles = [...REPAIR_FILE_NAMES];
  const filePayload = selectedFiles(files);
  const context = [
    `User repair request: ${cleanString(prompt) || "Repair the generated VibeBoard Desk app."}`,
    `Build id: ${cleanString(buildId || verificationReport.expectedBuildId)}`,
    `Device id: ${cleanString(verificationReport.deviceId || deployPlan.deviceId || manifest.deviceId)}`,
    `Allowed write surface: ${cleanString(manifest?.deskApp?.allowedWriteSurface || "generated-app-files-only")}`,
    "",
    "Failed verification checks:",
    summarizeFailedChecks(verificationReport),
    "",
    "Desk App Manifest:",
    truncate(stableJson(manifest), 5000),
    "",
    "Deploy Plan:",
    truncate(stableJson(deployPlan), 5000),
    "",
    "Golden-loop raw evidence:",
    truncate(stableJson(goldenLoop.raw || {}), 5000),
    "",
    "Current generated files:",
    truncate(stableJson(filePayload), 16000)
  ].join("\n");

  return {
    buildId: cleanString(buildId || verificationReport.expectedBuildId),
    deviceId: cleanString(verificationReport.deviceId || deployPlan.deviceId || manifest.deviceId),
    allowedFiles,
    failedChecks,
    context,
    files: filePayload,
    manifest,
    deployPlan,
    goldenLoop,
    verificationReport
  };
}

export function buildRepairMessages(request = {}) {
  return [
    {
      role: "system",
      content: `You are VibeBoard Desk Repair.

Repair only the generated Linux kiosk app files for a 480x360 VibeBoard Desk target.
Return ONLY a JSON object with this exact shape:
{
  "files": {
    "index.html": "...",
    "style.css": "...",
    "app.js": "...",
    "hardware_app.py": "..."
  },
  "notes": "one concise repair note"
}

Rules:
- Only change index.html, style.css, app.js, and hardware_app.py.
- Do not change BUILD_ID.
- Preserve relative ./style.css and ./app.js asset references.
- app.js must keep window.VibeBoardHardware, /api/status, and ./hardware-result.json integration.
- hardware_app.py must print JSON with runtime executed_on_board, build_id, and available_apis.
- Use the verification evidence to patch the current generated files; do not start over from scratch.`
    },
    {
      role: "user",
      content: request.context || ""
    }
  ];
}
