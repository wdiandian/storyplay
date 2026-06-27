# Story SKU System

Status: Plan / Current Map / Partial MVP.

故事 SKU 系统负责把故事包装成用户可浏览、可预览、可开始游玩的内容单元。它面向消费和分发，不等同于创作者工作台里的 `StoryProject`。

## 产品边界

```text
StoryProject = 创作源文件
Story SKU = 发布产物
发布管理 = 管理发布产物，不承载完整故事创作
```

`StoryProject` 保存创作者长期维护的设定、固定首场、剧情大纲护栏和运行配置。发布时再编译成 `Story SKU`。SKU 只保留首页、故事列表、分类、资源审计、上下架和启动 `/play` 所需的轻量信息。

## SKU 应该包含什么

第一版建议字段：

- `id`
- `title`
- `subtitle`
- `description`
- `coverImage`
- `firstSceneImage`
- `characterPortraits`
- `genres`
- `moods`
- `interaction`
- `structure`
- `visualStyle`
- `contentWarnings`
- `tags`
- `locale`
- `style`
- `firstAct`
- `startConfig`
- `sourceProjectId`
- `status`
- `rankingWeight`

## 当前主要代码和资产

- `app/[locale]/page.tsx`
- `app/[locale]/studio/skus/page.tsx`
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

## 当前已落地

- `public/home/manifest.json` 作为预设故事 SKU 的当前只读清单。
- `scripts/build-story-sku-manifest.mjs` 从现有 `public/home/` 资产生成 manifest。
- `lib/storySku/manifest.ts` 为首页、API fallback 和管理界面提供读取适配。
- `/studio/skus` 提供发布管理视图，用于搜索筛选、检查字段、排序、资源绑定、来源追踪和发布包装草稿；当前支持 Studio 草稿 API 保存和刷新恢复，但不写入 manifest 或数据库。
- `lib/storySku/serverCatalog.ts` 合并创作者发布 SKU 与预设 manifest，供 Studio 发布管理和草稿 API 使用。
- `lib/storySku/taxonomy.ts` 定义 StoryPlay 第一版结构化分类，并从当前预设故事旧标签推断默认分类。

## 和其他模块的关系

```text
StoryProject
  创作者编辑态
  |
  | publish
  v
Story SKU
  首页、列表、推荐、预览、开始游玩
  |
  | start
  v
Runtime Session
  /play 消费
```

## 短期开发重点

- 继续校准 SKU 分类体系，并把首页、stories 列表和发布表单统一到同一套 taxonomy。
- 梳理 `public/home/` 现有预制内容和数据库 featured stories 的关系。
- 首页和 stories 列表统一消费 SKU 数据。
- 为后续 Studio 发布 SKU 预留 `sourceProjectId` 和 `status`。
- 确定发布包装草稿的正式持久化位置：D1 表或 Creator Workspace 的发布草稿表；当前 `.storyplay/studio/sku-drafts.json` 只用于本地 MVP 阶段跑通保存链路。
- 保持 SKU 管理轻量化，不把正文、固定首场、剧情大纲和复杂创作工具塞回发布管理页。

## 后续文档建议

- [schema.md](schema.md)：SKU 字段、分类、状态和版本。
- [taxonomy.md](taxonomy.md)：StoryPlay 第一版结构化分类体系。
- `asset-pipeline.md`：封面、首图、角色图、first act 的生成和检查流程。
- `homepage-distribution.md`：首页分发、分类、排序、推荐逻辑。
