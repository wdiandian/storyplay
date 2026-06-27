# StoryPlay Agent System Refactor Plan

> Status: Roadmap / Current Progress.
>
> 本文既包含当前已落地状态，也保留了早期分阶段重构方案。执行开发时优先看“当前落地状态”和“R1/R2 当前执行状态”；后半部分的 Phase 0-5 属于历史迁移路线，不能当作当前待办重复执行。

## 目标

当前项目的智能体已经能跑，但维护边界不清晰：

- agent 代码、prompt、输入输出协议、降级逻辑混在一起。
- 有些能力是正式 agent，有些是散落在 orchestrator / prompts 里的模型调用。
- prompt 有分段能力，但只有 Writer 做得相对系统，其他 agent 仍是大字符串。
- 缺少统一的 agent contract，后续要升级模型、换 prompt、做内部评估和灰度都会困难。

这次重梳理的目标不是推倒重写，而是做到：

1. 保证现有 5 个正式 agent 和 4 个能力节点继续可用。
2. 每个 agent 都有清晰的职责、输入、输出、模型角色和降级策略。
3. prompt / skill 可版本化、可测试、可灰度替换。
4. agent / skill 明确作为项目内部基建维护，不暴露给创作者编辑。

## 当前落地状态

截至本轮整理，agent / skill 已明确定位为项目内部基建，不进入创作者可编辑系统。创作者创建系统后续单独梳理，不能直接编辑 agent contract、skill、prompt protocol 或 provider fallback。

已完成：

- Phase 1：建立 `lib/engine/agent-system/`，包含 9 个 agent 节点的 contract、skill、registry 和 inventory 脚本。
- Phase 2：StyleSelector、FreeformClassifier、Vision、InsertBeat 已接入统一 `runAgent` 边界，保留原 API 行为。
- Phase 3：Cinematographer 和 Painter 已接入统一 runtime / contract pattern；Cinematographer 的消息构造与解析兜底进入 contract，Painter 保持 image agent，不伪装成 text agent，并保留 referenceImages -> text-to-image 的原降级路径。
- Phase 4：CharacterDesigner 已按内部阶段拆为 card design、portrait render、voice resolver；外部 `designCharacterCard`、`renderCharacterPortrait`、`provisionCharacterVoice` 接口保持稳定，Director 调度不变。
- Phase 5：Writer 已接入 `writerContract.buildMessages`，保留现有 `chatStream`、`routeTaggedStream`、`<plan>/<story>/<choices>` 协议和 Director 流式调度；最小 fallback plan 归入 Writer 模块。

新增验证入口：

```bash
pnpm agent:inventory
pnpm agent:test
```

后续阶段进入收尾治理：把 agent-system 下的 schema/parser/fallback 继续拆成按 agent 聚合的文件，并补更多 fixture / golden eval。创作者创建系统仍另行设计，不直接暴露 agent / skill。

## Agent 作为项目级板块维护

从当前阶段开始，Agent System 不再被视为一次性的重构任务，而是 StoryPlay / Infiplot 的一个长期维护板块。它和前端体验、创作者系统、模型供应商接入、数据持久化一样，需要独立规划、独立验证、独立迭代。

这个板块的维护边界是：

- 负责内部 agent contract、skill、prompt protocol、parser、fallback、runtime、registry、测试和评估。
- 负责各 agent 与模型 API 的映射、版本升级、灰度策略和回滚策略。
- 负责研发/运营可见的调试能力，包括 agent run trace、耗时、fallback、模型输出、解析结果和错误。
- 不直接暴露给创作者编辑。
- 不把创作者配置系统和 agent/skill 系统混为一层。创作者配置是产品层输入，agent/skill 是内部执行基建。

### 后续 Roadmap

| 阶段 | 板块 | 目标 | 产出 |
| --- | --- | --- | --- |
| R1 | 结构治理 | 把集中式 `contracts.ts` / `skills.ts` 拆成按 agent 聚合的目录 | `agent-system/agents/{agent}/contract.ts`、`skill.ts`、`parser.ts`、`fallback.ts`、`fixtures/` |
| R2 | 测试资产 | 为每个 agent 建 schema test、fixture test、golden eval | 可在 prompt / model 升级前跑回归 |
| R3 | 运行观测 | 建结构化 agent run trace | 记录 agentId、modelRole、inputSummary、rawOutput、parsedOutput、fallback、duration、error |
| R4 | 版本治理 | 给 skill / prompt / contract / parser 建版本策略 | 支持内部灰度、A/B test、快速回滚 |
| R5 | 创作者创建系统衔接 | 定义创作者配置如何被内部 agent 消费 | World Config、Character Config、Narrative Rules、Visual Style Config、Interaction Rules |
| R6 | 内部调试面板 | 给研发/运营查看 agent 运行状态 | agent runs、模型、成本、耗时、fallback、image refs、TTS provider |
| R7 | 模型升级策略 | 按 agent 单独升级模型 | Writer、CharacterDesigner、Painter、Vision、Voice 分角色验证 |
| R8 | 评估闭环 | 建持续 eval 和质量评分 | schema pass rate、fallback rate、耗时、成本、角色一致性、场景连续性 |

### R1：结构治理

目标结构：

```text
lib/engine/agent-system/
  runtime/
    agentRuntime.ts
    telemetry.ts
    modelRouter.ts

  registry.ts
  types.ts

  agents/
    writer/
      contract.ts
      skill.ts
      parser.ts
      fallback.ts
      fixtures/

    character-designer/
      contract.ts
      skill.ts
      parser.ts
      fallback.ts
      fixtures/

    painter/
      contract.ts
      skill.ts
      prompt.ts
      fallback.ts
      fixtures/
```

优先顺序：

1. Writer
2. CharacterDesigner
3. Painter
4. Cinematographer
5. Vision / FreeformClassifier / InsertBeat / StyleSelector / Voice

### R2：测试资产

每个 agent 至少维护三类测试：

- Schema Test：只测 parser / fallback / contract，不调用真实模型。
- Fixture Test：固定输入和 mock 输出，验证 agent 行为。
- Golden Eval：少量真实模型调用，用规则或人工评分评估质量。

关键测试示例：

- Writer：`<plan>` 缺字段修复、`<story>` 空内容 fallback、`<choices>` 非法结构降级。
- CharacterDesigner：非 JSON 降级为空卡、StepFun voice id 非法丢弃、portrait 失败不阻塞主流程。
- Painter：reference priority 稳定、mock image 稳定、reference 失败后 text-to-image。
- Vision / FreeformClassifier：不确定分类默认 `insert-beat`。

### R1/R2 当前执行状态

当前阶段已经开始落地结构治理和测试资产，但刻意不改变业务行为：

- 已新增 `lib/engine/agent-system/agents/` 作为后续按 agent 聚合维护的根目录。
- 9 个 agent 均已建立目录与 `README.md`，明确它们是内部基建，不给创作者编辑。
- 已新增 `agent-system/agents/README.md` 作为目录索引，记录每个 agent 当前 runtime 位置和 fixture 状态。
- 已新增第一批 fixture：
  - `writer/fixtures/plan-missing-fields.json`
  - `style-selector/fixtures/fallback-runtime.json`
  - `character-designer/fixtures/invalid-json.json`
  - `cinematographer/fixtures/empty-output-fallback.json`
  - `painter/fixtures/reference-priority.json`
  - `vision/fixtures/contract-metadata.json`
  - `vision/fixtures/invalid-classify-fallback.json`
  - `freeform-classifier/fixtures/contract-metadata.json`
  - `freeform-classifier/fixtures/invalid-classify-fallback.json`
  - `insert-beat/fixtures/contract-metadata.json`
  - `insert-beat/fixtures/empty-output-fallback.json`
  - `insert-beat/fixtures/pov-line-delivery.json`
  - `voice/fixtures/contract-metadata.json`
- `scripts/test-agent-system.mjs` 已开始读取这些 fixture，用固定资产验证 parser / fallback / reference priority / contract metadata。
- `freeform-classifier` 已完成第一步行为迁移：`parseFreeformClassifyOutput` 和 `fallbackFreeformClassify` 已进入 `agent-system/agents/freeform-classifier/parser.ts`，`orchestrator.ts` 只负责调用模型和串联 runtime。
- `vision` 已完成第一步行为迁移：`parseVisionOutput` 和 `fallbackVisionInterpretation` 已进入 `agent-system/agents/vision/parser.ts`，`vision.ts` 只负责 vision provider 调用和 runtime 串联。
- `insert-beat` 已完成第一步行为迁移：`parseInsertBeatOutput` 和 `fallbackInsertBeatPartial` 已进入 `agent-system/agents/insert-beat/parser.ts`，`director.ts` 只负责 insert-beat 模型调用和 runtime 串联。

当前仍保持的边界：

- `contracts.ts` 和 `skills.ts` 暂时仍是统一出口，避免一次性迁移影响现有导入。
- 现有 runtime 实现仍留在 `lib/engine/agents/*`、`vision.ts`、`voice.ts`、`director.ts`、`orchestrator.ts`。
- `/api/start`、`/api/scene`、Writer `<plan>/<story>/<choices>`、Painter reference 降级、CharacterDesigner 外部函数都不改行为。

下一步建议：

1. 从低风险 agent 开始，把 parser / fallback / prompt helper 逐步搬入对应 agent 目录。
2. 每搬一个 agent，就把 contract metadata fixture 升级为行为 fixture。
3. 每次迁移后确认 `pnpm agent:test`、`pnpm typecheck` 通过。

### R3：运行观测

后续 agent run trace 建议结构：

```ts
type AgentRunTrace = {
  runId: string;
  agentId: AgentId;
  modelRole: ModelRole;
  inputSummary: string;
  rawOutput?: unknown;
  parsedOutput?: unknown;
  fallbackUsed: boolean;
  durationMs: number;
  error?: unknown;
};
```

第一版可以只输出到 console / markdown report，不急着进数据库。等调试面板和运营分析需要稳定数据后，再接入持久化。

### R4：版本治理

建议后续把版本粒度拆清：

```text
writer.skill.v1
writer.prompt.v1
writer.contract.v1
writer.parser.v1
```

版本治理目标：

- 单 agent 升级，不牵动全链路。
- prompt / model 可灰度。
- 失败可回滚。
- eval 可以比较不同版本的 schema pass、fallback rate、延迟和质量分。

### R5：创作者创建系统衔接

创作者系统不编辑 agent / skill。创作者能编辑的是产品层配置：

```text
World Config
Character Config
Narrative Rules
Visual Style Config
Interaction Rules
Asset References
```

内部 agent 消费这些配置，但创作者不能直接改：

```text
Agent Contract
Skill Protocol
Fallback Logic
Model Routing
Parser
System Prompt Hard Rules
```

这条边界必须长期保持，否则创作者系统会和内部执行基建耦合，后续模型升级、灰度、风控和回滚都会变困难。

### R6-R8：长期能力

R6 内部调试面板面向研发/运营，不面向普通创作者。它应该展示本次 scene 使用了哪些 agent、每个 agent 的耗时、fallback、raw output、parsed output、image refs、TTS provider、token 和成本信息。

R7 模型升级必须按 agent 分开验证：

| Agent | 升级关注点 |
| --- | --- |
| Writer | 长文本、结构遵守、风格稳定 |
| CharacterDesigner | JSON 稳定、角色差异化 |
| Cinematographer | 英文构图 prompt 质量 |
| Painter | reference 支持、出图质量 |
| Vision | 点击理解准确率 |
| Voice | 稳定性、成本、延迟 |

R8 评估闭环的核心指标：

- schema pass rate
- fallback rate
- 平均耗时
- 平均成本
- 角色一致性
- 场景连续性
- 文风稳定性
- 用户动作响应准确率

短期优先级：先做 R1 + R2。只有结构和测试资产稳定后，创作者创建系统、调试面板、模型升级和版本灰度才不会继续制造维护债。

## 一句话方案

把现在的“散落式 agent 代码”升级为：

```text
Agent Contract
  ↓
Agent Runtime
  ↓
Prompt / Skill Registry
  ↓
Agent Implementations
  ↓
Evaluation Fixtures
```

每个智能体都必须有一份 contract，一份 prompt/skill，一组输入输出 schema，一组 fixture 测试。

## 1. 现状问题

### 1.1 Agent 边界不一致

正式 agent 在：

```text
lib/engine/agents/
```

但实际 AI 能力还散落在：

```text
lib/engine/orchestrator.ts
lib/engine/director.ts
lib/engine/vision.ts
lib/engine/voice.ts
lib/engine/prompts.ts
```

结果是：

- 不看全局代码，很难知道到底有多少 agent。
- 新增一个 agent 没有标准做法。
- prompt 和调用逻辑耦合，后续要改很容易误伤。

### 1.2 Prompt 管理不统一

Writer 已经有 segment registry：

```text
lib/engine/prompts/segments/writer/
lib/engine/prompts/registry.ts
lib/engine/prompts/builder.ts
```

但其他 agent 的 prompt 仍大多集中在：

```text
lib/engine/prompts.ts
```

这导致：

- Writer 可维护性相对好。
- CharacterDesigner、Cinematographer、Vision、InsertBeat 的 prompt 不好分段。
- 很难做内部边界控制：哪些是系统协议，哪些是可由研发调整的创作策略。
- 很难做版本对比和 prompt 实验。

### 1.3 输出协议靠 prompt 约束，不够显性

现在不少 agent 要求“必须输出 JSON”，但协议主要写在 prompt 里。

问题：

- prompt 改坏后，schema 不一定能及时发现。
- schema、修复逻辑、fallback 分散在不同文件。
- 不利于后续做调试面板：看不到“这个 agent 应该输出什么”。

### 1.4 缺少 Agent 级测试与评估

目前测试更多偏流程能否跑通，缺少：

- 每个 agent 的固定输入 fixture。
- 输出 schema 校验。
- 关键行为断言。
- prompt 改动前后对比。
- 成本、延迟、失败率指标。

### 1.5 内部创作策略与系统协议没有隔离

agent / skill 不给创作者编辑，但内部维护时仍要区分两类内容。

内部创作策略包括：

- 文风
- 节奏
- 角色差异化规则
- 镜头偏好
- 画面留白规则

系统协议包括：

- JSON schema
- POV 硬规则
- `sceneKey` 协议
- `storyState` 协议
- 安全降级规则

现在这些混在 prompt 字符串里，研发改动时很难判断风险等级，也不利于测试和灰度。

## 2. 目标架构

建议新增一层统一 agent 目录：

```text
lib/engine/agent-system/
  contracts/
    writer.contract.ts
    style-selector.contract.ts
    character-designer.contract.ts
    cinematographer.contract.ts
    painter.contract.ts
    vision.contract.ts
    freeform-classifier.contract.ts
    insert-beat.contract.ts
    voice.contract.ts

  skills/
    writer.skill.ts
    style-selector.skill.ts
    character-designer.skill.ts
    cinematographer.skill.ts
    painter.skill.ts
    vision.skill.ts
    freeform-classifier.skill.ts
    insert-beat.skill.ts
    voice.skill.ts

  runtime/
    agentRuntime.ts
    modelRouter.ts
    outputParser.ts
    fallback.ts
    telemetry.ts

  registry.ts
  types.ts
```

原来的 `lib/engine/agents/` 暂时保留，但逐步改成调用新 agent-system。

## 3. Agent Contract 设计

每个 agent 必须定义一个 contract。

示例：

```ts
export type AgentId =
  | "writer"
  | "style-selector"
  | "character-designer"
  | "cinematographer"
  | "painter"
  | "vision"
  | "freeform-classifier"
  | "insert-beat"
  | "voice";

export type ModelRole = "text" | "image" | "vision" | "tts" | "none";

export type AgentContract<TInput, TOutput> = {
  id: AgentId;
  name: string;
  kind: "llm" | "image" | "vision" | "tts" | "pure";
  modelRole: ModelRole;
  inputSchema: unknown;
  outputSchema: unknown;
  buildMessages?: (input: TInput) => ChatMessage[];
  buildPrompt?: (input: TInput) => string;
  parseOutput?: (raw: string, input: TInput) => TOutput;
  fallback: (input: TInput, error: unknown) => TOutput | Promise<TOutput>;
};
```

核心原则：

- Agent 的输入输出必须独立定义。
- Prompt 只负责表达任务，不负责隐藏协议。
- 解析和 fallback 归 contract 管。
- 调用模型归 runtime 管。

## 4. Skill 文档结构

每个 agent 的 skill 应该是结构化对象，不只是一段 prompt。

建议结构：

```ts
export type AgentSkill = {
  id: string;
  agentId: AgentId;
  version: string;
  name: string;
  role: string;
  goal: string;
  inputs: string[];
  outputs: string;
  rules: SkillRule[];
  mustNot: SkillRule[];
  strategySections: SkillSection[];
  protocolSections: SkillSection[];
};

export type SkillSection = {
  id: string;
  title: string;
  content: string;
  owner: "engineering" | "narrative-design" | "system";
  risk: "low" | "medium" | "high" | "protocol";
};

export type SkillRule = {
  id: string;
  text: string;
  severity: "advisory" | "required" | "hard";
};
```

这样后续可以做到：

- 内部查看 skill。
- 研发清楚哪些是 `strategySections`，哪些是 `protocolSections`。
- 改动高风险协议前必须补 schema / fixture 测试。
- 每个 section 独立版本化。

## 5. Prompt 分层

每个 agent 的 prompt 分成 4 层：

```text
System Protocol Layer
  系统协议，高风险，必须由研发维护

Task Skill Layer
  agent 身份、目标、专业规则，内部迭代维护

Project Context Layer
  当前故事工程 / Session 注入

Runtime Instruction Layer
  当前这次调用的具体任务
```

以 Writer 为例：

```text
System Protocol
  - 必须输出 <plan> <story> <choices>
  - JSON 字段协议
  - 玩家 POV 硬规则

Task Skill
  - 文风
  - 对白准则
  - 节奏
  - 叙事质量规则

Project Context
  - worldSetting
  - styleGuide
  - storyState
  - history
  - characters

Runtime Instruction
  - 现在请生成下一幕
  - 承接刚才的 exit / nextSceneSeed
```

第一阶段只需要在代码里把层级拆清楚，暂时不需要 UI。

## 6. 目录迁移建议

### 当前

```text
lib/engine/prompts.ts
lib/engine/prompts/segments/writer/*
lib/engine/agents/*
lib/engine/vision.ts
lib/engine/voice.ts
```

### 目标

```text
lib/engine/agent-system/
  agents/
    writer/
      contract.ts
      skill.ts
      prompt.ts
      parser.ts
      fallback.ts
      fixtures/
    character-designer/
      contract.ts
      skill.ts
      prompt.ts
      parser.ts
      fallback.ts
      fixtures/
    cinematographer/
      ...
```

更推荐按 agent 聚合，而不是按 prompt / parser / fallback 分散：

```text
agent-system/agents/writer/*
agent-system/agents/character-designer/*
```

这样维护某个 agent 时，所有相关文件在一个目录里。

## 7. 各 Agent 的重梳理策略

### 7.1 Writer

保留当前 segment 机制，但补 contract。

要做：

- 把 `<plan>` schema 显性化。
- 把 `<choices>` schema 显性化。
- 把 `<memory>` schema 显性化。
- 把 prose splitting 前后的结构写进 contract。
- 把 storyBible 只在开局产出的规则放进 protocol section。
- 把文风、对白、节奏、感官描写放进 strategy section。

不建议第一阶段改：

- Writer 单次流式输出机制。
- `<plan> -> <story> -> <choices>` 三段协议。

### 7.2 StyleSelector

这是最轻的 agent，可以作为改造样板。

要做：

- 定义输入：`worldSetting`、可选风格列表。
- 定义输出：`styleKey` 或 `styleGuide`。
- 输出 schema：必须匹配 `STYLE_MAP`。
- fallback：吉卜力。

它适合第一个迁移，因为风险低。

### 7.3 CharacterDesigner

这是最需要重构的 agent 之一。

问题：

- 同时处理视觉卡、音色卡、StepFun voice id。
- 后面又接图像生成和 TTS provision。
- 职责容易膨胀。

建议拆成内部阶段，但保留外部 agent 名：

```text
CharacterDesigner
  ├─ CharacterCardDesigner（TEXT）
  ├─ CharacterPortraitRenderer（IMAGE）
  └─ CharacterVoiceResolver（TTS / pure）
```

外部仍叫 `CharacterDesigner`，这样不破坏现有流水线。

要做：

- 视觉卡 schema。
- 音色卡 schema。
- StepFun voice id schema。
- 角色差异化规则独立成 strategy section。
- TTS provider 差异独立成 protocol section。

### 7.4 Cinematographer

要从 `prompts.ts` 里拆出来。

要做：

- 定义 `CinematographerInput`。
- 定义 `CinematographerOutput`。
- 镜头策略拆成 skill section。
- 玩家 POV 规则锁死。
- 输出必须英文。
- fallback prompt 显性化。

适合第二批迁移。

### 7.5 Painter

Painter 不是 LLM agent，而是 image agent。

要做：

- 明确它的 contract 是 `image` kind。
- Prompt builder 独立。
- Reference priority 独立成可测试函数。
- UI 留白规则放进 strategy section。
- 禁止文字/UI/玩家身体属于 protocol section。

不要把 Painter 伪装成 text agent。

### 7.6 Vision

Vision 当前在 `lib/engine/vision.ts`，应该纳入 agent registry。

要做：

- 输入：annotated image + scene。
- 输出：`freeformAction`、`classify`、`reasoning`。
- 分类 schema：`insert-beat | change-scene`。
- 点击判断规则独立成 skill。

### 7.7 FreeformClassifier

当前写在 orchestrator。

要做：

- 从 orchestrator 挪到 agent-system。
- 输入：玩家文本 + 当前 scenePrompt。
- 输出：`insert-beat | change-scene`。
- 默认偏向 `insert-beat`。

### 7.8 InsertBeat

当前 prompt 在 `prompts.ts`，调用在 `director.ts`。

要做：

- 定义输出 partial beat schema。
- 明确不允许新角色。
- 明确不换图、不换场景。
- 文本长度和 speaker 规则写进 locked section。

### 7.9 Voice / TTS

Voice 不是 LLM agent，但需要 contract。

要做：

- 区分 provision 和 synthesize。
- 明确 Xiaomi / StepFun 的 provider 差异。
- 统一超时、失败、静音降级。
- 不让上层知道过多 provider 细节。

## 8. Agent Runtime

建议新增统一 runtime：

```ts
async function runAgent<TInput, TOutput>(
  config: EngineConfig,
  contract: AgentContract<TInput, TOutput>,
  input: TInput,
  options?: RunAgentOptions,
): Promise<AgentRunResult<TOutput>> {
  const startedAt = Date.now();
  try {
    const raw = await callModelByRole(config, contract, input, options);
    const output = contract.parseOutput
      ? contract.parseOutput(raw, input)
      : raw as TOutput;
    return {
      ok: true,
      agentId: contract.id,
      output,
      raw,
      durationMs: Date.now() - startedAt,
    };
  } catch (error) {
    const fallback = await contract.fallback(input, error);
    return {
      ok: false,
      agentId: contract.id,
      output: fallback,
      error,
      durationMs: Date.now() - startedAt,
    };
  }
}
```

收益：

- 统一 telemetry。
- 统一错误处理。
- 统一 fallback。
- 统一调试日志。
- 未来调试面板可以直接展示每次 agent run。

## 9. 测试与评估

每个 agent 至少有三类测试。

### 9.1 Schema Test

不调用真实模型，只测试 parser 和 fallback。

例：

- Writer plan 少字段能否补默认值。
- CharacterDesigner 输出非法 JSON 是否降级。
- Cinematographer 空输出是否 fallback。
- Vision 分类非法值是否归一到 `insert-beat`。

### 9.2 Fixture Test

固定输入，允许 mock 模型输出，验证完整 agent 行为。

目录：

```text
agent-system/agents/writer/fixtures/opening-romance.json
agent-system/agents/vision/fixtures/click-door.json
agent-system/agents/insert-beat/fixtures/talk-to-npc.json
```

### 9.3 Golden Eval

少量真实模型调用，人工或规则评分。

指标：

- schema 合格率
- 是否遵守 POV
- 是否引入未注册角色
- 是否输出 UI 文本到图像 prompt
- 角色差异度
- 场景连续性
- 平均延迟
- 平均成本

第一版不需要复杂平台，先用脚本输出 markdown 报告即可。

## 10. 调试面板建议

后续 `/play` 或 `/studio` 调试抽屉应显示：

```text
Agent Runs
  - Writer
    input summary
    raw output
    parsed output
    fallback?
    duration
    model
  - CharacterDesigner
  - Cinematographer
  - Painter
  - Vision / InsertBeat ...
```

这能极大降低 prompt 调试成本。

## 11. 迁移路线

### Phase 0：冻结现状

目标：不动逻辑，补文档和清单。

已完成：

- [skills.md](skills.md)
- [../creative-engine/creative-path-visual.html](../creative-engine/creative-path-visual.html)

还需要：

- 补 agent inventory JSON。
- 标记哪些 prompt section 属于 strategy，哪些属于 protocol。

### Phase 1：建立 Contract 与 Registry

目标：先不改调用，只定义结构。

任务：

1. 新建 `lib/engine/agent-system/types.ts`。
2. 新建 `registry.ts`。
3. 给 9 个节点写 contract 壳。
4. 给 9 个节点写 skill 壳。
5. 不接入现有流程。

验收：

- TypeScript 能编译。
- 文档能从 registry 生成 agent 列表。

### Phase 2：迁移低风险 Agent

先迁移：

1. StyleSelector
2. FreeformClassifier
3. Vision
4. InsertBeat

原因：

- 逻辑简单。
- 输出 schema 小。
- 对主生成链路影响较小。

验收：

- 行为与现状一致。
- API route 不变。
- 有 schema test。

### Phase 3：迁移视觉链路

迁移：

1. Cinematographer
2. Painter

验收：

- 同样的输入能生成同结构输出。
- reference priority 有单元测试。
- image provider 路径不变。

### Phase 4：迁移 CharacterDesigner

拆内部阶段：

```text
CharacterCardDesigner
CharacterPortraitRenderer
CharacterVoiceResolver
```

验收：

- 角色卡输出 schema 合格。
- StepFun voice id 校验保留。
- Xiaomi / StepFun 路径都能降级。
- 肖像失败不阻塞主流程。

### Phase 5：迁移 Writer

最后迁移 Writer，因为它是核心且风险最高。

要做：

- 保留现有 segment registry。
- 给 Writer 补 contract。
- 把 parser / fallback 从 `writer.ts` 中逐步分离。
- 给 `<plan>`、`<choices>`、`<memory>` 建 schema。

验收：

- 首幕生成正常。
- 下一幕生成正常。
- streaming plan 截获仍正常。
- proseSplitter 行为不变。

## 12. 风险控制

### 不要一次性改动的东西

- 不要改 Writer 的三段输出协议。
- 不要改 `/api/start`、`/api/scene` 的外部响应结构。
- 不要改 `Session` 结构。
- 不要同时迁移模型 client。
- 不要在第一版引入数据库版本管理。

### 必须保留的降级行为

- Writer 失败时 fallback beat。
- CharacterDesigner 肖像失败不阻塞。
- TTS 失败静音。
- Painter reference 失败后纯文本生图。
- Vision / Freeform 分类不确定时偏向 `insert-beat`。

## 13. 推荐优先级

最高优先级：

1. Agent inventory + registry。
2. Skill 分层，明确 strategy / protocol。
3. Schema test。
4. 调试日志统一。

中优先级：

1. 迁移 StyleSelector / Vision / Freeform / InsertBeat。
2. 迁移 Cinematographer / Painter。
3. 引入 agent run trace。

低优先级：

1. Prompt A/B test。
2. 内部 skill 版本管理 UI。
3. 多版本发布。
4. 数据库存储 agent skill 版本。

## 14. 最小可执行版本

如果只做一周内能落地的最小版本，建议做：

```text
Day 1
  - 新建 agent-system/types.ts
  - 定义 AgentId / AgentSkill / AgentContract

Day 2
  - 写 9 个 agent skill 壳
  - 写 registry

Day 3
  - 把 StyleSelector 接入新 runtime
  - 加 schema test

Day 4
  - 把 FreeformClassifier / Vision 接入新 runtime
  - 加 fixture test

Day 5
  - 把 InsertBeat 接入新 runtime
  - 加 agent run trace 日志
```

这一版不会动主生成链路最危险的 Writer / Painter，但会建立后续所有 agent 迁移的标准。

## 15. 最终形态

最终希望每个 agent 都能这样被查看和维护：

```text
Agent: Writer
Version: writer.skill.v3
Model role: text
Strategy sections:
  - 文风
  - 对白
  - 节奏
Protocol sections:
  - 输出格式
  - POV 规则
  - storyState 协议
Tests:
  - schema pass
  - fixture pass
  - golden eval 8.2/10
Runtime:
  - avg latency 12.4s
  - fallback rate 1.7%
```

这样 StoryPlay 才能从“能跑的多 agent prompt 工程”，升级成“可维护、可调试、可产品化的创作引擎”。
