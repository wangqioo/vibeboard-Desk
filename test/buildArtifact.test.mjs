import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  buildCompileManifest,
  extractBuildSeedFromAppSource,
  ensureGeneratedWorkspace,
  loadGeneratedWorkspace,
  readGeneratedFiles,
  withAssetVersion
} from "../src/buildArtifact.mjs";

test("withAssetVersion versions relative CSS and JS assets", () => {
  const html = '<link rel="stylesheet" href="./style.css"><script src="./app.js"></script>';
  assert.equal(
    withAssetVersion(html, "vb-test-123abc"),
    '<link rel="stylesheet" href="./style.css?v=vb-test-123abc"><script src="./app.js?v=vb-test-123abc"></script>'
  );
});

test("withAssetVersion replaces existing asset versions", () => {
  const html = '<link href="./style.css?v=old"><script src="./app.js?x=old"></script>';
  assert.equal(
    withAssetVersion(html, "vb-new-abcdef"),
    '<link href="./style.css?v=vb-new-abcdef"><script src="./app.js?v=vb-new-abcdef"></script>'
  );
});

test("withAssetVersion leaves absolute root assets untouched", () => {
  const html = '<link href="/style.css"><script src="/app.js"></script>';
  assert.equal(withAssetVersion(html, "vb-new-abcdef"), html);
});

test("extractBuildSeedFromAppSource reads BUILD_ID and PROMPT constants", () => {
  const seed = extractBuildSeedFromAppSource(`
    const BUILD_ID = "vb-mpyabc12-a1b2c3";
    const PROMPT = "做一个状态屏";
  `);
  assert.deepEqual(seed, {
    id: "vb-mpyabc12-a1b2c3",
    prompt: "做一个状态屏"
  });
});

test("extractBuildSeedFromAppSource falls back when constants are missing", () => {
  assert.deepEqual(extractBuildSeedFromAppSource("", {
    id: "preview",
    prompt: "waiting"
  }), {
    id: "preview",
    prompt: "waiting"
  });
});

test("buildCompileManifest preserves previous metadata and records compile state", () => {
  const manifest = buildCompileManifest({
    generatedManifest: {
      id: "vb-new-123abc",
      prompt: "new prompt",
      files: ["index.html"],
      target: "generated-target"
    },
    previousManifest: {
      id: "vb-new-123abc",
      prompt: "previous prompt",
      custom: "keep me",
      compile: { old: true }
    },
    pythonBin: "/usr/bin/python3",
    hardwareCompileOutput: {
      stdout: "",
      stderr: "local py_compile ok"
    },
    targetStatic: "/home/linaro/workspace/taishan-screen/static",
    builtAt: "2026-06-05T00:00:00.000Z"
  });

  assert.deepEqual(manifest, {
    id: "vb-new-123abc",
    prompt: "previous prompt",
    files: ["index.html"],
    target: "/home/linaro/workspace/taishan-screen/static",
    custom: "keep me",
    compile: {
      web: "node --check app.js",
      hardware: "/usr/bin/python3 -m py_compile hardware_app.py",
      hardwareLog: "local py_compile ok"
    },
    builtAt: "2026-06-05T00:00:00.000Z"
  });
});

async function withTempDir(fn) {
  const dir = await mkdtemp(path.join(os.tmpdir(), "vibeboard-build-artifact-"));
  try {
    return await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

const generatedFileNames = ["index.html", "style.css", "app.js", "hardware_app.py", "manifest.json"];

test("readGeneratedFiles only reads expected generated files that exist", async () => {
  await withTempDir(async dir => {
    await writeFile(path.join(dir, "index.html"), "<main></main>", "utf8");
    await writeFile(path.join(dir, "style.css"), "body{}", "utf8");
    await writeFile(path.join(dir, "notes.txt"), "ignore", "utf8");

    const files = await readGeneratedFiles(dir, generatedFileNames);

    assert.deepEqual(files, {
      "index.html": "<main></main>",
      "style.css": "body{}"
    });
  });
});

test("loadGeneratedWorkspace derives id and prompt from manifest before app constants", async () => {
  await withTempDir(async dir => {
    await writeFile(path.join(dir, "index.html"), "<main></main>", "utf8");
    await writeFile(path.join(dir, "style.css"), "body{}", "utf8");
    await writeFile(path.join(dir, "app.js"), 'const BUILD_ID = "vb-app-111aaa";\nconst PROMPT = "from app";', "utf8");
    await writeFile(path.join(dir, "manifest.json"), JSON.stringify({
      id: "vb-manifest-222bbb",
      prompt: "from manifest"
    }), "utf8");

    const workspace = await loadGeneratedWorkspace(dir, generatedFileNames);

    assert.equal(workspace.id, "vb-manifest-222bbb");
    assert.equal(workspace.prompt, "from manifest");
    assert.equal(workspace.dir, dir);
    assert.equal(workspace.built, true);
    assert.equal(workspace.deployed, false);
    assert.deepEqual(workspace.manifest, {
      id: "vb-manifest-222bbb",
      prompt: "from manifest"
    });
  });
});

test("ensureGeneratedWorkspace creates missing or empty generated files", async () => {
  await withTempDir(async dir => {
    await writeFile(path.join(dir, "index.html"), "", "utf8");
    await writeFile(path.join(dir, "app.js"), 'const BUILD_ID = "preview";\nconst PROMPT = "seed prompt";', "utf8");

    const workspace = await ensureGeneratedWorkspace({
      dir,
      generatedFileNames,
      fallbackSeed: { id: "preview", prompt: "fallback prompt" },
      makeFiles: ({ id, prompt }) => ({
        "index.html": `<main>${id}</main>`,
        "style.css": "body{}",
        "app.js": `const BUILD_ID = ${JSON.stringify(id)};\nconst PROMPT = ${JSON.stringify(prompt)};`,
        "hardware_app.py": "print('ok')",
        "manifest.json": JSON.stringify({ id, prompt })
      })
    });

    assert.equal(workspace.id, "preview");
    assert.equal(workspace.prompt, "seed prompt");
    assert.equal(await readFile(path.join(dir, "index.html"), "utf8"), "<main>preview</main>");
    assert.equal(await readFile(path.join(dir, "hardware_app.py"), "utf8"), "print('ok')");
  });
});

test("ensureGeneratedWorkspace can bootstrap the whole workspace when the entry file is missing", async () => {
  await withTempDir(async dir => {
    await writeFile(path.join(dir, "app.js"), 'const BUILD_ID = "vb-old-111aaa";\nconst PROMPT = "old prompt";', "utf8");

    const workspace = await ensureGeneratedWorkspace({
      dir,
      generatedFileNames,
      bootstrapFile: "index.html",
      fallbackSeed: { id: "preview", prompt: "fallback prompt" },
      makeFiles: ({ id, prompt }) => ({
        "index.html": `<main>${prompt}</main>`,
        "style.css": "body{}",
        "app.js": `const BUILD_ID = ${JSON.stringify(id)};\nconst PROMPT = ${JSON.stringify(prompt)};`,
        "hardware_app.py": "print('ok')",
        "manifest.json": JSON.stringify({ id, prompt })
      })
    });

    assert.equal(workspace.id, "preview");
    assert.equal(workspace.prompt, "fallback prompt");
    assert.equal(await readFile(path.join(dir, "app.js"), "utf8"), 'const BUILD_ID = "preview";\nconst PROMPT = "fallback prompt";');
  });
});
