> 阶段记录：保留当时的计划与验证结果。当前功能与限制以 [README](../README.md) 为准；历史测试数量不代表最新总数。

# ATOM 透明板只读诊断

日期：2026-10-08。目标：`taishan-transparent`。本次未修改远程配置、重启服务、录音、播放或启动浏览器。未读取 FRP 凭据。

## 已确认事实

- Debian 10，Chromium 91.0.4472.164，Xorg 显示 `480×360`。
- `taishan-screen.service` 正常运行，Python 服务监听 `127.0.0.1:8765`。
- LXDE 用户 autostart 包含 `@/home/linaro/workspace/taishan-screen/start-kiosk.sh`，当前无 Chromium 进程。
- `/tmp/taishan-screen-kiosk.log` 仅记录启动及 `Passthrough is not supported, GL is disabled`，没有明确退出原因。该日志时间为启动时未校准的 2019 年，实际 uptime 约 35 分钟；不能据此认为运行了七年。
- kiosk 脚本主动禁用 GPU、软件 rasterizer 和 GL，使用 `--no-sandbox`；它还会杀死全部 Chromium 与输入法进程。不可直接复用为应用管理器。
- `glxinfo -B` 显示 Mesa 18.3.6 / llvmpipe，`Accelerated: no`。存在 `/dev/dri/card*` 与 render 节点不能证明加速已工作。
- ALSA 播放和录音均有 `hw:0,0`；mixer 的 `Capture MIC Path` 为 `Main Mic`。PulseAudio HiFi profile 为 `sinks:1, sources:0`，仅存在扬声器 monitor。
- `/usr/share/alsa/ucm/rockchip,rk809-codec/HiFi.conf` 的 Mic/HSMic 有 CaptureChannels，但缺 `CapturePCM`。这是输入源未暴露的重要配置线索，尚不能保证实际麦克风硬件可录音。
- 未发现真实 `/dev/videoN` 摄像头。`/dev/video-dec0` 和 `video-enc0` 是普通文件，不可当成 UVC 摄像头。USB 清单没有明确可识别的 UVC 设备；需插入实际摄像头验证。

## 时间同步问题

`ntp.service` 正常运行；`ntpq -pn` 有 `*` 标记的有效上游，timedatectl 显示 synchronized=yes。`systemd-timesyncd` 已禁用。

但 `systemd-time-wait-sync` 仍 activating，单元的 TimeoutStartSec=infinity；12 个启动 jobs 包括 graphical.target、multi-user.target、timers.target 等被阻塞。可疑原因是等待器与现有 NTP 实现的同步状态通知不一致，尚未证明具体触发机制。

建议在保留 ntp 和备份现有 enable 状态后，停止并禁用 wait-sync 等待器，以解除目标阻塞。此举不关闭 NTP，但会取消“启动阶段必须等到时间同步”的保证，依赖证书、时间戳的应用必须自己检测时间可信状态。不要同时启用两个时间同步守护程序。执行后检查 list-jobs、ntpq 和现有应用服务；回退为 enable wait-sync，但 start 可能再次无限等待。

## 麦克风验证路径

先保存 UCM 与 mixer 状态。可用临时 `pactl load-module module-alsa-source device=hw:0,0 source_name=atom_mic` 暴露输入源，记录返回的模块 ID，验证后 `pactl unload-module ID` 回退。此操作会占用 ALSA 采集设备，参数是否可用需实测，不应开机持久化。

随后通过短录验证真实信号，才考虑补全 UCM CapturePCM 和路由。不要用 monitor 源当麦克风，也不要直接切换当前唯一 HiFi profile。当前 read-only 诊断未采集任何音频。

## 浏览器与图形后续

先用 ATOM 独立 profile、端口和日志启动轻量页面，保留原 autostart 和服务。避免调用原脚本杀全部浏览器。记录退出码、stderr、页面成功响应、窗口存在及进程占用；现有日志不足以判断崩溃或人为关闭。

第一阶段以 CSS/DOM 静态界面为主，避免依赖 WebGL。开启 GPU 或更换 DRM/桌面前先保留恢复入口，单独验证驱动栈。当前旧浏览器且禁用 sandbox 不适合直接运行不可信市场应用，正式应用隔离需另行设计。

## 本次边界

上述修复建议没有由本诊断任务执行。系统时间、音频实际效果、摄像头及浏览器退出原因均需明确的后续验证。不要因为基础设备节点存在就把这些能力标记为可交付。
