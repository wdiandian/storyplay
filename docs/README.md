# StoryPlay Docs Index

本文档是 `docs/` 的维护入口。当前先采用“模块总览 + 专题目录”的方式组织，不急着大规模移动历史文档。

## 先读什么

1. 项目整体分块：先读 [project-modules.md](project-modules.md)。
2. Agent、模型、API 基建：读 [platform/README.md](platform/README.md)，再读 [agent-system/README.md](agent-system/README.md)。
3. 故事 SKU 和首页内容供给：读 [story-sku/README.md](story-sku/README.md)。
4. 故事游玩界面：读 [play-experience/README.md](play-experience/README.md)。
5. 创作者工作台：读 [creator-workspace/README.md](creator-workspace/README.md)。
6. 产品视觉、首页、公开页面：读 [product/README.md](product/README.md)。
7. 模型供应商、TTS、部署接入：读 [integrations/README.md](integrations/README.md)。

## 当前推荐板块

```text
docs/
  project-modules.md

  platform/
    README.md

  story-sku/
    README.md

  play-experience/
    README.md

  creator-workspace/
    README.md

  agent-system/
    README.md
    overview.md
    refactor-plan.md
    skills.md

  creative-engine/
    README.md
    current-architecture.md
    roadmap.md
    story-project-schema.md
    analysis.md
    creative-path-visual.md
    creative-path-visual.html

  product/
    README.md
    design-system.md
    homepage-mvp-ui-plan.md
    studio-v1-information-architecture.md
    design-references/

  integrations/
    README.md
    xiaomi-tts-key.md

  assets/
    README.md
```

## 文档状态标记

后续文档请在开头标记状态：

- `Current`：当前实现事实，可作为开发依据。
- `Plan`：后续计划，不代表已经实现。
- `Historical Analysis`：历史分析或阶段性判断，只作背景参考。
- `Visual Aid`：辅助理解图，不作为代码事实来源。

## 维护规则

- 改模块边界、优先级、开发顺序：同步更新 [project-modules.md](project-modules.md)。
- 改 agent 结构、模型路由、API 编排、fallback、eval：同步更新 `platform/` 和 `agent-system/`。
- 改首页故事卡片、预制 first act、封面、分类、生成脚本：同步更新 `story-sku/`。
- 改 `/play`、播放交互、选择、自由输入、视觉点击、音频、存档分享：同步更新 `play-experience/`。
- 改 `/studio`、StoryProject、创作者编辑和调试链路：同步更新 `creator-workspace/` 和 `creative-engine/`。
- 当前推荐部署到腾讯云服务器：读 [deployment/tencent-cloud-server.md](deployment/tencent-cloud-server.md)。
- Cloudflare Workers 作为可选路线：读 [deployment/cloudflare-workers.md](deployment/cloudflare-workers.md)。
- 改 UI、首页、设计规范、公开页面：同步更新 `product/`。
- 改 TTS、图像模型、文本模型、环境变量、第三方服务：同步更新 `integrations/`。
