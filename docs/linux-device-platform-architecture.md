# VibeBoard Desk Linux Device Platform Architecture

## Purpose

VibeBoard Desk should be a Linux device application platform, not only a Taishan
screen demo. The first supported devices are Taishan RK3566 boards running a
Debian-like Linux desktop and a 480x360 Chromium kiosk, but the architecture
must be ready for more Linux hardware with different screens, users, services,
audio devices, sensors, GPIO surfaces, and deployment paths.

The platform goal is:

```text
natural language
  -> interpreted app intent
  -> selected Linux device profile
  -> selected device capability contracts
  -> generated web app manifest
  -> generated application files
  -> local validation
  -> device deployment plan
  -> remote deployment
  -> device evidence
  -> AI repair loop
```

This keeps Desk distinct from VibeBoard Micro. Micro owns MCU firmware,
toolchains, pin maps, and board support packages. Desk owns Linux runtime
applications, Chromium kiosk behavior, OS services, file deployment, and
per-device capability adapters.

## Layering Standard

Desk applications run above a Linux OS, but they are still hardware-bound. The
AI must not treat every target as a generic browser. Each generated application
must be written inside the target device's runtime and peripheral constraints.

```text
L0 Device Facts
  CPU architecture, distro, screen, audio devices, input devices, network,
  users, filesystem roots, service manager, and known hardware pitfalls.

L1 OS Runtime
  systemd services, X11/Wayland, PulseAudio/PipeWire/ALSA, Chromium, Python,
  node/python/curl/wget availability, permissions, udev, and remote access.

L2 Device Adapters
  Kiosk launch adapter, static-file deploy adapter, status adapter, audio
  capture adapter, GPIO adapter, sensor adapter, storage adapter, camera adapter.

L3 Capability Contracts
  Per-capability rules: how the web app may use the capability, which runtime
  flags are required, how to simulate it locally, how to validate it on device,
  and common failure categories.

L4 Application Orchestration
  Generated HTML/CSS/JS and `hardware_app.py`: UI, interactions, state machines,
  use of approved browser APIs, use of `/api/status` and hardware-result data.

L5 Product Behavior
  The user's natural-language app idea, visible behavior, acceptance criteria,
  and the repair requests after seeing the device.
```

Responsibility boundary:

- VibeBoard Desk owns L0-L3. These layers are product data and system-owned
  deployment/runtime logic.
- AI owns L4-L5. It generates the app inside the contracts selected by Desk.
- AI must not freely invent device paths, SSH users, Chromium flags, audio
  permission behavior, service names, or deploy roots.
- Every recurring peripheral issue should move from prompt-only advice to a
  structured Capability Contract.

## Core Domain Terms

### Linux Device Profile

The complete runtime profile for a supported Linux device. It includes:

- device id and label
- SSH or FRP endpoints
- default user and optional kiosk user
- static app root, release root, backup root, service name
- display size and kiosk launch requirements
- OS runtime facts such as distro, desktop stack, audio stack, and available
  helper commands
- supported capability contract ids
- known pitfalls and verification probes

The current `taishan-black` profile is an example: deployment uses `root`, but
Chromium and microphone capture must run as `lckfb` with the user's X11, DBus,
and runtime-directory environment.

### Capability Contract

A structured device capability that generated apps may use. A contract is not
only prompt text. It must include:

- id, label, description
- applicability rules for device profiles
- browser or OS APIs allowed
- runtime adapter requirements
- generated-code guidance
- simulation fallback
- validation probes
- common failure categories
- evidence fields to collect after deployment

Initial contracts:

```text
screen.kiosk-480x360
status.board-http
hardware-result.python
mic.browser-rms
audio.playback-browser
gpio.linux-sysfs-or-gpiod
camera.browser-or-v4l2
sensor.linux-iio
storage.local-static
network.status
```

The `mic.browser-rms` contract should contain the lessons from the black board:

- launch Chromium as the desktop/audio user, not root
- include `--use-fake-ui-for-media-stream`
- use `navigator.mediaDevices.getUserMedia({ audio: true })`
- compute volume from time-domain RMS using `getFloatTimeDomainData()`
- calibrate `noiseFloor` for about 90 frames
- apply `startGate = Math.max(0.0045, noiseFloor * 0.55)`
- map volume with `adjusted * 12` and transient peaks with `peak * 120`
- smooth with fast attack `0.32` and slow release `0.12`
- expose `volume`, `rms`, and `gate` debug values on the small screen
- provide a simulated fallback for preview or permission failures

### Desk App Manifest

A structured plan for a generated Linux kiosk app before files are written.

Suggested shape:

```json
{
  "schemaVersion": 1,
  "deviceId": "taishan-black",
  "appName": "voice_mood",
  "screen": { "width": 480, "height": 360 },
  "capabilityIds": ["screen.kiosk-480x360", "mic.browser-rms", "status.board-http"],
  "files": [
    { "path": "index.html", "role": "entry" },
    { "path": "style.css", "role": "style" },
    { "path": "app.js", "role": "browser-app" },
    { "path": "hardware_app.py", "role": "device-probe" },
    { "path": "manifest.json", "role": "metadata" }
  ],
  "runtimeServices": ["chromium-kiosk", "board-http", "python-probe"],
  "acceptanceChecks": [
    "screen serves the expected build id",
    "kiosk process uses the selected device profile",
    "microphone permission is granted or simulated fallback is visible"
  ],
  "allowedWriteSurface": "generated-app-files-only"
}
```

The manifest becomes the seam between AI planning and AI code writing. The
generator should first decide the capability contracts and file plan, then write
the files against that validated plan.

### Device Evidence

Structured proof collected after local build, deployment, and runtime checks.
Examples:

- generated build id and manifest id
- local `node --check` result
- local `python -m py_compile` result
- uploaded release path and static target path
- board HTTP `/api/status`
- static file build id
- `hardware-result.json`
- kiosk process user and arguments
- display geometry
- audio device list and runtime permission state
- browser console or app debug values when available

Device Evidence should feed repair prompts. If an app fails on the board, the AI
should receive the evidence and patch the generated files rather than starting a
new app from raw chat.

## Recommended Module Shape

```text
src/deviceProfiles/
  Linux Device Profile registry and public-safe profile views.

src/capabilities/
  Capability Contract registry, applicability checks, prompt fragments,
  validation probes, and simulation defaults.

src/appIntent/
  Natural-language request interpretation for Desk apps.

src/appManifest/
  Desk App Manifest schema, normalization, validation, and prompt builders.

src/appGeneration/
  LLM adapter, manifest generation, file generation, fallback templates, and
  generated-file contract validation.

src/buildArtifact/
  generated/current workspace, build ids, manifest persistence, local JS/Python
  validation, and preview capture.

src/deployPlans/
  Device-specific release roots, backup roots, static roots, ownership,
  service restarts, and kiosk launch plans.

src/remoteRunner/
  SSH, FRP, password fallback, upload bundle execution, endpoint retry, and
  route evidence.

src/deviceAdapters/
  Concrete adapters for Taishan kiosk, board HTTP status, audio capture probes,
  systemd services, display checks, and future Linux device families.

src/workflows/
  Generate, build, deploy, verify, market deploy, and evidence-based repair
  workflows with structured outcomes.
```

The HTTP route layer should call workflows. It should not know Chromium flags,
audio-user environment variables, FRP retry policy, or generated-code prompt
contracts.

## Workflow Design

### Generate

```text
POST /api/generate
  -> resolve Linux Device Profile
  -> interpret app intent
  -> select Capability Contracts
  -> generate Desk App Manifest
  -> validate manifest against device profile
  -> generate files from manifest
  -> validate generated file contracts
  -> write build artifact
```

### Build

```text
POST /api/build
  -> load build artifact
  -> validate required files
  -> node --check app.js
  -> python -m py_compile hardware_app.py
  -> attach compile evidence to manifest
  -> capture preview
```

### Deploy

```text
POST /api/deploy
  -> resolve device profile
  -> load and build artifact
  -> create Deploy Plan from device profile and manifest
  -> upload release bundle
  -> run device-side Python probe
  -> back up and replace static directory
  -> restart board service
  -> relaunch kiosk through device adapter
  -> collect Device Evidence
```

### Verify

```text
POST /api/verify
  -> query board HTTP status
  -> compare expected build id across browser app, static files, manifest, and
     hardware result
  -> check kiosk process user/args
  -> check display geometry
  -> run capability-specific probes
  -> return Verification Report
```

### Repair

```text
user feedback + Device Evidence
  -> classify failure category
  -> select affected capability contract
  -> patch generated files within Desk App Manifest
  -> rebuild
  -> redeploy or ask for confirmation
```

## Device Expansion Strategy

Adding a new Linux device should not require editing the generation prompt by
hand. The process should be:

1. Create a Linux Device Profile.
2. Attach supported Capability Contracts.
3. Add or reuse Device Adapters for status, deploy, kiosk, and probes.
4. Run profile validation against a live device.
5. Add at least one acceptance app for the profile.

Example future profiles:

```text
taishan-black
taishan-gray
taishan-transparent
rk3576-k7
walnutpi-screen
generic-debian-kiosk
generic-ubuntu-touchscreen
```

Capabilities should be portable when the runtime path is portable. For example,
`mic.browser-rms` can apply to many Chromium kiosk devices, but each device
profile may provide a different audio user, audio stack, and permission probe.

## Preview And Simulation Levels

Desk should be honest about what has been proven:

```text
L1 Local Browser Preview
  Same generated files rendered locally. Good for layout and basic JS.

L2 Device-Sized Kiosk Preview
  480x360 or profile-specific viewport with no scrolling and fixed assets.

L3 Capability Simulation
  Simulated mic levels, board status, GPIO states, sensor readings, camera
  frames, or network states inside the app.

L4 Real Device Verification
  Uploaded release, running kiosk, real `/api/status`, real hardware result,
  process args, and capability probes.
```

Do not present L1-L3 as proof that the target hardware works. They are feedback
surfaces. L4 is the source of truth.

## Migration Plan

### Phase 1: Name The Domain

- Add a Desk glossary for Linux Device Profile, Capability Contract, Desk App
  Manifest, Deploy Plan, Device Evidence, Verification Report, and Repair Loop.
- Keep the existing `/api/generate`, `/api/build`, `/api/deploy`, and
  `/api/verify` routes unchanged.

### Phase 2: Capability Contracts

- Move microphone prompt rules into `src/capabilities/micBrowserRms.mjs`.
- Add contracts for screen, board status, and hardware result.
- Add tests that prompt generation includes contract text only when the
  manifest selects the capability.

### Phase 3: Desk App Manifest

- Generate and validate manifest before file generation.
- Enforce selected capability ids and allowed write surface.
- Keep compatibility with the existing five generated files.

### Phase 4: Device Profiles And Deploy Plans

- Deepen the current `src/devices.mjs` into `src/deviceProfiles/`.
- Move profile-specific kiosk launch logic into deploy plans or adapters.
- Keep Taishan black's `lckfb` audio/kiosk behavior as a regression test.

### Phase 5: Evidence-Based Repair

- Store Device Evidence with each deployment.
- Build repair prompts from user feedback plus the latest evidence.
- Patch generated files instead of regenerating the whole app when possible.

## Near-Term Acceptance Criteria

- A microphone app generated from scratch uses the `mic.browser-rms` contract
  without manual prompt edits.
- Deploying to `taishan-black` launches Chromium as `lckfb` with microphone
  permission handling.
- Deploying to a profile without microphone support refuses or simulates mic
  behavior explicitly instead of generating misleading code.
- Verification reports capability-specific evidence, not only generic deploy
  success.
- Adding a new Linux device profile requires adding profile data and adapters,
  not rewriting generation or deployment workflows.
