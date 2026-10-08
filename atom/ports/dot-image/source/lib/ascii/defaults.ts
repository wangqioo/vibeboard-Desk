import type {
  AsciiFontSpec,
  AsciiLookupCacheOptions,
  AsciiRenderOptions,
  AsciiSamplingLayout,
} from "./types";

/**
 * Default ASCII character set using all 95 printable ASCII characters.
 * Matches Alex Harri's reference set: codepoints 0x20 (space) through 0x7E (~).
 */
export const DEFAULT_CHARSET: string[] = Array.from(
  { length: 95 },
  (_, index) => String.fromCodePoint(32 + index)
);

/**
 * Default monospace font specification.
 * Courier New is widely available and renders consistently across platforms.
 */
export const DEFAULT_FONT: AsciiFontSpec = {
  family: "Courier New, Courier, monospace",
  size: 12,
  weight: "normal",
  style: "normal",
  lineHeight: 1,
};

/**
 * 6D sampling layout with staggered circles for optimal coverage.
 * Internal circles capture the shape within each cell.
 * External circles capture neighboring regions for directional contrast.
 *
 * Layout (internal circles):
 *   [0] [1]   <- top row (slightly lower on left, higher on right)
 *   [2] [3]   <- middle row
 *   [4] [5]   <- bottom row (slightly lower on left, higher on right)
 *
 * This staggered arrangement minimizes gaps and captures diagonal features.
 */
export const DEFAULT_SAMPLING_LAYOUT: AsciiSamplingLayout = {
  // Internal sampling circles (6D) - positions as fractions of cell dimensions
  // x, y are center positions (0-1), r is radius as fraction of cell height
  internal: [
    { x: 0.25, y: 0.2, r: 0.18 }, // top-left
    { x: 0.75, y: 0.14, r: 0.18 }, // top-right (slightly higher)
    { x: 0.25, y: 0.5, r: 0.18 }, // middle-left
    { x: 0.75, y: 0.5, r: 0.18 }, // middle-right
    { x: 0.25, y: 0.86, r: 0.18 }, // bottom-left (slightly lower)
    { x: 0.75, y: 0.8, r: 0.18 }, // bottom-right
  ],

  // External sampling circles (10) for directional contrast enhancement
  // Index order is aligned to Alex Harri's widened influence mapping:
  // 0: top-left-center, 1: top-right-center, 2: top-left, 3: top-right,
  // 4: left-center, 5: right-center, 6: bottom-left, 7: bottom-right,
  // 8: bottom-left-center, 9: bottom-right-center
  external: [
    { x: 0.25, y: -0.15, r: 0.15 }, // 0: top-left-center
    { x: 0.75, y: -0.15, r: 0.15 }, // 1: top-right-center
    { x: 0, y: 0, r: 0.15 }, // 2: top-left corner
    { x: 1, y: 0, r: 0.15 }, // 3: top-right corner
    { x: -0.15, y: 0.5, r: 0.15 }, // 4: left center
    { x: 1.15, y: 0.5, r: 0.15 }, // 5: right center
    { x: 0, y: 1, r: 0.15 }, // 6: bottom-left corner
    { x: 1, y: 1, r: 0.15 }, // 7: bottom-right corner
    { x: 0.25, y: 1.15, r: 0.15 }, // 8: bottom-left-center
    { x: 0.75, y: 1.15, r: 0.15 }, // 9: bottom-right-center
  ],

  // Mapping from internal circles to external circles that influence them
  // Each internal circle is affected by external samples in its direction
  externalInfluence: [
    [0, 1, 2, 4], // top-left internal
    [0, 1, 3, 5], // top-right internal
    [2, 4, 6], // middle-left internal
    [3, 5, 7], // middle-right internal
    [4, 6, 8, 9], // bottom-left internal
    [5, 7, 8, 9], // bottom-right internal
  ],
};

/**
 * Default cache options for quantized vector lookups.
 * 10 levels provides good quality while keeping cache size manageable.
 * Total possible keys: 10^6 = 1,000,000 (approximately 7.6MB if fully saturated)
 */
export const DEFAULT_CACHE_OPTIONS: AsciiLookupCacheOptions = {
  quantizationLevels: 10,
};

/**
 * Default render options combining all defaults.
 */
export const DEFAULT_RENDER_OPTIONS: Required<
  Omit<AsciiRenderOptions, "maxWidth" | "maxHeight">
> & {
  maxWidth: number | null;
  maxHeight: number | null;
} = {
  maxWidth: null,
  maxHeight: null,
  cellWidth: 8,
  cellHeight: 14,
  font: DEFAULT_FONT,
  charset: DEFAULT_CHARSET,
  sampleCount: 3,
  brightness: 0,
  contrast: 0,
  contrastExponent: 2,
  directionalContrastExponent: 4,
  output: "both",
  foreground: "#ffffff",
  background: "#000000",
  layout: DEFAULT_SAMPLING_LAYOUT,
  cache: DEFAULT_CACHE_OPTIONS,
  ledMode: false,
  renderScale: 1,
};

/**
 * Merge user options with defaults, handling nested objects.
 */
export const mergeOptions = (
  options: AsciiRenderOptions
): typeof DEFAULT_RENDER_OPTIONS => ({
  ...DEFAULT_RENDER_OPTIONS,
  ...options,
  font: { ...DEFAULT_FONT, ...options.font },
  layout: options.layout ?? DEFAULT_SAMPLING_LAYOUT,
  cache: { ...DEFAULT_CACHE_OPTIONS, ...options.cache },
});
