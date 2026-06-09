import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { injectHardwareAppContracts } from "../src/hardwareContracts.mjs";

const execFileP = promisify(execFile);

test("injectHardwareAppContracts preserves executable Python single quoted strings", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "vb-hardware-contract-"));
  try {
    const file = path.join(dir, "hardware_app.py");
    const wrapped = injectHardwareAppContracts(`
import json

BUILD_ID = 'model-build'
PROMPT = 'Pet voice sync'

print(json.dumps({
    'build_id': BUILD_ID,
    'prompt': PROMPT,
    'available_apis': ['/api/status', './hardware-result.json'],
    'pet_state': 'listening'
}))
`, "vb-test-123");

    await writeFile(file, wrapped, "utf8");
    await execFileP("python3", ["-m", "py_compile", file]);
    const { stdout } = await execFileP("python3", [file]);
    const result = JSON.parse(stdout);

    assert.equal(result.build_id, "vb-test-123");
    assert.equal(result.runtime, "executed_on_board");
    assert.equal(result.prompt, "Pet voice sync");
    assert.deepEqual(result.available_apis, ["/api/status", "./hardware-result.json"]);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
