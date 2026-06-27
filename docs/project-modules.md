# StoryPlay Project Modules

Status: Plan / Module Map.

本文档定义 StoryPlay 后续按哪些板块开发，以及每个板块应该维护哪些文档。它是项目级入口，不替代具体技术文档。

## 总体判断

StoryPlay 不应该只按“页面”拆分。更合理的拆法是按产品能力拆成五个长期板块：

1. 基建：Agent 系统 + API 模型系统
2. 基建：故事 SKU 系统
3. 故事的游戏界面
4. 创作者工作台
5. 产品壳、账号、运营、部署等其他支撑能力

核心关系：

```text
创作者工作台
  产出 StoryProject / Story SKU / 发布配置
        |
        v
故事 SKU 系统  ----->  首页、列表、推荐、预制内容
        |
        v
故事游戏界面  ----->  /play 运行时体验
        |
        v
Agent + Model API 基建  ----->  生成、续写、视觉、语音、分类、插入剧情
```

## 1. 基建：Agent 系统 + API 模型系统

定位：内部生成能力和模型调用能力的基础设施。

负责内容：

- Agent 注册、职责、contract、parser、fallback、fixtures、测试。
- Writer、CharacterDesigner、Cinematographer、Painter、Vision、Voice 等能力。
- 文本模型、图像模型、视觉模型、TTS 的统一调用和降级。
- `/api/start`、`/api/scene`、`/api/vision`、`/api/insert-beat`、`/api/beat-audio` 等生成相关 API。
- 环境变量、供应商 key、用户自带 key、成本和限流策略。

当前主要代码：

- `lib/engine/agent-system/`
- `lib/engine/agents/`
- `lib/engine/director.ts`
- `lib/engine/orchestrator.ts`
- `lib/engine/vision.ts`
- `lib/engine/voice.ts`
- `lib/ai-client/`
- `lib/tts-client/`
- `app/api/start/route.ts`
- `app/api/scene/route.ts`
- `app/api/vision/route.ts`
- `app/api/insert-beat/route.ts`
- `app/api/beat-audio/route.ts`
- `app/api/classify-freeform/route.ts`

文档入口：

- [platform/README.md](platform/README.md)
- [agent-system/README.md](agent-system/README.md)
- [integrations/README.md](integrations/README.md)
- [creative-engine/current-architecture.md](creative-engine/current-architecture.md)

短期重点：

- 明确 agent system 和 creative engine 的边界。
- 统一模型调用配置和错误处理。
- 补齐关键 agent 的 contract / parser / fallback 测试。
- 为创作者工作台预留“可配置项输入”，但不把 agent 内部细节直接暴露给创作者。

## 2. 基建：故事 SKU 系统

定位：把可被发现、预览、开始游玩的故事内容包装成产品 SKU。

这里的 SKU 不是 StoryProject。SKU 面向用户消费和分发，包含标题、封面、简介、分类、首幕、角色预览、风格、语言版本、推荐权重等。StoryProject 面向创作者编辑，是生产侧工程文件。

负责内容：

- 首页瀑布流卡片、分类、推荐、筛选。
- featured stories 数据结构。
- 预制 first act、首图、角色图、风格缩略图。
- SKU 的生成、翻译、迁移、质量检查脚本。
- 后续从创作者工作台发布 SKU 的流程。

当前主要代码和资产：

- `app/[locale]/page.tsx`
- `app/[locale]/stories/page.tsx`
- `app/api/stories/featured/route.ts`
- `app/api/stories/list/route.ts`
- `app/api/stories/[id]/route.ts`
- `lib/db/schema.ts`
- `lib/db/repositories/featuredRepo.ts`
- `public/home/`
- `scripts/generate-home-covers.mjs`
- `scripts/generate-home-images.mjs`
- `scripts/prebake-firstacts.mjs`
- `scripts/enrich-firstacts-stepfun.mjs`
- `scripts/generate-tags.mjs`
- `scripts/migrate-featured.ts`

文档入口：

- [story-sku/README.md](story-sku/README.md)
- [product/homepage-mvp-ui-plan.md](product/homepage-mvp-ui-plan.md)

短期重点：

- 先定义 SKU 字段和分类体系，不急着重做所有子 SKU。
- 明确 SKU 与 first act、story pack、StoryProject 的关系。
- 首页卡片只消费稳定 SKU 数据，不直接耦合生成脚本细节。

## 3. 故事的游戏界面

定位：玩家进入故事后的核心游玩体验。

负责内容：

- `/play` 页面、画面展示、文本叙事、选择分支。
- 自由输入、视觉点击、插入剧情、对话历史。
- 音频、TTS、字幕、节奏控制。
- 本地存档、分享、gallery pack/unpack。
- 从 SKU 或 StoryProject 启动 runtime session。

当前主要代码：

- `app/[locale]/play/page.tsx`
- `components/PlayCanvas.tsx`
- `components/DialogueHistoryModal.tsx`
- `app/[locale]/gallery/page.tsx`
- `lib/clientStoryPersistence.ts`
- `lib/storyShare.ts`
- `app/api/story-pack/route.ts`
- `app/api/story-unpack/route.ts`
- `app/api/gallery-pack/route.ts`
- `app/api/gallery-unpack/route.ts`

文档入口：

- [play-experience/README.md](play-experience/README.md)
- [creative-engine/current-architecture.md](creative-engine/current-architecture.md)

短期重点：

- 先把最小游玩闭环稳定：开始、展示、选择、续写、存档、分享。
- 再做更重的沉浸式 UI、状态栏、地图、角色面板、任务面板。
- Play 页面只消费 runtime session，不直接编辑 StoryProject。

## 4. 创作者工作台

定位：给创作者更重的故事编辑、配置、调试和发布能力。

负责内容：

- `/studio` 信息架构。
- StoryProject 数据模型。
- 故事设定、世界观、角色、章节、场景、互动规则、视觉风格。
- Playtest 调试链路。
- 从 StoryProject 发布为 SKU。

当前状态：

- 主要还处于文档和方案阶段。
- 尚未实现完整 `/studio`。
- 已有 `StoryProject` schema 草案和 Studio v1 IA。

文档入口：

- [creator-workspace/README.md](creator-workspace/README.md)
- [creative-engine/story-project-schema.md](creative-engine/story-project-schema.md)
- [product/studio-v1-information-architecture.md](product/studio-v1-information-architecture.md)
- [creative-engine/roadmap.md](creative-engine/roadmap.md)

短期重点：

- 先做 StoryProject 最小数据模型。
- 再做 `/studio/new` 和 `/studio/[projectId]` 的最小工作台。
- 第一版只支持“配置 -> 试玩 -> 回写问题 -> 再试玩”，不要一开始做复杂编辑器。

## 5. 其他支撑能力

定位：不直接属于故事生产或游玩，但会影响产品完整性的能力。

包含内容：

- 产品壳：导航、首页、主题、设计系统、i18n。
- 账号和用户数据：登录、用户故事、权限。
- 数据库：schema、repository、migration。
- 部署：Cloudflare、Vercel、Docker、本地开发。
- 运营：反馈、埋点、成本统计、内容审核、合规页面。
- 文档资产：截图、流程图、设计参考。

当前主要代码：

- `app/[locale]/page.tsx`
- `app/[locale]/new/page.tsx`
- `app/[locale]/stories/page.tsx`
- `app/layout.tsx`
- `app/globals.css`
- `components/AuthModal.tsx`
- `components/LanguageSwitcher.tsx`
- `lib/supabase/`
- `lib/db/`
- `drizzle/`
- `middleware.ts`
- `wrangler.jsonc`
- `open-next.config.ts`
- `docker-compose.yml`

文档入口：

- [product/README.md](product/README.md)
- [integrations/README.md](integrations/README.md)
- [assets/README.md](assets/README.md)

短期重点：

- 产品壳先服务首页、SKU 列表、Play、Studio 四个主入口。
- 账号系统先满足“保存项目、保存游玩记录、发布 SKU”。
- 运营和审核能力等 SKU 发布流程稳定后再补。

## 开发顺序建议

第一阶段：整理基建边界。

- Agent + API 模型系统能稳定生成、续写、插入剧情、视觉点击、TTS。
- SKU 数据和 Play runtime 的边界明确。
- 文档里标清 Current / Plan，避免把未来方案当现状。

第二阶段：打磨玩家最小体验。

- 首页 SKU 浏览和快速开始体验稳定。
- `/play` 的基础游玩、存档、分享稳定。
- UI 先围绕 StoryPlay 的娱乐叙事气质统一。

第三阶段：启动创作者最小工作台。

- StoryProject 最小 schema。
- `/studio/new` 创建项目。
- `/studio/[projectId]` 能编辑发布所需的基本设定、分类、风格和启动输入。
- 深度场景编辑和 playtest 调试先作为增强能力，不阻塞最小发布闭环。

第四阶段：打通发布链路。

- StoryProject 发布为 Story SKU。
- SKU 进入首页和列表。
- 玩家能从首页/列表点击进入 `/play`。
- 版本、状态、审核和回滚放到发布闭环稳定之后。

第五阶段：增强创作能力。

- 章节结构、复杂分支、变量、任务、角色关系、素材库、协作。
- 更完整的调试台和质量评估。

## 关键边界

- Agent System 是内部基建，不是创作者直接编辑对象。
- StoryProject 是创作者工程文件，不是首页消费 SKU。
- Story SKU 是消费侧包装，不承载完整编辑态。
- `/play` 是 runtime，不负责编辑工程。
- Product UI 是全局体验层，不应该把业务规则写死在视觉组件里。
