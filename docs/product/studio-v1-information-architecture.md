# Studio V1 Information Architecture

Status: Plan.

本文档定义 `StoryPlay` 第一版创作者工作台 `/studio` 的信息架构。它不等于最终编辑器设计，也不直接定义代码实现；它的作用是把 `StoryProject` 数据模型映射成创作者可理解、可操作的产品界面。

关联文档：

- [../creative-engine/story-project-schema.md](../creative-engine/story-project-schema.md)
- [../creative-engine/roadmap.md](../creative-engine/roadmap.md)
- [design-system.md](design-system.md)

## Product Position

`/studio` 是创作者编辑故事工程、生成试玩、检查结果、接受或重试生成内容的工作台。

它不是：

- 首页创建框的放大版
- 聊天式 AI 助手
- 复杂节点编辑器
- 底层 agent / prompt / parser 编辑器
- 发布后台

第一版目标是打通最小创作闭环：

```text
Create StoryProject
  -> Edit setup / characters
  -> Generate playtest Session
  -> Play in /play
  -> Inspect generated artifacts
  -> Accept or revise
  -> Save back to StoryProject
```

## Route Plan

建议第一版路由：

| Route | Purpose |
| --- | --- |
| `/studio` | 工程列表和最近编辑入口 |
| `/studio/new` | 创建新 `StoryProject` |
| `/studio/[projectId]` | 工程工作台主界面 |
| `/studio/[projectId]/playtests/[playtestId]` | 可选。后续用于独立查看试玩记录 |

第一版可以只实现前三个路由。`/play` 继续作为运行时播放页，不并入 Studio。

## Global Layout

`/studio/[projectId]` 建议使用工具型布局：

```text
┌────────────────────────────────────────────────────────────┐
│ Top Bar: project title / status / save / playtest / theme  │
├───────────────┬──────────────────────────────┬─────────────┤
│ Left Nav      │ Main Editor Panel            │ Right Rail  │
│ Overview      │ current section content      │ context     │
│ Story Setup   │ forms / lists / inspectors   │ preview     │
│ World         │                              │ warnings    │
│ Characters    │                              │ actions     │
│ Scenes        │                              │             │
│ Playtests     │                              │             │
│ Settings      │                              │             │
└───────────────┴──────────────────────────────┴─────────────┘
```

Design rules:

- 左侧导航稳定，不用营销式大 hero。
- 主区域以表单、列表、检查器为主，信息密度比首页更高。
- 右侧栏只放当前上下文的摘要、风险、预览和操作，不放装饰卡。
- 移动端先降级为顶部 tab + 单列编辑，不强行保留三栏。

## Main Sections

### 1. Overview

Purpose: 让创作者快速知道这个工程处于什么状态，以及下一步该做什么。

Maps to:

- `StoryProject.meta`
- `StoryProject.concept`
- `StoryProject.playtests`
- `StoryProject.publish`

Main content:

- 工程标题、简介、封面、状态
- 最近一次保存时间
- 最近 playtest 状态
- 基础完整度：故事设定、角色、世界设定、试玩
- 快捷操作：继续编辑、生成试玩、打开最近试玩

V1 actions:

- edit title / subtitle / tags
- create playtest
- open latest playtest in `/play`

Not in V1:

- 复杂数据统计
- 发布转化漏斗
- 多人协作状态

### 2. Story Setup

Purpose: 编辑故事的核心命题和体验目标。

Maps to:

- `StoryProject.concept`
- `StoryProject.narrative`
- `StoryProject.runtimePolicy`

Main content:

- premise：故事命题
- targetFantasy：目标体验
- genreTags：题材
- toneTags：基调
- pacing：节奏
- protagonist：第二人称主角设定
- coreConflict：核心冲突
- keyMysteries：核心悬念

V1 actions:

- edit fields
- auto-generate a first narrative draft from premise
- lock important narrative fields

Not in V1:

- 长篇章节大纲生成
- 多路线主题规划
- 自动质量评分

### 3. World

Purpose: 管理世界观、地点、规则和世界书。

Maps to:

- `StoryProject.world`
- runtime `Session.worldBooks`

Main content:

- world setting
- world rules
- locations
- world book entries
- glossary

V1 actions:

- add / edit / delete world rule
- add / edit / delete location
- add constant world book entry
- add triggered world book entry with keywords

Not in V1:

- 可视化地图
- 自动关键词扫描报告
- 世界书冲突检测

### 4. Characters

Purpose: 管理创作者确认过的角色资产。

Maps to:

- `StoryProject.characters`
- runtime `Session.characters`

Main content:

- character list
- name / role / persona
- relationship to player
- visual description
- voice description
- portrait reference
- locked state

V1 actions:

- create character manually
- edit character fields
- mark character as locked
- accept generated runtime character into project
- request portrait regeneration later

Not in V1:

- 角色关系图
- 多套服装管理
- 精细音色试听库

### 5. Scenes

Purpose: 管理场景规划和已接受的生成结果。

Maps to:

- `StoryProject.structure.chapters`
- `StoryProject.structure.scenePlans`
- `StoryProject.structure.branchAnchors`

Main content:

- scene plan list
- scene summary
- sceneKey hint
- required characters
- entry seed
- choice seeds
- generated scene reference
- text / image / choices locks

V1 actions:

- create scene plan
- edit scene summary
- add choice seed
- lock text / image / choices
- link a generated scene from playtest

Not in V1:

- visual branch graph
- timeline editor
- variable / condition system
- fixed authored node + AI node mixed graph

### 6. Playtests

Purpose: 从工程生成试玩 Session，并查看哪些结果可以回写。

Maps to:

- `StoryProject.playtests`
- runtime `Session`
- `/play`

Main content:

- playtest list
- session id
- created time
- start scene plan
- status
- accepted artifacts
- warnings

V1 actions:

- generate playtest from current project
- open playtest in `/play`
- accept story state
- accept character
- accept scene
- discard playtest

Not in V1:

- 多 playtest 对比
- 分支覆盖率
- 自动推荐最佳版本

### 7. Settings

Purpose: 配置运行策略和工程级偏好。

Maps to:

- `StoryProject.runtimePolicy`
- `StoryProject.interaction`

Main content:

- language
- orientation
- style guide
- style reference
- TTS policy
- prefetch policy
- freeform input policy
- visual click policy

V1 actions:

- change style guide
- set orientation
- enable / disable TTS
- enable / disable freeform input
- enable / disable visual click
- set prefetch depth for playtest

Not in V1:

- per-agent model selection
- advanced provider configuration
- policy simulation

## Top Bar Actions

Recommended fixed actions:

| Action | Behavior |
| --- | --- |
| Save | Save current project draft |
| Playtest | Compile `StoryProject` into `Session` and open `/play` |
| Import | Future. Not V1 unless needed for local project restore |
| Export | Future. Do not reuse `.storyplay` for project export |
| Publish | Disabled placeholder until publish model exists |

The Playtest button is the primary action. Publish should not compete with it in V1.

## Right Rail

The right rail should be contextual.

Possible widgets:

- current section summary
- missing required fields
- lock status
- last generated artifact
- playtest warnings
- quick preview

Do not put unrelated docs, marketing copy, or agent internals here.

## V1 Creator Flow

### Flow A. Create From Scratch

1. Open `/studio/new`.
2. Enter title, premise, genre, tone, language.
3. Save as `StoryProject`.
4. Open `/studio/[projectId]`.
5. Add protagonist and first character notes.
6. Generate playtest.
7. Continue in `/play`.

### Flow B. Accept Runtime Output

1. Generate playtest from Studio.
2. Play first scene in `/play`.
3. Open debug / artifact review.
4. Accept generated `StoryState` into project.
5. Accept generated characters into project.
6. Return to Studio and keep editing.

### Flow C. Scene Planning

1. Add a scene plan in Scenes.
2. Write summary and choice seeds.
3. Generate playtest from that scene plan.
4. Accept or discard generated scene.

Scene planning can be limited in V1. It should not block the first setup -> playtest loop.

## Required Data Operations

V1 product operations:

- create project
- update project fields
- list projects
- delete / archive project
- compile project to session
- create playtest record
- accept playtest artifact

Suggested client module names:

- `lib/story-project/types.ts`
- `lib/story-project/storage.ts`
- `lib/story-project/sessionBuilder.ts`

These are implementation suggestions, not required file names.

## Project To Playtest Contract

Studio should not call low-level agents directly.

Expected flow:

```text
/studio
  -> StoryProject
  -> sessionBuilder
  -> Session
  -> sessionStorage or local playtest store
  -> /play?projectPlaytest=...
```

`/play` should still receive something shaped like the current runtime `Session` or current custom-start payload. The engine should not need to know the full Studio UI shape.

## Play Debug Surface

The full debug drawer can be a separate implementation step, but Studio V1 should reserve the concept.

Minimum debug artifacts to expose later:

- `plan`
- `story`
- `choices`
- `memory / storyState`
- `scenePrompt`
- `sceneKey`
- `characters`
- generated image reference
- warnings / fallback state

Studio V1 can initially store only the accepted artifacts and playtest session id.

## MVP Scope

Must have:

- `/studio` project list
- `/studio/new` create flow
- `/studio/[projectId]` with Overview, Story Setup, Characters, Settings
- local draft save
- project -> session playtest

Should have:

- World section
- Playtests section
- accept generated character / story state

Can wait:

- Scenes section beyond a simple list
- publish
- export `.storyproject`
- branch graph
- detailed debug drawer

## Anti-Goals

Do not build these in Studio V1:

- node-based story graph
- full publishing system
- realtime collaboration
- public creator profile
- analytics dashboard
- raw prompt editor
- agent contract editor
- provider credential editor

## Design Notes

Studio should use the current StoryPlay design system but with denser tool ergonomics:

- smaller headings than homepage
- clear left navigation
- compact section tabs or forms
- stable save / playtest actions
- readable state badges
- no nested cards
- no hero page treatment inside the workspace

The first screen of Studio should be useful immediately: either a project list or the project editor, never a marketing explanation.

## Open Questions

1. Should `/studio` require login before server persistence exists, or support local-only projects first?
2. Should `/create` remain a separate lightweight flow, or redirect into `/studio/new` later?
3. Should `/play` receive Studio playtests via `sessionStorage`, local project storage, or a new API route?
4. Should accepted generated characters automatically become locked, or only marked as AI-generated until the creator locks them?
5. Should Scenes appear in V1 UI, or remain schema-only until the first playtest loop works?
