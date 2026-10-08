/**
 * Image sampling module for ASCII renderer
 *
 * Provides efficient sampling of image regions to extract feature vectors
 * for character matching. Uses luminance-based sampling with configurable
 * quality settings.
 */

import type { AsciiSamplingLayout, PreparedSamplingLayout } from "./types";

/**
 * Converts RGB color values to relative luminance
 *
 * Uses the ITU-R BT.709 standard for relative luminance calculation,
 * which accounts for human perception of different color channels.
 *
 * @param r - Red channel (0-255)
 * @param g - Green channel (0-255)
 * @param b - Blue channel (0-255)
 * @returns Luminance value normalized to 0-1 range
 */
export function rgbToLuminance(r: number, g: number, b: number): number {
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

/**
 * Generates sample offsets within a circle for efficient reuse
 *
 * Pre-computes deterministic sample positions within a unit circle, which are
 * later scaled to actual circle dimensions. Uses a low-discrepancy sunflower
 * pattern for uniform coverage and stable output across renders.
 *
 * @param sampleCount - Number of sample points to generate
 * @returns Float32Array with interleaved [x, y] coordinates
 */
function generateCircleSampleOffsets(sampleCount: number): Float32Array {
  const offsets = new Float32Array(sampleCount * 2);

  const goldenAngle = Math.PI * (3 - Math.sqrt(5));

  for (let i = 0; i < sampleCount; i++) {
    // Deterministic sunflower distribution within unit circle
    const t = (i + 0.5) / sampleCount;
    const radius = Math.sqrt(t);
    const angle = i * goldenAngle;

    offsets[i * 2] = radius * Math.cos(angle);
    offsets[i * 2 + 1] = radius * Math.sin(angle);
  }

  return offsets;
}

/**
 * Pre-computes sampling layouts for efficient runtime performance
 *
 * Generates sample offsets for all internal and external circles in the
 * sampling layout. These pre-computed offsets can be reused for every cell
 * in the image, significantly improving performance.
 *
 * @param layout - The sampling layout definition
 * @param cellWidth - Width of each ASCII cell in pixels
 * @param cellHeight - Height of each ASCII cell in pixels
 * @param sampleCount - Number of samples per circle
 * @returns Prepared layout with pre-computed offsets
 */
export function prepareSamplingLayout(
  layout: AsciiSamplingLayout,
  cellWidth: number,
  cellHeight: number,
  sampleCount: number
): PreparedSamplingLayout {
  const internalOffsets = layout.internal.map(() =>
    generateCircleSampleOffsets(sampleCount)
  );

  const externalOffsets = layout.external.map(() =>
    generateCircleSampleOffsets(sampleCount)
  );

  return {
    internalOffsets,
    externalOffsets,
    sampleCount,
    cellWidth,
    cellHeight,
    layout,
  };
}

/**
 * Samples luminance values within a circular region
 *
 * Takes multiple sample points within a circle and returns their average
 * luminance. Handles boundary conditions by clamping coordinates to image
 * edges, ensuring no out-of-bounds access.
 *
 * @param imageData - Source image data to sample from
 * @param centerX - X coordinate of circle center in pixels
 * @param centerY - Y coordinate of circle center in pixels
 * @param offsets - Pre-computed sample offsets (in unit circle coordinates)
 * @param imgWidth - Width of the source image
 * @returns Average luminance (0-1) of sampled region
 */
export function sampleCircle(
  imageData: ImageData,
  centerX: number,
  centerY: number,
  offsets: Float32Array,
  _imgWidth: number
): number {
  const { data, width, height } = imageData;
  const sampleCount = offsets.length / 2;
  let luminanceSum = 0;

  for (let i = 0; i < sampleCount; i++) {
    // Scale unit circle offsets to actual pixel coordinates
    const dx = offsets[i * 2];
    const dy = offsets[i * 2 + 1];

    // Clamp to image boundaries
    const x = Math.max(0, Math.min(width - 1, Math.round(centerX + dx)));
    const y = Math.max(0, Math.min(height - 1, Math.round(centerY + dy)));

    // Calculate pixel index in ImageData array
    const idx = (y * width + x) * 4;

    // Extract RGB and convert to luminance
    const r = data[idx];
    const g = data[idx + 1];
    const b = data[idx + 2];

    luminanceSum += rgbToLuminance(r, g, b);
  }

  return luminanceSum / sampleCount;
}

/**
 * Samples the internal feature vector for an ASCII cell
 *
 * Generates a 6-dimensional vector by sampling 6 circular regions within
 * the cell. This vector captures the internal structure and brightness
 * distribution of the image region.
 *
 * @param imageData - Source image data
 * @param cellX - X coordinate of cell top-left corner in pixels
 * @param cellY - Y coordinate of cell top-left corner in pixels
 * @param layout - Prepared sampling layout with pre-computed offsets
 * @returns 6D vector of luminance values (0-1)
 */
export function sampleInternalVector(
  imageData: ImageData,
  cellX: number,
  cellY: number,
  layout: PreparedSamplingLayout
): number[] {
  const vector: number[] = [];

  for (let i = 0; i < layout.layout.internal.length; i++) {
    const circle = layout.layout.internal[i];
    const offsets = layout.internalOffsets[i];

    // Scale circle position from normalized (0-1) to pixel coordinates
    const centerX = cellX + circle.x * layout.cellWidth;
    const centerY = cellY + circle.y * layout.cellHeight;

    // Scale circle radius (true circle based on cell height)
    const scaledOffsets = new Float32Array(offsets.length);
    const radius = circle.r * layout.cellHeight;

    for (let j = 0; j < offsets.length / 2; j++) {
      scaledOffsets[j * 2] = offsets[j * 2] * radius;
      scaledOffsets[j * 2 + 1] = offsets[j * 2 + 1] * radius;
    }

    const luminance = sampleCircle(
      imageData,
      centerX,
      centerY,
      scaledOffsets,
      imageData.width
    );

    vector.push(luminance);
  }

  return vector;
}

/**
 * Samples the external feature vector for an ASCII cell
 *
 * Generates a 10-dimensional vector by sampling 10 circular regions around
 * the cell boundary. This vector captures edge information and directional
 * contrast with neighboring regions.
 *
 * @param imageData - Source image data
 * @param cellX - X coordinate of cell top-left corner in pixels
 * @param cellY - Y coordinate of cell top-left corner in pixels
 * @param layout - Prepared sampling layout with pre-computed offsets
 * @returns 10D vector of luminance values (0-1)
 */
export function sampleExternalVector(
  imageData: ImageData,
  cellX: number,
  cellY: number,
  layout: PreparedSamplingLayout
): number[] {
  const vector: number[] = [];

  for (let i = 0; i < layout.layout.external.length; i++) {
    const circle = layout.layout.external[i];
    const offsets = layout.externalOffsets[i];

    // Scale circle position from normalized (0-1) to pixel coordinates
    const centerX = cellX + circle.x * layout.cellWidth;
    const centerY = cellY + circle.y * layout.cellHeight;

    // Scale circle radius (true circle based on cell height)
    const scaledOffsets = new Float32Array(offsets.length);
    const radius = circle.r * layout.cellHeight;

    for (let j = 0; j < offsets.length / 2; j++) {
      scaledOffsets[j * 2] = offsets[j * 2] * radius;
      scaledOffsets[j * 2 + 1] = offsets[j * 2 + 1] * radius;
    }

    const luminance = sampleCircle(
      imageData,
      centerX,
      centerY,
      scaledOffsets,
      imageData.width
    );

    vector.push(luminance);
  }

  return vector;
}

/**
 * Applies brightness and contrast adjustments to a feature vector
 *
 * Modifies luminance values in-place using the formula:
 * output = (input - 0.5) * contrast + 0.5 + brightness
 *
 * This allows fine-tuning of the ASCII output appearance by adjusting
 * the feature vectors before character matching.
 *
 * @param vector - Input feature vector (values typically 0-1)
 * @param brightness - Brightness adjustment (-1 to 1, where 0 is neutral)
 * @param contrast - Contrast multiplier (0-2, where 1 is neutral)
 * @returns New vector with adjustments applied
 */
export function applyBrightnessContrast(
  vector: number[],
  brightness: number,
  contrast: number
): number[] {
  return vector.map((value) => {
    // Apply contrast around midpoint, then add brightness
    let adjusted = (value - 0.5) * contrast + 0.5 + brightness;

    // Clamp to valid range
    adjusted = Math.max(0, Math.min(1, adjusted));

    return adjusted;
  });
}
