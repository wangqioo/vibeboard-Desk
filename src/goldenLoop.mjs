export function parseFirstBuildId(text) {
  const match = String(text || "").match(/vb-[a-z0-9]+-[a-f0-9]{6}/i);
  return match ? match[0] : "";
}

export function parseJsonSafe(text) {
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return null;
  }
}

export function makeCheck(id, label, ok, evidence = "") {
  return {
    id,
    label,
    ok: Boolean(ok),
    evidence: String(evidence || "").trim().slice(0, 500)
  };
}

function shQuote(value) {
  return `'${String(value).replaceAll("'", `'"'"'`)}'`;
}

export function buildGoldenLoopRemoteCommand({ targetStatic, service, xAuthority = "/home/linaro/.Xauthority" }) {
  return [
    "set -u",
    `target=${shQuote(targetStatic)}`,
    `service=${shQuote(service)}`,
    `xauthority=${shQuote(xAuthority)}`,
    "http_get() { url=\"$1\"; if command -v curl >/dev/null 2>&1; then curl -fsS \"$url\"; elif command -v wget >/dev/null 2>&1; then wget -qO- \"$url\"; else python3 -c \"import sys,urllib.request;sys.stdout.write(urllib.request.urlopen(sys.argv[1], timeout=8).read().decode())\" \"$url\"; fi; }",
    "printf '__SECTION__:service\\n'",
    "systemctl is-active \"$service\" 2>/dev/null || true",
    "printf '\\n__SECTION__:http_index_id\\n'",
    "http_get http://127.0.0.1:8765/app.js 2>/dev/null | grep -o 'vb-[a-z0-9]*-[a-f0-9]*' | head -1 || true",
    "printf '\\n__SECTION__:static_index_id\\n'",
    "grep -o 'vb-[a-z0-9]*-[a-f0-9]*' \"$target/index.html\" \"$target/app.js\" 2>/dev/null | head -1 || true",
    "printf '\\n__SECTION__:manifest\\n'",
    "cat \"$target/manifest.json\" 2>/dev/null || true",
    "printf '\\n__SECTION__:program\\n'",
    "cat \"$target/hardware-result.json\" 2>/dev/null || true",
    "printf '\\n__SECTION__:status\\n'",
    "http_get http://127.0.0.1:8765/api/status 2>/dev/null || true",
    "printf '\\n__SECTION__:geometry\\n'",
    "DISPLAY=:0 XAUTHORITY=\"$xauthority\" xwininfo -root 2>/dev/null | grep -E 'Absolute upper-left|Width|Height' || true",
    "printf '\\n__SECTION__:kiosk\\n'",
    "{ ps -C chromium -o pid=,args= 2>/dev/null; ps -C chromium-bin -o pid=,args= 2>/dev/null; } | head -n 3 || true"
  ].join("\n");
}

export function parseGoldenLoopSections(raw) {
  const sections = {};
  let current = "";
  for (const line of String(raw || "").split(/\r?\n/)) {
    const marker = line.match(/^__SECTION__:(.+)$/);
    if (marker) {
      current = marker[1];
      sections[current] = "";
    } else if (current) {
      sections[current] += `${line}\n`;
    }
  }
  Object.keys(sections).forEach(key => {
    sections[key] = sections[key].trim();
  });
  return sections;
}

export function buildGoldenLoopResult({
  expectedId,
  sections,
  route = "",
  serviceName = "taishan-screen.service",
  checkedAt = new Date().toISOString()
}) {
  const manifest = parseJsonSafe(sections.manifest);
  const program = parseJsonSafe(sections.program);
  const status = parseJsonSafe(sections.status);
  const geometry = sections.geometry || "";
  const kiosk = sections.kiosk || "";
  const httpIndexId = parseFirstBuildId(sections.http_index_id);
  const staticIndexId = parseFirstBuildId(sections.static_index_id);
  const service = (sections.service || "").split(/\r?\n/).find(Boolean) || "";

  const checks = [
    makeCheck("program-runtime", "board program executed", program?.runtime === "executed_on_board", program ? JSON.stringify({
      build_id: program.build_id,
      runtime: program.runtime,
      hostname: program.hostname,
      cpu_temp_c: program.cpu_temp_c,
      loadavg: program.loadavg
    }) : sections.program),
    makeCheck("program-build-id", "program build id matches", program?.build_id === expectedId, program?.build_id || "missing"),
    makeCheck("http-build-id", "board HTTP build id matches", httpIndexId === expectedId, httpIndexId || sections.http_index_id || "missing"),
    makeCheck("static-build-id", "board static build id matches", staticIndexId === expectedId, staticIndexId || sections.static_index_id || "missing"),
    makeCheck("manifest-build-id", "manifest build id matches", manifest?.id === expectedId, manifest?.id || "missing"),
    makeCheck("status-api", "board status API responded", Boolean(status?.hostname || status?.network || status?.services), sections.status),
    makeCheck("service-active", `${serviceName} active`, service === "active", service || "missing"),
    makeCheck("display-geometry", "display geometry is 480x360", /Width:\s*480\b/.test(geometry) && /Height:\s*360\b/.test(geometry), geometry || "xwininfo unavailable"),
    makeCheck("kiosk-window", "kiosk launched at 480x360 scale 1", /--window-size=480,360/.test(kiosk) && /--force-device-scale-factor=1/.test(kiosk), kiosk || "chromium process not found")
  ];

  return {
    id: expectedId,
    ok: checks.every(check => check.ok),
    checkedAt,
    route,
    checks,
    raw: sections
  };
}
