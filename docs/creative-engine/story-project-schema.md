# StoryProject Schema Draft

Status: Plan / Schema Draft.

本文档定义 `StoryProject` 的第一版创作工程数据模型。它不是当前已经实现的类型，而是后续实现 `/studio`、工程保存、试玩生成、调试回写和发布版本时的 schema 依据。

## 一句话定位

`StoryProject` 是创作者编辑的长期工程文件；`Session` 是玩家或创作者试玩时使用的运行时状态。

不要把 `Session` 继续扩成创作工程。正确方向是：

```text
StoryProject -> Project Compiler / Session Builder -> Session -> /play
```

后续可以把满意的运行时结果回写进 `StoryProject`，但两者不能混成一个模型。

## 为什么需要 StoryProject

当前项目里最接近的结构是：

| 现有结构 | 位置 | 适合做什么 | 为什么不能直接当 StoryProject |
| --- | --- | --- | --- |
| `Session` | `lib/types/index.ts` | 运行时生成、继续游玩、保存当前局 | 偏游玩状态，包含 history、当前角色注册表和滚动记忆，不适合表达草稿、章节规划、锁定策略和发布版本 |
| `StoryState` | `lib/types/index.ts` | 故事圣经和动态记忆 | 只是叙事记忆的一部分，且当前由 Writer 自动生成/更新 |
| `stories / scenes / characters` | `lib/db/schema.ts` | 保存一次游玩产生的 story session | 偏结果持久化，不是创作工程 |
| `.storyplay` share doc | `lib/storyShare.ts` | 导出一局可继续播放的故事 | 偏分享和回放，不是 authoring 格式 |

`StoryProject` 的作用是把创作者真正要控制的东西前置出来：故事概念、世界设定、角色资产、章节场景规划、交互规则、运行策略、调试记录和发布状态。

## 设计原则

1. `StoryProject` 是 authoring state，必须可编辑、可保存、可版本化。
2. `Session` 是 runtime state，只由工程配置和试玩历史派生。
3. 创作者编辑产品层配置，不直接编辑 agent contract、parser、fallback 或底层 prompt 协议。
4. 第一版只覆盖最小 Studio 和试玩闭环，不强行设计完整分支图编辑器。
5. 所有 AI 生成结果都要标记来源和锁定状态，避免后续重生成误覆盖。

## Top-Level Shape

建议第一版顶层结构如下：

```ts
export type StoryProject = {
  schemaVersion: 1;
  id: string;
  meta: StoryProjectMeta;
  concept: StoryProjectConcept;
  world: StoryProjectWorld;
  narrative: StoryProjectNarrative;
  characters: StoryProjectCharacter[];
  structure: StoryProjectStructure;
  interaction: StoryProjectInteractionPolicy;
  runtimePolicy: StoryProjectRuntimePolicy;
  playtests: StoryProjectPlaytest[];
  publish: StoryProjectPublishState;
  createdAt: number;
  updatedAt: number;
};
```

## Meta

`meta` 是工程在列表、Studio 顶部和发布页中的基础信息。

```ts
export type StoryProjectStatus = "draft" | "playtesting" | "published" | "archived";

export type StoryProjectMeta = {
  title: string;
  subtitle?: string;
  slug?: string;
  language: "zh-CN" | "en" | "ja";
  cover?: StoryProjectAssetRef;
  tags: string[];
  status: StoryProjectStatus;
};
```

说明：

- `title` 是创作者工程标题，不等于 `Session.worldSetting`。
- `subtitle` 可用于首页/作品库短介绍。
- `cover` 后续可以来自生成图、上传图或发布构建。

## Concept

`concept` 对应创作者最初输入的故事命题和体验目标。

```ts
export type StoryProjectConcept = {
  premise: string;
  targetFantasy?: string;
  genreTags: string[];
  toneTags: string[];
  pacing?: "slow-burn" | "balanced" | "fast-hook";
  audience?: string;
  creatorNotes?: string;
};
```

说明：

- `premise` 是生成 `Session.worldSetting` 的主来源之一。
- `targetFantasy` 用来表达“这部互动故事要满足什么体验”，比普通剧情简介更贴近 StoryPlay 的产品目标。
- `creatorNotes` 只给创作者和后续编译器看，不直接展示给玩家。

## World

`world` 对应世界观、规则和世界书。

```ts
export type StoryProjectWorld = {
  setting: string;
  rules: StoryProjectWorldRule[];
  locations: StoryProjectLocation[];
  worldBooks: StoryProjectWorldBook[];
  glossary: StoryProjectGlossaryEntry[];
};

export type StoryProjectWorldRule = {
  id: string;
  title: string;
  content: string;
  importance: "low" | "medium" | "high";
  locked?: boolean;
};

export type StoryProjectLocation = {
  id: string;
  name: string;
  description: string;
  visualNotes?: string;
  sceneKeyHint?: string;
  locked?: boolean;
};

export type StoryProjectWorldBook = {
  id: string;
  name: string;
  entries: StoryProjectWorldBookEntry[];
};

export type StoryProjectWorldBookEntry = {
  id: string;
  keys: string[];
  content: string;
  position: "constant" | "triggered";
  priority?: number;
  locked?: boolean;
};

export type StoryProjectGlossaryEntry = {
  id: string;
  term: string;
  description: string;
};
```

说明：

- `StoryProjectWorldBook` 可以编译到现有 `Session.worldBooks`。
- `locations.sceneKeyHint` 用于影响 `sceneKey` 连续性，但不是最终 runtime `sceneKey`。

## Narrative

`narrative` 是创作者可控的故事圣经，和运行时 `StoryState` 对应但不完全相同。

```ts
export type StoryProjectNarrative = {
  logline?: string;
  protagonist?: string;
  coreConflict?: string;
  keyMysteries: string[];
  relationshipPremises: string[];
  chapterGoals: StoryProjectChapterGoal[];
  currentStoryState?: StoryProjectStoryStateSnapshot;
};

export type StoryProjectChapterGoal = {
  id: string;
  title: string;
  goal: string;
  requiredReveals?: string[];
};

export type StoryProjectStoryStateSnapshot = {
  source: "manual" | "playtest" | "imported";
  storyState: StoryStateLike;
  updatedAt: number;
  lockedFields?: Array<keyof StoryStateLike>;
};

export type StoryStateLike = {
  logline: string;
  genreTags: string;
  protagonist: string;
  castNotes?: string;
  synopsis: string;
  openThreads?: string[];
  relationships?: string[];
  nextHook?: string;
};
```

说明：

- `StoryStateLike` 先保持和现有 `StoryState` 字段对齐，方便转换。
- `currentStoryState` 可以来自手写，也可以来自一次满意的 playtest。
- 锁定字段用于防止 Writer 后续重写创作者明确确定的故事骨架。

## Characters

`characters` 是创作者资产，不等于 runtime 的角色注册表。

```ts
export type StoryProjectCharacter = {
  id: string;
  name: string;
  role: "protagonist" | "main" | "supporting" | "temporary";
  persona: string;
  relationshipToPlayer?: string;
  visual: StoryProjectCharacterVisual;
  voice: StoryProjectCharacterVoice;
  narrativeRules: string[];
  assets: StoryProjectCharacterAssets;
  source: StoryProjectSource;
  locked?: boolean;
};

export type StoryProjectCharacterVisual = {
  description?: string;
  styleNotes?: string;
  negativeNotes?: string;
  locked?: boolean;
};

export type StoryProjectCharacterVoice = {
  description?: string;
  provider?: "xiaomi" | "stepfun" | "none";
  stepfunVoiceId?: string;
  locked?: boolean;
};

export type StoryProjectCharacterAssets = {
  basePortrait?: StoryProjectAssetRef;
  referenceImages?: StoryProjectAssetRef[];
};
```

说明：

- 这里的角色是创作资产，后续可编译成 runtime `Character[]`。
- `protagonist` 角色不一定进入画面。当前产品仍以第二人称“你”为玩家视角。
- `locked` 表示后续 CharacterDesigner 不应自动覆盖该角色核心设定。

## Structure

`structure` 是第一版场景/章节规划。先保持轻量，不做完整节点编辑器。

```ts
export type StoryProjectStructure = {
  chapters: StoryProjectChapter[];
  scenePlans: StoryProjectScenePlan[];
  branchAnchors: StoryProjectBranchAnchor[];
};

export type StoryProjectChapter = {
  id: string;
  title: string;
  summary?: string;
  goal?: string;
  sortOrder: number;
};

export type StoryProjectScenePlan = {
  id: string;
  chapterId?: string;
  title?: string;
  summary: string;
  sceneKeyHint?: string;
  entrySeed?: string;
  requiredCharacters?: string[];
  choiceSeeds?: StoryProjectChoiceSeed[];
  locks?: StoryProjectSceneLocks;
  generated?: StoryProjectGeneratedSceneRef;
  sortOrder: number;
};

export type StoryProjectChoiceSeed = {
  id: string;
  label: string;
  nextSceneSeed: string;
  targetScenePlanId?: string;
  locked?: boolean;
};

export type StoryProjectSceneLocks = {
  text?: boolean;
  image?: boolean;
  choices?: boolean;
  sceneKey?: boolean;
};

export type StoryProjectGeneratedSceneRef = {
  playtestId: string;
  sessionId: string;
  sceneId: string;
  acceptedAt?: number;
};

export type StoryProjectBranchAnchor = {
  id: string;
  fromScenePlanId: string;
  label: string;
  toScenePlanId?: string;
  seed: string;
};
```

说明：

- `scenePlans` 是作者规划，不要求每个都已经生成过。
- `generated` 只引用 playtest 结果，不直接把完整 `Scene` 塞进规划节点。
- 第一版不需要做可视化图编辑，`branchAnchors` 先作为数据预留。

## Interaction Policy

`interaction` 定义玩家能怎样推进故事。

```ts
export type StoryProjectInteractionPolicy = {
  choiceMode: "ai-generated" | "creator-seeded" | "fixed";
  freeformInput: {
    enabled: boolean;
    defaultClassify: "insert-beat" | "change-scene";
    guardrails?: string[];
  };
  visualClick: {
    enabled: boolean;
    defaultClassify: "insert-beat" | "change-scene";
    hotspotHints?: StoryProjectHotspotHint[];
  };
};

export type StoryProjectHotspotHint = {
  id: string;
  scenePlanId?: string;
  label: string;
  description: string;
  expectedAction?: string;
};
```

说明：

- 当前 runtime 已有自由输入和视觉点击能力，但创作者还不能配置。
- 第一版只做策略配置，后续再做可视化热点编辑。

## Runtime Policy

`runtimePolicy` 定义生成和试玩策略。

```ts
export type StoryProjectRuntimePolicy = {
  styleGuide: string;
  styleReference?: StoryProjectAssetRef;
  orientation: "portrait" | "landscape";
  language: "zh-CN" | "en" | "ja";
  tts: {
    enabled: boolean;
    provider?: "xiaomi" | "stepfun" | "none";
  };
  prefetch: {
    enabled: boolean;
    depth: 0 | 1 | 2;
  };
  modelStrategy?: {
    textModelRole?: "default" | "quality" | "fast";
    imageModelRole?: "default" | "quality" | "fast";
  };
};
```

说明：

- `styleGuide`、`styleReference`、`orientation`、`language` 可以直接影响 `Session`。
- 调试模式下建议默认 `prefetch.depth = 0` 或 `1`，避免成本失控。

## Playtests

`playtests` 保存从工程生成的试玩记录和可回写结果。

```ts
export type StoryProjectPlaytest = {
  id: string;
  sessionId: string;
  createdAt: number;
  source: {
    projectVersion: number;
    startScenePlanId?: string;
  };
  status: "running" | "completed" | "discarded" | "accepted";
  summary?: string;
  acceptedArtifacts: StoryProjectAcceptedArtifact[];
};

export type StoryProjectAcceptedArtifact = {
  id: string;
  type: "story-state" | "character" | "scene" | "image" | "choice";
  sourceSessionId: string;
  sourceSceneId?: string;
  targetId?: string;
  acceptedAt: number;
};
```

说明：

- playtest 不等于发布版本。
- `acceptedArtifacts` 表示创作者认可哪些生成结果，并允许回写进工程资产。

## Publish State

`publish` 先做状态和版本占位，不在第一版实现完整发布系统。

```ts
export type StoryProjectPublishState = {
  currentDraftVersion: number;
  playtestBuilds: StoryProjectBuild[];
  releaseBuilds: StoryProjectBuild[];
};

export type StoryProjectBuild = {
  id: string;
  version: number;
  createdAt: number;
  status: "draft" | "playtest" | "released" | "retracted";
  sourceProjectVersion: number;
  entrySessionId?: string;
  notes?: string;
};
```

说明：

- 第一阶段可以只维护 `currentDraftVersion`。
- 发布构建后续再决定是存完整 session、story pack，还是编译后的 project runtime bundle。

## Shared Helpers

```ts
export type StoryProjectSource = "manual" | "ai-generated" | "imported" | "playtest";

export type StoryProjectAssetRef = {
  id: string;
  kind: "image" | "audio" | "json";
  url?: string;
  key?: string;
  uuid?: string;
  dataUrl?: string;
  source: StoryProjectSource;
};
```

说明：

- `url` 对应公开 CDN。
- `key` 对应未来 R2 或内部对象存储。
- `uuid` 对应图像服务引用。
- `dataUrl` 只适合本地草稿或临时导入，不建议长期依赖。

## Compile To Session

第一版 `StoryProject -> Session` 建议只做最小转换。

输入：

- `concept.premise`
- `concept.genreTags`
- `concept.toneTags`
- `world.setting`
- `world.worldBooks`
- `narrative.currentStoryState`
- `characters`
- `runtimePolicy`

输出：

```ts
export type ProjectSessionBuildInput = {
  project: StoryProject;
  startScenePlanId?: string;
  playerName?: string;
};

export type ProjectSessionBuildResult = {
  session: SessionLike;
  warnings: string[];
};
```

`SessionLike` 对齐当前 runtime `Session` 的必要字段：

```ts
export type SessionLike = {
  id: string;
  createdAt: number;
  worldSetting: string;
  styleGuide: string;
  history: unknown[];
  characters: unknown[];
  storyState?: StoryStateLike;
  styleReferenceImage?: string;
  orientation?: "portrait" | "landscape";
  playerName?: string;
  language?: string;
  worldBooks?: unknown[];
};
```

编译规则：

- `worldSetting` 由 `concept + world + narrative` 合成。
- `styleGuide` 来自 `runtimePolicy.styleGuide`。
- `storyState` 优先来自 `narrative.currentStoryState`。
- `characters` 来自未禁用的 `StoryProjectCharacter`。
- `worldBooks` 来自 `world.worldBooks`。
- `history` 初始为空，进入 `/play` 后由 runtime 写入。

## Backwrite From Session

从运行态回写到工程态时，只允许显式接受，不做自动覆盖。

可回写：

- `StoryState` -> `narrative.currentStoryState`
- runtime `Character` -> `characters[*].visual / voice / assets`
- runtime `Scene` -> `structure.scenePlans[*].generated`
- runtime `choices` -> `structure.scenePlans[*].choiceSeeds`

不自动回写：

- 用户某次游玩路径的完整 `history`
- 临时插入的 beat
- 未被创作者接受的图片、台词和分支
- provider-specific transient data

## Storage Strategy

第一版存储建议：

1. 本地草稿：`localStorage` 或 IndexedDB，键名使用 `storyplay:projects`。
2. 服务端草稿：等认证和配额策略稳定后再接 D1。
3. 大资源：图片、音频、style reference 后续转入 R2 或等价对象存储。
4. 导出格式：不要复用 `.storyplay`，建议后续单独设计 `.storyproject` 或 JSON bundle。

原因：

- `.storyplay` 是可播放分享包。
- `StoryProject` 是可编辑工程包。
- 两者目标不同，混用会影响向后兼容。

## MVP Field Priority

第一版真正需要实现的字段可以更少：

```ts
type StoryProjectMvp = Pick<
  StoryProject,
  | "schemaVersion"
  | "id"
  | "meta"
  | "concept"
  | "world"
  | "narrative"
  | "characters"
  | "runtimePolicy"
  | "playtests"
  | "createdAt"
  | "updatedAt"
>;
```

MVP 暂缓：

- 完整 `structure.branchAnchors`
- 正式 `publish.releaseBuilds`
- 可视化热点编辑
- 多人协作
- 复杂版本比较

## Open Questions

这些问题实现前需要确认：

1. 第一版 Studio 草稿是否只做本地保存，还是直接设计服务端表。
2. `StoryProject` 是否需要和已保存的 `stories` 表共用 ID，还是保持独立 ID 空间。
3. `.storyproject` 导出是否第一阶段就做。
4. 角色资产是否允许从一次 playtest 自动创建，还是必须创作者手动确认。
5. 章节和场景规划第一版是否进入 UI，还是只放在 schema 预留。
