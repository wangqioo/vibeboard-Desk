# VibeBoard Desk Architecture

This document describes the current architecture of the VibeBoard Desk repository and the refactor seams that should be kept stable while the MVP evolves.

## Product Boundary

VibeBoard Desk is a small-screen web application generator and deployment console for Linux screen devices, currently centered on Taishan RK3566 boards running a 480x360 Chromium kiosk.

The product loop is:

1. A user describes a small hardware app in the browser.
2. The local Node backend generates five app files.
3. The backend validates the generated app locally.
4. The backend uploads a release to a selected board over SSH or FRP.
5. The board compiles and runs `hardware_app.py`.
6. The board serves the generated app from `taishan-screen/static`.
7. The kiosk relaunches Chromium at 480x360.
8. The backend verifies the golden loop by comparing build ids, board status, display geometry, and kiosk process arguments.

This is the Desk member of the VibeBoard family. It should stay distinct from the ESP-IDF-first Micro repository.

## Current Entry Points

- `server.mjs`: Local Node HTTP server. It owns routing, sql.js storage, model calls, app generation, build validation, preview capture, SSH transport, deployment, market APIs, board status proxying, and static file serving.
- `index.html`, `app.js`, `styles.css`: Main browser console. It owns chat, model settings, device selection, generated-file preview, board status display, conversation history, and deploy actions.
- `market.html`: Browser market page. It loads `/api/market` first, then falls back to `market-apps/catalog.json` when the backend is unavailable.
- `runtime/start-kiosk.sh`: Board-side Chromium kiosk launcher. It waits for X and HTTP, disables input-method popups, kills stale Chromium processes, then launches a 480x360 kiosk.
- `market-apps/`: Committed static app catalog.
- `generated/current/`, `previews/`, `vibeboard.db`: Runtime state. These are ignored by git and regenerated or updated by the local server.

## Runtime Data Flow

### Generation Flow

```text
Browser prompt
  -> POST /api/generate
  -> normalize model settings
  -> call OpenAI-compatible chat completions or use template fallback
  -> normalize generated files
  -> enforce file contracts
  -> write generated/current/{index.html,style.css,app.js,hardware_app.py,manifest.json}
  -> currentBuild in memory
```

The generated app contract is currently enforced by string checks:

- `index.html` links `./style.css` and `./app.js`.
- `app.js` includes `BUILD_ID`, `PROMPT`, `window.VibeBoardHardware`, `/api/status`, and `hardware-result.json`.
- `hardware_app.py` declares hardware APIs and is wrapped when needed to emit golden-loop fields.

### Build Flow

```text
POST /api/build
  -> load currentBuild
  -> version local asset links
  -> node --check generated/current/app.js
  -> python -m py_compile generated/current/hardware_app.py
  -> validate required files are non-empty
  -> rewrite manifest compile metadata
  -> capture preview asynchronously with Playwright
```

### Deployment Flow

```text
POST /api/deploy
  -> choose device id from request
  -> serialize deploys with deployQueue
  -> temporarily select BOARD with withDevice
  -> ensure current generated build is loaded and built
  -> create remote release directory
  -> upload app files and runtime/start-kiosk.sh as a base64 bundle
  -> run board-side compile and hardware program
  -> back up current static directory
  -> copy release files into target static directory
  -> restart taishan-screen.service
  -> kill and relaunch Chromium kiosk
  -> verify golden loop
```

### Market Flow

```text
GET /api/market
  -> load DB market apps
  -> load static market-apps/catalog.json
  -> merge, preferring DB rows by id

POST /api/market/:id/deploy
  -> load DB app or static app files
  -> write selected app into generated/current
  -> build current app
  -> deploy current app
```

### Conversation Flow

```text
Browser chat
  -> /api/conversations
  -> /api/conversations/:id/messages
  -> sql.js database persisted to vibeboard.db
```

The conversation store is local runtime state. It should not be treated as a source-of-truth marketplace.

## Current Architectural Friction

### 1. `server.mjs` is a shallow module

`server.mjs` has a very small external interface (`npm start`) but its implementation mixes nearly every product concept. A maintainer must understand devices, transport, generation, build artifacts, deployment, market apps, conversations, and static serving in one file.

The deletion test shows the module is not deep enough: deleting it does not concentrate complexity behind a smaller interface; it spreads every concept back into the route layer.

### 2. Device state is global and mutable

The server keeps `BOARD`, `knownHosts`, `activeEndpoint`, `boardPassword`, `deviceContextQueue`, and `deployQueue` as global mutable state. `withDevice` serializes device context switching, but the interface still relies on ambient state.

This makes concurrent status checks, market deploys, and normal deploys harder to reason about.

### 3. Frontend and backend duplicate device profiles

The backend defines device profiles for SSH and FRP. The frontend defines device profiles for labels, frame images, and screen placement. Some duplication is expected, but the ids and labels should have one canonical source.

### 4. Build artifact state is implicit

`currentBuild`, `generated/current`, `manifest.json`, and the preview image are one concept, but the interface is spread across many functions. Market deploys also mutate `generated/current`, so the current app is both a workbench artifact and a deployment staging area.

### 5. Remote execution is interleaved with product deployment logic

OpenSSH, sshpass-over-Python, WSL fallback, endpoint retry, upload bundle encoding, and deployment shell scripts live together. The transport rules are real product knowledge and should be isolated from the desk deployment workflow.

### 6. Documentation drift already exists

Observed drift:

- README previously flattened SSH users into one default. The gray board defaults to `root`; the transparent board profile defaults to `linaro`.
- README mentions OpenAI and Anthropic, while the current provider presets are DeepSeek, MiniMax, and custom OpenAI-compatible.
- `package.json` includes `better-sqlite3`, but current code imports `sql.js`.
- README still says `server.mjs` is 2600+ lines; it is now over 3000 lines.

These are small individually, but they make board setup and dependency decisions less trustworthy.

## Proposed Modules

### `device-registry`

Owns:

- device ids
- labels
- SSH and FRP endpoints
- deploy roots
- public device config
- default-device selection

Primary seam:

```text
getDeviceProfiles()
resolveDevice(input, env)
publicDeviceConfig(device, runtimeState)
```

Leverage: callers stop knowing how defaults, env overrides, FRP endpoints, and public-safe fields are assembled.

### `remote-runner`

Owns:

- endpoint ordering
- active endpoint memory
- OpenSSH key auth
- password fallback
- Python/sshpass execution
- stdin command execution
- base64 bundle upload
- remote error summaries

Primary seam:

```text
createRemoteRunner(device, credentials, options)
runner.exec(command, options)
runner.execWithInput(command, input, options)
runner.uploadBundle(entries, options)
runner.describeRoute()
```

Leverage: deploy code stops carrying transport detail. Tests can cover retry ordering and error summaries without a real board.

### `app-generation`

Owns:

- model provider normalization
- chat-completions payload construction
- JSON extraction
- generated file normalization
- fallback template generation
- generated app contract validation
- hardware result contract injection

Primary seam:

```text
generateApp(prompt, buildId, modelSettings, target)
validateGeneratedApp(files)
```

Leverage: route code asks for an app artifact, not for model parsing and fallback rules.

### `build-artifact`

Owns:

- build id creation
- `generated/current` reads and writes
- manifest read and write
- local app syntax checks
- hardware Python checks
- preview capture metadata

Primary seam:

```text
workspace.writeGenerated(app)
workspace.loadCurrent()
workspace.buildCurrent()
workspace.capturePreview()
```

Leverage: the workbench state becomes an explicit module instead of hidden global state.

### `desk-deployer`

Owns:

- release directory naming
- backup naming
- app file deployment
- board-side compile and hardware execution
- service restart
- kiosk relaunch
- deploy result shape

Primary seam:

```text
deployArtifact(artifact, device, runner)
```

Leverage: the deployment workflow becomes readable at the product level and transport can be swapped under it.

### `golden-loop-verifier`

Owns:

- board-side verification command
- section parsing
- build id extraction
- manifest/program/status parsing
- check list construction

Primary seam:

```text
verifyGoldenLoop(expectedBuildId, device, runner)
```

Leverage: verification becomes testable and can be reused by normal deploy, market deploy, and manual diagnostics.

### `market-catalog`

Owns:

- static catalog loading
- DB catalog loading
- app detail lookup
- code file loading
- DB/static merge semantics
- download increment rules

Primary seam:

```text
listMarketApps()
loadMarketAppCode(appId)
publishCurrentApp(app)
markDownloaded(appId)
```

Leverage: market routing no longer needs to know whether an app came from SQLite or static files.

### `conversation-store`

Owns:

- schema setup
- database persistence
- conversation CRUD
- message CRUD
- first-message title update

Primary seam:

```text
listConversations()
createConversation()
deleteConversation(id)
listMessages(conversationId)
appendMessage(conversationId, message)
```

Leverage: sql.js details are isolated, and future storage changes do not touch route code.

## Current Refactor Status

The first low-risk refactor pass is in place:

- `src/devices.mjs` owns the device registry, environment overrides, public board config, endpoint labels, and endpoint ordering.
- `src/marketCatalog.mjs` owns static catalog normalization, DB/static merge helpers, and static app code loading.
- `src/conversationStore.mjs` owns conversation/message schema and CRUD operations.
- `src/modelSettings.mjs` owns provider presets, model setting normalization, and chat completions URL construction.
- `src/goldenLoop.mjs` owns the read-only golden-loop remote command builder, section parsing, build-id extraction, JSON parsing, and check construction. `server.mjs` still owns the SSH execution call.
- `src/buildArtifact.mjs` owns build artifact string helpers, compile manifest construction, plus `generated/current` workspace reads, writes, loading, and bootstrap repair. Local syntax checks, Python compile execution, manifest file writing, and preview capture still live in `server.mjs`.
- `src/remoteRunner.mjs` owns endpoint ordering, retry/fallback control flow, remote error summarization, OpenSSH key-auth argument construction, the OpenSSH exec adapter, the Python/sshpass password fallback adapter, upload text/bundle command construction, and WSL-specific SSH execution helpers.
- `src/deskDeployer.mjs` owns deterministic deploy path construction, deploy upload entry construction, board-side deploy shell command construction, deploy output parsing, and post-deploy verification failure shaping. `server.mjs` still owns deploy queueing, current-build loading, local build execution, SSH/upload execution, remote log reads, and live golden-loop verification.
- `package.json` has an `npm test` script using Node's built-in test runner.

The transparent board has previously been reachable through `linaro@150.158.146.192:6223`; `/api/board?deviceId=taishan-transparent` and `/api/status?deviceId=taishan-transparent` have been smoke-tested through the local server. The latest WSL-helper refactor verification could not complete live board smoke because direct SSH to that FRP endpoint returned `Connection closed by 150.158.146.192 port 6223`. The remaining high-risk deploy work is extracting the live deploy orchestration itself, which should be done with focused tests and a live board verification pass once the board/FRP endpoint is reachable again.

## Recommended Refactor Order

### Phase 1: Establish testable pure seams

1. Add Node's built-in test runner with `npm test`.
2. Extract `device-registry`.
3. Test device defaulting, env overrides, public config shape, and invalid device fallback.
4. Update server routes to use the module without changing HTTP behavior.

This phase is low risk because it mostly moves pure data and deterministic functions.

### Phase 2: Extract artifact and market locality

1. Extract `build-artifact` enough to own `generated/current` and manifest operations.
2. Extract `market-catalog`.
3. Add tests for static catalog normalization and app-code loading.

This phase reduces accidental coupling between market deploys and normal workbench deploys.

### Phase 3: Extract remote execution

1. Move endpoint ordering and command execution into `remote-runner`.
2. Preserve all current fallback behavior.
3. Test route ordering, active endpoint reuse, and error summaries with fake exec adapters.

This phase is medium risk because it touches board transport behavior.

### Phase 4: Extract deployment and verification

1. Extract `golden-loop-verifier`.
2. Extract `desk-deployer`.
3. Keep the shell script bodies byte-for-byte equivalent at first.
4. Run local syntax tests, then verify against the board before claiming behavior parity.

This phase is highest risk and should only happen after the lower seams have tests.

### Phase 5: Reduce frontend/backend drift

1. Serve canonical device profiles from `/api/board-config`.
2. Let the frontend keep only view-specific frame metadata.
3. Align README defaults and provider names with code.
4. Remove unused dependencies if confirmed unused.

## Invariants To Preserve

- Generated apps are fixed at 480x360 and must not scroll.
- Generated HTML uses relative `./style.css` and `./app.js`.
- The PC preview iframes the same generated app that the board serves.
- The generated app can fetch `/api/status` and `./hardware-result.json`.
- Deploys upload files in a small number of remote connections.
- Kiosk launch includes `--window-position=0,0`, `--window-size=480,360`, and `--force-device-scale-factor=1`.
- Golden-loop verification compares local build id, board HTTP build id, board static build id, manifest id, hardware result id, board status, service state, display geometry, and kiosk process args.
- Board passwords stay out of source code.

## Immediate Follow-Up Candidates

1. Add a small `CONTEXT.md` glossary with canonical terms: Desk App, Generated App, Build Artifact, Device Profile, Remote Runner, Golden Loop, Market App, Kiosk Runtime.
2. Extract the remaining deploy orchestration behind `desk-deployer` after the pure helper layer has tests and live board deployment can be verified.
