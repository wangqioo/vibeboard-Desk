/**
 * ASCII character lookup using nearest neighbor search in 6D shape space.
 *
 * This module implements efficient character selection by:
 * 1. Computing squared Euclidean distance in normalized shape space
 * 2. Using quantized vector caching to avoid repeated NN searches
 * 3. Supporting optional k-d tree optimization for large character sets
 *
 * @module lib/ascii/lookup
 */

import type { AsciiCharacter, AsciiCharacterSet } from "./types";

/**
 * Configuration options for the lookup cache.
 */
export interface AsciiLookupCacheOptions {
  /**
   * Number of quantization levels per dimension.
   * Higher values = more cache entries but less collision.
   * For 6D space with 10 levels: 10^6 = 1M possible keys.
   */
  quantizationLevels: number;
}

/**
 * Cache interface for character lookups.
 */
export interface LookupCache {
  /**
   * Look up the nearest character for a sampling vector.
   * Uses cache if available, computes and caches otherwise.
   */
  lookup: (samplingVector: number[]) => string;

  /**
   * Clear all cached entries.
   */
  clear: () => void;

  /**
   * Get cache statistics.
   */
  stats: () => {
    hits: number;
    misses: number;
    size: number;
  };
}

/**
 * Compute squared Euclidean distance between two vectors.
 *
 * Skips the square root for performance since we only need relative distances.
 * For vectors a and b: d² = Σ(aᵢ - bᵢ)²
 *
 * @param a - First vector
 * @param b - Second vector
 * @returns Squared distance (non-negative)
 *
 * @example
 * ```ts
 * squaredEuclideanDistance([0, 0], [3, 4]) // 25
 * squaredEuclideanDistance([1, 2, 3], [1, 2, 3]) // 0
 * ```
 */
export function squaredEuclideanDistance(a: number[], b: number[]): number {
  let sum = 0;
  const len = Math.min(a.length, b.length);

  for (let i = 0; i < len; i++) {
    const diff = a[i] - b[i];
    sum += diff * diff;
  }

  return sum;
}

/**
 * Find the nearest character using brute force linear search.
 *
 * Uses squared Euclidean distance with early termination when distance is 0.
 * This is optimal for small character sets (< 200 characters).
 *
 * For larger sets, consider implementing a k-d tree or ball tree.
 *
 * @param samplingVector - Normalized 6D shape vector from image sampling
 * @param characters - Array of characters with precomputed shape vectors
 * @returns The closest matching character
 *
 * @example
 * ```ts
 * const chars = [
 *   { char: ' ', vector: [0, 0, 0, 0, 0, 0] },
 *   { char: '#', vector: [1, 1, 1, 1, 1, 1] }
 * ];
 * findNearestCharacter([0.9, 0.9, 0.9, 0.9, 0.9, 0.9], chars) // '#'
 * ```
 */
export function findNearestCharacter(
  samplingVector: number[],
  characters: AsciiCharacter[]
): string {
  if (characters.length === 0) {
    return " ";
  }

  let bestChar = characters[0].char;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const { char, vector } of characters) {
    const distance = squaredEuclideanDistance(samplingVector, vector);

    // Early termination - perfect match
    if (distance === 0) {
      return char;
    }

    if (distance < bestDistance) {
      bestDistance = distance;
      bestChar = char;
    }
  }

  return bestChar;
}

/**
 * Normalize a sampling vector using the character set's maximum values.
 *
 * Each component is divided by its corresponding max value to bring
 * all dimensions into [0, 1] range for fair distance comparisons.
 *
 * @param vector - Raw sampling vector from image analysis
 * @param maxValues - Maximum value for each dimension in the character set
 * @returns Normalized vector in [0, 1]^n
 *
 * @example
 * ```ts
 * normalizeWithMaxValues([50, 100], [100, 200])
 * // [0.5, 0.5]
 * ```
 */
export function normalizeWithMaxValues(
  vector: number[],
  maxValues: number[]
): number[] {
  return vector.map((value, i) => {
    const max = maxValues[i];
    return max > 0 ? value / max : 0;
  });
}

/**
 * Quantize a normalized vector into a single numeric key for caching.
 *
 * Each dimension is discretized into `levels` bins, then packed into
 * a single integer using mixed-radix encoding.
 *
 * For example with 3 dimensions and 10 levels:
 * - [0.15, 0.52, 0.89] → [1, 5, 8] → key = 1×100 + 5×10 + 8 = 158
 *
 * This assumes all vector components are in [0, 1] range.
 *
 * @param vector - Normalized vector (components in [0, 1])
 * @param levels - Number of quantization levels per dimension
 * @returns Integer key suitable for Map<number, string>
 *
 * @example
 * ```ts
 * quantizeVector([0.15, 0.52], 10) // 15 (bin 1, bin 5)
 * quantizeVector([0.99, 0.99], 10) // 99 (bin 9, bin 9)
 * quantizeVector([0, 0], 10) // 0 (bin 0, bin 0)
 * ```
 */
export function quantizeVector(vector: number[], levels: number): number {
  let key = 0;
  let multiplier = 1;

  // Build key from right to left (least significant dimension first)
  for (let i = vector.length - 1; i >= 0; i--) {
    // Clamp to [0, 1] and quantize
    const value = Math.max(0, Math.min(1, vector[i]));
    const bin = Math.floor(value * levels);
    // Ensure bin is in [0, levels-1]
    const clampedBin = Math.min(bin, levels - 1);

    key += clampedBin * multiplier;
    multiplier *= levels;
  }

  return key;
}

/**
 * Create a lookup cache with quantized vector keys.
 *
 * The cache maps quantized vectors to their nearest characters,
 * avoiding expensive NN searches for similar sampling vectors.
 *
 * Cache effectiveness depends on:
 * - `quantizationLevels`: Higher = more precise but more misses
 * - Vector distribution: Uniform sampling benefits more from caching
 * - Character set size: Larger sets benefit more from caching
 *
 * @param characters - Array of characters with shape vectors
 * @param options - Cache configuration
 * @returns Cache object with lookup, clear, and stats methods
 *
 * @example
 * ```ts
 * const cache = createLookupCache(characterSet.characters, {
 *   quantizationLevels: 10
 * });
 *
 * const char1 = cache.lookup([0.5, 0.5, 0.5, 0.5, 0.5, 0.5]);
 * const char2 = cache.lookup([0.51, 0.49, 0.5, 0.5, 0.5, 0.5]); // likely cached
 *
 * console.log(cache.stats()); // { hits: 1, misses: 1, size: 1 }
 * ```
 */
export function createLookupCache(
  characters: AsciiCharacter[],
  options: AsciiLookupCacheOptions
): LookupCache {
  const cache = new Map<number, string>();
  let hits = 0;
  let misses = 0;

  const lookup = (samplingVector: number[]): string => {
    const key = quantizeVector(samplingVector, options.quantizationLevels);

    const cached = cache.get(key);
    if (cached !== undefined) {
      hits++;
      return cached;
    }

    misses++;
    const char = findNearestCharacter(samplingVector, characters);
    cache.set(key, char);
    return char;
  };

  const clear = (): void => {
    cache.clear();
    hits = 0;
    misses = 0;
  };

  const stats = () => ({
    hits,
    misses,
    size: cache.size,
  });

  return {
    lookup,
    clear,
    stats,
  };
}

/**
 * Create a character lookup function for a given character set.
 *
 * This is the main entry point for the lookup module. It returns a function
 * that maps raw sampling vectors to the nearest character.
 *
 * The returned function:
 * 1. Checks the cache (if enabled) for a quantized match
 * 2. Performs nearest neighbor search if cache misses
 * 3. Caches the result for future lookups
 *
 * @param characterSet - Character set with precomputed shape vectors
 * @param cacheOptions - Optional cache configuration (defaults: 10 levels)
 * @returns Lookup function: (samplingVector) => character
 *
 * @example
 * ```ts
 * const lookup = createCharacterLookup(characterSet, {
 *   quantizationLevels: 10
 * });
 *
 * // Use in rendering loop
 * for (const cell of imageCells) {
 *   const vector = sampleImageCell(cell);
 *   const char = lookup(vector);
 *   renderChar(char, cell.x, cell.y);
 * }
 * ```
 */
export function createCharacterLookup(
  characterSet: AsciiCharacterSet,
  cacheOptions?: Partial<AsciiLookupCacheOptions>
): (samplingVector: number[]) => string {
  const { characters } = characterSet;

  // Default cache options
  const options: AsciiLookupCacheOptions = {
    quantizationLevels: 10,
    ...cacheOptions,
  };

  // Create cache if options provided
  const cache = createLookupCache(characters, options);

  // Return lookup function with caching
  return (samplingVector: number[]): string => cache.lookup(samplingVector);
}
