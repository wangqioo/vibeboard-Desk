# 点阵剧场 / Dot Theater

Original renderer: [sallar/led-matrix](https://github.com/sallar/led-matrix), MIT, commit `271d12ef40dae2cc2725fcbfd9ec990be3ff41fc`. npm `led-matrix@1.0.1` records the identical gitHead. The checked-in compiled class is unchanged and wrapped only to export `window.LedMatrix`; original TypeScript, tests, metadata and license are preserved in `upstream-source`.

The ATOM controller provides 32×16 and 64×32 pixel painting, four ink colors, erasing, up to 12 editable/duplicate frames, playback at 2–14 FPS, animated heart/walker/rain examples, and a sampled-font text marquee including Chinese when the system supplies a CJK font. Every frame is rendered through the original LedMatrix `setData`/`render` methods. Root screen never scrolls; only the project JSON textarea scrolls. Controls use the standard theme tokens and `theme_ui=controls`, while pixel ink colors remain meaningful content colors. Destructive changes use an in-app confirmation screen because opaque-origin application frames do not allow native modal dialogs.

## Persistence

Opaque-origin sandbox frames cannot directly use localStorage. This app requests its dedicated ATOM parent bridge:

- Child → parent: `{type:'atom:dot-state',action:'get'}` or `{type:'atom:dot-state',action:'set',data:state}`.
- Parent → child: `{type:'atom:dot-state-result',action,ok,data}`.
- State: `{format:'atom-dot-theater-v1',width:32|64,height:width/2,frames:number[][],speed:integer2..14,text:string<=48}`.
- 1–12 frames; each has exactly width×height indices, integer 0–4. Size is below 128 KiB.

The parent must validate state and bind it to the actual `dot-theater` frame/window source. Saving is explicit through “保存到本机”; “已保存” appears only after positive acknowledgment. Startup restores a valid stored project. When the bridge is absent, denied or times out, the app clearly reports session-only state. Manual JSON text export/import remains available, without claiming automatic file saving.

Debug interface: `window.dotTheater` exposes `engine`, `matrix`, `frames`, `size`, `playing`, `mode`. Main IDs: `matrix`, `resolution`, `previous`, `next`, `add`, `play`, `tools`; tool IDs: `brush`, `color`, `clear`, `delete`, `text`, `marquee`, `speed`, `save`, `project`, `import`, `file`; confirmation: `confirm-accept`, `confirm-cancel`.

Rebuild offline with `python3 atom/tools/build_dot_theater.py`. Deploy the complete folder, including renderer, source, license and icon; use bundle.json's manifest for installation.
