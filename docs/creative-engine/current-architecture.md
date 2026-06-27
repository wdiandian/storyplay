# Creative Engine Current Architecture

Status: Current.

本文档记录当前 Creative Engine 的真实代码结构。它的重点是说明“旧 engine runtime + 新 agent-system 治理层”如何共存，避免后续开发误以为所有运行时代码都已经迁入 `lib/engine/agent-system/`。

## 一句话结论

当前项目已经有可运行的实时创作引擎，但它不是全新的 agent runtime 架构。

真实情况是：

```text
API routes
  -> lib/engine/orchestrator.ts
  -> lib/engine/director.ts
  -> historical runtime files under lib/engine/agents/*.ts, vision.ts, voice.ts
  -> selected governance/parser/fallback support from lib/engine/agent-system/
```

`agent-system/` 当前是内部治理层和逐步迁移目标，负责 contract、skill、registry、runtime wrapper、parser/fallback、fixtures、smoke tests。它还没有完全接管 Creative Engine 的所有实际编排。

## 当前请求入口

| 用户路径 | API 文件 | Engine 入口 | 当前职责 |
| --- | --- | --- | --- |
| 开始新故事 | `app/api/start/route.ts` | `startSession()` | 创建 `Session`，生成首幕 |
| 继续下一幕 | `app/api/scene/route.ts` | `requestScene()` | 基于已有 `Session` 生成下一幕 |
| 自由输入分类 | `app/api/classify-freeform/route.ts` | `orchestrator.ts` | 判断自由输入是场内互动还是换场 |
| 场内插入节拍 | `app/api/insert-beat/route.ts` | `directInsertBeat()` | 当前画面内临时追加一个 beat |
| 背景点击理解 | `app/api/vision/route.ts` | `vision.ts` | 用 vision 模型理解点击位置 |
| 对白音频 | `app/api/beat-audio/route.ts` | `voice.ts` | 合成 NPC 对白音频 |

## 当前运行链路

```text
startSession / requestScene
  -> directScene
     -> runWriterStream
        -> routeTaggedStream
           -> <plan>
           -> <story>
           -> <choices>
     -> CharacterDesigner
     -> Cinematographer
     -> Painter
     -> proseSplitter
     -> applyStoryStatePatch
     -> return SceneResult
```

核心文件：

| 层级 | 文件 | 当前职责 |
| --- | --- | --- |
| API | `app/api/start/route.ts` | 接收首幕请求，加载 config，调用 `startSession` |
| API | `app/api/scene/route.ts` | 接收续幕请求，加载 config，调用 `requestScene` |
| Session 编排 | `lib/engine/orchestrator.ts` | 创建 / 更新 `Session`，决定进入 `directScene`、freeform classifier、vision 等路径 |
| 单幕导演 | `lib/engine/director.ts` | 编排 Writer、角色、分镜、绘图、音色、storyState 合并 |
| Writer runtime | `lib/engine/agents/writer.ts` | 生成 plan / story / choices，清洗 beats，提供 writer fallback |
| 角色 runtime | `lib/engine/agents/characterDesigner.ts` | 角色卡、肖像、音色准备 |
| 分镜 runtime | `lib/engine/agents/cinematographer.ts` | 生成英文画面构图 prompt |
| 绘图 runtime | `lib/engine/agents/painter.ts` | 收集参考图并生成场景图 |
| Vision runtime | `lib/engine/vision.ts` | 背景点击理解 |
| Voice runtime | `lib/engine/voice.ts` | 对白音频合成 |
| 文本拆分 | `lib/engine/stream/proseSplitter.ts` | 把 Writer prose 拆成 Beat，并提取 storyState patch |
| 流解析 | `lib/engine/stream/index.ts` | 解析 Writer `<plan>/<story>/<choices>` 标签流 |

## Session / Scene / Beat / StoryState

当前 Creative Engine 的运行时核心仍是 `Session`。

`Session` 保存：

- `worldSetting`：玩家输入或首页配置组装出的故事命题。
- `styleGuide`：当前画风描述。
- `history`：已生成并访问过的场景历史。
- `characters`：累计角色注册表。
- `storyState`：故事主线记忆和动态状态。
- `sceneKey` 相关历史：用于判断是否可以复用上一幕空间参考。
- `orientation`、`language`、`playerName`、`styleReferenceImage` 等运行配置。

`Scene` 是当前返回给前端的可播放单位。

`Beat` 是 `Scene` 内的播放节点，包含旁白、对白、角色、下一步、选择等。

`StoryState` 是连续故事记忆。当前由 Writer 自动生成和更新，创作者还不能直接编辑。

## 旧 Runtime 与新 Agent System 的边界

当前不是“旧 runtime 已废弃，新 runtime 全面接管”的状态。

### 旧 runtime 仍负责真实执行

这些文件仍然是主要运行路径：

- `lib/engine/orchestrator.ts`
- `lib/engine/director.ts`
- `lib/engine/agents/writer.ts`
- `lib/engine/agents/styleSelector.ts`
- `lib/engine/agents/characterDesigner.ts`
- `lib/engine/agents/cinematographer.ts`
- `lib/engine/agents/painter.ts`
- `lib/engine/vision.ts`
- `lib/engine/voice.ts`

改业务行为时，必须确认这些文件是否仍在执行路径上。

### 新 agent-system 负责治理和逐步接管

`lib/engine/agent-system/` 当前负责：

- `AgentSkill`：记录 agent 职责、规则、禁区和策略段。
- `AgentContract`：记录 agent id、model role、输入输出 schema、prompt builder、parser、fallback。
- `AgentRegistry`：注册 9 个 agent 节点并提供 inventory。
- `AgentRuntime`：提供统一 `runAgent`、fallback handling 和基础日志。
- agent-owned fixtures：给每个 agent 建最小回归资产。
- 已迁移 parser/fallback：`freeform-classifier`、`vision`、`insert-beat`。

它当前已经参与部分运行路径：

| Agent | 参与方式 |
| --- | --- |
| StyleSelector | 通过 `runAgent` 接入统一 fallback 边界 |
| Cinematographer | 通过 contract / runtime pattern 接入 |
| Painter | 通过 contract / runtime pattern 接入，但仍保留 image-specific 行为 |
| Writer | 使用 `writerContract.buildMessages`，主流式协议仍在 `writer.ts` 和 `director.ts` |
| CharacterDesigner | 保留旧外部 API，内部阶段与 contract/fixtures 已纳入治理 |
| FreeformClassifier | parser/fallback 已迁入 agent-owned 文件 |
| Vision | parser/fallback 已迁入 agent-owned 文件 |
| InsertBeat | parser/fallback 已迁入 agent-owned 文件 |
| Voice / TTS | 目前主要是 contract metadata 和 fixture 治理 |

## 模型 API 对应

当前模型并不是每个 agent 写死一个 API，而是按 model role / provider config 调用。

| Model role | 主要节点 | 当前说明 |
| --- | --- | --- |
| text | Writer、StyleSelector、CharacterDesigner、Cinematographer、FreeformClassifier、InsertBeat | 走文本模型供应商配置 |
| image | CharacterDesigner、Painter | 角色肖像和场景图 |
| vision | Vision | 背景点击图像理解 |
| tts | CharacterDesigner、Voice / TTS | 音色准备与逐句合成 |

后续升级模型时，应按 agent 单独跑 fixture / eval，不要只做全局替换。

## 当前可接受的开发方式

### 改 Creative Engine 行为

如果要改“实际故事如何生成、Session 如何推进、Scene / Beat 如何返回”，优先检查：

- `lib/engine/orchestrator.ts`
- `lib/engine/director.ts`
- `lib/engine/agents/writer.ts`
- `lib/engine/stream/proseSplitter.ts`
- `lib/engine/context/index.ts`
- 相关 API route

然后同步更新本目录文档。

### 改某个 agent 的治理规则

如果要改“某个 agent 的职责、模型角色、fallback、parser、fixture”，优先检查：

- `lib/engine/agent-system/contracts.ts`
- `lib/engine/agent-system/skills.ts`
- `lib/engine/agent-system/registry.ts`
- `lib/engine/agent-system/agents/<agent>/`
- `scripts/test-agent-system.mjs`

然后同步更新 `docs/agent-system/`。

### 改 prompt

当前 prompt 仍分散在：

- `lib/engine/prompts.ts`
- `lib/engine/prompts/`
- 部分 historical runtime 文件
- `lib/engine/agent-system/contracts.ts` 中的 prompt builder 接口

改 prompt 时需要同时确认：

- 输出协议是否变化。
- parser 是否仍能解析。
- fallback 是否仍合理。
- fixture 是否需要更新。

## 不要误解

- `agent-system/` 不是创作者编辑系统。
- `AgentSkill` 不是给创作者填写的技能文档。
- Creator System 尚未实现。
- StoryProject / Studio / 可视化分支图仍属于后续产品层规划。
- 当前迁移目标是“在不破坏旧 runtime 的情况下，把 agent contract / parser / fallback / fixture 慢慢收拢”，不是一次性替换整个引擎。

## 下一步建议

在进入产品侧创作流程改造前，建议保持以下顺序：

1. 保持当前 runtime fallback 无乱码、无坏模板、无英文突兀降级。
2. 用本文档作为 Creative Engine 当前事实基线。
3. 产品侧先定义创作者可编辑资产：World Config、Character Config、Narrative Rules、Visual Style Config、Interaction Rules。
4. 再设计这些产品配置如何转换成 `Session` / `StoryState` / agent inputs。
5. 不让创作者直接编辑底层 agent contract、skill、parser、fallback。

## 验证命令

涉及 Creative Engine 或 Agent System 的变更，至少跑：

```bash
pnpm agent:inventory
pnpm agent:test
pnpm typecheck
```

涉及前端播放或 API route 时，再补：

```bash
pnpm lint
```
