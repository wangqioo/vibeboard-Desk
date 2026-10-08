# 黏土工坊
真实 SculptGL 引擎，源版本与许可证见 UPSTREAM.txt / LICENSE。完整着色器源码、alpha、matcap、环境贴图及worker均保留，运行不访问外网。ATOM 适配用四个48px按钮替代完整桌面菜单。

默认网格为6144个四边面（细分阈值从50000降低到2500）。堆土、膨胀、平滑工具修改真实顶点，撤销恢复顶点；重置重建球体。本次状态不持久化。右键拖动旋转、滚轮缩放。WebGL不可用时明确报错，无假预览。小板软件渲染性能须真机测。

本地480×360 Chromium/SwiftShader测试：无pageerror，6144面初始化成功，实际拖动修改顶点，撤销可恢复；四个按钮48px可见。未承诺雕刻保存/导出。

重建：vendor/sculptgl-src安装pnpm依赖（ignore-scripts），运行 python3 atom/tools/build_model_extras.py --compile。pnpm/node需在PATH。source保存适配后的真实源码。
