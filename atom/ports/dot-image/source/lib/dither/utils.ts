import type { RGB } from "./types";

const HEX_COLOR_REGEX = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i;
const clampByte = (value: number) => Math.max(0, Math.min(255, value));

/**
 * Convert hex color to RGB
 * Copied from blue-noise-typescript/src/dither.ts:17-27
 */
export function hexToRgb(hex: string): RGB {
  const result = HEX_COLOR_REGEX.exec(hex);
  if (!result) {
    throw new Error(`Invalid hex color: ${hex}`);
  }
  return {
    b: Number.parseInt(result[3], 16),
    g: Number.parseInt(result[2], 16),
    r: Number.parseInt(result[1], 16),
  };
}

/**
 * Modulo wrap function for tiling noise texture
 * Copied from blue-noise-typescript/src/dither.ts:32-34
 */
export function wrap(m: number, n: number): number {
  return n % m;
}

/**
 * Apply contrast adjustment to image data
 * Uses the filter-effects contrast() linear transfer around mid-gray.
 */
export function applyContrast(
  imageData: ImageData,
  contrast: number
): ImageData {
  const clampedContrast = Math.max(-100, Math.min(100, contrast));
  if (clampedContrast === 0) {
    return imageData;
  }

  const amount = 1 + clampedContrast / 100;
  const midpoint = 128;
  const { data } = imageData;

  for (let i = 0; i < data.length; i += 4) {
    data[i] = clampByte(amount * (data[i] - midpoint) + midpoint);
    data[i + 1] = clampByte(amount * (data[i + 1] - midpoint) + midpoint);
    data[i + 2] = clampByte(amount * (data[i + 2] - midpoint) + midpoint);
  }

  return imageData;
}

/**
 * Apply brightness adjustment to image data
 * Uses the filter-effects brightness() linear multiplier.
 */
export function applyBrightness(
  imageData: ImageData,
  brightness: number
): ImageData {
  const clampedBrightness = Math.max(-100, Math.min(100, brightness));
  if (clampedBrightness === 0) {
    return imageData;
  }

  const amount = 1 + clampedBrightness / 100;
  const { data } = imageData;

  for (let i = 0; i < data.length; i += 4) {
    data[i] = clampByte(data[i] * amount);
    data[i + 1] = clampByte(data[i + 1] * amount);
    data[i + 2] = clampByte(data[i + 2] * amount);
  }

  return imageData;
}
