# 点阵波场移植记录

上游：[m1ckc3s/shimmering-dots](https://github.com/m1ckc3s/shimmering-dots)，固定 SHA `072370df144a2de5d2c5aa49f80eab48140d5721`，MIT。原完整源码保存在 ports/dot-waves/source，LICENSE 单独保留。

从原 PixelBackground.tsx 提取 React wrapper 之前的 Canvas2D 引擎，用 Node 24 内置 stripTypeScriptTypes 去类型，原 Pixel、renderShimmer、renderTwist、renderOrganic、renderAurora、renderMorph、updateFloaters/drawFloaters 算法保持。去掉 React/Tailwind 和大控制面板，改为适配480×360的一屏控制。七种可切模式：涟漪点阵、网格闪烁、螺旋点阵、有机波场、极光点阵、流变点阵、鼠标排斥。前六项保留网格与相位场特征，鼠标排斥保留原力场交互；不伪造点阵模拟。

构建 `python3 atom/tools/build_dot_waves.py`，Node24路径可用 NODE_EXECUTABLE 指定。缺源码时脚本下载固定SHA归档。所有生成引擎和资源离线，无React运行时、CDN、远程字体或遥测。bundle是入口加图标，必须连同整个ports目录部署。

应用画布固定黑背景以维持上游明暗波场，控制条使用 --card/--ink/--line/--accent 标准主题变量；新绘透明currentColor64SVG通过ensure_icon校验。manifest fullscreen/theme_ui controls。

本地 Chromium sandbox allow-scripts、不含allow-same-origin验证：七模式实际Canvas像素总和跨帧均发生变化，网格单元570、涟漪975、螺旋714、有机4131、极光/流变5187；鼠标移动进入原force列表（2条），暂停后frameCount保持不变。body scrollWidth480、scrollHeight360，控制最右364px，按钮40px高，滑块触控44px区域；无pageerror。30fps节流，页面隐藏暂停绘制。实机性能需统一部署后测。

复用验证脚本 `atom/tools/validate_dot_waves.cjs` 使用Playwright；PORTS_URL指带Access-Control-Allow-Origin:*的ports静态服务，CHROME_EXECUTABLE指定可用浏览器。静态或Mac真机结果不代替RK3566性能数据。
