# 麦克风、风扇与按住说话

## 当前行为

长按空格约650ms开始录音，继续按住讲话，松手自动停止并调用ASR，文字进入工作坊需求框；最长30秒。文本编辑中的普通空格不触发。页面切换时键盘焦点可能变化，松手事件仍由桌面处理；麦克风尚在启动时松手会排队停止。生成动作由用户确认，语音不是自动执行任意系统命令。

录音期间申请暂停风扇并定期维持租约，录音结束、失败、自动超时后恢复温控。60°C保护优先；暂停不成功时仍允许录音。麦克风测试应用提供独立开关；离开该页恢复温控，页面失联5秒后恢复，单次暂停最长120秒。

## 硬件与定位结果

自接两线咪头位于机壳内。原理图：CN3 1脚MIC1P、2脚GND；MIC1P通过C150接RK809 MIC1p，MIC1n未连接。R116提供偏置。系统原设备树启用了差分输入，与该接线存在不匹配。

样机做了单端运行时实验，未修改启动镜像。用户反馈底噪没有明显改善，风扇噪声需要分组录音确认。不能声称软件配置已修复麦克风硬件或消除底噪。应用不做降噪、ASR或自动增益；电平条是数字强度，非波形/声压计。

## 单端实验 helper

`deploy/atom-mic-single-ended.py` 只适用于本设备：I²C0、0x20、RK809，操作三个音频寄存器，对应vendor驱动的Main Mic单端逻辑。原值保存在 `/var/lib/atom/mic-mode-original.json`（0600）。root所有的固定程序通过 `/run/atom-mic-mode.sock` 只接受 apply，避免让NoNewPrivileges的网页后端执行任意sudo。

仅在确认同型号板、接线与地址后安装：

```bash
sudo install -m755 -o root -g root deploy/atom-mic-single-ended.py /usr/local/sbin/atom-mic-single-ended
sudo install -m644 deploy/atom-mic-mode.service /etc/systemd/system/atom-mic-mode.service
sudo mkdir -p /etc/atom
sudo touch /etc/atom/mic-single-ended.enabled
sudo systemctl daemon-reload
sudo systemctl enable --now atom-mic-mode
```

录音有真实PCM后应用模式并读回验证，配置失败则停止录音。本实验不是通用PMIC驱动修复；确认效果后应修正设备树和通道配置，移除临时helper。

回退：执行 `sh deploy/rollback-mic-single-ended.sh`，删除标志、关闭helper并恢复原寄存器。原值不是断电恢复的通用配置。

## 风扇服务

`deploy/fancontrol.py` 使用系统Python的gpiod模块，GPIO chip3 line4，对应原样机 taishan-fan。由该服务独占GPIO，应用只发送 off/auto/status 到本地受权限限制socket。温度读取失败恢复散热；保留原自动阈值47°C开启、45°C以下关闭。这里的“恢复”是恢复自动温控，不保证风扇永远开启。

更新已有服务前备份它的控制脚本；部署 `deploy/taishan-fan.service` 时确认Python/gpiod与GPIO位置一致。不要直接在其他板卡上申请同一GPIO。

## 测试

真机验证：手动风扇暂停、页面失联租约恢复、退出恢复，按住说话期间持续暂停与停止恢复；模拟温度60°C拒绝暂停、传感器错误恢复；录音生命周期与失败路径有单元测试。松手流程的快速启动竞态测试使用真实麦克风、模拟ASR响应，避免把模拟结果误写成真实语音识别验收。
