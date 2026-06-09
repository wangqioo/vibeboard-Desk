const MIC_BROWSER_RMS_PROMPT = `Microphone capability contract: mic.browser-rms
- Use navigator.mediaDevices.getUserMedia({ audio: true }) and provide a simulated fallback when permission or hardware is unavailable.
- Measure input with AnalyserNode.getFloatTimeDomainData() and RMS from time-domain samples; do not use frequency-bin averages as the primary volume signal.
- Calibrate a noiseFloor for roughly the first 90 animation frames, with a minimum around 0.003, so board fan noise is treated as background.
- Apply an additional start gate before mapping volume: const startGate = Math.max(0.0045, noiseFloor * 0.55); const adjusted = Math.max(0, rms - noiseFloor - startGate).
- Map normal volume with Math.pow(adjusted * 12, 0.75) * 100, and map transient peaks only when peak > noiseFloor * 5.8 + startGate using peak * 120.
- Smooth as an envelope with fast attack and slow release: const smoothing = vol >= smoothVolume ? 0.32 : 0.12; smoothVolume = smoothVolume * (1 - smoothing) + vol * smoothing.
- Keep debug status visible on small screens for mic apps, including volume percent, rms, and gate values.`;

const SCREEN_KIOSK_480X360_PROMPT = `Screen capability contract: screen.kiosk-480x360
- Target the Linux Chromium kiosk viewport as a fixed 480x360 display.
- Keep controls and status text legible at 480x360 without relying on scrolling for primary operation.
- Avoid layouts that require pointer precision near screen edges; leave practical margins for touch or small display overscan.
- Prefer resilient CSS sizing with bounded panels, stable aspect ratios, and no viewport-width font scaling.`;

const STATUS_BOARD_HTTP_PROMPT = `Status capability contract: status.board-http
- Read board status from the Desk HTTP status APIs instead of inventing browser-only device state.
- Treat unavailable status as a visible degraded state, not as a fatal app failure.
- Keep status polling lightweight and avoid tight retry loops on the board.`;

const HARDWARE_RESULT_PYTHON_PROMPT = `Hardware result capability contract: hardware-result.python
- Treat Python hardware execution as an asynchronous result source.
- Show pending, success, and failure states distinctly so generated apps can explain hardware outcomes.
- Do not assume Python code can run directly in the browser; route hardware execution through the board/server integration.`;

export const CAPABILITY_CONTRACTS = [
  {
    id: "mic.browser-rms",
    label: "Browser microphone RMS input",
    description: "Sound-reactive browser input tuned for Linux Chromium kiosk devices with fan noise.",
    prompt: MIC_BROWSER_RMS_PROMPT,
    keywords: [
      "voice",
      "audio",
      "record",
      "recording",
      "speech",
      "sound",
      "mic",
      "microphone",
      "语音",
      "录音",
      "声音",
      "声控",
      "音量",
      "麦克风"
    ]
  },
  {
    id: "screen.kiosk-480x360",
    label: "480x360 Linux kiosk screen",
    description: "UI layout contract for small Linux Chromium kiosk displays.",
    prompt: SCREEN_KIOSK_480X360_PROMPT,
    keywords: [
      "screen",
      "display",
      "kiosk",
      "480x360",
      "480",
      "360",
      "layout",
      "ui",
      "界面",
      "屏幕",
      "显示",
      "小屏"
    ]
  },
  {
    id: "status.board-http",
    label: "Board HTTP status",
    description: "Board status reporting through Desk HTTP endpoints.",
    prompt: STATUS_BOARD_HTTP_PROMPT,
    keywords: [
      "status",
      "health",
      "board status",
      "device status",
      "online",
      "http",
      "状态",
      "在线",
      "设备状态"
    ]
  },
  {
    id: "hardware-result.python",
    label: "Python hardware result",
    description: "Asynchronous Python hardware execution results surfaced to generated apps.",
    prompt: HARDWARE_RESULT_PYTHON_PROMPT,
    keywords: [
      "python",
      "hardware",
      "result",
      "gpio",
      "execute",
      "execution",
      "run code",
      "硬件",
      "结果",
      "执行",
      "运行"
    ]
  }
];

export function listCapabilityContracts() {
  return CAPABILITY_CONTRACTS.map(contract => ({ ...contract, keywords: [...contract.keywords] }));
}

export function getCapabilityContract(id) {
  return CAPABILITY_CONTRACTS.find(contract => contract.id === id) || null;
}

export function validateCapabilityIds(capabilityIds = []) {
  const uniqueIds = [...new Set(capabilityIds)];
  const validIds = [];
  const unknownIds = [];

  for (const id of uniqueIds) {
    if (getCapabilityContract(id)) {
      validIds.push(id);
    } else {
      unknownIds.push(id);
    }
  }

  return { validIds, unknownIds };
}

export function resolveCapabilityContracts(capabilityIds = []) {
  return validateCapabilityIds(capabilityIds).validIds.map(id => getCapabilityContract(id));
}

export function inferCapabilityIdsFromPrompt(prompt = "") {
  const text = String(prompt || "").toLowerCase();
  return CAPABILITY_CONTRACTS
    .filter(contract => contract.keywords.some(keyword => text.includes(keyword.toLowerCase())))
    .map(contract => contract.id);
}

export function capabilityPromptSections(capabilityIds = []) {
  return resolveCapabilityContracts(capabilityIds)
    .map(contract => contract.prompt)
    .join("\n\n");
}
