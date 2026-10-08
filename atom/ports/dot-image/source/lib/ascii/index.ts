/* biome-ignore-all lint/performance/noBarrelFile: Public API entry point */
/**
 * ASCII Rendering Library
 *
 * High-quality ASCII art renderer with shape-aware character selection
 * and contrast enhancement for sharp, cel-shaded results.
 *
 * @example
 * ```typescript
 * import { renderAscii, renderAsciiAsync } from "@/lib/ascii";
 *
 * // Synchronous rendering
 * const result = renderAscii(imageData, {
 *   contrastExponent: 2.0,
 *   directionalContrastExponent: 3.0,
 * });
 *
 * // Display as text
 * console.log(result.grid.join("\n"));
 *
 * // Or use the ImageData for canvas rendering
 * ctx.putImageData(result.imageData, 0, 0);
 *
 * // Async rendering with web worker
 * const asyncResult = await renderAsciiAsync(imageData, options);
 * ```
 */

// Character set utilities
export {
  buildCharacterSet,
  clearCharacterSetCache,
  computeCharacterVector,
  createFontString,
  getCachedCharacterSet,
  getCharacterSetCacheSize,
  normalizeVectors,
} from "./characters";
// Contrast enhancement
export {
  applyContrastEnhancement,
  applyDirectionalContrast,
  applyGlobalContrast,
} from "./contrast";
// Core rendering functions
export {
  initializePipeline,
  renderAscii,
  renderAsciiFromFile,
  renderAsciiFromImage,
  renderAsciiFromVideo,
  renderAsciiGrid,
  renderAsciiToImageData,
} from "./core";

// Defaults for customization
export {
  DEFAULT_CACHE_OPTIONS,
  DEFAULT_CHARSET,
  DEFAULT_FONT,
  DEFAULT_RENDER_OPTIONS,
  DEFAULT_SAMPLING_LAYOUT,
  mergeOptions,
} from "./defaults";
// Character lookup
export {
  createCharacterLookup,
  createLookupCache,
  findNearestCharacter,
  normalizeWithMaxValues,
  quantizeVector,
  squaredEuclideanDistance,
} from "./lookup";

// Sampling utilities
export {
  applyBrightnessContrast,
  prepareSamplingLayout,
  rgbToLuminance,
  sampleCircle,
  sampleExternalVector,
  sampleInternalVector,
} from "./sampling";
// Types
export type {
  AsciiCharacter,
  AsciiCharacterSet,
  AsciiCircle,
  AsciiFontSpec,
  AsciiLookupCacheOptions,
  AsciiOutputMode,
  AsciiPipelineState,
  AsciiRenderOptions,
  AsciiRenderResult,
  AsciiSamplingLayout,
  AsciiWorkerRequest,
  AsciiWorkerResponse,
  LookupCache,
  PreparedSamplingLayout,
} from "./types";
// Worker client for async rendering
export {
  AsciiWorkerClient,
  getSharedWorkerClient,
  isWorkerSupported,
  renderAsciiAsync,
} from "./worker-client";
