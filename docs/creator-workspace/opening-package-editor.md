# Opening Package Editor

Status: In progress. Phase 1, Phase 2, and a minimal manual editor are implemented for local MVP.

This document defines the next StoryPlay creator milestone: a creator-controlled first playable scene.

The product direction is:

```text
Creator writes and locks the opening scene
  -> creator defines the story outline guardrail
  -> publishes it as part of the Story SKU
  -> player enters a fixed first scene
  -> AI continues only after the first-scene exit, staying inside the outline
```

This replaces the weaker MVP assumption that a published creator story only needs a `StartRequest` prompt.

## One-Sentence Definition

An Opening Package is the fixed runtime package for the first scene of a published story.

It includes the first background image, first scene metadata, first-scene characters, beats, local choices, and the exit hook used when AI continues into the next scene.

It works together with `storyOutline`, which is the soft plot guardrail for all later AI-generated scenes.

## Product Goal

The creator must be able to control the player's first minute.

For StoryPlay, this matters more than broad project-management features because the first scene decides whether the player understands the fantasy, trusts the tone, and wants to continue.

## What Becomes Fixed

The first scene should not depend on live model generation when the player starts the story.

The creator should be able to control:

- background image
- image orientation
- scene title
- scene location / scene key
- visual atmosphere
- active characters in the scene
- character display names
- character portrait references where available
- beat order
- narration text
- speaker text
- voice delivery notes
- beat-level visible characters / poses
- choice labels
- local choice jumps inside the first scene
- exit choices into AI continuation
- the `nextSceneSeed` / continuation hook
- initial `storyState` for later AI scenes

## What Remains AI-Controlled

AI can still help the creator, but it must not silently override locked first-scene content.

Allowed AI use:

- generate a draft opening from project fields
- rewrite selected narration or dialogue on explicit request
- generate or regenerate background image on explicit request
- suggest choices
- suggest continuation hooks
- continue into the second scene after a `change-scene` exit

AI continuation must follow the project's story outline guardrail:

- main goal
- phase outline
- required story beats
- relationship arc
- ending direction
- guardrails / forbidden drift

Not allowed for this milestone:

- live-generate the first scene on player start when an Opening Package exists
- replace creator-written beats during publish
- treat the current Act / Scene plan as a full authored plot tree

## Runtime Model

The current runtime already has the right lower-level shape:

```ts
Scene = {
  id: string;
  scenePrompt: string;
  imageUrl?: string;
  imageUuid?: string;
  sceneKey?: string;
  orientation?: "portrait" | "landscape";
  entryBeatId: string;
  beats: Beat[];
}
```

```ts
Beat = {
  id: string;
  narration?: string;
  speaker?: string;
  line?: string;
  lineDelivery?: string;
  activeCharacters?: Array<{ name: string; pose?: string }>;
  next:
    | { type: "continue"; nextBeatId: string }
    | { type: "choice"; choices: BeatChoice[] };
}
```

```ts
BeatChoice.effect =
  | { kind: "advance-beat"; targetBeatId: string }
  | { kind: "change-scene"; nextSceneSeed: string }
```

So the new feature should mostly add authoring and persistence around this shape, not invent a new first-scene runtime.

## Proposed Project Schema

Add a new top-level field to `StoryProject`:

```ts
export type StoryProjectOpeningPackage = {
  id: string;
  status: "empty" | "draft" | "ready";
  source: "manual" | "ai-generated" | "imported" | "playtest";
  updatedAt: string;
  scene: StoryProjectOpeningScene;
  storyState: StoryProjectOpeningStoryState;
  validation: StoryProjectOpeningValidation;
};
```

Scene shape:

```ts
export type StoryProjectOpeningScene = {
  id: string;
  title: string;
  location: string;
  sceneKey: string;
  scenePrompt: string;
  orientation: "portrait" | "landscape";
  backgroundImageUrl: string;
  backgroundImageUuid?: string;
  beats: StoryProjectOpeningBeat[];
  entryBeatId: string;
};
```

Beat shape:

```ts
export type StoryProjectOpeningBeat = {
  id: string;
  kind: "narration" | "dialogue";
  narration: string;
  speaker: string;
  line: string;
  lineDelivery: string;
  activeCharacters: Array<{
    name: string;
    pose: string;
  }>;
  next:
    | { type: "continue"; nextBeatId: string }
    | { type: "choice"; choices: StoryProjectOpeningChoice[] };
  locked: boolean;
};
```

Choice shape:

```ts
export type StoryProjectOpeningChoice = {
  id: string;
  label: string;
  effect:
    | { kind: "advance-beat"; targetBeatId: string }
    | { kind: "change-scene"; nextSceneSeed: string };
};
```

Story memory shape:

```ts
export type StoryProjectOpeningStoryState = {
  logline: string;
  genreTags: string;
  protagonist: string;
  castNotes: string;
  synopsis: string;
  openThreads: string[];
  relationships: string[];
  nextHook: string;
};
```

## Publish Contract

`StorySku.creatorRuntime` should support two paths:

```ts
creatorRuntime: {
  startRequest: StartRequest;
  openingPackage?: PublishedOpeningPackage;
  sourceActId?: string;
  sourceSceneId?: string;
  publishedAt: string;
}
```

If `openingPackage` exists and is valid:

```text
homepage card click
  -> stores opening package in sessionStorage
  -> /play?custom=1 or a new /play?sku=:id path
  -> /play builds initial Session directly from the fixed scene
  -> later change-scene calls continue through /api/scene
```

If `openingPackage` is missing:

```text
fallback to current StartRequest live generation path
```

This keeps the existing publish loop working while enabling fixed first scenes.

## Editor UX

The project editor should add a primary section named:

```text
首场编辑
```

Recommended tabs:

- `画面`
- `角色`
- `脚本`
- `选择`
- `出口`

### 画面

Purpose: define the fixed first background.

Fields:

- background image preview
- upload image
- generate image from prompt
- scene prompt
- scene key
- location
- orientation

MVP can start with URL input and existing generated image reuse. Upload can come later if storage is not ready.

### 角色

Purpose: define who can appear in first-scene beats.

Fields:

- character name
- role
- visual notes
- portrait reference if available
- voice notes

For MVP, reuse `StoryProject.characters` and allow per-beat active character names/poses.

### 脚本

Purpose: edit the beat list.

Each beat card should show:

- beat id
- narration
- speaker
- line
- line delivery
- active characters / poses
- next behavior

Core operations:

- add beat
- duplicate beat
- delete beat with reference guard
- reorder beat
- set entry beat
- validate missing next target

### 选择

Purpose: edit local branching inside the first scene.

Choice behavior:

- `advance-beat`: jump to another first-scene beat
- `change-scene`: exit fixed first scene and ask AI to continue

MVP does not need a visual graph. A structured list with target selectors is enough.

### 出口

Purpose: control the handoff from fixed content to AI continuation.

Fields:

- exit choice label
- `nextSceneSeed`
- `storyState.nextHook`
- open threads
- relationship notes

The editor should explain this as "AI 续写方向", not as a full plot tree.

## Validation Rules

Publishing should allow a prompt-only story, but show a stronger readiness state when the Opening Package is complete.

Opening Package is ready when:

- background image exists
- entry beat exists
- every beat has displayable text
- every `continue.nextBeatId` exists
- every `advance-beat.targetBeatId` exists
- at least one exit choice has `change-scene`
- every exit choice has a non-empty `nextSceneSeed`
- initial storyState has `logline`, `protagonist`, and `nextHook`

Warnings:

- no speaker lines
- no active characters
- no local choices
- no scene key
- no cast notes

## Development Roadmap

### Phase 1: Schema And Compiler

Status: Implemented for local MVP.

Goal: make the data model real without changing the UI heavily.

Deliverables:

- add `StoryProject.openingPackage`
- add `StoryProject.storyOutline`
- normalize old projects with an empty opening package
- add `compileOpeningPackageToStartResponse`
- add validation helpers
- add published `openingPackage` to `StorySku.creatorRuntime`
- compile story outline guardrails into prompt/runtime world setting

Done when:

- typecheck passes
- old projects still load
- published SKUs can carry opening package data

Implemented files:

- `lib/storyProject/types.ts`
- `lib/storyProject/openingPackage.ts`
- `lib/storyProject/outlineCompiler.ts`
- `lib/storyProject/publish.ts`
- `lib/storySku/manifest.ts`

### Phase 2: Player Start Bridge

Status: Implemented for local MVP.

Goal: published creator story can start from a fixed first scene.

Deliverables:

- homepage card stores opening package when present
- `/play` detects creator opening package
- `/play` builds initial `Session` locally from the fixed scene
- later `change-scene` continues with the current `/api/scene` path

Done when:

- clicking a creator story with opening package enters fixed first scene without `/api/start`
- exiting first scene generates the next scene normally

Implemented files:

- `app/[locale]/page.tsx`
- `app/[locale]/play/page.tsx`

### Phase 3: Minimal Opening Editor UI

Status: Implemented as a first manual editor.

Goal: creators can author the fixed first scene.

Deliverables:

- `首场编辑` section in project editor
- background image URL / scene prompt fields
- beat list editor
- choice editor
- exit hook editor
- readiness checklist

Done when:

- creator can manually create at least 3 beats
- creator can add a local choice branch
- creator can add one AI continuation exit
- publish uses the edited opening package

Current local MVP supports:

- enabling / disabling fixed first scene
- background image URL
- scene title / location / scene prompt / scene key
- beat list editing
- entry beat selection
- sequential continue targets
- final AI continuation exit
- storyState synopsis / nextHook / openThreads / relationships
- readiness checklist

Still not implemented:

- visual graph
- arbitrary multiple choices per beat
- beat deletion / reorder controls
- image upload
- background image generation
- character asset binding

### Phase 4: AI Assist And Asset Flow

Goal: speed up authoring without weakening creator control.

Deliverables:

- generate draft opening from project fields
- generate background image from scene prompt
- rewrite selected beat
- suggest choices
- import first scene from a successful playtest

This phase should be explicit-assist only.

### Phase 5: Later Graph Editor

Goal: support larger authored branching beyond the first scene.

Deliverables:

- playable graph schema
- node editor
- conditions and state changes
- endings
- versioned releases

This is not part of the current MVP.

## Naming Rule

Use these names in product UI:

- `首场编辑`
- `固定首场`
- `脚本`
- `选择`
- `AI 续写方向`

Avoid these names for the current milestone:

- `剧情树`
- `完整章节图`
- `关卡编辑器`

The current milestone controls the first scene. A full playable graph is a later product layer.
