/** The render mode selected in the studio. */
export type RenderMode = "blue-noise" | "ascii" | "led";

interface ModeOption {
  value: RenderMode;
  label: string;
  description: string;
}

/** Ordered list of modes for the mode switcher, with display copy. */
export const MODE_OPTIONS: ModeOption[] = [
  {
    value: "blue-noise",
    label: "Blue Noise",
    description: "Grainless blue-noise dithering",
  },
  {
    value: "ascii",
    // oxlint-disable-next-line unicorn/text-encoding-identifier-case -- display label, not a text encoding
    label: "ASCII",
    description: "Glyph-based ASCII art",
  },
  {
    value: "led",
    label: "LED",
    description: "Red-to-white LED dot matrix",
  },
];

/** All render mode values, in switcher order. Used for URL query parsing. */
export const MODE_VALUES: RenderMode[] = MODE_OPTIONS.map(
  (option) => option.value
);

/** The default render mode when none is set in the URL. */
export const DEFAULT_MODE: RenderMode = "blue-noise";

/** The download filename suffix for a mode (e.g. photo-ascii.png). */
export const MODE_FILENAME_SUFFIX: Record<RenderMode, string> = {
  "blue-noise": "dithered",
  ascii: "ascii",
  led: "led",
};

export function modeLabel(mode: RenderMode): string {
  return MODE_OPTIONS.find((option) => option.value === mode)?.label ?? mode;
}
