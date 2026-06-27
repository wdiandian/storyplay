# Creator MVP Publish Loop

Status: Current priority.

Implementation status: MVP publish loop is functionally complete for local development and the StoryProject -> Story SKU handoff is now closed for MVP.

Next milestone: [Opening Package Editor](./opening-package-editor.md).

The publish loop now has two levels:

```text
Level 1: StoryProject -> StartRequest -> live-generated first scene
Level 2: StoryProject -> fixed Opening Package -> AI continues after first-scene exit
```

Level 1 is implemented. Level 2 is the next creator MVP because it lets creators control the player's first minute and define a story outline guardrail instead of only publishing a generation prompt.

This document resets the Creator Workspace roadmap around the real minimum viable product.

The first minimum MVP was not a deep story editor. It was:

```text
Creator creates a story
  -> saves core story information
  -> publishes it as a discoverable Story SKU
  -> the story appears on the homepage / story list
  -> a player can click it and enter /play
```

Act / Scene planning, scene-level playtests, and generated result review are useful creator experience upgrades, but they are not the release-critical path for the first MVP.

The next MVP is not a full plot tree either. It is a creator-controlled first scene:

```text
Creator creates Opening Package
  -> defines Story Outline guardrail
  -> publishes it with the Story SKU
  -> player starts from the fixed first scene
  -> AI continues after the creator-authored exit while following the outline
```

Deferred creator features are tracked in [deferred-feature-backlog.md](./deferred-feature-backlog.md).

## Product Principle

The first creator flow should answer one question:

Can a creator make a story that becomes visible and playable for players?

If a feature does not directly support that question, it belongs to a later phase.

## MVP Scope

### 1. Create StoryProject

Already mostly implemented.

Required fields for MVP:

- title
- logline
- synopsis
- genres
- moods / tags
- visual style
- cover image or cover placeholder
- start prompt / runtime input derived from the project

Act / Scene structure can exist, but it must not be required to publish.

### 2. Publish StoryProject as Story SKU

Missing and now highest priority.

The publish action should convert a `StoryProject` into a Story SKU draft or local published SKU.

Minimum published SKU should include:

- stable SKU id
- source project id
- title
- subtitle / logline
- description / synopsis
- cover image
- categories / genres
- tags
- language
- audience
- style guide
- runtime start payload
- publish status
- createdAt / updatedAt

### 3. Show Published Story on Discovery Surfaces

Published creator stories should be visible in:

- homepage waterfall / card list
- story list page if available
- a creator/local category or filter

For local MVP, a file-backed local store is acceptable.

### 4. Player Can Start the Story

The published SKU must produce the same kind of runtime input `/play` already understands.

For first MVP:

- it can use `/play?custom=1`
- it can reuse `sessionStorage("storyplay:custom")`
- it does not need prebaked first-act assets
- it does not need generated cover assets if a placeholder is available

The goal is playable, not production-perfect.

### 5. Fixed Opening Package

New priority.

Published creator stories should optionally include a fixed first-scene package:

- background image
- scene metadata
- `Scene.beats`
- entry beat
- local choices
- AI continuation exits
- initial `storyState`
- story outline guardrail for later scenes

When this package exists, `/play` should start from it directly and skip `/api/start` for the first scene.

## Deferred Enhancements

These are useful but not part of the minimum creator MVP:

- Act / Scene structure editing
- Scene-level playtest history
- `Scene.lastPlaytest`
- accepting generated playtest summaries into Scene fields
- accepting generated image URLs as scene visual references
- complex graph editor
- character asset editor
- version management
- review / moderation workflow
- multi-user ownership and permissions

Keep these features documented, but do not let them block the publish loop.

## Implementation Roadmap

### Phase A: Publish Contract

Status: Implemented for local MVP.

Define the exact StoryProject -> Story SKU mapping.

Deliverables:

- publish DTO / mapper
- SKU fields required by homepage cards
- source project metadata on SKU
- local storage target

Implemented files:

- `lib/storyProject/publish.ts`
- `lib/storySku/publishedStore.ts`
- `lib/storySku/manifest.ts`

### Phase B: Publish API

Status: Implemented for local MVP.

Add a project publish endpoint:

```text
POST /api/studio/projects/:id/publish
```

The endpoint should:

- load StoryProject
- validate minimum publish fields
- create or update a local Story SKU draft/published item
- mark project publish status
- return the generated SKU

Implemented endpoint:

```text
POST /api/studio/projects/:id/publish
```

The endpoint writes creator-published SKUs to:

```text
.storyplay/studio/published-skus.json
```

### Phase C: Studio Publish UI

Status: Implemented for local MVP.

Add a clear action in the project editor:

- `发布到首页`
- show validation issues
- show published SKU id / status
- provide link to homepage or story detail

Current implementation:

- project editor has `发布到首页`
- unsaved project changes are saved before publish
- model API configuration is not required to publish
- publish result updates `StoryProject.publish.status` and `StoryProject.publish.skuId`
- project editor shows publish-readiness checks for required and recommended fields
- project editor shows a lightweight homepage card preview derived from the current StoryProject
- project editor shows publish sync state: 未发布 / 已同步 / 有未发布修改
- published projects expose a homepage shortcut
- published projects expose a 发布管理 shortcut
- published projects can be canceled/unpublished from the project editor; this removes the published Story SKU but keeps the StoryProject
- republishing updates the same SKU id

### Phase D: Discovery Integration

Status: Homepage implemented. Story list page remains a follow-up.

Make homepage/story list include local creator-published SKUs.

For MVP:

- put them in a `创作者故事` or `本地发布` category
- sort latest first
- keep existing preset stories untouched

Current implementation:

- `/api/stories/featured` merges local creator-published SKUs before DB/preset rows
- homepage card waterfall consumes the merged featured API
- preset manifest remains untouched
- creator-published cards show a `创作者` badge
- creator-published stories use a StoryPlay default cover when no cover is supplied
- `/studio/skus` is now framed as 发布管理: it manages published artifacts, not authoring source files
- 发布管理 can delete creator-published SKUs; preset SKUs cannot be deleted

Follow-up:

- decide whether `/stories` should become a published-story discovery page or remain saved-player-story history

### Phase E: Player Start

Status: Implemented for local MVP.

Ensure clicking the card starts the published SKU.

For MVP:

- either reuse custom sessionStorage payload
- or add a simple SKU start path that resolves the local SKU then enters `/play`

Current implementation:

- preset cards still use `/play?card=:id`
- creator SKU cards write `storyplay:custom` with the published runtime payload
- creator SKU cards enter `/play?custom=1`
- creator SKU runtime payload includes `source`, `projectId`, `projectTitle`, and `skuId`

## Remaining Non-Blocking Follow-Ups

The local MVP is now enough to create, preview, publish, discover, unpublish, and play a StoryProject.

The StoryProject / Story SKU module should now be considered MVP-complete for local development. Further work should only happen when the product needs production infrastructure, such as D1 persistence, real accounts, moderation, publish versions, or analytics. Avoid expanding 发布管理 into a second story editor.

## Preset Import

系统预设不直接编辑。预设作品进入创作体系的方式是：

```text
Preset Story SKU -> 复制为 StoryProject -> 编辑副本 -> 发布为 Creator Story SKU
```

Current implementation:

- 发布管理里的系统预设可以点击 `复制为故事工程`
- 导入器读取预设 SKU 和 `/public/home/firstact/*.json`
- 标题、卖点、简介、分类、标签、封面、首图、视觉风格会迁移到 StoryProject
- firstAct 的 scene / beats / choices 会迁移为固定首场 Opening Package
- firstAct 的 storyState 会迁移为首场状态、剧情大纲和后续护栏的初始内容
- 原预设 SKU 保持不变；编辑和发布发生在新 StoryProject 副本上

后续如果要“陆续取代原预设”，应做发布/分发策略，而不是直接改 manifest：

- Creator SKU 发布成功后可在首页排序上压过对应 preset
- 发布管理可增加 `替代来源 presetId`
- preset 可被标记为隐藏或降权
- 最终生产环境再迁移到数据库里的发布表

These items are intentionally left outside the MVP finish line:

- publish history / version rollback
- moderation and ownership workflow
- `/stories` page role decision
- generated cover pipeline
- creator SKU analytics
- richer published-story detail page

## Next MVP Success Criteria

The Opening Package phase is done when:

1. A creator can edit a fixed first scene.
2. The fixed first scene includes a background image and author-written beats.
3. The creator can add at least one local choice branch.
4. The creator can add at least one `change-scene` exit for AI continuation.
5. Publishing carries the fixed first scene into the Story SKU.
6. A player clicking the published story starts from that fixed first scene.
7. After the exit choice, the existing AI scene generation continues normally.

## Success Criteria

This phase is done when:

1. A creator can create a StoryProject from the Studio.
2. The creator can publish it as a Story SKU.
3. The published story appears on the homepage.
4. A player can click the story card.
5. The player reaches `/play` with the story's project-derived start input.

No scene-level editing or result acceptance is required for this milestone.
