const DEFAULT_UPLOAD_FILE_NAMES = Object.freeze([
  "index.html",
  "style.css",
  "app.js",
  "hardware_app.py",
  "manifest.json"
]);

function joinRemotePath(root, name) {
  const base = String(root || "").replace(/\/+$/, "");
  return base ? `${base}/${name}` : "";
}

function timestampToken(timestamp) {
  return String(timestamp || new Date().toISOString()).replace(/[-:.]/g, "");
}

function uniqueStrings(values = []) {
  return [...new Set(values.filter(value => typeof value === "string" && value.trim()).map(value => value.trim()))];
}

function uploadFileNames(manifest) {
  return uniqueStrings([
    ...(Array.isArray(manifest?.files) ? manifest.files : []),
    ...DEFAULT_UPLOAD_FILE_NAMES
  ]);
}

function createOwnershipPlan(profile) {
  const deployUser = profile?.user || "";
  const chownUser = profile?.kioskUser || (deployUser === "root" ? "linaro" : deployUser);

  return {
    deployUser,
    chownUser,
    chownTarget: profile?.appRoot || ""
  };
}

export function createKioskLaunchPlan(profile) {
  const kioskUser = profile?.kioskUser || profile?.user || "";
  const kioskHome = profile?.kioskHome || (kioskUser ? `/home/${kioskUser}` : "");
  const environment = {
    ...(kioskHome ? { HOME: kioskHome } : {}),
    DISPLAY: ":0",
    ...(profile?.xAuthority ? { XAUTHORITY: profile.xAuthority } : {}),
    ...(profile?.xdgRuntimeDir ? { XDG_RUNTIME_DIR: profile.xdgRuntimeDir } : {}),
    ...(profile?.dbusSessionBusAddress ? { DBUS_SESSION_BUS_ADDRESS: profile.dbusSessionBusAddress } : {}),
    ...(kioskHome ? {
      TAISHAN_SCREEN_CHROMIUM_PROFILE: `${kioskHome}/.cache/taishan-screen-chromium`,
      TAISHAN_SCREEN_LOG_DIR: `${kioskHome}/.cache/taishan-screen-chromium/logs`
    } : {}),
    ...(profile?.os?.browserMediaPermission ? { BROWSER_MEDIA_PERMISSION_MODE: profile.os.browserMediaPermission } : {})
  };

  return {
    user: kioskUser,
    appRoot: profile?.appRoot || "",
    environment
  };
}

export function createDeployPlan({
  profile,
  manifest,
  buildId,
  timestamp
} = {}) {
  const releasePath = joinRemotePath(profile?.releaseRoot, buildId);
  const backupPath = joinRemotePath(profile?.backupRoot, `static-${buildId || ""}-${timestampToken(timestamp)}`);
  const staticPath = profile?.targetStatic || "";
  const files = uploadFileNames(manifest);

  return {
    deviceId: profile?.id || "",
    buildId: buildId || "",
    manifestId: manifest?.id || "",
    releasePath,
    backupPath,
    staticPath,
    appRoot: profile?.appRoot || "",
    service: profile?.service || "",
    display: { ...(profile?.display || {}) },
    uploadFiles: files.map(name => ({
      name,
      releasePath: joinRemotePath(releasePath, name),
      ...(name === "hardware_app.py" ? {} : { staticPath: joinRemotePath(staticPath, name) })
    })),
    ownership: createOwnershipPlan(profile),
    kioskLaunch: createKioskLaunchPlan(profile),
    capabilityProbeIds: uniqueStrings(
      profile?.verificationProbes?.length ? profile.verificationProbes : profile?.capabilityIds
    )
  };
}

export function validateDeployPlan(plan) {
  const required = [
    ["deviceId", "deviceId is required"],
    ["buildId", "buildId is required"],
    ["releasePath", "releasePath is required"],
    ["backupPath", "backupPath is required"],
    ["staticPath", "staticPath is required"],
    ["appRoot", "appRoot is required"]
  ];
  const errors = required
    .filter(([key]) => !String(plan?.[key] || "").trim())
    .map(([, message]) => message);

  return {
    ok: errors.length === 0,
    errors
  };
}
