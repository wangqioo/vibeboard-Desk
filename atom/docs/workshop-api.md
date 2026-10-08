# 应用工坊模块接口

`Workshop(state_dir, validate_fn=None, theme_css_fn=None)` 不直接提供 HTTP。root 将它接入同源 API。

- `public_config()` 返回 `{provider,base_url,model,protocol,api_key_set,stt_base_url,stt_model,stt_api_key_set,presets:[{id,name,base_url,model,protocol}]}`，永不返回密钥。
- `save_config(data)` 接受以上配置与 `api_key`、`stt_api_key`、`clear_api_key`、`clear_stt_api_key`。空密钥保留旧值，明确 clear 布尔值清除。`state/model.json` 0600、fsync 后原子替换。不要加入版本控制或常规导出备份。
- `read_private_config()` 仅供服务器调用，返回完整配置，禁止作为 HTTP 响应。
- `start_generation({prompt,theme_id})` 返回 `{job_id}`。未配置模型时报 ValueError，不使用模板代替生成。
- `get_job(job_id)` 返回 `{job_id,status,theme_id,created_at}`；ready 增加 bundle，failed 增加安全的 error。状态 queued→generating→checking→ready/failed。任务仅内存保留，重启清空；最多同时生成两项、保留约30项。
- validate_fn 接收完整 bundle，可抛 ValueError；不应执行代码或安装。theme_css_fn(theme_id) 返回受信任 CSS 字符串。CSS 同时进入生成提示词并注入 HTML style，主题冻结到生成作品。

root 安装入口必须在用户明确点击安装后，取 ready bundle 再调用原 install_app。模块不会自行安装。预览应使用无 allow-same-origin 的 sandbox iframe。生成代码未执行，仅做结构验证。

HTTPS 请求超时90秒，禁止重定向，不读取外部凭据，不打印请求/响应/API key；失败响应不回显底层异常。厂商预设仅提供地址，除DeepSeek默认值外模型名称由用户填写以免依赖过期型号。自定义URL是用户明确配置的服务地址。

## 官方协议参考

- [OpenAI Chat API](https://developers.openai.com/api/reference/resources/chat)：兼容协议采用 chat/completions、messages 和 choices.message.content。
- [DeepSeek 首次调用](https://api-docs.deepseek.com/en/)与[Chat Completions](https://api-docs.deepseek.com/api/create-chat-completion/)。
- [Claude Messages](https://platform.claude.com/docs/en/api/messages/create)与[API overview](https://platform.claude.com/docs/en/api/overview)：messages端点、x-api-key、anthropic-version，独立system字段与content文本块。
- [Qwen OpenAI兼容](https://www.alibabacloud.com/help/en/model-studio/compatibility-of-openai-with-dashscope)：地域地址与账户权限需对应，可在配置中修改。
- [MiniMax OpenAI SDK](https://platform.minimax.io/docs/api-reference/text-openai-api)：OpenAI兼容地址。部分模型带think标签；目前不自动剥离，非纯JSON输出会校验失败。
- [Moonshot 官方文档入口](https://platform.moonshot.cn/docs/api/chat)：此次工具未能读取正文，预设地址需结合用户账户检查，未声称完成在线实测。

测试使用mock响应验证协议、解析、失败和密钥遮蔽；未调用收费模型，也未配置任何真实密钥。

## 全屏应用布局验收

生成目标现在是完整 **480×360**，manifest 推荐 `layout:"fullscreen"`。应用不复制系统常驻 header、Home bar、全局导航。默认操作页是一屏有界布局，html/body 高度100%，body 高度100vh、margin0；内容放不下应拆步骤/视图。不得仅设置 overflow:hidden 将按钮裁掉。

歌曲列表、长正文可以局部滚动，但必须显式使用 `.atom-scroll` 或 `[data-atom-scroll]`，滚动容器有界高度（CSS height/max-height 或受约束的 grid/flex），局部导航和主要动作在滚动区域外保留。局部翻页导航可以按任务需要出现，禁止常驻系统导航。

静态工具对 root height:auto/min-height 与未标记 overflow:auto/scroll 仅给 warnings；它不能推断真正内容长度或完整CSS布局。运行时验收：在480×360检查 `document.documentElement.scrollHeight <= innerHeight + 1` 和 `document.body.scrollHeight <= innerHeight + 1`、宽度无溢出；进入长列表时仅标记区域 scrollHeight 大于 clientHeight，主要按钮边界始终位于视口内。最长中文、打开错误信息、不同状态均重复检查。不能用root不滚动一项证明未裁切，必须验证可见控件与完整流程。

DeepSeek 默认模型别名更新为 `deepseek-flash`；GET job 非法格式 id 抛 ValueError，合法但不存在仍抛 KeyError。
