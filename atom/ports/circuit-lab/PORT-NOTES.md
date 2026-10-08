# Circuit Lab / 电路实验室

Original CircuitJS1 4.1.5js GWT runtime and Java source (upstream tag commit recorded in UPSTREAM.txt). Full GPL-2.0 source is in upstream-source/, with build scripts. ATOM controls call the upstream public JS interface; the original solver and voltage/current visualization remain intact. Query defaults hide the large desktop menu/sidebar. Canvas allocation reserves 84px for ATOM controls. The GWT bootstrap installs code in the app document instead of a nested frame, preserving ATOM's opaque-origin sandbox; query reading uses an explicit local string. Modified readable runtime JS is bundled as well as original upstream source.

Three offline experiments: RLC, half-wave rectification and 555 oscillator. Pause/resume, reset and resistance ×1/×2 re-import actual circuits. Double-click component editing is available through the upstream dialog. This is a compact experiment interface, not the full desktop schematic editor. No cloud, Dropbox, service worker or remote scripts are used.

Deploy the whole folder. Entry-only bundle.json alone does not contain the engine. Reassemble wrappers with atom/tools/build_science_extras.py after the recorded source/engine assets are available.
