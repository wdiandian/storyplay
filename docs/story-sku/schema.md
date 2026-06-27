# Story SKU Schema

Status: Plan / Schema Draft.

本文档定义 Story SKU 的第一版结构。SKU 面向消费和分发，用于首页、故事列表、分类、推荐和发布状态管理。它不等同于 `StoryProject`，也不等同于 `/play` 的 runtime session。

核心判断：

```text
StoryProject = 创作源文件
Story SKU = 发布产物
发布管理 = 管理发布产物，不承载完整故事创作
```

## 边界

```text
StoryProject
  创作者编辑态，包含完整设定、章节、角色、规则和调试历史。
        |
        | publish
        v
Story SKU
  消费侧包装，包含卡片信息、分类、资源路径、首幕入口和发布状态。
        |
        | start
        v
First Act / Runtime Session
  可直接进入 /play 的首幕运行包。
```

SKU 应该足够轻，不能把完整 `firstact`、音频 base64、远程生成元数据全部塞进首页数据。

## 第一版字段

```ts
type StorySku = {
  id: string;                  // "m0", "f12"
  gender: "male" | "female";
  audienceLabel: "男性向" | "女性向";
  title: string;
  logline: string;
  synopsis: string;
  tags: string[];
  genres: string[];
  moods: string[];
  interaction: "轻互动" | "中互动" | "强互动";
  structure: "单线推进" | "多分支" | "短剧反转" | "关系推进" | "解谜" | "养成";
  visualStyle: string;
  contentWarnings: string[];
  genreTagsRaw: string;
  stylePrompt: string;

  assets: {
    cover: string;             // "/home/m0.webp"
    firstScene?: string;       // "/home/firstscene/m0.webp"
    firstScenePortrait?: string;
    portraits: string[];
    portraitsPortrait: string[];
  };

  firstAct: {
    zh: string;
    en?: string;
    ja?: string;
    portraitZh?: string;
    portraitEn?: string;
    portraitJa?: string;
  };

  runtimeSummary: {
    sceneKey?: string;
    beatsCount: number;
    choicesCount: number;
    charactersCount: number;
  };

  storyState: {
    protagonist?: string;
    castNotes?: string;
    openThreads: string[];
    relationships: string[];
    nextHook?: string;
  };

  publish: {
    status: "active" | "draft" | "archived";
    source: "preset" | "creator";
    sourceProjectId?: string;
  };

  curation: {
    sortOrder: number;
    featured: boolean;
  };
};
```

## 当前 manifest

当前先由脚本从 `public/home/firstact/*.json` 反推生成：

- `public/home/manifest.json`
- 生成脚本：`scripts/build-story-sku-manifest.mjs`

当前 manifest 的职责是盘清楚现有 60 个预设故事，而不是立刻替换首页逻辑。

## Draft 编辑态

`/studio/skus` 当前使用 `StorySkuDraft` 作为发布包装草稿，用于验证包装字段、分类、资源路径、排序和上下架边界。保存按钮会写入 Studio 草稿接口，当前本地开发环境落在 `.storyplay/studio/sku-drafts.json`；浏览器 `localStorage` 只作为接口不可用时的恢复兜底。它不写入 `public/home/manifest.json`，也不写入 D1。

发布管理页会通过 `lib/storySku/serverCatalog.ts` 合并：

- 创作者发布 SKU：来自 `.storyplay/studio/published-skus.json`
- 系统预设 SKU：来自 `public/home/manifest.json`

创作者发布 SKU 应通过 `publish.sourceProjectId` 回指 StoryProject。故事正文、固定首场、剧情大纲护栏等创作源字段仍回到 StoryProject 编辑。

```ts
type StorySkuDraft = {
  id: string;
  title: string;
  logline: string;
  synopsis: string;
  tagsText: string;
  genres: string[];
  moods: string[];
  interaction: "轻互动" | "中互动" | "强互动";
  structure: string;
  visualStyle: string;
  contentWarnings: string[];
  cover: string;
  firstScene: string;
  sortOrder: number;
  featured: boolean;
  status: "active" | "draft" | "archived";
};
```

当前校验规则：

- `title` 不能为空，建议不超过 32 字。
- `logline` 不能为空，建议不超过 90 字。
- `synopsis` 不能为空，建议不超过 280 字。
- `tagsText` 至少解析出 1 个标签，建议不超过 6 个。
- `genres` 至少选择 1 个，建议不超过 3 个。
- `moods` 至少选择 1 个，建议不超过 4 个。
- `sortOrder` 必须是非负整数。
- `cover` 不能为空。
- `firstScene` 为空时给 warning，不阻塞草稿。

Draft 的作用是让发布包装编辑体验先成型，并支持刷新后恢复未发布改动。当前只保存脏草稿到 Studio 草稿仓库，正式发布、审核、版本和多人协作仍待后续接入 D1/Creator Workspace 策略。

当前 API：

- `GET /api/studio/skus/drafts`：读取全部脏草稿。
- `PUT /api/studio/skus/drafts`：保存单个 SKU 草稿。
- `DELETE /api/studio/skus/drafts`：清空全部草稿。
- `DELETE /api/studio/skus/drafts/:id`：删除单个 SKU 草稿。

## 分类体系

第一版结构化分类见 [taxonomy.md](taxonomy.md)。当前实现会从预设故事旧 `tags`、`genreTagsRaw` 和文本描述里推断默认分类，后续创作者发布链路应直接填写结构化字段。

## 需要避免

- 不要让首页直接解析完整 `firstact`。
- 不要让 SKU 依赖远程图片 URL。
- 不要把 `referenceAudioBase64` 放进 SKU manifest。
- 不要让 SKU 承载创作者编辑态字段。

## 后续演进

1. 首页和 stories 列表改为消费 `manifest.json`。
2. D1 `featured_stories` 表升级为接近 SKU 的结构。
3. Creator Workspace 发布时生成 SKU，并补齐 `sourceProjectId`、`status`、版本和审核状态。
4. 首幕 runtime 包继续作为独立资源，由 SKU 的 `firstAct` 字段引用。
