import { createFontString } from "./characters";
import type { AsciiFontSpec } from "./types";

export interface FontMetrics {
  charWidth: number;
  charHeight: number;
  ascent: number;
  descent: number;
}

const metricsCache = new Map<string, FontMetrics>();

/**
 * Measure actual font metrics using the canvas TextMetrics API.
 * Results are cached by font string.
 */
export const measureFontMetrics = (font: AsciiFontSpec): FontMetrics => {
  const fontString = createFontString(font);
  const cached = metricsCache.get(fontString);
  if (cached) {
    return cached;
  }

  const canvas =
    typeof OffscreenCanvas === "undefined"
      ? document.createElement("canvas")
      : new OffscreenCanvas(1, 1);
  const ctx = canvas.getContext("2d") as
    | CanvasRenderingContext2D
    | OffscreenCanvasRenderingContext2D;
  if (!ctx) {
    throw new Error("Failed to get canvas 2D context for font measurement");
  }

  ctx.font = fontString;
  const tm = ctx.measureText("M");

  const metrics: FontMetrics = {
    charWidth: tm.width,
    charHeight: tm.fontBoundingBoxAscent + tm.fontBoundingBoxDescent,
    ascent: tm.fontBoundingBoxAscent,
    descent: tm.fontBoundingBoxDescent,
  };

  metricsCache.set(fontString, metrics);
  return metrics;
};

/**
 * Derive cell dimensions and font size from a target cell width and font family.
 * Measures the font at a reference size, then scales to fit the target width.
 */
export const deriveCellDimensions = (
  targetCellWidth: number,
  fontFamily: string
): { cellWidth: number; cellHeight: number; fontSize: number } => {
  const referenceFontSize = 100;
  const referenceMetrics = measureFontMetrics({
    family: fontFamily,
    size: referenceFontSize,
  });

  const scaleFactor = targetCellWidth / referenceMetrics.charWidth;
  const fontSize = Math.max(1, Math.round(referenceFontSize * scaleFactor));

  const actualMetrics = measureFontMetrics({
    family: fontFamily,
    size: fontSize,
  });

  return {
    cellWidth: targetCellWidth,
    cellHeight: Math.max(1, Math.ceil(actualMetrics.charHeight)),
    fontSize,
  };
};
