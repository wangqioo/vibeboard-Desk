# VibeBoard Desk Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor VibeBoard Desk from a single-file MVP into tested modules while preserving HTTP behavior and board deployment semantics.

**Architecture:** Use `docs/architecture.md` as the source map. Extract deterministic modules first, then isolate runtime-heavy deploy and remote execution later. Keep `server.mjs` as the HTTP composition root until extracted modules have tests.

**Tech Stack:** Node.js ESM, built-in `node:test`, `assert/strict`, native HTTP server, `sql.js`, browser HTML/CSS/JS, shell scripts for board kiosk runtime.

---

## File Structure

- Create `src/devices.mjs`: device registry, defaults, env overrides, public config, endpoint ordering.
- Create `src/marketCatalog.mjs`: static catalog loading, static app code loading, DB/static merge helpers.
- Create `src/conversationStore.mjs`: sql.js schema setup and conversation/message persistence helpers.
- Create `src/modelSettings.mjs`: provider presets, model settings normalization, chat completions URL helper.
- Create `test/devices.test.mjs`: device registry behavior tests.
- Create `test/marketCatalog.test.mjs`: static catalog and app code tests.
- Create `test/conversationStore.test.mjs`: conversation store tests using in-memory sql.js.
- Create `test/modelSettings.test.mjs`: model settings normalization tests.
- Modify `package.json`: add `test` script using Node's built-in test runner.
- Modify `server.mjs`: import extracted modules and remove duplicated implementations.
- Keep `app.js`, `index.html`, `market.html`, `runtime/start-kiosk.sh` unchanged in the first pass except if server API shape forces a small compatibility fix.

## Guardrails

- Do not change public API paths.
- Do not change generated app file names.
- Do not change board deploy shell commands in the first pass.
- Do not change `runtime/start-kiosk.sh`.
- Preserve `taishan-transparent`, `taishan-gray`, and `taishan-black` ids.
- Preserve `VIBEBOARD_*` environment variable names.
- Preserve existing fallback behavior for missing model API keys.
- Treat `generated/current`, `previews`, `vibeboard.db`, and `tmp` as runtime state.

## Task 1: Add Test Runner

**Files:**
- Modify: `package.json`

- [ ] Add a `test` script:

```json
"scripts": {
  "start": "node server.mjs",
  "check": "node --check server.mjs && node --check app.js",
  "test": "node --test"
}
```

- [ ] Run `npm test`.

Expected before tests exist: exit 0 with zero discovered tests.

- [ ] Run `npm run check`.

Expected: `node --check server.mjs && node --check app.js` exits 0.

## Task 2: Extract Device Registry

**Files:**
- Create: `src/devices.mjs`
- Create: `test/devices.test.mjs`
- Modify: `server.mjs`

- [ ] Write failing tests for:
  - all three device ids are exposed;
  - default device is `taishan-gray`;
  - gray device honors `VIBEBOARD_BOARD_HOST`, `VIBEBOARD_BOARD_PORT`, `VIBEBOARD_FRP_HOST`, `VIBEBOARD_FRP_PORT`, `VIBEBOARD_BOARD_USER`, and `VIBEBOARD_BOARD_LABEL`;
  - invalid input falls back to current/default device;
  - public config includes no password value;
  - endpoint ordering deduplicates equal FRP/configured endpoints.

- [ ] Run `npm test test/devices.test.mjs` and confirm failure because `src/devices.mjs` does not exist.

- [ ] Implement:

```js
export const DEFAULT_BOARD_ROOTS = { ... };
export const DEVICE_PROFILES = { ... };
export function createBoardConfig(deviceId, env = process.env) { ... }
export function deviceIdFrom(input = {}, fallbackId = "taishan-gray") { ... }
export function publicBoardConfig(board, runtime = {}) { ... }
export function publicDeviceProfiles(env = process.env) { ... }
export function boardEndpoints(board) { ... }
export function endpointLabel(endpoint) { ... }
```

- [ ] Update `server.mjs` to import those functions/constants.

- [ ] Run `npm test test/devices.test.mjs`.

- [ ] Run `npm test` and `npm run check`.

## Task 3: Extract Market Catalog

**Files:**
- Create: `src/marketCatalog.mjs`
- Create: `test/marketCatalog.test.mjs`
- Modify: `server.mjs`

- [ ] Write failing tests for:
  - `normalizeCatalogApps` maps `title` to `name`;
  - preview URLs become root-relative;
  - missing authors default to `community`;
  - DB apps override static apps with the same id;
  - app code loading only returns expected generated file names;
  - path traversal app ids return empty code.

- [ ] Implement:

```js
export const GENERATED_FILE_NAMES = [...]
export function normalizeCatalogApps(data, generatedFileNames = GENERATED_FILE_NAMES) { ... }
export function mergeMarketApps(dbApps, staticApps) { ... }
export async function loadStaticMarketApps(rootDir, generatedFileNames = GENERATED_FILE_NAMES) { ... }
export async function readStaticMarketCode(rootDir, appId, generatedFileNames = GENERATED_FILE_NAMES) { ... }
```

- [ ] Update `server.mjs` market routes to use the module.

- [ ] Run `npm test test/marketCatalog.test.mjs`.

- [ ] Run `npm test` and `npm run check`.

## Task 4: Extract Conversation Store

**Files:**
- Create: `src/conversationStore.mjs`
- Create: `test/conversationStore.test.mjs`
- Modify: `server.mjs`

- [ ] Write failing tests for:
  - schema initializes on a new DB;
  - creating a conversation returns id/title;
  - appending the first user message updates the title;
  - deleting a conversation deletes messages;
  - messages list in creation order.

- [ ] Implement a store factory:

```js
export function createConversationStore(db, saveDb) {
  return {
    initSchema,
    listConversations,
    createConversation,
    deleteConversation,
    listMessages,
    appendMessage
  };
}
```

- [ ] Update `server.mjs` conversation routes to use the store.

- [ ] Run `npm test test/conversationStore.test.mjs`.

- [ ] Run `npm test` and `npm run check`.

## Task 5: Extract Model Settings

**Files:**
- Create: `src/modelSettings.mjs`
- Create: `test/modelSettings.test.mjs`
- Modify: `server.mjs`

- [ ] Write failing tests for:
  - default provider is DeepSeek;
  - MiniMax preset is supported;
  - custom provider can be enabled with base URL, model, and API key;
  - trailing slashes are trimmed;
  - `/chat/completions` is not appended twice.

- [ ] Implement:

```js
export const MODEL_PROVIDERS = { ... }
export function normalizeModelSettings(input = {}) { ... }
export function chatCompletionsUrl(baseUrl) { ... }
```

- [ ] Update `server.mjs` to import these.

- [ ] Run `npm test test/modelSettings.test.mjs`.

- [ ] Run `npm test` and `npm run check`.

## Task 6: Documentation Drift Pass

**Files:**
- Modify: `README.md`
- Modify: `docs/architecture.md`

- [ ] Align README with current code:
  - default SSH user;
  - provider presets;
  - package dependencies;
  - `server.mjs` file size;
  - current API list including `/api/board`, `/api/board-config`, and `/api/verify`.

- [ ] Run `npm test` and `npm run check`.

## Task 7: Stop Point Before Deploy Refactor

**Files:**
- None unless prior tasks require small follow-up fixes.

- [ ] Do not extract `remote-runner`, `desk-deployer`, or `golden-loop-verifier` until the lower-risk modules are green.
- [ ] Record remaining deploy-heavy refactor as the next phase.
- [ ] If a board is reachable and credentials are configured, run a smoke test against `/api/board`; otherwise document that live board verification was not run.

## Self-Review

- The plan covers the first low-risk refactor phase from `docs/architecture.md`.
- Deploy shell behavior is intentionally deferred.
- Every code-changing task has a test-first step.
- The public API and generated app contract are preserved.

## Continuation: Second Low-Risk Pass

### Task 8: Extract Golden Loop Result Construction

**Files:**
- Create: `src/goldenLoop.mjs`
- Create: `test/goldenLoop.test.mjs`
- Modify: `server.mjs`

- [x] Move section parsing, build id extraction, JSON parsing, check construction, and final result construction into a tested module.
- [x] Keep the SSH remote verification command in `server.mjs`.
- [x] Run `npm test test/goldenLoop.test.mjs`, `npm test`, and `npm run check`.

### Task 9: Extract Build Artifact Pure Helpers

**Files:**
- Create: `src/buildArtifact.mjs`
- Create: `test/buildArtifact.test.mjs`
- Modify: `server.mjs`

- [x] Move asset version rewriting into a tested module.
- [x] Move `BUILD_ID` and `PROMPT` parsing into a tested module.
- [x] Keep `generated/current` file-system operations in `server.mjs`.
- [x] Run `npm test test/buildArtifact.test.mjs`, `npm test`, and `npm run check`.

### Remaining Tasks

- [ ] Extract `desk-deployer` only after live board verification is available.

### Task 10: Extract Remote Runner Control Flow

**Files:**
- Modify: `src/remoteRunner.mjs`
- Modify: `test/remoteRunner.test.mjs`
- Modify: `server.mjs`

- [x] Add fake-exec tests for endpoint ordering, retryable connection failures, non-retryable failures, and final error construction.
- [x] Implement `runAcrossEndpoints`.
- [x] Wire `paramikoExec` and `opensshExec` through `runAcrossEndpoints` while keeping concrete SSH command construction in `server.mjs`.
- [x] Smoke-test transparent board through the local server:
  - `GET /api/board?deviceId=taishan-transparent`
  - `GET /api/status?deviceId=taishan-transparent`

### Task 17: Extract Desk Deployer Pure Helpers

**Files:**
- Create: `src/deskDeployer.mjs`
- Create: `test/deskDeployer.test.mjs`
- Modify: `server.mjs`
- Modify: `docs/architecture.md`

- [x] Add tests for deploy path construction, upload entry construction, board-side deploy command construction, deploy output parsing, and post-deploy verification failure shaping.
- [x] Move deterministic deploy path, upload entry, remote command, output parsing, and verification-failure construction into `deskDeployer`.
- [x] Keep deploy queueing, current-build loading, local build execution, SSH/upload execution, remote log reads, and live golden-loop verification in `server.mjs`.
- [x] Run `npm test test/deskDeployer.test.mjs`, `npm test`, and `npm run check`.
- [x] Do not run `/api/deploy` during this extraction; it writes board state and needs an explicit live-deploy verification window.

### Task 18: Extract Compile Manifest Construction

**Files:**
- Modify: `src/buildArtifact.mjs`
- Modify: `test/buildArtifact.test.mjs`
- Modify: `server.mjs`
- Modify: `docs/architecture.md`

- [x] Add a failing test for compile manifest merge order, compile metadata, target path, and deterministic `builtAt`.
- [x] Move compile manifest construction into `buildArtifact`.
- [x] Keep local syntax checks, Python compile execution, manifest file writing, and preview capture in `server.mjs`.
- [x] Run `npm test test/buildArtifact.test.mjs` and `npm run check`.

### Task 15: Extract Upload Command Construction

**Files:**
- Modify: `src/remoteRunner.mjs`
- Modify: `test/remoteRunner.test.mjs`
- Modify: `server.mjs`
- Modify: `docs/architecture.md`

- [x] Add tests for text upload command quoting, text upload base64 payloads, bundle payload encoding, and remote Python uploader command construction.
- [x] Move upload text command construction and bundle Python uploader command construction into `remoteRunner`.
- [x] Keep local file reads and actual SSH execution in `server.mjs`.
- [x] Run `npm test test/remoteRunner.test.mjs`, `npm test`, and `npm run check`.
- [x] Smoke-test transparent board through the local server without deploying:
  - `GET /api/board?deviceId=taishan-transparent`
  - `GET /api/status?deviceId=taishan-transparent`

### Task 16: Extract WSL SSH Helper

**Files:**
- Modify: `src/remoteRunner.mjs`
- Modify: `test/remoteRunner.test.mjs`
- Modify: `server.mjs`
- Modify: `docs/architecture.md`

- [x] Add fake-exec tests for WSL sshpass argument construction, stdin forwarding, success output, and failure metadata.
- [x] Move WSL-specific SSH argument construction and exec adapter into `remoteRunner`.
- [x] Keep Windows platform branch selection and fallback orchestration in `server.mjs`.
- [x] Remove the unused no-input WSL SSH wrapper from `server.mjs`.
- [x] Run `npm test test/remoteRunner.test.mjs`, `npm test`, and `npm run check`.
- [x] Attempt transparent board smoke through the local server:
  - `GET /api/board?deviceId=taishan-transparent`
  - `GET /api/status?deviceId=taishan-transparent`
- [x] Record that live smoke was blocked by the remote endpoint: direct `ssh -p 6223 linaro@150.158.146.192 hostname` also returned `Connection closed by 150.158.146.192 port 6223`.

### Task 11: Extract Golden Loop Remote Command Builder

**Files:**
- Modify: `src/goldenLoop.mjs`
- Modify: `test/goldenLoop.test.mjs`
- Modify: `server.mjs`

- [x] Add a test for the read-only remote verification script sections and shell quoting.
- [x] Move the golden-loop remote command builder into `goldenLoop` without changing command text.
- [x] Keep SSH execution in `server.mjs`.
- [x] Run `npm test test/goldenLoop.test.mjs`, `npm test`, and `npm run check`.

### Task 12: Extract Build Artifact Workspace Operations

**Files:**
- Modify: `src/buildArtifact.mjs`
- Modify: `test/buildArtifact.test.mjs`
- Modify: `server.mjs`
- Modify: `docs/architecture.md`

- [x] Add tests for reading generated files, loading build id/prompt from manifest or app constants, filling missing/empty files, and preserving bootstrap repair when `index.html` is missing.
- [x] Move `generated/current` file reads, writes, workspace loading, and bootstrap repair into `buildArtifact`.
- [x] Keep local syntax checks, Python compile, manifest compile metadata, preview capture, and board target metadata in `server.mjs`.
- [x] Reuse workspace helpers in normal generation, market publish fallback reads, and market deploy writes.
- [x] Run `npm test test/buildArtifact.test.mjs`, `npm test`, and `npm run check`.

### Task 13: Extract OpenSSH Key Auth Adapter

**Files:**
- Modify: `src/remoteRunner.mjs`
- Modify: `test/remoteRunner.test.mjs`
- Modify: `server.mjs`
- Modify: `docs/architecture.md`

- [x] Add fake-exec tests for OpenSSH argument construction, stdin forwarding, success output, and failure metadata.
- [x] Move OpenSSH key-auth argument construction and exec adapter into `remoteRunner`.
- [x] Keep endpoint retry/fallback orchestration in `server.mjs` through `runAcrossEndpoints`.
- [x] Keep password fallback and upload command construction in `server.mjs`.
- [x] Run `npm test test/remoteRunner.test.mjs`, `npm test`, and `npm run check`.

### Task 14: Extract Python Password Fallback Adapter

**Files:**
- Modify: `src/remoteRunner.mjs`
- Modify: `test/remoteRunner.test.mjs`
- Modify: `server.mjs`
- Modify: `docs/architecture.md`

- [x] Add fake-exec tests for password payload construction, Python/sshpass subprocess options, stdin forwarding, success output, and failure metadata.
- [x] Move Python/sshpass password fallback script, payload construction, and exec adapter into `remoteRunner`.
- [x] Keep endpoint retry/fallback orchestration in `server.mjs` through `runAcrossEndpoints`.
- [x] Keep upload command construction and WSL-specific SSH helpers in `server.mjs`.
- [x] Run `npm test test/remoteRunner.test.mjs`, `npm test`, and `npm run check`.
- [x] Smoke-test transparent board through the local server:
  - `GET /api/board?deviceId=taishan-transparent`
  - `GET /api/status?deviceId=taishan-transparent`
