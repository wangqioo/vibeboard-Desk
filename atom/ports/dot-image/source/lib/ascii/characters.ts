import type {
  AsciiCharacter,
  AsciiCharacterSet,
  AsciiCircle,
  AsciiFontSpec,
  AsciiSamplingLayout,
} from "./types";

/**
 * Cache for built character sets to avoid redundant computation.
 * Key format: `${fontString}|${cellWidth}x${cellHeight}|${charset.join("")}`
 */
const characterSetCache = new Map<string, AsciiCharacterSet>();

/**
 * Threshold for considering a pixel as "ink" (dark).
 * Values below this grayscale level are considered part of the character.
 * Range: 0 (black) to 255 (white)
 */
const INK_THRESHOLD = 128;

/**
 * Creates a CSS font string from a font specification.
 * Format: "[style] [weight] [size]px [family]"
 *
 * @param font - Font specification object
 * @returns CSS font string suitable for CanvasRenderingContext2D.font
 *
 * @example
 * ```typescript
 * createFontString({ family: "monospace", size: 12, weight: "bold" })
 * // Returns: "bold 12px monospace"
 * ```
 */
export const createFontString = (font: AsciiFontSpec): string => {
  const parts: string[] = [];

  if (font.style && font.style !== "normal") {
    parts.push(font.style);
  }

  if (font.weight && font.weight !== "normal") {
    parts.push(String(font.weight));
  }

  parts.push(`${font.size}px`, font.family);

  return parts.join(" ");
};

/**
 * Samples a circular region on a canvas and returns the fraction of "ink" pixels.
 * Uses a simple grid-based sampling approach within the bounding box of the circle.
 *
 * @param imageData - Canvas image data to sample from
 * @param cx - Circle center X coordinate (absolute pixels)
 * @param cy - Circle center Y coordinate (absolute pixels)
 * @param r - Circle radius (absolute pixels)
 * @param width - Canvas width in pixels
 * @param height - Canvas height in pixels
 * @returns Fraction of dark pixels in the circle (0.0 to 1.0)
 */
const sampleCircle = (
  imageData: Uint8ClampedArray,
  cx: number,
  cy: number,
  r: number,
  width: number,
  height: number
): number => {
  const r2 = r * r; // Squared radius for distance comparison
  let inkCount = 0;
  let totalCount = 0;

  // Sample within bounding box of circle
  const minX = Math.max(0, Math.floor(cx - r));
  const maxX = Math.min(width - 1, Math.ceil(cx + r));
  const minY = Math.max(0, Math.floor(cy - r));
  const maxY = Math.min(height - 1, Math.ceil(cy + r));

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      // Check if point is within circle
      const dx = x - cx;
      const dy = y - cy;
      const distSquared = dx * dx + dy * dy;

      if (distSquared <= r2) {
        totalCount++;

        // Get grayscale value (we use red channel since canvas is already grayscale)
        const idx = (y * width + x) * 4;
        const brightness = imageData[idx]; // 0 = black, 255 = white

        // Count as ink if darker than threshold
        if (brightness < INK_THRESHOLD) {
          inkCount++;
        }
      }
    }
  }

  // Return fraction of ink pixels, or 0 if no samples
  return totalCount > 0 ? inkCount / totalCount : 0;
};

/**
 * Computes a 6D shape vector for a single character by rasterizing it
 * and sampling circular regions.
 *
 * The character is drawn on a white background with black text, then
 * 6 circular regions are sampled to determine the fraction of "ink" in each.
 *
 * @param char - Character to compute vector for
 * @param ctx - Canvas rendering context (can be regular or offscreen)
 * @param cellWidth - Cell width in pixels
 * @param cellHeight - Cell height in pixels
 * @param circles - Array of 6 sampling circles (normalized 0-1 coordinates)
 * @returns 6D vector of ink fractions [0-1] for each sampling region
 */
export const computeCharacterVector = (
  char: string,
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  cellWidth: number,
  cellHeight: number,
  circles: AsciiCircle[]
): number[] => {
  // Clear canvas with white background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, cellWidth, cellHeight);

  // Draw character in black
  ctx.fillStyle = "#000000";
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";

  // Center character within cell to match render output alignment
  ctx.fillText(char, cellWidth / 2, cellHeight / 2);

  // Get image data for sampling
  const imageData = ctx.getImageData(0, 0, cellWidth, cellHeight);

  // Sample each circular region
  const vector: number[] = [];

  for (const circle of circles) {
    // Convert normalized coordinates to absolute pixels
    const cx = circle.x * cellWidth;
    const cy = circle.y * cellHeight;
    const r = circle.r * cellHeight; // Radius is based on cell height

    const inkFraction = sampleCircle(
      imageData.data,
      cx,
      cy,
      r,
      cellWidth,
      cellHeight
    );

    vector.push(inkFraction);
  }

  return vector;
};

/**
 * Normalizes character vectors using component-wise max normalization.
 * This ensures that at least one character fully utilizes each dimension,
 * maximizing the spread in the 6D space for better character differentiation.
 *
 * @param characters - Array of characters with their raw vectors
 * @returns Object containing normalized characters and the max values used
 */
export const normalizeVectors = (
  characters: AsciiCharacter[]
): { characters: AsciiCharacter[]; maxValues: number[] } => {
  if (characters.length === 0) {
    return { characters: [], maxValues: [] };
  }

  const dimensions = characters[0].vector.length;

  // Find maximum value for each dimension across all characters
  const maxValues: number[] = Array.from({ length: dimensions }, () => 0);

  for (const character of characters) {
    for (let i = 0; i < dimensions; i++) {
      maxValues[i] = Math.max(maxValues[i], character.vector[i]);
    }
  }

  // Normalize each character's vector
  const normalizedCharacters: AsciiCharacter[] = characters.map(
    (character) => ({
      char: character.char,
      vector: character.vector.map((value, i) =>
        // Avoid division by zero - if max is 0, keep value as 0
        maxValues[i] > 0 ? value / maxValues[i] : 0
      ),
    })
  );

  return {
    characters: normalizedCharacters,
    maxValues,
  };
};

/**
 * Builds a complete character set with normalized shape vectors.
 * This is the main entry point for character set generation.
 *
 * Process:
 * 1. Creates a canvas for rasterization
 * 2. Sets up font rendering context
 * 3. Computes raw vectors for each character
 * 4. Normalizes vectors across the entire set
 *
 * @param charset - Array of characters to include in the set
 * @param font - Font specification for rendering
 * @param cellWidth - Cell width in pixels
 * @param cellHeight - Cell height in pixels
 * @param layout - Sampling layout with internal circle positions
 * @returns Complete character set with normalized vectors
 */
export const buildCharacterSet = (
  charset: string[],
  font: AsciiFontSpec,
  cellWidth: number,
  cellHeight: number,
  layout: AsciiSamplingLayout
): AsciiCharacterSet => {
  // Create canvas for character rasterization
  // Use OffscreenCanvas if available for better performance
  const canvas =
    typeof OffscreenCanvas === "undefined"
      ? document.createElement("canvas")
      : new OffscreenCanvas(cellWidth, cellHeight);

  canvas.width = cellWidth;
  canvas.height = cellHeight;

  const ctx = canvas.getContext("2d", {
    willReadFrequently: true, // Optimize for frequent getImageData calls
  }) as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null;

  if (!ctx) {
    throw new Error("Failed to create canvas context for character rendering");
  }

  // Set up font rendering
  const fontString = createFontString(font);
  ctx.font = fontString;

  // Compute raw vectors for all characters
  const rawCharacters: AsciiCharacter[] = charset.map((char) => ({
    char,
    vector: computeCharacterVector(
      char,
      ctx,
      cellWidth,
      cellHeight,
      layout.internal
    ),
  }));

  // Normalize vectors across the entire character set
  const { characters, maxValues } = normalizeVectors(rawCharacters);

  return {
    characters,
    maxValues,
    charset,
    font,
    cellWidth,
    cellHeight,
    layout,
  };
};

/**
 * Generates a cache key for a character set configuration.
 * The key uniquely identifies a character set by its font, dimensions, and characters.
 *
 * @param charset - Array of characters
 * @param font - Font specification
 * @param cellWidth - Cell width in pixels
 * @param cellHeight - Cell height in pixels
 * @returns Cache key string
 */
const getCacheKey = (
  charset: string[],
  font: AsciiFontSpec,
  cellWidth: number,
  cellHeight: number
): string => {
  const fontString = createFontString(font);
  const charsetString = charset.join("");
  return `${fontString}|${cellWidth}x${cellHeight}|${charsetString}`;
};

/**
 * Gets a character set from cache or builds it if not cached.
 * This is the recommended way to obtain character sets as it avoids
 * redundant computation for the same configuration.
 *
 * @param charset - Array of characters to include in the set
 * @param font - Font specification for rendering
 * @param cellWidth - Cell width in pixels
 * @param cellHeight - Cell height in pixels
 * @param layout - Sampling layout with internal circle positions
 * @returns Complete character set with normalized vectors (cached or newly built)
 *
 * @example
 * ```typescript
 * const charSet = getCachedCharacterSet(
 *   ["@", "#", "*", ".", " "],
 *   { family: "monospace", size: 12 },
 *   8,
 *   14,
 *   DEFAULT_SAMPLING_LAYOUT
 * );
 * ```
 */
export const getCachedCharacterSet = (
  charset: string[],
  font: AsciiFontSpec,
  cellWidth: number,
  cellHeight: number,
  layout: AsciiSamplingLayout
): AsciiCharacterSet => {
  const cacheKey = getCacheKey(charset, font, cellWidth, cellHeight);

  // Check cache
  const cached = characterSetCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  // Build new character set
  const characterSet = buildCharacterSet(
    charset,
    font,
    cellWidth,
    cellHeight,
    layout
  );

  // Store in cache
  characterSetCache.set(cacheKey, characterSet);

  return characterSet;
};

/**
 * Clears the character set cache.
 * Useful for freeing memory or forcing regeneration of character sets.
 */
export const clearCharacterSetCache = (): void => {
  characterSetCache.clear();
};

/**
 * Gets the current size of the character set cache.
 * @returns Number of cached character sets
 */
export const getCharacterSetCacheSize = (): number => characterSetCache.size;
