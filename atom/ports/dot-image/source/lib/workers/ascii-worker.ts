/**
 * Web Worker for ASCII rendering
 *
 * Offloads heavy image processing to a worker thread for responsive UI.
 * Uses OffscreenCanvas for efficient rendering without main thread blocking.
 */

import { renderAscii } from "../ascii/core";
import type { AsciiWorkerRequest, AsciiWorkerResponse } from "../ascii/types";

// Worker context - use globalThis for worker scope
const worker = globalThis as unknown as Worker;

/**
 * Handle incoming messages from the main thread.
 */
worker.onmessage = (event: MessageEvent<AsciiWorkerRequest>) => {
  const { type, id, imageData, options } = event.data;

  if (type !== "render") {
    const errorResponse: AsciiWorkerResponse = {
      type: "error",
      id,
      error: `Unknown message type: ${type}`,
    };
    worker.postMessage(errorResponse);
    return;
  }

  try {
    // Perform the heavy rendering work
    const result = renderAscii(imageData, options);

    // Send the result back
    const response: AsciiWorkerResponse = {
      type: "result",
      id,
      result,
    };

    // Transfer ImageData buffer if present for better performance
    if (result.imageData) {
      worker.postMessage(response, [result.imageData.data.buffer]);
    } else {
      worker.postMessage(response);
    }
  } catch (error) {
    const errorResponse: AsciiWorkerResponse = {
      type: "error",
      id,
      error: error instanceof Error ? error.message : "Unknown error",
    };
    worker.postMessage(errorResponse);
  }
};

// Signal worker is ready
worker.postMessage({ type: "ready" });
