import { deriveCellDimensions } from "./font-metrics";
import type { AsciiRenderOptions } from "./types";

/**
 * Simplified ASCII render parameters exposed to the UI. `ledMode` is not part of
 * this set — it is driven by the page-level mode (ASCII vs LED).
 */
export interface AsciiParameters {
  foreground: string;
  background: string;
  brightness: number;
  contrastExponent: number;
  columns: number;
}

export const DEFAULT_ASCII_PARAMETERS: AsciiParameters = {
  foreground: "#ffffff",
  background: "#000000",
  brightness: 0,
  contrastExponent: 2,
  columns: 128,
};

const ASCII_FONT_FAMILY = "Courier New, Courier, monospace";

/**
 * Convert simplified AsciiParameters to full AsciiRenderOptions.
 * Derives cell dimensions from target columns and source image width.
 * `renderScale` supersamples the output for crisper glyphs (1 = off).
 */
export function toAsciiRenderOptions(
  params: AsciiParameters,
  imageWidth: number,
  ledMode: boolean,
  renderScale = 1
): AsciiRenderOptions {
  const targetCellWidth = Math.max(1, Math.floor(imageWidth / params.columns));
  const { cellWidth, cellHeight, fontSize } = deriveCellDimensions(
    targetCellWidth,
    ASCII_FONT_FAMILY
  );

  // LED mode uses square cells since it doesn't render text.
  const effectiveCellHeight = ledMode ? cellWidth : cellHeight;

  return {
    foreground: params.foreground,
    background: params.background,
    brightness: params.brightness,
    contrast: 0,
    contrastExponent: Math.max(1, params.contrastExponent),
    directionalContrastExponent: Math.min(
      8,
      Math.max(1, params.contrastExponent * 2)
    ),
    cellWidth,
    cellHeight: effectiveCellHeight,
    font: { family: ASCII_FONT_FAMILY, size: fontSize },
    maxWidth: null,
    sampleCount: 3,
    output: "both",
    ledMode,
    renderScale,
  };
}
