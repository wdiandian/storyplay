# Creator Story Assistant

Status: MVP usable, section-skill governance in place.

`Creator Story Assistant` 是创作者后台里的产品层故事助手。它服务于 `StoryProject` 编辑体验，不是底层 `agent-system` runtime agent，也不会把内部 agent / skill / parser / fallback / prompt 配置开放给创作者编辑。

## 定位

- 帮助创作者补全、诊断、微调故事工程草稿。
- 以当前 `StoryProject` 为上下文，输出可预览的 `StoryProjectPatch`。
- 创作者确认后才应用到本地草稿，仍需点击“保存工程”落库。
- 和后续 Creator System 分开：Creator System 负责创作者创建流程和模板，本助手只负责后台编辑时的 AI 辅助。

## 非目标

- 不自动保存工程。
- 不直接发布 Story SKU。
- 不修改 `openingPackage`、`publish`、`generation`、`playtests`、`fixedRuntimePackages` 等运行或发布状态。
- 不允许模型写入图片 URL、图片状态、provider、model、key 等生成产物字段。
- 不开放内部 `agent-system` / `AgentSkill` / `AgentContract` 给创作者配置。

## 当前调用链

```text
Studio Project Editor
  app/[locale]/studio/projects/[projectId]/ProjectEditorClient.tsx
        |
        | POST current StoryProject draft + targetSection + conversation
        v
  app/api/studio/projects/[id]/assistant/route.ts
        |
        | quota / model routing / text model call
        v
  lib/creatorAssistant/runCreatorStoryAssistant.ts
        |
        | prompt -> parser -> safe patch
        v
  Creator reviews preview, then applies patch locally
```

## 侧边栏交互流程

侧边栏不是 agent 配置面板，而是创作者编辑时的工作流入口。当前流程固定为：

1. 选择要处理的板块
   - 对应 `creatorAssistantSkills` 中的一个 section skill。
   - 后端会按该 skill 限制 prompt、parser 和 patch root。
2. 选择这次要做什么
   - 展示当前 skill 的 `quickActions`。
   - 点击后只会填入本轮意图，不会直接改草稿。
3. 补充具体要求
   - 创作者可以说明保留项、修改方向、不要改的内容。
   - 主按钮生成建议卡片。
4. 审核建议卡片
   - 每张卡展示字段、修改理由、before/after。
   - 创作者可以单张应用、忽略、恢复已忽略，或一键应用未忽略建议。

`检查缺口` 是辅助工具，用于写完一轮后的体检和模型失败兜底，不是主创作路径。

## 代码分工

- `lib/creatorAssistant/types.ts`
  - 定义 assistant action、输入输出、conversation、suggestion、patch note、`StoryProjectPatch`。
  - 限制角色和资产 patch 的可写字段，避免模型伪造图片产物。
- `lib/creatorAssistant/skills/types.ts`
  - 定义产品层 assistant skill 的元数据结构。
- `lib/creatorAssistant/skills/registry.ts`
  - 当前创作助手的 section-skill 注册表。
  - 管理每个板块的 label、默认 action、可写字段、只读字段、允许 patch root、prompt guidance、quick actions。
- `lib/creatorAssistant/prompt.ts`
  - 根据当前 skill 构造模型 prompt。
  - 明确告诉模型只能返回当前 skill 允许的 patch root 和 editable fields。
  - 明确禁止返回资产 URL、图片状态、内部 agent/skill 配置。
- `lib/creatorAssistant/parser.ts`
  - 使用 `parseJsonLoose` 解析模型输出。
  - 对 patch 做字段级 allowlist 清洗。
  - 按当前 skill 的 `editableFields` 做 path 级过滤。
  - 删除模型输出中的资产 URL/status/provider/model/key 和角色 reference image URL/status。
- `lib/creatorAssistant/skillPatchFilter.ts`
  - 统一执行 skill patch 过滤。
  - 同时约束模型输出、本地诊断 fallback 和模型配置不可用 fallback。
  - 先按 `patchRootKeys` 限制 root，再按 `editableFields` 限制具体字段路径。
- `lib/creatorAssistant/mergePatch.ts`
  - 客户端保守合并器。
  - 只合并创作字段，保留 id、时间戳、发布状态、生成状态、试玩记录等系统字段。
  - 尊重 locked character。
  - 提供 patch diff preview。
- `lib/creatorAssistant/runCreatorStoryAssistant.ts`
  - 调用 text model。
  - 使用 `creator-story-assistant:<action>` tag 记录模型调用。
- `app/api/studio/projects/[id]/assistant/route.ts`
  - Studio 后台 API。
  - 读取已存工程，也允许前端传当前未保存草稿作为分析对象。
  - 使用 `loadEngineConfigForScenario("studio-assistant")`、quota、billing user 和 model route metadata。
  - 返回 `{ result }`，不保存。
- `app/[locale]/studio/projects/[projectId]/ProjectEditorClient.tsx`
  - 展示右侧悬浮创作助手。
  - 按当前板块 skill 展示快捷动作。
  - 支持对话式指令、诊断、生成预览。
  - 支持一键回填全部 patch，也支持按预览项单独回填。

## 当前 Skill

| Skill | 用途 | 主要可写范围 |
| --- | --- | --- |
| `project` | 全工程诊断和整体补强 | title、logline、synopsis、world、narrative、outline、characters、assets metadata、interaction、visual |
| `basics` | 基础信息和作品定位 | title、synopsis、audience、genres、moods、tags、narrative.protagonist、narrative.coreConflict |
| `world` | 世界观、规则、地点、调性 | world.setting、world.rules、world.locations、world.tone |
| `narrative` | 玩家视角、核心冲突、谜题、章节目标 | narrative.* |
| `outline` | 故事蓝图、主线目标、必达节点、护栏 | logline、storyOutline、structure |
| `characters` | 角色卡、关系、声音和参考图提示词 | characters 文本字段、referenceImagePrompt |
| `assets` | 素材槽位说明和生图提示词 | assets.id/kind/title/prompt/characterId/notes |
| `interaction` | 互动方式、选项密度、分支策略 | interaction.* |
| `visual` | 视觉风格和运行时风格指南 | visual.stylePrompt、runtimePolicy.styleGuide、interaction.visualGenerationMode |

`registry.ts` 是当前产品层创作助手的维护入口。新增板块或调整板块能力时，优先改注册表，再同步 prompt、parser 测试和 UI 文案。

## 字段安全边界

允许助手建议修改：

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
- `characters` 的文本字段和 `referenceImagePrompt`
- `assets` 的 `id`、`kind`、`title`、`prompt`、`characterId`、`notes`
- `interaction`
- `visual.stylePrompt`
- `runtimePolicy.orientation`
- `runtimePolicy.styleGuide`

禁止助手修改：

- `schemaVersion`
- `id`
- `createdAt`
- `updatedAt`
- `openingPackage`
- `generation`
- `publish`
- `playtests`
- `fixedRuntimePackages`
- `assets.url`
- `assets.status`
- `assets.provider`
- `assets.model`
- `assets.key`
- `characters.referenceImageUrl`
- `characters.referenceImageStatus`
- 内部 `agent-system` 文件
- 内部 skill 文档和 contract

图片 URL、生成状态、provider、model、key 只能由上传或生图接口产生，不能由文本模型补全产生。

## 与 agent-system 的关系

```text
Creator Story Assistant
  product-layer assistant in Creator Workspace
  edits StoryProject draft through approved patch
  section skills are UI/prompt governance metadata

agent-system
  internal governance layer for runtime creative agents
  maintains AgentSkill / AgentContract / AgentRegistry / AgentRuntime
  not editable by creators
```

当前阶段两者分开维护。未来如果需要统一治理，可以在不改变产品 API 的前提下，把 prompt、parser、fallback 和 contract 逐步迁移到 `agent-system`，但创作者仍然只看到产品层助手能力。

## 已落地优化

- 新增 section-skill registry，替代硬编码板块指导。
- API targetSection 校验改为基于 skill registry。
- prompt 按当前 skill 注入可写字段、只读字段、patch root 和快捷动作。
- parser 增加字段级清洗和 skill root + editable path 过滤。
- skill patch 过滤已升级为 path 级白名单，避免板块只允许 root 后误写同 root 下的其他字段。
- mergePatch 阻止模型写入伪造资产 URL/status/provider/model/key。
- mergePatch 阻止模型写入角色 reference image URL/status。
- 编辑器右侧助手改为当前板块专属快捷动作。
- patch preview 已升级为建议卡片，每张卡展示字段、修改理由、before/after，并支持应用或忽略。
- 建议卡片支持“恢复已忽略”，一键回填只应用未忽略的建议。
- 重点字段旁已增加局部 AI 优化入口，会自动设置 targetSection 和字段上下文。
- `diagnose` 已接入本地规则；模型失败时仍会返回基础诊断和保守 patch。
- 本地诊断 patch 也会经过当前 skill 的 path 级过滤，不会跨板块回填。
- 切换助手板块时会清空旧建议，避免把上一个板块的结果误认为当前板块结果。
- `scripts/test-creator-assistant.mjs` 覆盖 skill root/path 过滤、资产伪 URL 清洗、角色图片 URL 清洗。

## Roadmap

1. Skill fixtures
   - 为每个 skill 增加输入输出 fixture。
   - 测试 parser、skill root/path filtering、mergePatch、readonly field safety。
2. Playtest feedback
   - 将 `improve-playtest` 接入试玩记录摘要。
   - 输出可应用到 outline、interaction、characters 的小范围 patch。
3. UI maintenance
   - 持续排查历史隐藏助手 UI，避免后续维护时改一处漏一处。
   - 保持右侧助手作为主要入口，字段旁入口作为局部快捷入口。
4. Local diagnose expansion
   - 继续扩展本地诊断规则，覆盖简介过短、世界规则缺失、角色关系缺失、资产提示词缺失等问题。

## 验证命令

```bash
pnpm creator-assistant:test
pnpm typecheck
pnpm lint
```
