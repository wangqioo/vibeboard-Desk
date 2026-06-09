import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  GENERATED_FILE_NAMES,
  loadStaticMarketApps,
  mergeMarketApps,
  normalizeCatalogApps,
  readStaticMarketCode
} from "../src/marketCatalog.mjs";

test("normalizeCatalogApps maps title to name and applies defaults", () => {
  const apps = normalizeCatalogApps({
    apps: [{
      id: "app-1",
      title: "天气屏",
      preview_url: "market-apps/app-1/preview.png"
    }]
  });
  assert.equal(apps[0].name, "天气屏");
  assert.equal(apps[0].preview_url, "/market-apps/app-1/preview.png");
  assert.equal(apps[0].author, "community");
  assert.equal(apps[0].downloads, 0);
  assert.equal(apps[0].source, "static");
  assert.deepEqual(apps[0].files, GENERATED_FILE_NAMES);
});

test("mergeMarketApps keeps database apps before static apps and deduplicates by id", () => {
  const merged = mergeMarketApps(
    [{ id: "same", name: "DB App", source: "database" }],
    [
      { id: "same", name: "Static App", source: "static" },
      { id: "static-only", name: "Static Only", source: "static" }
    ]
  );
  assert.deepEqual(merged.map(app => app.name), ["DB App", "Static Only"]);
});

test("loadStaticMarketApps reads catalog.json from the market root", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "vb-market-"));
  await writeFile(path.join(root, "catalog.json"), JSON.stringify({
    apps: [{ id: "app-1", name: "鱼缸", downloads: "2" }]
  }));
  const apps = await loadStaticMarketApps(root);
  assert.equal(apps.length, 1);
  assert.equal(apps[0].name, "鱼缸");
  assert.equal(apps[0].downloads, 2);
});

test("readStaticMarketCode only returns generated app files", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "vb-market-code-"));
  const appDir = path.join(root, "app-1");
  await mkdir(appDir);
  await writeFile(path.join(appDir, "index.html"), "<html></html>");
  await writeFile(path.join(appDir, "style.css"), "body{}");
  await writeFile(path.join(appDir, "app.js"), "console.log(1)");
  await writeFile(path.join(appDir, "hardware_app.py"), "print({})");
  await writeFile(path.join(appDir, "manifest.json"), "{}");
  await writeFile(path.join(appDir, "secret.txt"), "nope");

  const files = await readStaticMarketCode(root, "app-1");
  assert.deepEqual(Object.keys(files), GENERATED_FILE_NAMES);
  assert.equal(files["secret.txt"], undefined);
});

test("readStaticMarketCode rejects path traversal app ids", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "vb-market-traversal-"));
  const files = await readStaticMarketCode(root, "../outside");
  assert.deepEqual(files, {});
});
