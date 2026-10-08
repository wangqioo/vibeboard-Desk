# Music Vision / 音乐幻境

Offline ATOM adapter around the original Butterchurn 2.6.7 WebGL2/MilkDrop engine and the 29 original presets in butterchurn-presets 2.4.7 Minimal. `vendor/` files are unmodified published distributions. npm releases, corresponding Git commits and file checksums are recorded in UPSTREAM.txt and SHA256SUMS. Both upstream licenses are preserved.

The first click starts a small local WebAudio demo composition. No microphone, model, streaming service or network is used. A user can choose an audio file up to 40 MiB; decoding is local and playback starts only after another explicit click. Switching a preset blends for 1.5 seconds. Automatic changes occur every 18 seconds when enabled. Rendering is capped at approximately 30 FPS, mesh 24×18 and pixel ratio 1 for the RK3566 target.

Requires WebGL2 and WebAudio. Unsupported GPUs and file-decoding errors appear on screen. Scene colors are intentionally preserved; the control chrome opts into the current ATOM theme. Fullscreen 480×360, no root scrolling. On page hide or backgrounding, playback stops. The app does not expose a microphone mode because the sandbox cannot directly access hardware.

Rebuild with `python3 atom/tools/build_music_extras.py`; deploy the complete folder and manifest from bundle.json. No npm install is needed.
