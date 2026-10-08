/**
 * Contrast enhancement for ASCII rendering
 *
 * This module implements two types of contrast enhancement that create a cel-shading
 * effect for ASCII art:
 *
 * 1. **Global Contrast Enhancement** - Applies a power function to darken mid-tones
 *    while preserving the brightest values in each sampling vector.
 *
 * 2. **Directional Contrast Enhancement** - Uses external samples to sharpen edges
 *    by darkening regions adjacent to brighter neighbors, creating boundary emphasis.
 *
 * Both techniques help create more defined, cartoon-like shading that enhances
 * the visual quality of ASCII art by increasing contrast at boundaries and reducing
 * mid-tone gradients.
 */

/**
 * Apply global contrast enhancement to a sampling vector
 *
 * This function normalizes the vector to [0,1] based on its maximum component,
 * applies a power function to each component, then denormalizes back. This
 * "crunches" darker values toward black while preserving the brightest values.
 *
 * The effect creates stronger contrast by making dark regions darker while
 * keeping bright regions bright, similar to increasing contrast in image editing.
 *
 * @param vector - The sampling vector to enhance
 * @param exponent - Power function exponent (>1 increases contrast, 1 = no change)
 * @returns New array with contrast-enhanced values (immutable operation)
 *
 * @example
 * ```typescript
 * // Increase contrast with exponent of 2
 * const enhanced = applyGlobalContrast([0.5, 0.8, 1.0], 2.0);
 * // Result: [0.31, 0.64, 1.0] - darker values crushed, brightest preserved
 * ```
 */
export function applyGlobalContrast(
  vector: number[],
  exponent: number
): number[] {
  // No enhancement needed if exponent is 1
  if (exponent === 1) {
    return [...vector];
  }

  // Find maximum value for normalization
  const maxValue = Math.max(...vector);

  // If max is 0, all values are 0 - return copy
  if (maxValue === 0) {
    return vector.map(() => 0);
  }

  // Normalize, apply power function, then denormalize
  return vector.map((value) => {
    const normalized = value / maxValue;
    const adjusted = normalized ** exponent;
    return adjusted * maxValue;
  });
}

/**
 * Apply directional contrast enhancement using external samples
 *
 * This function sharpens boundaries by considering how bright neighboring regions
 * are. For each internal sample, we find the maximum brightness of external samples
 * that spatially affect it. We then normalize the internal value against this
 * external maximum before applying the power function.
 *
 * The effect is that regions adjacent to brighter neighbors get darkened more
 * aggressively, creating sharp boundaries and edge emphasis. This is key to the
 * cel-shading effect in ASCII art.
 *
 * @param internalVector - Brightness values from internal (character body) samples
 * @param externalVector - Brightness values from external (surrounding) samples
 * @param externalInfluence - Maps internal index -> array of external indices that affect it
 * @param exponent - Power function exponent (>1 increases edge sharpness)
 * @returns New array with directional contrast applied (immutable operation)
 *
 * @example
 * ```typescript
 * // Internal sample near bright external samples gets darkened more
 * const internal = [0.6, 0.7];
 * const external = [0.9, 0.3];
 * const influence = [[0], [1]];  // internal[0] affected by external[0], etc.
 * const result = applyDirectionalContrast(internal, external, influence, 2.0);
 * // internal[0] normalized against 0.9, internal[1] against 0.7
 * ```
 */
export function applyDirectionalContrast(
  internalVector: number[],
  externalVector: number[],
  externalInfluence: number[][],
  exponent: number
): number[] {
  // No enhancement needed if exponent is 1
  if (exponent === 1) {
    return [...internalVector];
  }

  return internalVector.map((internalValue, i) => {
    // Find the maximum external value that affects this internal sample
    const influencingIndices = externalInfluence[i] || [];

    // Get max of all external samples that affect this internal sample
    const maxExternal =
      influencingIndices.length > 0
        ? Math.max(...influencingIndices.map((idx) => externalVector[idx]))
        : 0;

    // Normalize against the greater of internal value or max external influence
    const maxValue = Math.max(internalValue, maxExternal);

    // If max is 0, this sample is completely dark
    if (maxValue === 0) {
      return 0;
    }

    // Normalize, apply power function, then denormalize
    const normalized = internalValue / maxValue;
    const adjusted = normalized ** exponent;
    return adjusted * maxValue;
  });
}

/**
 * Apply both directional and global contrast enhancement
 *
 * This function combines both enhancement techniques to create the final cel-shading
 * effect for ASCII rendering. The order is important:
 *
 * 1. **Directional contrast first** - Sharpens boundaries based on neighboring regions
 * 2. **Global contrast second** - Crushes mid-tones across the entire enhanced vector
 *
 * Applying directional first ensures that boundary sharpening happens before global
 * darkening, which creates cleaner edge definition. If global were applied first,
 * the darkening would reduce the relative differences that directional contrast
 * relies on to detect edges.
 *
 * @param internalVector - Brightness values from internal (character body) samples
 * @param externalVector - Brightness values from external (surrounding) samples
 * @param externalInfluence - Maps internal index -> array of external indices that affect it
 * @param globalExponent - Power function exponent for global contrast (>1 increases overall contrast)
 * @param directionalExponent - Power function exponent for directional contrast (>1 sharpens edges)
 * @returns New array with both enhancements applied (immutable operation)
 *
 * @example
 * ```typescript
 * // Apply moderate edge sharpening and strong global contrast
 * const enhanced = applyContrastEnhancement(
 *   internalVector,
 *   externalVector,
 *   externalInfluence,
 *   2.0,   // Global: crush mid-tones significantly
 *   1.5    // Directional: moderate edge sharpening
 * );
 * ```
 */
export function applyContrastEnhancement(
  internalVector: number[],
  externalVector: number[],
  externalInfluence: number[][],
  globalExponent: number,
  directionalExponent: number
): number[] {
  // Apply directional contrast first to sharpen boundaries
  let enhanced = applyDirectionalContrast(
    internalVector,
    externalVector,
    externalInfluence,
    directionalExponent
  );

  // Then apply global contrast to crush mid-tones
  enhanced = applyGlobalContrast(enhanced, globalExponent);

  return enhanced;
}
