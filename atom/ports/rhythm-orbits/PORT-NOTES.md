# Rhythm Orbits / 节奏轨道

This offline ATOM port uses the original Music Pattern Generator Euclidean processor (`processors/epg/processor.js`), its Bjorklund algorithm, and original MIDI connectors. `upstream-core.js` is mechanically assembled from the corresponding source files by build_music_extras.py; the rhythm-generation and MIDI note-event processing logic is retained. Parameters are changed by terminating/recreating the original processor, avoiding the original desktop application's global state, network editor and dynamic loader.

`upstream-source/src` contains the complete unmodified upstream source tree for the pinned develop commit, including original modules/assets, to preserve corresponding source. The LICENSE and source headers specify GPL-3.0-or-later; package.json's LGPL-3.0 metadata conflicts with them, so this adapter follows the included GPL terms and preserves the original attribution.

The original processors emit MIDI note events, which the ATOM adapter routes into its own WebAudio synthesizer (low drum, wood-like triangle, bell sine). Sound is real, local, and starts only on an explicit click. No MIDI hardware, sound-font service or model is required. The canvas visualizes three independent Euclidean sequences; tap a ring to select it, adjust steps/pulses, rotate, mute or randomize. BPM 45–180, 4–24 steps. A 25 ms scheduler scans the original processors 120 ms ahead. Track colors encode voices and remain meaningful scene colors; controls opt into the current device theme.

This exposes the project's Euclidean generator as a complete small-screen instrument; it does not include the original desktop node/patch editor, snapshot editor or external hardware MIDI routing UI. Complete original source is bundled separately for those capabilities. No root scrolling, and audio stops when the app is hidden or destroyed.

Rebuild with `python3 atom/tools/build_music_extras.py`; deploy the complete folder and manifest from bundle.json. No npm install is needed.
