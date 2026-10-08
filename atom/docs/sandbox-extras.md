# 材料世界与折纸实验室离线移植

两项均保留真实上游模拟算法，不是视觉占位。构建：

```sh
rustup toolchain install 1.81.0 --profile minimal --target wasm32-unknown-unknown
cargo install wasm-bindgen-cli --version 0.2.100 --locked
python3 atom/tools/build_sandbox_extras.py
```

构建脚本缺源码时下载固定 SHA，保留原 MIT LICENSE 与 UPSTREAM.txt；上游源码在 vendor（忽略版本控制），生成运行资源在 ports。目录资源离线部署，bundle.json 只包含入口 HTML，不能单独当成完整离线资源包。

- 材料世界：Sandspiel 原 Rust Universe/Species 编译 WASM，160×100 模拟格，20次/秒；Canvas2D显示，真实沙、水、火、木、油、植物、冰、熔岩、酸等材料反应。更换原云端社区和React界面，不含账号、上传和在线画廊；未移植可选流体风场渲染，粒子反应核心保留。支持连续笔画、笔刷大小、暂停、撤销和清空。
- 折纸实验室：原 OrigamiSimulator 的折痕/弹性约束、GPU动态求解器与 Three.js 控制器；默认四折顶点9个节点，保留三项精选低复杂度模型。每帧求解12步，WebGL2兼容层调整旧GLSL与浮点纹理。原桌面控件隐藏，以折叠滑块、模型选择、暂停、复位替代。全部上游依赖、模型、shader及源码离线保留，移除遥测，原字体依赖改为系统字体。

浏览器检查已在480×360、allow-scripts且不含allow-same-origin的sandbox iframe下通过，资源服务器必须提供Access-Control-Allow-Origin:*；保留脚本crossorigin与模块WASM的跨源加载。原Origami并发资源较多，HTTP服务request_queue_size建议128以免连接被reset。

验证：root与body高度360；无pageerror/Shader编译错误；沙粒放置后50tick状态发生变化且仍有21粒沙；折叠比例60%改95%后真实节点坐标变化（不是CSS旋转）；9节点求解正常。实机性能仍需root统一部署后验证，不将Mac上的软件WebGL结果当作RK3566性能结论。

图标均为新画的透明currentColor SVG，未复制上游品牌标识。

补充验证：另外两项折纸模型15/9节点均加载成功，坐标全为有限数；暂停开关与复位按钮可操作，无脚本错误。可复用浏览器验证脚本为 `atom/tools/validate_sandbox_extras.cjs`（Playwright，`PORTS_URL` 指向支持CORS的ports目录，`CHROME_EXECUTABLE` 可指定已安装浏览器）。

旧Chromium兼容：Rust1.99即使禁用reference-types仍因预编译std产生两张表；现在固定Rust1.81.0，并使用 `-C target-feature=-reference-types,-multivalue,-bulk-memory`，wasm-bindgen输出仅一张函数表。构建目录独立target-mvp，防止现代工具链产物误覆盖。折纸上游html/body的min-width775px已覆盖为0，真实scrollWidth现为480，控件条460。
