import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("Desk frontend uses VibeBoard family branding without changing the workbench layout", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  const css = await readFile(new URL("../styles.css", import.meta.url), "utf8");

  assert.match(html, /<title>VibeBoard Desk<\/title>/);
  assert.match(html, /VibeBoard Desk/);
  assert.match(html, /AI Hardware Workbench/);
  assert.match(html, /AI 工作流/);
  assert.match(html, /Linux 小屏预览/);
  assert.match(html, /设备证据/);
  assert.match(html, /模型/);
  assert.match(html, /运行状态/);
  assert.doesNotMatch(html, /VibeBoard Linux/);
  assert.doesNotMatch(html, /Hardware Vibe Coding MVP/);
  assert.doesNotMatch(html, /Agent Chat/);
  assert.doesNotMatch(html, /Live Hardware Preview/);

  assert.match(css, /--platform-accent:\s*#38bdf8/);
  assert.match(css, /\.platform-subtitle/);
  assert.match(css, /\.platform-stage-strip/);
});
