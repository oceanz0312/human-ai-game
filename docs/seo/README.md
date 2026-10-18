> **已作废（2026-10-18）**：本目录的多语言、humanvsai.app 域名、平台型首页方案，已被 [gefei-seo-sop/spot-the-difference-site-sop.md 第 11 节](../../gefei-seo-sop/spot-the-difference-site-sop.md) 取代（spotthedifferencegame.com 单游戏 EMD 站，只做英文，AI 用代码模拟）。下文仅作历史记录。

# SEO 文档索引

| 文件 | 内容 |
|---|---|
| [seo-multilingual-architecture.md](seo-multilingual-architecture.md) | 已批准的多语言 SEO 目录规则与改造方案（含实施偏差与上线记录） |
| [cold-start-sop.md](cold-start-sop.md) | 可复用的 SEO 冷启动 SOP（第 1 周 / 2–4 周 / 检查点 / 渠道 / 风险） |
| [keyword-research.md](keyword-research.md) | web.cafe SEO Agent 关键词数据（权威版）、不追词、域名、一屏建议、外链渠道 |
| [spot-difference-game-seo.md](spot-difference-game-seo.md) | 早期调研：找茬游戏选词与域名（无搜索量数据） |
| [human-vs-ai-platform-seo.md](human-vs-ai-platform-seo.md) | 早期调研：平台定位下的选词、页面结构、域名 |
| [human-vs-ai-cold-start.md](human-vs-ai-cold-start.md) | 早期调研：冷启动计划与渠道明细 |

冲突时优先级：keyword-research.md > seo-multilingual-architecture.md > 早期调研文件。

## 切换到正式域名（humanvsai.app）
1. `.env.production`：`NEXT_PUBLIC_SITE_URL=https://humanvsai.app`（canonical / hreflang / sitemap / robots / JSON-LD / OG）
2. `wrangler.jsonc` 与 `workers/decisions/wrangler.jsonc`：`PUBLIC_BASE_URL`（分享链接、Cookie、Decisions Worker 允许来源）
3. 绑定自定义域名，并对 `*.workers.dev` 做全路径 301（尚未实施）
