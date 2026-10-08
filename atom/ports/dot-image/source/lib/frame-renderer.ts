import { renderAscii } from "@/lib/ascii/core";
import type { AsciiParameters } from "@/lib/ascii/params";
import { toAsciiRenderOptions } from "@/lib/ascii/params";
import { createDitherScratch, ditherDrawable } from "@/lib/dither/core";
import type { DitherParameters, NoiseTexture } from "@/lib/dither/types";

/**
 * Turns a single video/image frame into a rendered ImageData for the active
 * mode. Returns null when the renderer isn't ready yet (e.g. noise texture still
 * loading), so the caller can skip the frame. Implementations read the latest
 * parameters through getters so the render loop never has to restart.
 */
export type FrameRenderer = (
  source: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number
) => ImageData | null;

/** Blue-noise dithering frame renderer. Reuses one scratch across frames. */
export function createDitherFrameRenderer(opts: {
  getNoise: () => NoiseTexture | null;
  getParams: () => DitherParameters;
}): FrameRenderer {
  // Created lazily on first frame so the factory never touches the DOM during
  // server-side rendering.
  let scratch: ReturnType<typeof createDitherScratch> | null = null;
  return (source, width, height) => {
    const noise = opts.getNoise();
    if (!noise) {
      return null;
    }
    scratch ??= createDitherScratch();
    return ditherDrawable(
      source,
      width,
      height,
      noise,
      opts.getParams(),
      scratch
    );
  };
}

// Cap the working resolution for ASCII/LED video so per-frame glyph rendering
// stays interactive. Sampling averages over cells, so downscaling first barely
// changes the result while greatly cutting the cost.
const ASCII_VIDEO_MAX_WIDTH = 900;

/** ASCII / LED frame renderer. Reuses one working canvas across frames. */
export function createAsciiFrameRenderer(opts: {
  getParams: () => AsciiParameters;
  getLedMode: () => boolean;
}): FrameRenderer {
  // Created lazily on first frame so the factory never touches the DOM during
  // server-side rendering.
  let work: HTMLCanvasElement | null = null;
  let workCtx: CanvasRenderingContext2D | null = null;

  return (source, width, height) => {
    if (!(width && height)) {
      return null;
    }
    if (!work) {
      work = document.createElement("canvas");
      workCtx = work.getContext("2d", { willReadFrequently: true });
    }
    if (!workCtx) {
      return null;
    }
    const scale = Math.min(1, ASCII_VIDEO_MAX_WIDTH / width);
    const workWidth = Math.max(1, Math.round(width * scale));
    const workHeight = Math.max(1, Math.round(height * scale));
    if (work.width !== workWidth || work.height !== workHeight) {
      work.width = workWidth;
      work.height = workHeight;
    }
    workCtx.drawImage(source, 0, 0, workWidth, workHeight);
    const imageData = workCtx.getImageData(0, 0, workWidth, workHeight);
    const options = toAsciiRenderOptions(
      opts.getParams(),
      workWidth,
      opts.getLedMode()
    );
    return renderAscii(imageData, options).imageData ?? null;
  };
}
