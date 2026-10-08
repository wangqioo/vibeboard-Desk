# Dot Life / 点阵生命

Original skeeto/webgl-game-of-life GPU ping-pong shader, Unlicense, fixed source SHA in UPSTREAM.txt. ATOM replaces the original desktop controller and display shader with circular LED dots. Conway's transition rules remain unchanged. A 64×32 toroidal grid runs at 6/12/24 generations per second; rendering uses WebGL RGBA8 textures and does not need WebGPU or floating-point render targets.

Draw with left drag, erase with right drag; choose glider gun, pulsar, spaceships or random pattern; pause, single-step and clear. State lasts for this opening. Fullscreen 480×360 with theme-aware controls and independent transparent currentColor icon. Full local folder is required, including glsl shaders and Igloo library. Rebuild with atom/tools/build_dot_life.py after obtaining the recorded upstream snapshot.

Real device check: a horizontal three-cell blinker became the expected vertical three-cell blinker after one GPU step, GL error 0; all controls remain in bounds and Space returns to desktop.
