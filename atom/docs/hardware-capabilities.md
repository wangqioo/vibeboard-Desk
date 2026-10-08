# RK3566 透明板加速能力基线

2026-10-08，Debian10 BSP / Linux4.19.232 / Chromium91。本文区分已验证、已枚举和未接入，不把启用开关当成硬件使用证据。

| 单元 | 结果与证据 | 应用价值 |
|---|---|---|
| Mali-G52 GPU | EGL/GLES、WebGL1/2、Canvas、合成已启用；Mali renderer；30秒shader约60FPS | Three.js、互动展示、流体效果 |
| GPU页面栅格化 | Chromium rasterization enabled_force，oop_rasterization enabled；正式启动器持久启用 | 浏览器页面绘制 |
| VPU H.264解码 | Chromium VDAVideoDecoder / kIsPlatformVideoDecoder=true；libv4l-rkmpp实际输出帧；1080p30合成片循环15秒，450帧、丢1帧 | 本地视频、视频内容 |
| VPU H.264编码 | GStreamer mpph264enc生成1080p30合成视频，原生MPP解码至EOS成功 | 后续摄像、录制、转码 |
| VPU H.265 | mpph265enc生成720p合成码流，mppvideodec解码至EOS成功 | 原生高效率视频；本次不承诺Chromium HEVC支持 |
| RGA 2D加速 | 实际100次1280×720→480×360 RGBA缩放，约669ms，所有目标像素正确 | 图像预处理、缩放、摄像头画面适配 |
| NPU | SDK1.3.0 / 驱动0.7.2；官方RK356X MobileNet实际30次输入→执行→读输出，平均6.41ms | 适配RKNN后的图像分类、OCR等模型 |

浏览器启用条件：不仅是enable-accelerated-video-decode，还需此版本Linux特性门控enable-features=VaapiVideoDecoder。此设备实际后端仍为V4L2→libv4l-rkmpp→MPP，不能因为特性名称就声称使用VAAPI驱动。根据Chromium91源码的Linux门控排查得到。start-atom.sh持久保存已验证参数，不启用禁用所有驱动兼容性修正的测试参数。

RGA虚拟地址测试最初普通malloc缓冲区导致释放时堆损坏；使用4096页对齐分配、页长度对齐及目标高度stride后正常。后续应用应使用受控DMA/页对齐缓冲区，不能直接照搬一般网页数组。

预装mobilenet_ssd.rknn不符合当前rknnrt模型格式。测试使用官方rockchip-linux/rknpu2提交2fafa622b9b51ae963eede50083e44a45df6f9bf中的examples/rknn_api_demo/model/RK356X/mobilenet_v1.rknn及同提交runtime/RK356X/Linux/librknn_api/include/rknn_api.h。没有更换系统NPU库。设备测试文件在/home/linaro/atom/hardware，源代码在tools/hardware。合成输入只验证执行，不验证识别准确率；ASR/TTS模型是否适用NPU必须做算子与转换评估。

CPU当前ondemand、频率上限1.8GHz；GPU为simple_ondemand，已枚举200–800MHz。保留设备的频率与温控机制，没有超频或取消温控。NPU当前userspace策略沿用板厂配置，不把短时调用测试当成全部负载已调优。

边界：1080p视频是低码率合成测试，不是高码率4K长时间验收；VP8/VP9只由浏览器枚举，本轮未实播。摄像头与ISP未接硬件、音频DSP没有验证、硬件编码没有接成用户录制应用。Vulkan未启用；还需持续负载、断电恢复和具体模型产品化。现有29项后端测试不覆盖驱动，驱动证据使用原生程序、浏览器Media事件和硬件日志。

参考：
- https://github.com/JeffyCN/libv4l-rkmpp
- https://github.com/rockchip-linux/mpp
- https://github.com/rockchip-linux/rknpu2/tree/2fafa622b9b51ae963eede50083e44a45df6f9bf
- https://github.com/chromium/chromium/blob/91.0.4472.164/content/browser/gpu/compositor_util.cc
