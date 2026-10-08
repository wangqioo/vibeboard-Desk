# ATOM 本机 API

服务仅绑定 `127.0.0.1:8770`。Python 3.7+ 标准库；系统功能使用 Linux `/proc`、`/sys`、`ip` 与 `pactl`。缺失硬件数据返回 null 或不可用状态。内存与磁盘单位 bytes，uptime 单位秒，温度单位摄氏度。

## 查询

- `GET /api/health`: `{ok:true,service:"atom",version:"0.5.0"}`
- `GET /api/status`: `{hostname,cpu_temp,uptime,memory:{total,available,used,percent},disk:{total,used,free,percent},network:{ip,connected}}`。connected 表示有全局 IPv4 地址，不代表互联网可达。
- `GET /api/apps`: `{apps:[{id,name,description,entry}]}`。内置 entry 为 `/#clock`、`/#timer`、`/#status`；安装应用 entry 为 `/user-apps/<id>/index.html`。
- `GET /api/audio`: `{volume,sources:[{id,name,monitor}]}`。不可用时 `{volume:null,sources:[],available:false}`。音量读取第一个 sink。

## 写操作

必须有 `Content-Type: application/json`、`Origin: http://127.0.0.1:8770` 和一致 Host；localhost 同源也支持。无 Origin 返回 403。JSON 请求上限 2 MiB。

- `POST /api/audio/volume`: `{volume:整数0至100}` → `{ok:true,volume}`。执行超时 3 秒，无 shell。
- `POST /api/apps/install`: `{manifest:{id,name,description,entry:"index.html"},files:{"index.html":"HTML文本","main.js":"JS文本"}}` → HTTP 201 `{ok:true,app:manifest}`。已安装同名应用拒绝覆盖。
- `POST /api/apps/update`: 同安装格式。要求已经安装；临时目录写完后替换，运行时替换失败恢复旧目录。当前双重 rename 在断电时可能留下 `.backup-*`，需人工恢复，暂不承诺断电事务。
- `POST /api/apps/uninstall`: `{id}` → `{ok:true}`。内置应用不可卸载。

输入错误 400，同源错误 403，设备操作失败 503，未知接口 404。错误格式 `{error:"说明"}`。

## 应用约束

id 是以小写字母开头、最长 48 字符的小写字母/数字/下划线/短横线。name 为 1–80 字符，description 最长 500 字符。入口固定 index.html，最多 100 个 UTF-8 文本文件。不接受绝对路径、空路径段、`.`、`..`、反斜杠、NUL，manifest.json 由服务器生成。应用目录符号链接禁止。所有文件仅静态提供，不执行 Python/CGI 或应用提供的命令。

应用不是操作系统级沙箱。UI 应通过不带 allow-same-origin 的 sandbox iframe 运行第三方应用，使其不能调用设备写 API。API 本身不接收任意命令。

## v0.2 开发模式与显示

- `GET /api/developer`: `{enabled,hostname,ip,user}`。默认 disabled；设置写入 `atom/state/settings.json`，临时文件 fsync 后原子替换，重启保留。
- `POST /api/developer`: `{enabled:true|false}` → `{enabled}`。只接受布尔值。仅控制应用安装和更新，关闭时这两个接口返回 403。卸载仍可使用。此开关不修改 SSH，也不是 SSH 的安全边界。
- `GET /api/display`: `{available,brightness,max_brightness}`。brightness 是整数百分比，max_brightness 是驱动原始最大值。设备不可用时后两项 null。
- `POST /api/display/brightness`: `{brightness:整数0至100}` → `{ok:true,brightness}`。通过第一个 `/sys/class/backlight/*` 节点直接写入对应原始亮度，依赖已有系统权限；没有设备或不能写入返回 503。没有 sudo 或任意命令执行。

开发模式与显示写操作遵循同源规则。外部应用 SDK 与用户授权不属于本版。

## 语音诊断补充接口

同源 POST：`/api/voice/start` 可传 `{quiet_fan:true}`（语音需求收音暂停风扇），`/api/voice/stop` 停止并恢复温控；`/api/voice/meter`、`/api/voice/play-recording` 传 recording_id，`/api/voice/playback-stop` 停止回放。`/api/voice/fan` 仅接受 action 为 status/off/auto。状态查询不启动录音。普通第三方应用不直接访问这些写接口；mic-test 使用限定应用和当前 iframe 的消息桥。
