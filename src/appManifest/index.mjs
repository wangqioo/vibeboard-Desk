export const DESK_APP_MANIFEST_SCHEMA_VERSION = 1;

export const DESK_APP_FILE_ROLES = Object.freeze({
  "index.html": "entry",
  "style.css": "style",
  "app.js": "browser-app",
  "hardware_app.py": "device-probe",
  "manifest.json": "metadata"
});

export const DEFAULT_DESK_APP_FILES = Object.freeze(
  Object.entries(DESK_APP_FILE_ROLES).map(([path, role]) => Object.freeze({ path, role }))
);

const REQUIRED_FILE_PATHS = DEFAULT_DESK_APP_FILES.map(file => file.path);
const ALLOWED_FILE_PATHS = new Set(REQUIRED_FILE_PATHS);
const ALLOWED_WRITE_SURFACE = "generated-app-files-only";
const MIN_SCREEN_DIMENSION = 1;
const MAX_SCREEN_DIMENSION = 8192;

function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeAppName(value, fallback) {
  const rawName = typeof value === "string" ? value : "";
  const fallbackName = typeof fallback === "string" && fallback.trim() ? fallback : "desk-app";
  const normalized = rawName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || fallbackName;
}

function normalizeStringArray(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(item => typeof item === "string")
    .map(item => item.trim())
    .filter(Boolean);
}

function uniqueStrings(values) {
  return [...new Set(values)];
}

function normalizeFiles(value) {
  if (!Array.isArray(value)) {
    return DEFAULT_DESK_APP_FILES.map(file => ({ ...file }));
  }

  return value
    .filter(isRecord)
    .map(file => ({
      path: typeof file.path === "string" ? file.path.trim() : "",
      role: typeof file.role === "string" ? file.role.trim() : ""
    }));
}

function validateStringArray(name, value, errors) {
  if (!Array.isArray(value)) {
    errors.push(`${name} must be an array`);
    return;
  }

  for (const item of value) {
    if (typeof item !== "string" || !item.trim()) {
      errors.push(`${name} must contain non-empty strings`);
      return;
    }
  }
}

function validateScreen(screen, errors) {
  if (!isRecord(screen)) {
    errors.push("screen must include integer width and height");
    return;
  }

  for (const key of ["width", "height"]) {
    const value = screen[key];
    if (!Number.isInteger(value) || value < MIN_SCREEN_DIMENSION || value > MAX_SCREEN_DIMENSION) {
      errors.push(`screen.${key} must be an integer from ${MIN_SCREEN_DIMENSION} to ${MAX_SCREEN_DIMENSION}`);
    }
  }
}

function validateCapabilityIds(capabilityIds, errors) {
  validateStringArray("capabilityIds", capabilityIds, errors);
  if (!Array.isArray(capabilityIds)) {
    return;
  }

  const ids = capabilityIds.map(id => typeof id === "string" ? id.trim() : id);
  if (new Set(ids).size !== ids.length) {
    errors.push("capabilityIds must be unique");
  }
}

function validateFiles(files, errors) {
  if (!Array.isArray(files)) {
    errors.push("files must be an array");
    return;
  }

  const seenPaths = new Set();
  for (const file of files) {
    if (!isRecord(file) || typeof file.path !== "string" || typeof file.role !== "string") {
      errors.push("files must contain path and role strings");
      return;
    }

    const path = file.path.trim();
    const role = file.role.trim();
    if (!ALLOWED_FILE_PATHS.has(path) || role !== DESK_APP_FILE_ROLES[path]) {
      errors.push(`files may only include ${REQUIRED_FILE_PATHS.join(", ")} with their default roles`);
      return;
    }

    if (seenPaths.has(path)) {
      errors.push(`duplicate file path: ${path}`);
      return;
    }
    seenPaths.add(path);
  }

  for (const path of REQUIRED_FILE_PATHS) {
    if (!seenPaths.has(path)) {
      errors.push(`missing required file: ${path}`);
    }
  }
}

export function normalizeDeskAppManifest(raw, options = {}) {
  const input = isRecord(raw) ? raw : {};
  const fallbackAppName = options.fallbackAppName ?? input.deviceId;
  const files = normalizeFiles(input.files);

  return {
    schemaVersion: DESK_APP_MANIFEST_SCHEMA_VERSION,
    deviceId: typeof input.deviceId === "string" ? input.deviceId.trim() : "",
    appName: normalizeAppName(input.appName, fallbackAppName),
    screen: {
      width: Number.isInteger(input.screen?.width) ? input.screen.width : options.defaultScreen?.width,
      height: Number.isInteger(input.screen?.height) ? input.screen.height : options.defaultScreen?.height
    },
    capabilityIds: uniqueStrings(normalizeStringArray(input.capabilityIds)),
    files,
    runtimeServices: normalizeStringArray(input.runtimeServices),
    acceptanceChecks: normalizeStringArray(input.acceptanceChecks),
    allowedWriteSurface: typeof input.allowedWriteSurface === "string"
      ? input.allowedWriteSurface.trim()
      : ALLOWED_WRITE_SURFACE
  };
}

export function validateDeskAppManifest(raw, options = {}) {
  const input = raw;
  const manifest = normalizeDeskAppManifest(raw, options);
  const errors = [];

  if (!isRecord(input)) {
    throw new TypeError("Desk App Manifest must be an object");
  }

  if (input.schemaVersion !== DESK_APP_MANIFEST_SCHEMA_VERSION) {
    errors.push(`schemaVersion must be ${DESK_APP_MANIFEST_SCHEMA_VERSION}`);
  }

  if (typeof input.deviceId !== "string" || !input.deviceId.trim()) {
    errors.push("deviceId is required");
  }

  if (typeof manifest.appName !== "string" || !manifest.appName.trim()) {
    errors.push("appName is required");
  }

  validateScreen(input.screen, errors);
  validateCapabilityIds(input.capabilityIds, errors);
  validateFiles(input.files, errors);
  validateStringArray("runtimeServices", input.runtimeServices, errors);
  validateStringArray("acceptanceChecks", input.acceptanceChecks, errors);

  if (input.allowedWriteSurface !== ALLOWED_WRITE_SURFACE) {
    errors.push(`allowedWriteSurface must be ${ALLOWED_WRITE_SURFACE}`);
  }

  if (errors.length > 0) {
    throw new TypeError(`Invalid Desk App Manifest: ${errors.join("; ")}`);
  }

  return manifest;
}
