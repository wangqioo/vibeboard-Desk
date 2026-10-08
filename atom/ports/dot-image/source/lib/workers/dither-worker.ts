/// <reference lib="webworker" />

import type { DitherParameters, NoiseTexture } from "../dither/types";
import {
  applyBrightness,
  applyContrast,
  hexToRgb,
  wrap,
} from "../dither/utils";
import { NOISE_TEXTURES } from "../noise/textures";

interface DitherWorkerRequest {
  id: number;
  file: File;
  params: DitherParameters;
}

interface DitherWorkerResponse {
  id: number;
  blob?: Blob;
  width?: number;
  height?: number;
  error?: string;
}

const noiseCache = new Map<number, NoiseTexture>();

const loadNoiseTexture = async (size: number): Promise<NoiseTexture> => {
  const cached = noiseCache.get(size);
  if (cached) {
    return cached;
  }

  const config = NOISE_TEXTURES.find((texture) => texture.size === size);
  if (!config) {
    throw new Error("Noise texture not found");
  }

  const response = await fetch(config.dataUrl);
  const blob = await response.blob();
  const bitmap = await createImageBitmap(blob);
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
  const ctx = canvas.getContext("2d", { willReadFrequently: true });

  if (!ctx) {
    bitmap.close();
    throw new Error("Could not get canvas context");
  }

  ctx.drawImage(bitmap, 0, 0);
  const imageData = ctx.getImageData(0, 0, bitmap.width, bitmap.height);
  const grayscale = new Uint8ClampedArray(bitmap.width * bitmap.height);

  for (let i = 0; i < imageData.data.length; i += 4) {
    grayscale[i / 4] = imageData.data[i];
  }

  bitmap.close();

  const noise = { data: grayscale, height: bitmap.height, width: bitmap.width };
  noiseCache.set(size, noise);
  return noise;
};

const processDither = async (
  file: File,
  params: DitherParameters
): Promise<{ blob: Blob; width: number; height: number }> => {
  const fg = hexToRgb(params.foreground);
  const bg = hexToRgb(params.background);

  const bitmap = await createImageBitmap(file);

  let targetWidth = bitmap.width;
  let targetHeight = bitmap.height;

  if (
    params.maxWidth !== null &&
    params.maxWidth !== undefined &&
    params.maxWidth > 0 &&
    bitmap.width > params.maxWidth
  ) {
    targetHeight = Math.floor((bitmap.height * params.maxWidth) / bitmap.width);
    targetWidth = Math.floor(params.maxWidth);
  }

  const pixelSize = Math.max(1, Math.floor(params.pixelSize));
  const ditherWidth = Math.max(1, Math.floor(targetWidth / pixelSize));
  const ditherHeight = Math.max(1, Math.floor(targetHeight / pixelSize));

  const ditherCanvas = new OffscreenCanvas(ditherWidth, ditherHeight);
  const ditherCtx = ditherCanvas.getContext("2d", {
    willReadFrequently: true,
  });

  if (!ditherCtx) {
    bitmap.close();
    throw new Error("Could not get canvas context");
  }

  ditherCtx.imageSmoothingEnabled = true;
  ditherCtx.imageSmoothingQuality = "high";
  ditherCtx.drawImage(bitmap, 0, 0, ditherWidth, ditherHeight);

  let imageData = ditherCtx.getImageData(0, 0, ditherWidth, ditherHeight);
  bitmap.close();

  if (params.brightness !== 0) {
    imageData = applyBrightness(imageData, params.brightness);
  }

  if (params.contrast !== 0) {
    imageData = applyContrast(imageData, params.contrast);
  }

  const noise = await loadNoiseTexture(params.noiseSize);
  const grayscaleData = new Uint8ClampedArray(ditherWidth * ditherHeight);

  for (let i = 0; i < imageData.data.length; i += 4) {
    const avg =
      (imageData.data[i] + imageData.data[i + 1] + imageData.data[i + 2]) / 3;
    grayscaleData[i / 4] = avg;
  }

  const outputData = new Uint8ClampedArray(ditherWidth * ditherHeight * 4);

  for (let y = 0; y < ditherHeight; y++) {
    for (let x = 0; x < ditherWidth; x++) {
      const wrapX = wrap(noise.width, x);
      const wrapY = wrap(noise.height, y);
      const noiseIdx = wrapY * noise.width + wrapX;
      const imageIdx = y * ditherWidth + x;
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
      outputData[outputIdx + 3] = 255;
    }
  }

  let outputWidth = ditherWidth;
  let outputHeight = ditherHeight;
  let finalData = outputData;

  if (pixelSize > 1) {
    outputWidth = targetWidth;
    outputHeight = targetHeight;
    finalData = new Uint8ClampedArray(outputWidth * outputHeight * 4);

    for (let y = 0; y < outputHeight; y++) {
      for (let x = 0; x < outputWidth; x++) {
        const srcX = Math.min(ditherWidth - 1, Math.floor(x / pixelSize));
        const srcY = Math.min(ditherHeight - 1, Math.floor(y / pixelSize));
        const srcIdx = (srcY * ditherWidth + srcX) * 4;
        const dstIdx = (y * outputWidth + x) * 4;

        finalData[dstIdx] = outputData[srcIdx];
        finalData[dstIdx + 1] = outputData[srcIdx + 1];
        finalData[dstIdx + 2] = outputData[srcIdx + 2];
        finalData[dstIdx + 3] = 255;
      }
    }
  }

  const outputImageData = new ImageData(finalData, outputWidth, outputHeight);
  const outputCanvas = new OffscreenCanvas(outputWidth, outputHeight);
  const outputCtx = outputCanvas.getContext("2d");

  if (!outputCtx) {
    throw new Error("Could not get canvas context");
  }

  outputCtx.putImageData(outputImageData, 0, 0);

  const blob = await outputCanvas.convertToBlob({ type: "image/png" });
  return { blob, height: outputHeight, width: outputWidth };
};

const ctx = self as DedicatedWorkerGlobalScope;

ctx.addEventListener(
  "message",
  async (event: MessageEvent<DitherWorkerRequest>) => {
    const { id, file, params } = event.data;

    if (typeof OffscreenCanvas === "undefined") {
      const response: DitherWorkerResponse = {
        error: "OffscreenCanvas is not supported in this browser.",
        id,
      };
      ctx.postMessage(response);
      return;
    }

    try {
      const { blob, width, height } = await processDither(file, params);
      const response: DitherWorkerResponse = { blob, height, id, width };
      ctx.postMessage(response);
    } catch (error) {
      const response: DitherWorkerResponse = {
        error: error instanceof Error ? error.message : "Unknown worker error",
        id,
      };
      ctx.postMessage(response);
    }
  }
);
