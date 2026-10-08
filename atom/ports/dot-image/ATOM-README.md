# 点阵影像
来源 mblode/fx，MIT许可证，固定SHA见UPSTREAM.txt。使用真实上游蓝噪抖动、ASCII采样/字形映射、LED渲染算法，源lib完整离线保留；编译目标Chromium90。没有Next/React/分析SDK或外网字体依赖。

程序夜景明确标示为示例。导入本地PNG/JPEG/WebP/GIF单帧，限制8MiB，画布缩至320×168，不上传。三种模式：LED点阵、蓝噪抖动、ASCII；粗中细改变采样分辨率。只在交互时计算，不持续跑动画。图片状态仅本次打开保存。

本地480×360真实Chromium验证三模式及文件导入，无pageerror：中细度LED240×126、抖动160×84、ASCII156×80。处理约几至几十毫秒；小板性能须真机验证。主按钮48px可见，无根滚动。资源不依赖storage或WebGL。

构建 python3 atom/tools/build_dot_image.py；重编译带 --compile，esbuild在vendor/dot-build，Node需在PATH。主题只影响外壳控件，画面配色是艺术输出。完整目录安装，entry-only bundle需连同engine/main/source资源复制。
