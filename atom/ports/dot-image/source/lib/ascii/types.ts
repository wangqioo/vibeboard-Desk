export type AsciiOutputMode = "grid" | "imageData" | "both";

export interface AsciiFontSpec {
  family: string;
  size: number;
  weight?: number | "normal" | "bold";
  style?: "normal" | "italic" | "oblique";
  lineHeight?: number;
}

export interface AsciiCircle {
  x: number;
  y: number;
  r: number;
}

export interface AsciiSamplingLayout {
  internal: AsciiCircle[];
  external: AsciiCircle[];
  externalInfluence: number[][];
}

export interface AsciiLookupCacheOptions {
  quantizationLevels: number;
}

export interface AsciiRenderOptions {
  maxWidth?: number | null;
  maxHeight?: number | null;
  cellWidth?: number;
  cellHeight?: number;
  font?: AsciiFontSpec;
  charset?: string | string[];
  sampleCount?: number;
  brightness?: number;
  contrast?: number;
  contrastExponent?: number;
  directionalContrastExponent?: number;
  output?: AsciiOutputMode;
  foreground?: string;
  background?: string;
  layout?: AsciiSamplingLayout;
  cache?: Partial<AsciiLookupCacheOptions>;
  ledMode?: boolean;
  /**
   * Supersampling factor for the output ImageData only. Values > 1 draw each
   * glyph/LED cell at a higher pixel density (crisper when the preview is
   * upscaled) without changing the sampling grid, columns, or chosen glyphs.
   */
  renderScale?: number;
}

export interface AsciiCharacter {
  char: string;
  vector: number[];
}

export interface AsciiCharacterSet {
  characters: AsciiCharacter[];
  maxValues: number[];
  charset: string[];
  font: AsciiFontSpec;
  cellWidth: number;
  cellHeight: number;
  layout: AsciiSamplingLayout;
}

export interface AsciiRenderResult {
  grid: string[];
  columns: number;
  rows: number;
  width: number;
  height: number;
  cellWidth: number;
  cellHeight: number;
  imageData?: ImageData;
  brightnessGrid?: number[][];
}

export interface PreparedSamplingLayout {
  internalOffsets: Float32Array[];
  externalOffsets: Float32Array[];
  sampleCount: number;
  cellWidth: number;
  cellHeight: number;
  layout: AsciiSamplingLayout;
}

// Worker message types for async rendering
export interface AsciiWorkerRequest {
  type: "render";
  id: string;
  imageData: ImageData;
  options: AsciiRenderOptions;
}

export interface AsciiWorkerResponse {
  type: "result" | "error" | "progress";
  id: string;
  result?: AsciiRenderResult;
  error?: string;
  progress?: number;
}

// Lookup cache interface
export interface LookupCache {
  lookup: (samplingVector: number[]) => string;
  clear: () => void;
  stats: () => { hits: number; misses: number; size: number };
}

// Rendering pipeline state
export interface AsciiPipelineState {
  characterSet: AsciiCharacterSet;
  samplingLayout: PreparedSamplingLayout;
  lookupFn: (samplingVector: number[]) => string;
}
