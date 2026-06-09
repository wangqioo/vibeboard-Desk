import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("frontend exposes repair diagnosis controls in the status drawer", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  const app = await readFile(new URL("../app.js", import.meta.url), "utf8");
  const css = await readFile(new URL("../styles.css", import.meta.url), "utf8");

  assert.match(html, /id="repairPanel"/);
  assert.match(html, /id="repairCategory"/);
  assert.match(html, /id="repairContextBtn"/);
  assert.match(html, /id="repairRunBtn"/);

  assert.match(app, /repairContext: "\/api\/repair-context"/);
  assert.match(app, /repair: "\/api\/repair"/);
  assert.match(app, /renderRepairClassification/);
  assert.match(app, /requestRepairContext/);
  assert.match(app, /runRepair/);

  assert.match(css, /\.repair-panel/);
  assert.match(css, /\.repair-actions/);
});
