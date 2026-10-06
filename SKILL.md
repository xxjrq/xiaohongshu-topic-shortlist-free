---
name: xiaohongshu-topic-shortlist-free
description: 使用用户指定的 Easy WebBridge 浏览器和关键词，在小红书搜索页仅读取最多10条可见结果，交付5条带来源的参考笔记、主题分组和可用角度；遇登录、验证或卡片缺正文时明确暂停或保留摘要与缺项，适合选题前的轻量资料整理。
---

# 小红书选题参考短名单

把用户指定浏览器里**可见**的小红书搜索结果压缩为 5 条可追溯的选题参考。输入为关键词、受众与 `browserId`；结果是主题分组、可用角度、每条来源与缺项，不把摘要扩写成正文，也不把离线样例当成线上采集。

## 前置依赖

安装并连接 [Easy WebBridge（GitHub 主下载）](https://github.com/xxjrq/easy-webbridge)；GitHub 不可用时使用 [Gitee 备用地址](https://gitee.com/xxjrq/easy-webbridge)。在目标浏览器扩展中确认连接后，由用户提供本次的 `browserId`。不得在产物、日志或文档中记录它。

## 输入

```json
{"keyword":"通勤穿搭","audience":"一线城市上班族","browserId":"用户本次提供的值"}
```

单次最多读取 10 条当前可见的搜索卡片。超出范围时请求用户分批；不得宣称已读完全文或无限滚动内容。

## 执行

1. 先读取 Easy WebBridge CLI 帮助，然后仅对输入的一个 `browserId` 执行。创建 `<slug>-<run-id>` 专属 session 和“选题参考短名单”标签组；不接管、不关闭任何已有页面或其他 session。
2. 打开小红书搜索页，取得当前页 `tabId` 后使用显式 `--text-mode page` 快照。每次导航、搜索、滚动后重新快照以刷新 `@e` 引用；只提取卡片中可见的标题、摘要、作者（若见）、链接/来源。
3. 若出现登录、验证码、滑块或账号安全验证，立即停止并交付 `status: paused`，说明原因；不尝试绕过。若卡片无正文，只写可见摘要和 `missing: 正文不可见`。只有同时存在 `body_visible: true` 与非空 `body` 原文才算正文可见；只有标记、但没有正文内容时仍标正文不可见。
4. Agent 必须逐条阅读可见标题与摘要，判断主题相关度、受众适配、理由、精确可见证据、主题和角度，再按相关度与受众适配排序选最多 5 条；不能只依赖关键词命中。没有摘要/正文或来源时保留可见信息并标记 partial；不足 5 条就交付实际条数，不得凑数。关闭前确认该 session 由本次创建，随后只关闭该 session。

5. 将逐条审阅结果作为 `agent_review` 随每张卡片提交给 CLI：`relevance_score` 与 `audience_fit_score` 为 0–5，`rationale` 说明可见内容为什么匹配或不匹配，`evidence` 中的短语必须逐字来自该卡片可见标题、摘要或正文；相关卡片还需提供 Agent 判断的 `theme` 与 `angle`；角度中的城市层级等限定必须能在受众或该卡片可见文本中找到依据，不得自行添加“一线城市”等限定。将关键词、受众、最多10条可见卡片和上述审阅写入 UTF-8 JSON 文件（如 `research-input.json`），然后执行以下命令生成 `shortlist-output.json`：

```bash
node scripts/shortlist.mjs research-input.json shortlist-output.json
```

读取输出文件并按输出格式交付。CLI 校验证据引用、正文存在性，再按分数和原顺序稳定排序、组装结果。这个确定性脚本不具备通用中文语义理解能力，也不能代替 Agent 阅读页面。

示意命令（`browserId` 和 session 仅运行时提供）：

```bash
node /path/to/easy-webbridge/cli/easy-webbridge.mjs --help
node /path/to/easy-webbridge/cli/easy-webbridge.mjs navigate "$BROWSER_ID" 'https://www.xiaohongshu.com/search_result?keyword=...' --new-tab --session 'xiaohongshu-topic-shortlist-free-RUN_ID' --group-title '选题参考短名单'
node /path/to/easy-webbridge/cli/easy-webbridge.mjs snapshot "$BROWSER_ID" TAB_ID --compact --visibility visible --region viewport --max-elements 60 --text-mode page
```

本 Skill 只读整理选题资料，不包含草稿填充步骤。

## 输出格式

```json
{
  "status": "completed | paused | partial",
  "keyword": "...",
  "audience": "...",
  "groups": [{"theme":"...","angle":"...","notes":[{"title":"... 或 null","summary":"仅可见摘要或 null","body":"正文原文或 null","source":"可见链接或页面来源，缺失则 null","relevance_score":0,"audience_fit_score":0,"review_rationale":"基于可见文本的判定","evidence":["可见标题、摘要或正文中的原文短语"],"missing":[]}]}],
  "coverage": {"visible_results_reviewed": 0, "shortlist_count": 0},
  "limitations": []
}
```

`fixtures/` 仅为离线页面资料模拟，用于验证结构；不代表在线采集结果。

缺失标题、摘要、正文或来源会如实标记；只有明确 `body_visible: true` 且 `body` 非空的卡片才算正文可见；任何入选项存在缺项、或相关项不足 5 条时，短名单状态为 `partial`。不会以占位文案补造字段。来源必须逐条可追溯。
