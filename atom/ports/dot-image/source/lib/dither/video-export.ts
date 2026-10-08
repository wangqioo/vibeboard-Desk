import { ArrayBufferTarget, Muxer } from "mp4-muxer";

import type { FrameRenderer } from "@/lib/frame-renderer";

// H.264 requires even dimensions.
function toEven(n: number): number {
  return n % 2 === 0 ? n : n - 1;
}

// Candidate AVC codec strings, from most to least capable. We probe them with
// VideoEncoder.isConfigSupported and use the first that the browser accepts for
// the target resolution.
const AVC_CANDIDATES = [
  "avc1.640033", // High 5.1
  "avc1.640028", // High 4.0
  "avc1.4d0028", // Main 4.0
  "avc1.42001f", // Baseline 3.1
];

async function pickAvcCodec(
  width: number,
  height: number,
  framerate: number
): Promise<string | null> {
  if (typeof VideoEncoder === "undefined") {
    return null;
  }
  for (const codec of AVC_CANDIDATES) {
    try {
      const support = await VideoEncoder.isConfigSupported({
        codec,
        framerate,
        height,
        width,
      });
      if (support.supported) {
        return codec;
      }
    } catch {
      // try next candidate
    }
  }
  return null;
}

interface VideoSession {
  muxer: Muxer<ArrayBufferTarget>;
  encoder: VideoEncoder;
  outCanvas: HTMLCanvasElement;
  outCtx: CanvasRenderingContext2D;
}

async function createVideoSession(opts: {
  width: number;
  height: number;
  fps: number;
  bitrate: number;
  audio?: { numberOfChannels: number; sampleRate: number };
}): Promise<VideoSession> {
  const width = toEven(opts.width);
  const height = toEven(opts.height);

  const codec = await pickAvcCodec(width, height, opts.fps);
  if (!codec) {
    throw new Error("H.264 encoding is not supported in this browser");
  }

  const muxer = new Muxer({
    target: new ArrayBufferTarget(),
    video: { codec: "avc", frameRate: opts.fps, height, width },
    audio: opts.audio
      ? {
          codec: "aac",
          numberOfChannels: opts.audio.numberOfChannels,
          sampleRate: opts.audio.sampleRate,
        }
      : undefined,
    // Source frame timestamps may not start at 0, so offset them to the origin.
    firstTimestampBehavior: "offset",
    fastStart: "in-memory",
  });

  const encoder = new VideoEncoder({
    error: (e) => {
      console.error("VideoEncoder error:", e);
    },
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
  });
  encoder.configure({
    bitrate: opts.bitrate,
    codec,
    framerate: opts.fps,
    height,
    width,
  });

  const outCanvas = document.createElement("canvas");
  outCanvas.width = width;
  outCanvas.height = height;
  const outCtx = outCanvas.getContext("2d");
  if (!outCtx) {
    throw new Error("Could not get canvas context");
  }

  return { encoder, muxer, outCanvas, outCtx };
}

// Draw a dithered ImageData onto the (even-sized) output canvas.
function paintFrame(session: VideoSession, dithered: ImageData) {
  session.outCtx.putImageData(dithered, 0, 0);
}

async function encodeAudioFromBuffer(
  muxer: Muxer<ArrayBufferTarget>,
  audioBuffer: AudioBuffer
): Promise<void> {
  const { numberOfChannels, sampleRate, length } = audioBuffer;

  const audioEncoder = new AudioEncoder({
    error: (e) => {
      console.error("AudioEncoder error:", e);
    },
    output: (chunk, meta) => muxer.addAudioChunk(chunk, meta),
  });
  audioEncoder.configure({
    bitrate: 128_000,
    codec: "mp4a.40.2",
    numberOfChannels,
    sampleRate,
  });

  // Feed the PCM in chunks as planar float32 AudioData.
  const CHUNK = 4096;
  const channels: Float32Array[] = [];
  for (let c = 0; c < numberOfChannels; c++) {
    channels.push(audioBuffer.getChannelData(c));
  }

  for (let offset = 0; offset < length; offset += CHUNK) {
    const frames = Math.min(CHUNK, length - offset);
    const planar = new Float32Array(frames * numberOfChannels);
    for (let c = 0; c < numberOfChannels; c++) {
      planar.set(channels[c].subarray(offset, offset + frames), c * frames);
    }
    const timestamp = Math.round((offset / sampleRate) * 1_000_000);
    const audioData = new AudioData({
      data: planar,
      format: "f32-planar",
      numberOfChannels,
      numberOfFrames: frames,
      sampleRate,
      timestamp,
    });
    audioEncoder.encode(audioData);
    audioData.close();
  }

  await audioEncoder.flush();
  audioEncoder.close();
}

async function decodeAudio(file: File): Promise<AudioBuffer | null> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const AudioCtx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    const audioCtx = new AudioCtx();
    const buffer = await audioCtx.decodeAudioData(arrayBuffer);
    await audioCtx.close();
    // A silent/absent audio track decodes to zero channels.
    if (buffer.numberOfChannels === 0 || buffer.length === 0) {
      return null;
    }
    return buffer;
  } catch {
    // No decodable audio track — export video only.
    return null;
  }
}

export interface ExportFileOptions {
  video: HTMLVideoElement;
  file: File | null;
  /** Renders one source frame into the current mode's output ImageData. */
  renderFrame: FrameRenderer;
  fps?: number;
  onProgress?: (fraction: number) => void;
  signal?: AbortSignal;
}

// Seek the video to a given time and resolve once the frame is ready. Seeking
// (rather than realtime playback) keeps export frame-accurate and unaffected by
// autoplay policy or a backgrounded tab.
function seekTo(video: HTMLVideoElement, time: number): Promise<void> {
  return new Promise((resolve, reject) => {
    if (Math.abs(video.currentTime - time) < 1e-3 && video.readyState >= 2) {
      resolve();
      return;
    }
    const timeout = setTimeout(() => {
      cleanup();
      resolve();
    }, 3000);
    const onSeeked = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error("Seek failed during export"));
    };
    const cleanup = () => {
      clearTimeout(timeout);
      video.removeEventListener("seeked", onSeeked);
      video.removeEventListener("error", onError);
    };
    video.addEventListener("seeked", onSeeked);
    video.addEventListener("error", onError);
    video.currentTime = time;
  });
}

/**
 * Export a rendered MP4 from a source video element by seeking through it frame
 * by frame and encoding each frame. Original audio is re-encoded and muxed in.
 * The per-frame rendering (dither, ASCII, LED, …) is supplied by `renderFrame`.
 */
export async function exportVideoFile(opts: ExportFileOptions): Promise<Blob> {
  const { video, file, renderFrame, onProgress, signal } = opts;
  const fps = opts.fps ?? 30;

  const sourceWidth = video.videoWidth;
  const sourceHeight = video.videoHeight;
  if (!(sourceWidth && sourceHeight)) {
    throw new Error("Video has no dimensions yet");
  }

  // Dimensions of one rendered frame (drives the output canvas size).
  const sample = renderFrame(video, sourceWidth, sourceHeight);
  if (!sample) {
    throw new Error("Renderer is not ready");
  }

  const audioBuffer = file ? await decodeAudio(file) : null;

  const session = await createVideoSession({
    audio: audioBuffer
      ? {
          numberOfChannels: audioBuffer.numberOfChannels,
          sampleRate: audioBuffer.sampleRate,
        }
      : undefined,
    bitrate: 8_000_000,
    fps,
    height: sample.height,
    width: sample.width,
  });

  if (audioBuffer) {
    await encodeAudioFromBuffer(session.muxer, audioBuffer);
  }

  const duration = video.duration || 0;
  const frameDuration = 1 / fps;
  const frameDurationUs = Math.round(1_000_000 / fps);

  video.pause();

  let frameCount = 0;
  for (let time = 0; time < duration; time += frameDuration) {
    if (signal?.aborted) {
      throw new DOMException("Export aborted", "AbortError");
    }
    await seekTo(video, time);

    const rendered = renderFrame(video, sourceWidth, sourceHeight);
    if (!rendered) {
      continue;
    }
    paintFrame(session, rendered);

    const frame = new VideoFrame(session.outCanvas, {
      duration: frameDurationUs,
      timestamp: Math.round(time * 1_000_000),
    });
    session.encoder.encode(frame, { keyFrame: frameCount % (fps * 2) === 0 });
    frame.close();
    frameCount++;

    if (duration > 0) {
      onProgress?.(Math.min(1, time / duration));
    }

    // Let the encoder drain so its queue doesn't grow unbounded.
    if (session.encoder.encodeQueueSize > fps) {
      await session.encoder.flush();
    }
  }

  await session.encoder.flush();
  session.encoder.close();
  session.muxer.finalize();
  onProgress?.(1);

  return new Blob([session.muxer.target.buffer], { type: "video/mp4" });
}
