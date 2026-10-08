import { getCachedCharacterSet } from "./characters";
import { applyContrastEnhancement } from "./contrast";
import { mergeOptions } from "./defaults";
import type { DEFAULT_RENDER_OPTIONS } from "./defaults";
import { renderLedToImageData } from "./led";
import { createCharacterLookup } from "./lookup";
import {
  applyBrightnessContrast,
  prepareSamplingLayout,
  sampleExternalVector,
  sampleInternalVector,
} from "./sampling";
import type {
  AsciiPipelineState,
  AsciiRenderOptions,
  AsciiRenderResult,
} from "./types";

/**
 * Parse color string to RGB values.
 */
const parseColor = (color: string): [number, number, number] => {
  if (color.startsWith("#")) {
    const hex = color.slice(1);
    if (hex.length === 3) {
      return [
        Number.parseInt(hex[0] + hex[0], 16),
        Number.parseInt(hex[1] + hex[1], 16),
        Number.parseInt(hex[2] + hex[2], 16),
      ];
    }
    return [
      Number.parseInt(hex.slice(0, 2), 16),
      Number.parseInt(hex.slice(2, 4), 16),
      Number.parseInt(hex.slice(4, 6), 16),
    ];
  }
  // Default to white if parsing fails
  return [255, 255, 255];
};

/**
 * Calculate output dimensions based on input and options.
 */
const calculateDimensions = (
  inputWidth: number,
  inputHeight: number,
  options: typeof DEFAULT_RENDER_OPTIONS
): { columns: number; rows: number; width: number; height: number } => {
  const { cellWidth, cellHeight } = options;

  // Calculate grid size directly from input dimensions
  const columns = Math.max(1, Math.floor(inputWidth / cellWidth));
  const rows = Math.max(1, Math.floor(inputHeight / cellHeight));

  return {
    columns,
    rows,
    width: columns * cellWidth,
    height: rows * cellHeight,
  };
};

/**
 * Initialize the rendering pipeline with character set and sampling layout.
 */
export const initializePipeline = (
  options: typeof DEFAULT_RENDER_OPTIONS,
  samplingCellWidth: number,
  samplingCellHeight: number,
  characterCellWidth: number = samplingCellWidth,
  characterCellHeight: number = samplingCellHeight
): AsciiPipelineState => {
  const charset = Array.isArray(options.charset)
    ? options.charset
    : [...options.charset];

  // Build or retrieve cached character set
  const characterSet = getCachedCharacterSet(
    charset,
    options.font,
    characterCellWidth,
    characterCellHeight,
    options.layout
  );

  // Prepare sampling layout with pre-computed offsets
  const samplingLayout = prepareSamplingLayout(
    options.layout,
    samplingCellWidth,
    samplingCellHeight,
    options.sampleCount
  );

  // Create lookup function with caching
  const lookupFn = createCharacterLookup(characterSet, options.cache);

  return { characterSet, samplingLayout, lookupFn };
};

/**
 * Process a single cell and return the best matching character and brightness.
 */
const processCell = (
  imageData: ImageData,
  cellX: number,
  cellY: number,
  pipeline: AsciiPipelineState,
  brightnessAdjustment: number,
  contrastMultiplier: number,
  globalExponent: number,
  directionalExponent: number
): { char: string; brightness: number } => {
  const { samplingLayout, lookupFn } = pipeline;

  // Sample internal and external vectors
  let internalVector = sampleInternalVector(
    imageData,
    cellX,
    cellY,
    samplingLayout
  );
  let externalVector = sampleExternalVector(
    imageData,
    cellX,
    cellY,
    samplingLayout
  );

  if (brightnessAdjustment !== 0 || contrastMultiplier !== 1) {
    internalVector = applyBrightnessContrast(
      internalVector,
      brightnessAdjustment,
      contrastMultiplier
    );
    externalVector = applyBrightnessContrast(
      externalVector,
      brightnessAdjustment,
      contrastMultiplier
    );
  }

  // Apply contrast enhancement (directional first, then global)
  internalVector = applyContrastEnhancement(
    internalVector,
    externalVector,
    samplingLayout.layout.externalInfluence,
    globalExponent,
    directionalExponent
  );

  // Compute mean brightness from the enhanced vector
  const brightness =
    internalVector.reduce((sum, v) => sum + v, 0) / internalVector.length;

  // Look up best matching character
  return { char: lookupFn(internalVector), brightness };
};

/**
 * Render ASCII grid from ImageData.
 * Returns both the character grid and a per-cell brightness grid.
 */
export const renderAsciiGrid = (
  imageData: ImageData,
  options: AsciiRenderOptions = {}
): { grid: string[]; brightnessGrid: number[][] } => {
  const opts = mergeOptions(options);
  const { columns, rows } = calculateDimensions(
    imageData.width,
    imageData.height,
    opts
  );

  // Calculate effective cell size for sampling
  const effectiveCellWidth = imageData.width / columns;
  const effectiveCellHeight = imageData.height / rows;

  const pipeline = initializePipeline(
    opts,
    effectiveCellWidth,
    effectiveCellHeight,
    opts.cellWidth,
    opts.cellHeight
  );

  const clampedBrightness = Math.max(-100, Math.min(100, opts.brightness));
  const clampedContrast = Math.max(-100, Math.min(100, opts.contrast));
  const brightnessAdjustment = clampedBrightness / 100;
  const contrastMultiplier = 1 + clampedContrast / 100;

  const grid: string[] = [];
  const brightnessGrid: number[][] = [];

  for (let row = 0; row < rows; row++) {
    let rowStr = "";
    const brightnessRow: number[] = [];
    for (let col = 0; col < columns; col++) {
      const cellX = col * effectiveCellWidth;
      const cellY = row * effectiveCellHeight;
      const { char, brightness } = processCell(
        imageData,
        cellX,
        cellY,
        pipeline,
        brightnessAdjustment,
        contrastMultiplier,
        opts.contrastExponent,
        opts.directionalContrastExponent
      );
      rowStr += char;
      brightnessRow.push(brightness);
    }
    grid.push(rowStr);
    brightnessGrid.push(brightnessRow);
  }

  return { grid, brightnessGrid };
};

/**
 * Create a font string for canvas rendering.
 */
const createFontString = (
  font: typeof DEFAULT_RENDER_OPTIONS.font,
  size?: number
): string => {
  const weight = font.weight ?? "normal";
  const style = font.style ?? "normal";
  const actualSize = size ?? font.size;
  return `${style} ${weight} ${actualSize}px ${font.family}`;
};

/**
 * Render ASCII grid to ImageData for canvas display.
 */
export const renderAsciiToImageData = (
  grid: string[],
  options: AsciiRenderOptions = {}
): ImageData => {
  const opts = mergeOptions(options);
  const { font, foreground, background } = opts;

  // Supersample the output only: the grid is already chosen, so scaling the
  // cell size and font here just rasterizes each glyph with more pixels.
  const scale = Math.max(1, opts.renderScale);
  const cellWidth = opts.cellWidth * scale;
  const cellHeight = opts.cellHeight * scale;
  const fontSize = font.size * scale;

  const rows = grid.length;
  const columns = grid[0]?.length ?? 0;
  const width = columns * cellWidth;
  const height = rows * cellHeight;

  // Create canvas for rendering
  const canvas =
    typeof OffscreenCanvas === "undefined"
      ? document.createElement("canvas")
      : new OffscreenCanvas(width, height);

  if (!(canvas instanceof OffscreenCanvas)) {
    canvas.width = width;
    canvas.height = height;
  }

  const ctx = canvas.getContext("2d") as
    | CanvasRenderingContext2D
    | OffscreenCanvasRenderingContext2D
    | null;
  if (!ctx) {
    throw new Error("Failed to get canvas 2D context");
  }

  // Fill background
  const [bgR, bgG, bgB] = parseColor(background);
  ctx.fillStyle = `rgb(${bgR}, ${bgG}, ${bgB})`;
  ctx.fillRect(0, 0, width, height);

  // Set up text rendering
  const [fgR, fgG, fgB] = parseColor(foreground);
  ctx.fillStyle = `rgb(${fgR}, ${fgG}, ${fgB})`;
  // Match the font to the supersampled cell so glyphs stay proportional.
  ctx.font = createFontString(font, fontSize);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // Render each character
  for (let row = 0; row < rows; row++) {
    const rowStr = grid[row];
    for (let col = 0; col < columns; col++) {
      const char = rowStr[col];
      if (char && char !== " ") {
        const x = col * cellWidth + cellWidth / 2;
        const y = row * cellHeight + cellHeight / 2;
        ctx.fillText(char, x, y);
      }
    }
  }

  return ctx.getImageData(0, 0, width, height);
};

/**
 * Main rendering function - converts image to ASCII.
 */
export const renderAscii = (
  imageData: ImageData,
  options: AsciiRenderOptions = {}
): AsciiRenderResult => {
  const opts = mergeOptions(options);
  const { columns, rows, width, height } = calculateDimensions(
    imageData.width,
    imageData.height,
    opts
  );

  // Render ASCII grid
  const { grid, brightnessGrid } = renderAsciiGrid(imageData, options);

  // Build result
  const result: AsciiRenderResult = {
    grid,
    brightnessGrid,
    columns,
    rows,
    width,
    height,
    cellWidth: opts.cellWidth,
    cellHeight: opts.cellHeight,
  };

  // Optionally render to ImageData
  if (opts.output === "imageData" || opts.output === "both") {
    result.imageData = opts.ledMode
      ? renderLedToImageData(brightnessGrid, options)
      : renderAsciiToImageData(grid, options);
  }

  return result;
};

/**
 * Render ASCII from a File or Blob.
 */
export const renderAsciiFromFile = (
  file: File | Blob,
  options: AsciiRenderOptions = {}
): Promise<AsciiRenderResult> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        // Draw image to canvas to get ImageData
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Failed to get canvas context"));
          return;
        }
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        resolve(renderAscii(imageData, options));
      };
      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = reader.result as string;
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });

/**
 * Render ASCII from an Image element.
 */
export const renderAsciiFromImage = (
  img: HTMLImageElement,
  options: AsciiRenderOptions = {}
): AsciiRenderResult => {
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth || img.width;
  canvas.height = img.naturalHeight || img.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Failed to get canvas context");
  }
  ctx.drawImage(img, 0, 0);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  return renderAscii(imageData, options);
};

/**
 * Render ASCII from a video frame.
 */
export const renderAsciiFromVideo = (
  video: HTMLVideoElement,
  options: AsciiRenderOptions = {}
): AsciiRenderResult => {
  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Failed to get canvas context");
  }
  ctx.drawImage(video, 0, 0);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  return renderAscii(imageData, options);
};
