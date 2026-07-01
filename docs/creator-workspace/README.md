# Creator Workspace

Status: Partial MVP.

Current priority:

- [Asset, Blueprint, Fixed Runtime Roadmap](./asset-blueprint-fixed-runtime-roadmap.md)
- [Creator MVP Publish Loop](./creator-mvp-publish-loop.md)
- [Creator Story Assistant](./creator-story-assistant.md)
- [Opening Package Editor](./opening-package-editor.md)

The first usable creator MVP is:

```text
StoryProject -> publish as Story SKU -> homepage/story list -> player enters /play
```

The next creator MVP is:

```text
StoryProject -> asset preproduction + story blueprint -> playtest -> fixed runtime package -> publish as Story SKU
```

The old fixed Opening Package remains as a compatibility layer. New product work should prefer Story Blueprint, Asset Library, and Fixed Runtime Package.

The current creator MVP shape is:

```text
基础信息 -> 固定首场 -> 剧情大纲护栏 -> 发布 -> 玩家试玩
```

Act / Scene planning and Scene Playtest are creator-experience upgrades. They should not block the minimum publish path.

创作者工作台负责更重的故事编辑、配置、调试和发布。它的核心数据是 `StoryProject`，不是首页 SKU，也不是 `/play` runtime session。

## 核心边界

```text
StoryProject = 创作源文件
Story SKU = 发布产物
发布管理 = 管理发布产物，不承载完整故事创作
```

创作者应该在 StoryProject 中编辑基础信息、固定首场和剧情大纲护栏；发布后生成 Story SKU。Story SKU 只负责首页、列表、分类、资源、上下架和试玩入口需要的轻量包装。不要把 SKU 管理页继续扩展成第二套故事编辑器。

## 范围

- `/studio`
- `/studio/new`
- `/studio/[projectId]`
- StoryProject schema
- 世界观、角色、章节、场景、互动规则、视觉风格
- Playtest 调试链路
- 发布为 Story SKU

## 当前状态

- 完整 `/studio` 尚未实现。
- 已实现 `/studio/skus` 发布管理入口，用于查看当前预设 SKU 和创作者发布 SKU、筛选搜索、资源审计和发布包装字段；当前编辑可保存到 Studio 草稿 API。
- 已有 StoryProject schema 草案。
- 已有 Studio v1 信息架构草案。
- 当前生成链路仍以 runtime `Session` 为核心。

## 关联文档

- [./creator-story-assistant.md](./creator-story-assistant.md)
- [./creator-mvp-publish-loop.md](./creator-mvp-publish-loop.md)
- [./deferred-feature-backlog.md](./deferred-feature-backlog.md)
- [../creative-engine/story-project-schema.md](../creative-engine/story-project-schema.md)
- [./story-project-mvp.md](./story-project-mvp.md)
- [./story-structure-mvp.md](./story-structure-mvp.md)
- [./scene-playtest-mvp.md](./scene-playtest-mvp.md)
- [../infrastructure/studio-storage-roadmap.md](../infrastructure/studio-storage-roadmap.md)
- [../product/studio-v1-information-architecture.md](../product/studio-v1-information-architecture.md)
- [../creative-engine/roadmap.md](../creative-engine/roadmap.md)
- [../creative-engine/current-architecture.md](../creative-engine/current-architecture.md)

## 已落地：StoryProject MVP

- 已新增 `StoryProject` 类型和本地文件存储。
- 已新增 `/api/studio/projects` 和 `/api/studio/projects/[id]`。
- 已新增 `/studio/projects`、`/studio/projects/new` 和 `/studio/projects/[projectId]`。
- 当前详情页已升级为 StoryProject 编辑器 MVP；试玩生成链路、角色资产、章节场景树和发布桥接仍在后续阶段。

## 第一版建议

第一版工作台只做最小可用闭环：

1. 新建 StoryProject。
2. 编辑故事概念、世界观、主角、核心风格。
3. 生成一个可 playtest 的 runtime session。
4. 回看 playtest 结果和问题。
5. 调整配置后重新试玩。

暂时不要一开始做完整复杂编辑器。章节树、变量、任务、素材库、协作和版本管理可以放到后续阶段。

## 和其他模块的关系

```text
Creator Workspace
  edits StoryProject
        |
        | publish
        v
Story SKU
  published artifact for homepage, story list, categories and start payload
        |
        | start
        v
Play Experience
  consumes runtime payload
```

## 后续文档建议

- `studio-mvp.md`：Studio MVP 功能范围和页面状态。
- `project-storage.md`：StoryProject 保存、版本和权限。
- `playtest-loop.md`：试玩、调试、回写和重新生成链路。

## 已落地页面

### `/studio/skus`

发布管理入口。

作用：

- 合并读取创作者发布 SKU 和 `public/home/manifest.json` 预设 SKU。
- 展示已发布作品清单。
- 支持标题、标签、ID 搜索。
- 支持按男性向、女性向和资源缺口筛选。
- 支持选中发布作品后查看包装详情和编辑发布包装草稿。
- 展示总量、男女向分布和资源缺口。
- 展示封面、首幕、首图、头像等资源绑定情况。
- 标注发布包装字段：标题、一句话卖点、简介、标签、封面、首图、推荐、排序、上下架。
- 展示来源：系统预设或创作者发布；创作者发布 SKU 应保留 `sourceProjectId`。

暂不做：

- 不做完整故事编辑；故事正文、固定首场和剧情大纲回到 StoryProject。
- 不做正式发布持久化；当前只写入本地 Studio 草稿仓库，不直接修改 manifest 或 D1。
- 不直接修改 `public/home/manifest.json`。
- 不把 SKU 编辑器做成独立产品；后续应并入 Creator Workspace 的发布和分发管理流程。
