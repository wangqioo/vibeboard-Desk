const TAISHAN_DISPLAY = Object.freeze({ width: 480, height: 360 });

const TAISHAN_COMMON_CAPABILITIES = Object.freeze([
  "screen.kiosk-480x360",
  "status.board-http",
  "hardware-result.python"
]);

const DEFAULT_RUNTIME_PATHS = Object.freeze({
  targetStatic: "/home/linaro/workspace/taishan-screen/static",
  appRoot: "/home/linaro/workspace/taishan-screen",
  releaseRoot: "/home/linaro/workspace/vibeboard-deploy/releases",
  backupRoot: "/home/linaro/workspace/vibeboard-deploy/backups",
  service: "taishan-screen.service",
  xAuthority: "/home/linaro/.Xauthority"
});

const BLACK_BOARD_RUNTIME_PATHS = Object.freeze({
  targetStatic: "/home/lckfb/workspace/taishan-screen/static",
  appRoot: "/home/lckfb/workspace/taishan-screen",
  releaseRoot: "/home/lckfb/workspace/vibeboard-deploy/releases",
  backupRoot: "/home/lckfb/workspace/vibeboard-deploy/backups",
  service: "taishan-screen.service",
  xAuthority: "/home/lckfb/.Xauthority",
  kioskUser: "lckfb",
  kioskHome: "/home/lckfb",
  xdgRuntimeDir: "/run/user/1000",
  dbusSessionBusAddress: "unix:path=/run/user/1000/bus"
});

export const LINUX_DEVICE_PROFILES = Object.freeze({
  "taishan-transparent": Object.freeze({
    id: "taishan-transparent",
    label: "透明版",
    host: "150.158.146.192",
    port: "6223",
    frpHost: "150.158.146.192",
    frpPort: "6223",
    user: "linaro",
    display: TAISHAN_DISPLAY,
    os: Object.freeze({
      family: "linux",
      boardFamily: "taishan-rk3566",
      desktopStack: "x11",
      kioskRuntime: "chromium"
    }),
    capabilityIds: TAISHAN_COMMON_CAPABILITIES,
    pitfalls: Object.freeze([]),
    verificationProbes: Object.freeze(["board-http-status", "static-build-id", "kiosk-process"]),
    ...DEFAULT_RUNTIME_PATHS
  }),
  "taishan-gray": Object.freeze({
    id: "taishan-gray",
    label: "灰色版",
    host: "150.158.146.192",
    port: "6278",
    frpHost: "150.158.146.192",
    frpPort: "6278",
    user: "root",
    display: TAISHAN_DISPLAY,
    os: Object.freeze({
      family: "linux",
      boardFamily: "taishan-rk3566",
      desktopStack: "x11",
      kioskRuntime: "chromium"
    }),
    capabilityIds: TAISHAN_COMMON_CAPABILITIES,
    pitfalls: Object.freeze([]),
    verificationProbes: Object.freeze(["board-http-status", "static-build-id", "kiosk-process"]),
    ...DEFAULT_RUNTIME_PATHS
  }),
  "taishan-black": Object.freeze({
    id: "taishan-black",
    label: "亮黑版",
    host: "150.158.146.192",
    port: "6279",
    frpHost: "150.158.146.192",
    frpPort: "6279",
    user: "root",
    display: TAISHAN_DISPLAY,
    os: Object.freeze({
      family: "linux",
      boardFamily: "taishan-rk3566",
      desktopStack: "x11",
      kioskRuntime: "chromium",
      audioUser: "lckfb",
      browserMediaPermission: "fake-ui"
    }),
    capabilityIds: Object.freeze([...TAISHAN_COMMON_CAPABILITIES, "mic.browser-rms"]),
    pitfalls: Object.freeze([
      "Deploy may use root, but Chromium and microphone capture must run as lckfb.",
      "Chromium needs the desktop user's X11, DBus, and runtime-directory environment."
    ]),
    verificationProbes: Object.freeze([
      "board-http-status",
      "static-build-id",
      "kiosk-process",
      "browser-microphone-rms"
    ]),
    ...BLACK_BOARD_RUNTIME_PATHS
  })
});

export function getLinuxDeviceProfile(id) {
  return LINUX_DEVICE_PROFILES[id] || undefined;
}

export function listLinuxDeviceProfiles() {
  return Object.values(LINUX_DEVICE_PROFILES);
}

export function resolveLinuxDeviceProfile(input = {}, fallbackId = "taishan-gray") {
  const id = String(input?.deviceId || input?.boardId || "").trim();
  return getLinuxDeviceProfile(id)
    || getLinuxDeviceProfile(fallbackId)
    || getLinuxDeviceProfile("taishan-gray");
}

export function deviceCapabilityIds(profile) {
  return [...(profile?.capabilityIds || [])];
}

export function publicLinuxDeviceProfile(profile) {
  if (!profile) return undefined;

  return {
    id: profile.id,
    label: profile.label,
    host: profile.host,
    port: String(profile.port),
    frpHost: profile.frpHost,
    frpPort: String(profile.frpPort),
    user: profile.user,
    targetStatic: profile.targetStatic,
    appRoot: profile.appRoot,
    releaseRoot: profile.releaseRoot,
    backupRoot: profile.backupRoot,
    service: profile.service,
    display: { ...profile.display },
    os: { ...profile.os },
    capabilityIds: deviceCapabilityIds(profile),
    pitfalls: [...(profile.pitfalls || [])],
    verificationProbes: [...(profile.verificationProbes || [])]
  };
}
