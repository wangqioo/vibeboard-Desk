/* tslint:disable */
/* eslint-disable */
export enum Species {
  Empty = 0,
  Wall = 1,
  Sand = 2,
  Water = 3,
  Stone = 13,
  Ice = 9,
  Gas = 4,
  Cloner = 5,
  Mite = 15,
  Wood = 7,
  Plant = 11,
  Fungus = 18,
  Seed = 19,
  Fire = 6,
  Lava = 8,
  Acid = 12,
  Dust = 14,
  Oil = 16,
  Rocket = 17,
}
export class Cell {
  private constructor();
  free(): void;
}
export class Universe {
  private constructor();
  free(): void;
  reset(): void;
  tick(): void;
  width(): number;
  height(): number;
  cells(): number;
  winds(): number;
  burns(): number;
  paint(x: number, y: number, size: number, species: Species): void;
  push_undo(): void;
  pop_undo(): void;
  flush_undos(): void;
  static new(width: number, height: number): Universe;
}
export class Wind {
  private constructor();
  free(): void;
}

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
  readonly memory: WebAssembly.Memory;
  readonly __wbg_cell_free: (a: number, b: number) => void;
  readonly __wbg_universe_free: (a: number, b: number) => void;
  readonly universe_reset: (a: number) => void;
  readonly universe_tick: (a: number) => void;
  readonly universe_width: (a: number) => number;
  readonly universe_height: (a: number) => number;
  readonly universe_cells: (a: number) => number;
  readonly universe_winds: (a: number) => number;
  readonly universe_burns: (a: number) => number;
  readonly universe_paint: (a: number, b: number, c: number, d: number, e: number) => void;
  readonly universe_push_undo: (a: number) => void;
  readonly universe_pop_undo: (a: number) => void;
  readonly universe_flush_undos: (a: number) => void;
  readonly universe_new: (a: number, b: number) => number;
  readonly __wbg_wind_free: (a: number, b: number) => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;
/**
* Instantiates the given `module`, which can either be bytes or
* a precompiled `WebAssembly.Module`.
*
* @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
*
* @returns {InitOutput}
*/
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
* If `module_or_path` is {RequestInfo} or {URL}, makes a request and
* for everything else, calls `WebAssembly.instantiate` directly.
*
* @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
*
* @returns {Promise<InitOutput>}
*/
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
