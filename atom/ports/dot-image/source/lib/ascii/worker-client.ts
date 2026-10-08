/**
 * Worker client for ASCII rendering
 *
 * Provides a Promise-based interface to the ASCII worker.
 * Handles worker lifecycle, message passing, and fallback to main thread.
 */

import { renderAscii } from "./core";
import type {
  AsciiRenderOptions,
  AsciiRenderResult,
  AsciiWorkerRequest,
  AsciiWorkerResponse,
} from "./types";

/**
 * Pending request waiting for worker response.
 */
interface PendingRequest {
  resolve: (result: AsciiRenderResult) => void;
  reject: (error: Error) => void;
}

/**
 * Check if OffscreenCanvas is supported (required for worker rendering).
 */
export const isWorkerSupported = (): boolean =>
  typeof Worker !== "undefined" && typeof OffscreenCanvas !== "undefined";

/**
 * Generate a unique request ID.
 */
const generateId = (): string =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;

/**
 * ASCII Worker Client
 *
 * Manages a web worker for offloading ASCII rendering.
 * Falls back to main thread rendering if workers are unsupported.
 */
export class AsciiWorkerClient {
  private worker: Worker | null = null;
  private readonly pending = new Map<string, PendingRequest>();
  private ready = false;
  private readonly readyPromise: Promise<void>;
  private resolveReady: (() => void) | null = null;

  constructor() {
    this.readyPromise = new Promise((resolve) => {
      this.resolveReady = resolve;
    });

    if (isWorkerSupported()) {
      this.initWorker();
    } else {
      // Mark as ready immediately for fallback mode
      this.ready = true;
      this.resolveReady?.();
    }
  }

  /**
   * Initialize the web worker.
   */
  private initWorker(): void {
    try {
      // Create worker from the worker file
      this.worker = new Worker(
        new URL("../workers/ascii-worker.ts", import.meta.url),
        { type: "module" }
      );

      this.worker.onmessage = this.handleMessage.bind(this);
      this.worker.onerror = this.handleError.bind(this);
    } catch {
      // Fallback if worker creation fails
      this.ready = true;
      this.resolveReady?.();
    }
  }

  /**
   * Handle messages from the worker.
   */
  private handleMessage(
    event: MessageEvent<AsciiWorkerResponse | { type: "ready" }>
  ): void {
    const { data } = event;

    if (data.type === "ready") {
      this.ready = true;
      this.resolveReady?.();
      return;
    }

    const { id, type } = data as AsciiWorkerResponse;
    const pending = this.pending.get(id);

    if (!pending) {
      return;
    }

    this.pending.delete(id);

    if (type === "error") {
      pending.reject(
        new Error((data as AsciiWorkerResponse).error ?? "Worker error")
      );
    } else if (type === "result") {
      const { result } = data as AsciiWorkerResponse;
      if (result) {
        pending.resolve(result);
      }
    }
  }

  /**
   * Handle worker errors.
   */
  private handleError(event: ErrorEvent): void {
    // Reject all pending requests
    for (const [id, pending] of this.pending) {
      pending.reject(new Error(`Worker error: ${event.message}`));
      this.pending.delete(id);
    }

    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }

    if (!this.ready) {
      this.ready = true;
      this.resolveReady?.();
    }
  }

  /**
   * Render ASCII art from ImageData.
   *
   * Uses worker if available, falls back to main thread otherwise.
   */
  async render(
    imageData: ImageData,
    options: AsciiRenderOptions = {}
  ): Promise<AsciiRenderResult> {
    await this.readyPromise;

    // Fallback to main thread if worker is not available
    if (!this.worker) {
      return renderAscii(imageData, options);
    }

    // Capture worker reference to avoid non-null assertion in callback
    const { worker } = this;

    return new Promise((resolve, reject) => {
      const id = generateId();

      this.pending.set(id, { resolve, reject });

      const request: AsciiWorkerRequest = {
        type: "render",
        id,
        imageData,
        options,
      };

      // Transfer ImageData buffer for better performance
      worker.postMessage(request, [imageData.data.buffer]);
    });
  }

  /**
   * Terminate the worker.
   */
  terminate(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }

    // Reject all pending requests
    for (const [id, pending] of this.pending) {
      pending.reject(new Error("Worker terminated"));
      this.pending.delete(id);
    }
  }

  /**
   * Check if the worker is ready.
   */
  isReady(): boolean {
    return this.ready;
  }

  /**
   * Wait for the worker to be ready.
   */
  waitReady(): Promise<void> {
    return this.readyPromise;
  }
}

/**
 * Create a singleton worker client.
 */
let sharedClient: AsciiWorkerClient | null = null;

export const getSharedWorkerClient = (): AsciiWorkerClient => {
  if (!sharedClient) {
    sharedClient = new AsciiWorkerClient();
  }
  return sharedClient;
};

/**
 * Render ASCII using the shared worker client.
 */
export const renderAsciiAsync = (
  imageData: ImageData,
  options: AsciiRenderOptions = {}
): Promise<AsciiRenderResult> => {
  const client = getSharedWorkerClient();
  return client.render(imageData, options);
};
