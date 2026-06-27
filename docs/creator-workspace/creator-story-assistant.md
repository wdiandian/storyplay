# Creator Story Assistant

Status: MVP implementation started.

`Creator Story Assistant` 是创作者后台里的产品层故事助手。它面向创作者编辑 `StoryProject`，不属于底层 `agent-system` 注册的 runtime agent，也不允许创作者编辑内部 `AgentSkill`、`AgentContract`、parser、fallback 或 prompt 基建。

## 目标

- 帮助创作者诊断故事工程缺口。
- 基于当前 `StoryProject` 草稿扩展概念、世界观、角色、故事大纲和试玩改进建议。
- 输出结构化建议和可选 `StoryProjectPatch`。
- 由创作者确认后应用到本地草稿，再通过已有“保存工程”动作落库。

## 非目标

- 不自动保存工程。
- 不直接发布 Story SKU。
- 不修改 `openingPackage`、`publish`、`generation`、`playtests` 等运行和发布状态。
- 不开放内部 agent / skill 给创作者编辑。
- 不替代后续 Creator System。Creator System 以后负责创作者自定义创建流程；本助手只是后台编辑体验的 AI 辅助入口。

## 当前入口

```text
Studio Project Editor
  app/[locale]/studio/projects/[projectId]/ProjectEditorClient.tsx
        |
        | POST current StoryProject draft
        v
  app/api/studio/projects/[id]/assistant/route.ts
        |
        | text model call
        v
  lib/creatorAssistant/runCreatorStoryAssistant.ts
```

## 代码文件

- `lib/creatorAssistant/types.ts`
  - 定义 action、输入、输出、suggestion、patch 和 patch note。
- `lib/creatorAssistant/prompt.ts`
  - 构建模型消息。
  - 明确要求 JSON only。
  - 明确禁止暴露或修改内部 agent / skill 基建。
- `lib/creatorAssistant/parser.ts`
  - 使用 `parseJsonLoose` 解析模型输出。
  - 清洗 summary、suggestions、patchNotes、nextActions 和 patch 外形。
  - 解析失败时返回可展示的 fallback 结果。
- `lib/creatorAssistant/mergePatch.ts`
  - 客户端可用的保守合并器。
  - 只允许合并创作字段。
  - 保留 `id`、时间戳、发布状态、试玩记录、生成状态等非创作字段。
  - 尊重 locked character。
- `lib/creatorAssistant/runCreatorStoryAssistant.ts`
  - 调用 text model。
  - 使用 `creator-story-assistant:<action>` tag 记录模型调用。
- `app/api/studio/projects/[id]/assistant/route.ts`
  - Studio 后台 API。
  - 读取已存工程，也允许前端传当前未保存草稿作为分析对象。
  - 返回 `{ result }`，不保存。
- `app/[locale]/studio/projects/[projectId]/ProjectEditorClient.tsx`
  - 展示助手面板。
  - 支持输入创作者指令。
  - 支持运行 action。
  - 支持手动“应用建议”到本地草稿。

## MVP actions

| Action | 用途 | 是否改草稿 |
| --- | --- | --- |
| `diagnose` | 检查故事工程缺口、跑偏风险、试玩前阻塞点 | 通常只给建议，少量 patch |
| `expand-concept` | 扩展概念、世界观、冲突、标签、视觉方向 | 可生成 patch |
| `build-outline` | 生成主线目标、阶段大纲、必达节点、章节规划 | 可生成 patch |
| `create-characters` | 生成或补强角色卡 | 可生成 patch，但不能覆盖 locked character |
| `improve-playtest` | 基于试玩记录改进草稿 | 预留入口 |

## 数据边界

助手可建议修改：

- `title`
- `logline`
- `synopsis`
- `audience`
- `genres`
- `moods`
- `tags`
- `world`
- `narrative`
- `storyOutline`
- `structure.acts`
- `characters`
- `interaction`
- `visual`
- `runtimePolicy.orientation`
- `runtimePolicy.styleGuide`

助手不可修改：

- `schemaVersion`
- `id`
- `createdAt`
- `updatedAt`
- `openingPackage`
- `generation`
- `publish`
- `playtests`
- 内部 `agent-system` 文件
- 内部 skill 文档

## 与 agent-system 的关系

```text
Creator Story Assistant
  product-layer assistant in Creator Workspace
  edits StoryProject draft through approved patch

agent-system
  internal governance layer for runtime creative agents
  maintains AgentSkill / AgentContract / AgentRegistry / AgentRuntime
```

当前阶段两者分开维护。未来如果 Creator Story Assistant 需要纳入统一治理，可以在不改变产品 API 的前提下，把 prompt、parser、fallback 和 contract 迁移到 `agent-system`，但创作者仍然只看到产品层助手能力，不看到内部 skill 或 agent 配置。

## 后续迭代

1. 增加本地 heuristic diagnose，在模型不可用时仍能给出基础诊断。
2. 给 `StoryProjectPatch` 增加 fixture 测试，覆盖 locked character、发布状态保留、acts/scenes 合并。
3. 将 `improve-playtest` 接入更完整的试玩反馈摘要。
4. 在 UI 中增加 patch diff 预览，而不是只展示 patch notes。
5. 后续 Creator System 设计完成后，再决定是否开放创作者自己的“创建流程模板”，但不开放内部 agent / skill 编辑。
