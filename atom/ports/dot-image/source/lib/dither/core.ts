import type { DitherParameters, NoiseTexture } from "./types";
import { applyBrightness, applyContrast, hexToRgb, wrap } from "./utils";

/**
 * Load an image from a File object
 */
function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(img.src);
      resolve(img);
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Compute the output (target) dimensions for a source of the given size,
 * honoring params.maxWidth.
 */
export function getTargetDimensions(
  sourceWidth: number,
  sourceHeight: number,
  params: DitherParameters
): { width: number; height: number } {
  let targetWidth = sourceWidth;
  let targetHeight = sourceHeight;

  if (
    params.maxWidth !== null &&
    params.maxWidth !== undefined &&
    sourceWidth > params.maxWidth
  ) {
    targetHeight = Math.floor((sourceHeight * params.maxWidth) / sourceWidth);
    targetWidth = params.maxWidth;
  }

  return { height: targetHeight, width: targetWidth };
}

/**
 * Apply blue noise dithering to already-decoded pixel data.
 *
 * This is the pure, stateless core of the algorithm: brightness/contrast ->
 * grayscale -> blue-noise threshold -> colorize -> optional nearest-neighbor
 * upscale. It has no dependency on File/Image/Video, so it is reused per frame
 * for video as well as for still images.
 *
 * @param imageData Pixel data already downscaled to the dither resolution.
 * @param target Output dimensions when pixelSize > 1 (nearest-neighbor upscale).
 */
export function ditherImageData(
  imageData: ImageData,
  noise: NoiseTexture,
  params: DitherParameters,
  target?: { width: number; height: number }
): ImageData {
  const { width } = imageData;
  const { height } = imageData;
  const fg = hexToRgb(params.foreground);
  const bg = hexToRgb(params.background);
  const pixelSize = Math.max(1, Math.floor(params.pixelSize));

  // Apply tone adjustments (mutate in place)
  let toned = imageData;
  if (params.brightness !== 0) {
    toned = applyBrightness(toned, params.brightness);
  }
  if (params.contrast !== 0) {
    toned = applyContrast(toned, params.contrast);
  }

  // Convert to grayscale
  const grayscaleData = new Uint8ClampedArray(width * height);
  for (let i = 0; i < toned.data.length; i += 4) {
    const avg = (toned.data[i] + toned.data[i + 1] + toned.data[i + 2]) / 3;
    grayscaleData[i / 4] = avg;
  }

  // Apply dithering algorithm
  const outputData = new Uint8ClampedArray(width * height * 4);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const wrapX = wrap(noise.width, x);
      const wrapY = wrap(noise.height, y);

      const noiseIdx = wrapY * noise.width + wrapX;
      const imageIdx = y * width + x;
      const outputIdx = imageIdx * 4;

      const noiseLuma = noise.data[noiseIdx];
      const imageLuma = grayscaleData[imageIdx];

      const isBright = imageLuma > noiseLuma;

      if (isBright) {
        outputData[outputIdx] = bg.r;
        outputData[outputIdx + 1] = bg.g;
        outputData[outputIdx + 2] = bg.b;
      } else {
        outputData[outputIdx] = fg.r;
        outputData[outputIdx + 1] = fg.g;
        outputData[outputIdx + 2] = fg.b;
      }
      outputData[outputIdx + 3] = 255; // Alpha
    }
  }

  // If pixelSize > 1, upscale using nearest-neighbor to create blocky pixels
  if (pixelSize > 1) {
    const upscaledWidth = target?.width ?? width * pixelSize;
    const upscaledHeight = target?.height ?? height * pixelSize;
    const upscaledData = new Uint8ClampedArray(
      upscaledWidth * upscaledHeight * 4
    );

    // Nearest-neighbor upscaling
    for (let y = 0; y < upscaledHeight; y++) {
      for (let x = 0; x < upscaledWidth; x++) {
        // Map to source pixel
        const srcX = Math.min(width - 1, Math.floor(x / pixelSize));
        const srcY = Math.min(height - 1, Math.floor(y / pixelSize));
        const srcIdx = (srcY * width + srcX) * 4;
        const dstIdx = (y * upscaledWidth + x) * 4;

        upscaledData[dstIdx] = outputData[srcIdx];
        upscaledData[dstIdx + 1] = outputData[srcIdx + 1];
        upscaledData[dstIdx + 2] = outputData[srcIdx + 2];
        upscaledData[dstIdx + 3] = 255;
      }
    }

    return new ImageData(upscaledData, upscaledWidth, upscaledHeight);
  }

  return new ImageData(outputData, width, height);
}

export interface DitherScratch {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
}

/**
 * Create a reusable scratch canvas for the dither downscale step. Passing one
 * to `ditherDrawable` avoids allocating a canvas per frame during video render.
 */
export function createDitherScratch(): DitherScratch {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) {
    throw new Error("Could not get canvas context");
  }
  return { canvas, ctx };
}

/**
 * Dither any drawable source (image, video frame, bitmap). Downscales the
 * source to the dither resolution on a canvas, then runs `ditherImageData`.
 * Reused by both the live video preview loop and the MP4 exporter.
 */
export function ditherDrawable(
  drawable: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
  noise: NoiseTexture,
  params: DitherParameters,
  scratch?: DitherScratch,
  // When set, render at this exact output width (height kept to source aspect)
  // instead of the params-derived size. Used to dither the live preview at the
  // resolution it is actually displayed at, so the 1-bit result stays crisp
  // rather than being fractionally rescaled by the browser.
  outputWidth?: number
): ImageData {
  const target =
    outputWidth && outputWidth > 0
      ? {
          height: Math.max(
            1,
            Math.round((outputWidth * sourceHeight) / sourceWidth)
          ),
          width: Math.max(1, Math.round(outputWidth)),
        }
      : getTargetDimensions(sourceWidth, sourceHeight, params);
  const pixelSize = Math.max(1, Math.floor(params.pixelSize));
  const ditherWidth = Math.max(1, Math.floor(target.width / pixelSize));
  const ditherHeight = Math.max(1, Math.floor(target.height / pixelSize));

  const work = scratch ?? createDitherScratch();
  const { canvas, ctx } = work;
  if (canvas.width !== ditherWidth || canvas.height !== ditherHeight) {
    canvas.width = ditherWidth;
    canvas.height = ditherHeight;
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(drawable, 0, 0, ditherWidth, ditherHeight);

  const imageData = ctx.getImageData(0, 0, ditherWidth, ditherHeight);
  return ditherImageData(imageData, noise, params, target);
}

/**
 * Apply blue noise dithering to an image file.
 */
export async function applyDither(
  imageFile: File,
  noise: NoiseTexture,
  params: DitherParameters,
  outputWidth?: number
): Promise<ImageData> {
  const img = await loadImage(imageFile);
  return ditherDrawable(
    img,
    img.width,
    img.height,
    noise,
    params,
    undefined,
    outputWidth
  );
}
