import { mergeOptions } from "./defaults";
import type { AsciiRenderOptions } from "./types";

const LED_GAP = 1;

// Baked-in bloom: bright cells are blurred and composited back additively to
// mimic the glow of a real LED matrix. Fixed defaults — not user-adjustable.
const BLOOM_INTENSITY = 0.7;
const BLOOM_THRESHOLD = 0.4;

type AnyCanvas = HTMLCanvasElement | OffscreenCanvas;
type AnyCtx = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

/** Create a canvas sized to the render, preferring OffscreenCanvas off-thread. */
const createCanvas = (width: number, height: number): AnyCanvas => {
  if (typeof OffscreenCanvas === "undefined") {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    return canvas;
  }
  return new OffscreenCanvas(width, height);
};

// Three-stop color ramp: unlit deep red -> pure red -> warm amber-white.
const LED_BLACK = [0x13, 0x02, 0x07] as const;
const LED_RED = [0xff, 0x00, 0x00] as const;
const LED_WHITE = [0xff, 0xd2, 0x7a] as const;

/** Interpolate the LED ramp; black at 0, red at the midpoint, amber-white at 1. */
const ledColor = (b: number): string => {
  const from = b < 0.5 ? LED_BLACK : LED_RED;
  const to = b < 0.5 ? LED_RED : LED_WHITE;
  const t = b < 0.5 ? b * 2 : (b - 0.5) * 2;
  const r = Math.round(from[0] + (to[0] - from[0]) * t);
  const g = Math.round(from[1] + (to[1] - from[1]) * t);
  const bl = Math.round(from[2] + (to[2] - from[2]) * t);
  return `rgb(${r}, ${g}, ${bl})`;
};

/**
 * Render a brightness grid as an LED display simulation.
 * Each cell is drawn as a horizontal bar whose width encodes brightness
 * and whose color runs from a deep unlit red through red to warm amber-white.
 */
export const renderLedToImageData = (
  brightnessGrid: number[][],
  options: AsciiRenderOptions = {}
): ImageData => {
  const opts = mergeOptions(options);

  // Supersample the output only (crisper bar edges when upscaled).
  const scale = Math.max(1, opts.renderScale);
  const cellWidth = opts.cellWidth * scale;
  const cellHeight = opts.cellHeight * scale;
  const gap = LED_GAP * scale;

  const rows = brightnessGrid.length;
  const columns = brightnessGrid[0]?.length ?? 0;
  const width = columns * cellWidth;
  const height = rows * cellHeight;

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d") as AnyCtx | null;
  if (!ctx) {
    throw new Error("Failed to get canvas 2D context");
  }

  // Fill entire canvas with the unlit LED color (deep near-black red)
  ctx.fillStyle = ledColor(0);
  ctx.fillRect(0, 0, width, height);

  const halfGap = gap / 2;
  const maxBarWidth = cellWidth - gap;
  const barHeight = cellHeight - gap;

  // Collect bright cells for a bloom pass while drawing the base layer.
  const bloom = BLOOM_INTENSITY;
  const threshold = BLOOM_THRESHOLD;
  const bloomCtx =
    bloom > 0 ? (createCanvas(width, height).getContext("2d") as AnyCtx) : null;

  for (let row = 0; row < rows; row++) {
    const brightnessRow = brightnessGrid[row];
    const y = row * cellHeight + halfGap;

    for (let col = 0; col < columns; col++) {
      const b = brightnessRow[col];
      if (b <= 0) {
        continue;
      }

      const x = col * cellWidth + halfGap;

      ctx.fillStyle = ledColor(b);

      // Width scales from 50% (red) to 100% (white); height is always full
      const barWidth = (0.5 + 0.5 * b) * maxBarWidth;
      ctx.fillRect(x, y, barWidth, barHeight);

      // Seed the bloom layer with the brightest cells (drawn full-cell so the
      // blur spreads an even glow) weighted by how far past the threshold.
      if (bloomCtx && b >= threshold) {
        const span = Math.max(0.001, 1 - threshold);
        bloomCtx.globalAlpha = Math.min(1, (b - threshold) / span);
        bloomCtx.fillStyle = ledColor(b);
        bloomCtx.fillRect(x, y, maxBarWidth, barHeight);
      }
    }
  }

  // Composite the bloom layer back additively across several progressively
  // wider, softer blur passes. This mimics Unreal's mip-chain bloom: a tight
  // pass keeps the core hot while wide passes spread a soft glow far beyond
  // each bright LED.
  if (bloomCtx) {
    const bloomSrc = bloomCtx.canvas as AnyCanvas;
    const passes = [
      { radius: 0.5, alpha: 0.55 },
      { radius: 1.5, alpha: 0.4 },
      { radius: 3.5, alpha: 0.28 },
      { radius: 7, alpha: 0.18 },
      { radius: 14, alpha: 0.1 },
    ];
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const pass of passes) {
      ctx.globalAlpha = Math.min(1, pass.alpha * bloom);
      ctx.filter = `blur(${maxBarWidth * pass.radius}px)`;
      ctx.drawImage(bloomSrc, 0, 0);
    }
    ctx.restore();
  }

  return ctx.getImageData(0, 0, width, height);
};
