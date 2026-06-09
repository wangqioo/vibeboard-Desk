import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("start-kiosk logs under the user profile instead of hardcoded /tmp", async () => {
  const source = await readFile(new URL("../runtime/start-kiosk.sh", import.meta.url), "utf8");

  assert.match(source, /LOG_DIR=/);
  assert.match(source, /mkdir -p "\$PROFILE" "\$LOG_DIR"/);
  assert.match(source, /TAISHAN_SCREEN_KIOSK_LOG:-\$LOG_DIR\/taishan-screen-kiosk\.log/);
  assert.match(source, /--use-fake-ui-for-media-stream/);
  assert.doesNotMatch(source, /TAISHAN_SCREEN_KIOSK_LOG:-\/tmp\/taishan-screen-kiosk\.log/);
});
