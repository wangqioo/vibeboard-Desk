import { DEFAULT_DESK_APP_FILES, validateDeskAppManifest } from "../appManifest/index.mjs";
import { deviceCapabilityIds, getLinuxDeviceProfile } from "../deviceProfiles/index.mjs";
import { inferCapabilityIdsFromPrompt } from "../capabilities/index.mjs";

const DEFAULT_RUNTIME_SERVICES = Object.freeze(["chromium-kiosk", "board-http", "python-probe"]);
const DEFAULT_ACCEPTANCE_CHECKS = Object.freeze([
  "screen serves the expected build id",
  "kiosk process uses the selected device profile",
  "hardware result reports the expected build id"
]);

function uniqueStrings(values = []) {
  return [...new Set(values.filter(value => typeof value === "string" && value.trim()).map(value => value.trim()))];
}

export function selectCapabilityIdsForPrompt(prompt = "", profile = {}) {
  return uniqueStrings([
    ...inferCapabilityIdsFromPrompt(prompt),
    ...deviceCapabilityIds(profile)
  ]);
}

export function mergeProfileMetadata(runtimeProfile = {}) {
  const platformProfile = getLinuxDeviceProfile(runtimeProfile?.id) || {};
  return {
    ...platformProfile,
    ...runtimeProfile,
    display: runtimeProfile.display || platformProfile.display,
    capabilityIds: uniqueStrings([
      ...deviceCapabilityIds(platformProfile),
      ...deviceCapabilityIds(runtimeProfile)
    ]),
    os: {
      ...(platformProfile.os || {}),
      ...(runtimeProfile.os || {})
    },
    pitfalls: uniqueStrings([
      ...(platformProfile.pitfalls || []),
      ...(runtimeProfile.pitfalls || [])
    ]),
    verificationProbes: uniqueStrings([
      ...(platformProfile.verificationProbes || []),
      ...(runtimeProfile.verificationProbes || [])
    ])
  };
}

export function buildDeskManifestMetadata({
  prompt = "",
  profile,
  appName = "",
  runtimeServices = DEFAULT_RUNTIME_SERVICES,
  acceptanceChecks = DEFAULT_ACCEPTANCE_CHECKS
} = {}) {
  const deskApp = validateDeskAppManifest({
    schemaVersion: 1,
    deviceId: profile?.id || "",
    appName,
    screen: profile?.display,
    capabilityIds: selectCapabilityIdsForPrompt(prompt, profile),
    files: DEFAULT_DESK_APP_FILES,
    runtimeServices,
    acceptanceChecks,
    allowedWriteSurface: "generated-app-files-only"
  }, {
    fallbackAppName: profile?.id || "desk-app"
  });

  return {
    deskApp,
    capabilityIds: deskApp.capabilityIds,
    deviceId: deskApp.deviceId,
    screen: deskApp.screen
  };
}
