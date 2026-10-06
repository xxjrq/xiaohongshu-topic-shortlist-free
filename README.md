# 小红书选题参考短名单

从小红书搜索页的可见资料中，按 Agent 对标题、摘要和可见正文的逐条阅读，整理最多 **5 条带来源的选题参考**：按相关度和受众适配排序，记录可见证据、主题角度，并明确哪些内容没有显示。适合在写作或拍摄前做小范围、可核对的灵感搜集。

![推广图](assets/promo.svg)

## 输入与结果

输入：关键词、目标受众、用户本次指定的 `browserId`；一次最多检查 10 条可见搜索结果。

结果：最多 5 条相关参考笔记、主题分组、面向受众的角度、每条可见来源和判断证据，以及正文或链接等缺项。若登录、验证码或安全验证出现，流程立即暂停；卡片未显示正文时只保留摘要，绝不补写全文结论。结果不足 5 条时如实交付实际数量。

## 安装

```bash
npx skills add xxjrq/xiaohongshu-topic-shortlist-free
```

这是浏览器 Skill。先安装 [Easy WebBridge（GitHub）](https://github.com/xxjrq/easy-webbridge)，无法访问时使用 [Gitee 镜像](https://gitee.com/xxjrq/easy-webbridge)。连接目标浏览器后，由使用者在本次请求中提供 `browserId`；运行只选择这一个环境、创建自己的 session 标签组，并在结束时只关闭自己创建的组。

## 使用方式

向 Agent 提供：`关键词 + 受众 + browserId`。它会先读取 CLI 帮助，以只读方式在专属 session 中打开搜索页，针对当前可见内容用 `--text-mode page` 快照，最多检查 10 张卡片。Agent 逐条阅读可见标题、摘要和正文，为每张卡片记录相关度、受众适配、理由及逐字证据，然后把 JSON 输入保存为 `research-input.json` 并运行 `node scripts/shortlist.mjs research-input.json shortlist-output.json`。只有 `body_visible: true` 且非空 `body` 原文同时存在，才算正文可见；确定性 CLI 校验证据、正文和字段后组装结果，不靠封闭关键词词表假装能普遍理解中文语义。每次导航或滚动都会刷新页面引用。

默认不会写入页面。即使获准填充草稿，也仅停在最终发布/发送按钮之前。不会绕过登录、验证码、风控或账号验证。

## 本地离线验证

```bash
node scripts/self-test.mjs
```

自测使用 `fixtures/` 的离线 mock 页面资料与逐条 Agent 审阅记录，真实运行成功和负向 CLI，覆盖五条排序、排除“通勤桌面整理”等仅共享通勤词的无关卡片、仅一条相关、零相关、正文不可见、字段缺失和中文登录/滑块暂停；不访问小红书、不需要 Easy WebBridge，也不声称在线采集。线上若只有五张卡片但摘要或正文缺失，按缺项标记 `partial`，不会伪装成完整成功。

## 资料来源与许可

业务用途参考：[OpenCLI](https://github.com/jackwener/OpenCLI) 与其 [小红书浏览器适配说明](https://github.com/jackwener/OpenCLI/blob/main/docs/adapters/browser/xiaohongshu.md)。本仓库为原创说明与实现，未复制其源码或文案。见 [LICENSE](LICENSE)。

English: [README.en.md](README.en.md)
