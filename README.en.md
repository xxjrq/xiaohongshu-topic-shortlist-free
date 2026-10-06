# Xiaohongshu Topic Reference Shortlist

Turn visible Xiaohongshu search cards into up to five traceable topic references. The Agent reads each visible title, summary, and body, judges relevance and audience fit, and records the rationale and exact visible evidence. A body is complete only when both `body_visible: true` and non-empty body text are present. Run `node scripts/shortlist.mjs research-input.json shortlist-output.json` to validate and assemble the ranked result; the CLI does not claim general Chinese semantic understanding.

![Promo image](assets/promo.svg)

## Input and output

Provide a keyword, audience, and the `browserId` the user explicitly selected for this run. The skill reviews no more than ten visible results and returns up to five ranked references, groups, angles, visible evidence, sources, and limitations. It pauses for login, CAPTCHA, or security verification. When a summary, body, or source is missing, it preserves what is visible and reports a partial result.

## Install

```bash
npx skills add xxjrq/xiaohongshu-topic-shortlist-free
```

This browser skill requires [Easy WebBridge on GitHub](https://github.com/xxjrq/easy-webbridge); use the [Gitee mirror](https://gitee.com/xxjrq/easy-webbridge) when needed. One user-provided browser is selected per run. The skill owns only its namespaced session/tab group and never takes over pre-existing pages.

## Offline test

```bash
node scripts/self-test.mjs
```

Fixtures are offline mocks with explicit Agent review records. Tests run successful and negative CLI cases, five-result ranking, irrelevant-card rejection, one/zero relevant results, missing summary/body, and a Chinese login/slider-verification pause. The CLI checks evidence excerpts against visible title/summary/body text; it does not infer semantic relevance from a closed keyword list. These fixtures are not online collection results.

## Attribution

The workflow purpose was checked against [OpenCLI](https://github.com/jackwener/OpenCLI) and its [Xiaohongshu adapter note](https://github.com/jackwener/OpenCLI/blob/main/docs/adapters/browser/xiaohongshu.md). This repository contains original instructions and implementation; see [LICENSE](LICENSE).
