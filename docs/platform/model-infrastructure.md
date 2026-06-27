# 模型基建规划

状态：规划中。

本文定义 StoryPlay 的模型平台方向。目标是支持两种产品模式：

1. 官方托管模型：用户无需配置 API Key，直接使用平台提供的模型能力，平台承担供应商成本，并按点数 / 次数 / 额度向用户计费。
2. BYOK 模式：高级用户使用自己的模型 Key。请求消耗用户自己的供应商额度，不消耗平台官方模型预算。

这份文档是后续模型路由、用量记录、计费、供应商 Key、可观测性和后台运营控制的规划基线。

## 当前状态

当前运行时有四个模型域：

| 模型域 | 当前配置 | 主要使用方 |
| --- | --- | --- |
| Text | `TEXT_BASE_URL`, `TEXT_API_KEY`, `TEXT_MODEL`, `TEXT_PROVIDER` | Writer, StyleSelector, CharacterDesigner, Cinematographer, FreeformClassifier, InsertBeat |
| Image | `IMAGE_BASE_URL`, `IMAGE_API_KEY`, `IMAGE_MODEL`, `IMAGE_PROVIDER` | 角色肖像、场景图 |
| Vision | `VISION_BASE_URL`, `VISION_API_KEY`, `VISION_MODEL`, `VISION_PROVIDER` | 背景点击理解、参考图画风解析 |
| TTS | `TTS_BASE_URL`, `TTS_API_KEY`, `TTS_SPEECH_MODEL` | 对白语音 |

生产路径通过 `lib/config.ts` 读取服务端环境变量。

BYOK 路径已经有部分实现：

- `components/SettingsModal.tsx` 允许用户填写 text / image / vision / TTS 配置。
- `lib/clientModelConfig.ts` 把模型配置保存在 localStorage。
- `lib/engineClient.ts` 在本地存在 BYOK 配置时走客户端引擎，否则回退到服务端 API。
- `app/api/llm/user-proxy/route.ts` 和 `lib/byoProxy.ts` 提供用户自带 Key 的 CORS 代理兜底。

当前主要缺口：

- 官方模式和 BYOK 模式已经有显式 `modelMode`，但还没有用户可见的余额 / 点数体系。
- `TEXT_MODEL` 粒度过粗，所有文本 agent 共用一个模型。
- 官方模式已有第一版 usage 事件日志，但还没有持久化到数据库，也还没有真正扣费。
- 后台成本控制、限流、灰度、降级还没有统一基建。

## 四个核心模型域

平台第一阶段只暴露四个核心模型域。它们是产品和基础设施边界，不代表每个内部 agent 都应该单独配置一个模型。

| 模型域 | 作用 | 第一阶段状态 |
| --- | --- | --- |
| Text | 剧情、对白、选择、轻量规划、分类、提示词生成 | 必需 |
| Image | 场景背景图、角色肖像 | 必需 |
| Vision | 理解已有图片，主要用于背景点击和参考图画风解析 | 增强功能 |
| TTS | 对白语音合成 | 增强功能 |

第一阶段商业化模型平台应先围绕这四个域优化，不要过早做过细的 per-agent 模型配置。内部 agent 的保留、合并或扩展，应根据产品价值决定，而不是因为每个 agent 都可以单独配模型。

建议 MVP 暴露方式：

```text
官方模式：
  TEXT
  IMAGE
  VISION 可选
  TTS 可选

BYOK 模式：
  用户可以分别配置 text / image / vision / tts
```

## Agent 去留与合并判断

问题不只是“某个功能用哪个模型”，更重要的是：这个 agent 是否值得作为独立运行步骤继续存在。

### 文本运行时 Agent

| Agent / 步骤 | 当前职责 | 建议 | 原因 |
| --- | --- | --- | --- |
| Writer | 输出 `<plan>`、故事正文、选择、记忆更新 | 保留并增强 | 这是核心产品大脑，应负责叙事连续性、可播放 beat、场景出口和 story state。 |
| FreeformClassifier | 判断用户自由输入是场内互动还是切场景 | 合并 / 简化 | 可以先用便宜文本调用，也可以用规则 + LLM 兜底替代，不应成为重 agent。 |
| InsertBeat | 在当前场景内插入一段临时互动，不生成新图 | 作为可选运行功能保留 | 对自由探索有价值，但最简单的选择驱动 MVP 不依赖它。 |
| CharacterDesigner | 为新角色生成外观卡和声音卡 | 保留但收窄职责 | 对图像和 TTS 一致性有价值，但不应该发明剧情事实，只应把 Writer 的角色意图翻译成媒体卡。 |
| Cinematographer | 把场景摘要转成英文图像分镜 prompt | 候选合并 | 如果图像质量可接受，可以并入 Writer plan 或 Painter prompt builder。只有在实测明显提升图像质量时才保持独立。 |
| StyleSelector | 用户选择 auto 时自动挑画风 | 后置或规则替代 | 这是边缘能力。MVP 更适合让用户显式选画风，或用确定性映射。 |
| CreatorStoryAssistant | Studio 创作者助手 | 与玩家运行时分离保留 | 对创作者工具有价值，但应走创作者额度 / 后台策略，不应混入玩家运行时计费。 |

### 图像运行步骤

| 步骤 | 当前职责 | 建议 | 原因 |
| --- | --- | --- | --- |
| Scene Painter | 生成主场景图 | 保留并增强 | 这是互动影游的核心视觉能力，需要供应商 adapter、比例控制、参考图处理和重试。 |
| Character Portrait | 生成可复用角色参考肖像 | 如果重视角色一致性则保留 | 对角色连续性有价值。纯场景 MVP 可以后置，但画面一致性会下降。 |
| Style reference image conditioning | 使用用户上传参考图约束场景风格 | 后置 | 高级工作流，更适合创作者 / 付费能力。 |
| Prior scene reference | 同一 `sceneKey` 下复用上一幕场景图做连续性参考 | 若供应商支持参考图则保留 | 对空间连续性重要，需要供应商 adapter 支持。 |

### 视觉运行步骤

| 步骤 | 当前职责 | 建议 | 原因 |
| --- | --- | --- | --- |
| Vision click | 理解玩家点击了画面哪里 | 增强功能 | 是差异化能力，但选择按钮和文字输入已经可以支撑 MVP。 |
| Style image parsing | 把用户上传图解析成画风提示词 | 后置 | 属于创作者 / 高级功能，不是核心游玩闭环。 |

### TTS 运行步骤

| 步骤 | 当前职责 | 建议 | 原因 |
| --- | --- | --- | --- |
| Voice provisioning | 创建或选择角色音色 | 仅在开启 TTS 时保留 | TTS 关闭时不应阻塞场景生成。 |
| Beat synthesis | 为每句对白生成音频 | 增强功能 | 会产生大量小调用，应作为可选能力或受点数控制。 |

## 建议的简化运行时

第一版稳定运行时可以比当前完整 agent 面更小：

```text
必需路径：
  Writer
  CharacterDesigner
  Scene Painter

可选路径：
  InsertBeat
  VisionClick
  TTS

候选合并路径：
  Cinematographer -> Writer plan 或 Painter prompt builder
  StyleSelector -> 确定性画风映射或用户显式选择
  FreeformClassifier -> 规则 + 便宜模型兜底

独立产品路径：
  CreatorStoryAssistant -> Studio 额度，不进入玩家运行时
```

这样既能让模型平台保持简单，又保留扩展空间：重点增强 Writer 质量、图像一致性和创作者工具。

## 产品模式

### 官方模式

官方模式是默认消费者体验。

用户不需要配置供应商 Key，请求使用 StoryPlay 托管的模型凭证和审核过的模型路由。

官方模式要求：

- 玩家流程里不需要 API Key 设置。
- 使用量从用户的 StoryPlay 余额或额度中扣除。
- 生成失败不扣费，或自动退回。
- 平台可以在不影响用户的情况下切换供应商或模型路由。
- 平台可以应用限流、每日上限、风控和滥用控制。

当前还没有正式账号、充值和余额体系。过渡阶段使用浏览器本地生成的 `guestId`，通过请求头 `x-storyplay-guest-id` 把匿名官方模型用量归集到 `guest:<id>`，并做每日官方点数上限检查。这个机制只用于轻量成本控制和防止误刷，不等同于正式商业计费；清除浏览器存储可以绕过，后续接入账号系统后应迁移到真实 `userId`、余额预留和充值流水。

建议 MVP 计费形态：

| 行为 | 初始建议扣点 | 说明 |
| --- | ---: | --- |
| 生成开场场景 | 10 点 | 完整文本 + 图像 + 可能的新角色资产 |
| 生成下一场景 | 10 点 | 完整场景生成链路 |
| 视觉点击 | 1 点 | 只走 Vision |
| 场内插入互动 | 2 点 | 只走 Text，不生成新图 |
| 自由输入分类 | 0 或 1 点 | 为体验服务，可先吸收成本 |
| TTS 单句 | 1 点 | 可选能力，调用次数可能较多 |

第一版计费建议按“用户可理解的行为”固定扣点，而不是按 token 精确计费。token / image / TTS 用量仍然需要记录，用于后续调价。

### BYOK 模式

BYOK 面向高级用户、开发者和测试场景。

用户提供自己的 text、image、vision、TTS 凭证。Key 默认保存在客户端；当供应商 CORS 不支持时，可以通过服务端代理转发。

BYOK 模式要求：

- 用户必须明确选择 BYOK 模式。
- BYOK 请求不使用 StoryPlay 官方供应商 Key。
- BYOK 请求不消耗官方模型点数。
- 后续可选策略：对服务器代理、存储、带宽、发布等平台服务收取少量服务点。
- UI 必须明确说明模型成本由用户自己的供应商额度承担。

MVP 阶段建议 BYOK 不消耗 StoryPlay 模型点数。这样能降低高级用户试用和调模型的阻力。

## 模型模式

模型访问模式应显式声明，不要靠隐式判断。

建议类型：

```ts
export type ModelAccessMode = "official" | "byok";
```

建议请求上下文：

```ts
export type ModelRunContext = {
  mode: ModelAccessMode;
  userId: string;
  requestId: string;
  billableKind: BillableUsageKind;
  chargePolicy: "charge" | "free" | "refund-on-failure";
};
```

产品侧应该有用户可见设置：

```text
模型模式
- 官方模式
- 自带 Key 模式
```

不要只依赖“localStorage 里是否存在 Key”作为产品决策。当前可以作为兼容兜底，但平台应逐步迁移到显式模式。

## 可计费行为

模型调用应按用户可理解的行为计费和记录，而不是只按供应商请求计费。

建议初始枚举：

```ts
export type BillableUsageKind =
  | "scene_opening"
  | "scene_next"
  | "scene_prefetch"
  | "vision_click"
  | "insert_beat"
  | "freeform_classify"
  | "tts_line"
  | "image_scene"
  | "image_portrait";
```

说明：

- `scene_opening` 和 `scene_next` 是复合行为，内部可能调用 Writer、CharacterDesigner、Cinematographer、Painter、角色肖像生成和音色准备。
- `image_scene` 和 `image_portrait` 应作为内部成本事件记录，即使用户只为完整场景扣一次点。
- `scene_prefetch` 需要特殊策略。如果后续大量使用预生成，建议在“用户真正消费该场景”时扣费，或做可退回的 pending ledger。

## Text 模型路由

当前所有文本 agent 共用 `TEXT_MODEL`。这对初期上线是可以接受的。StoryPlay 应先收敛和明确 agent 表面，再只在有明确产品价值或成本收益时增加模型路由。

建议第一阶段最多拆成三类：

```text
TEXT_MODEL_MAIN   -> Writer 和核心叙事生成
TEXT_MODEL_CHEAP  -> 分类、插入互动、媒体卡辅助
TEXT_MODEL_STUDIO -> 创作者助手
```

只有当日志显示确实需要时，再继续拆更细。

后续可能的文本角色：

```ts
export type TextModelRole =
  | "default"
  | "main"
  | "cheap"
  | "studio"
  | "writer"
  | "character"
  | "cinema"
  | "classifier"
  | "insertBeat"
  | "style";
```

后续可能的环境变量：

```text
TEXT_MODEL_MAIN=
TEXT_MODEL_CHEAP=
TEXT_MODEL_STUDIO=

# 更细粒度拆分，后续再考虑：
# TEXT_MODEL_WRITER=
# TEXT_MODEL_CHARACTER=
# TEXT_MODEL_CINEMA=
# TEXT_MODEL_CLASSIFIER=
# TEXT_MODEL_INSERT_BEAT=
# TEXT_MODEL_STYLE=
```

回退规则：

```text
具体角色模型 -> TEXT_MODEL_MAIN 或 TEXT_MODEL_CHEAP -> TEXT_MODEL
```

建议初始官方路由：

| 文本角色 | 建议模型 | 原因 |
| --- | --- | --- |
| Writer | `anthropic/claude-sonnet-4.6` | 剧情质量和协议遵循最关键 |
| Character | `google/gemini-3.1-flash-lite` | 低成本结构化角色卡 |
| Cinema | `google/gemini-3.1-flash-lite` | 只是英文画面提示词转换，不是完整叙事 |
| Classifier | `deepseek/deepseek-v4-flash` | 便宜分类和归一化 |
| InsertBeat | `anthropic/claude-haiku-4.5` 或 `google/gemini-3.1-flash-lite` | 短文本、低延迟 |
| Style | `deepseek/deepseek-v4-flash` | 单标签选择 |

第一版实现时应加统一 helper，而不是把模型选择逻辑散落在各处：

```ts
resolveTextConfig(config, "writer")
```

或：

```ts
withTextModel(config.text, "writer")
```

## 场景模型路由

下一阶段模型优化不应直接演变成“每个 agent 一个环境变量”。更稳的方式是建立一层场景模型路由：

```text
用户行为 / API route
  -> ModelScenario
  -> ModelProfile
  -> ProviderConfig / TtsConfig
  -> provider adapter
```

这层路由只属于官方托管模式。BYOK 第一阶段仍然保持简单：用户只配置 text / image / vision / tts 四个核心模型域，不暴露复杂场景路由。后续可以给高级用户增加“自定义 profile”开关，但不应作为默认体验。

### 设计目标

- 平台可以针对不同场景使用不同模型，降低成本并改善延迟。
- 产品仍然只向用户解释四个能力域：文本、图像、识图、配音。
- API route 不直接拼环境变量名，所有模型选择经过统一 helper。
- 每个场景都有稳定 fallback，配置缺失时不影响上线。
- usage 记录能看到实际使用的场景和 profile，方便后续成本分析。

### 场景枚举

第一阶段先覆盖已有官方模型 API：

```ts
export type ModelScenario =
  | "start"
  | "scene"
  | "vision"
  | "classify-freeform"
  | "insert-beat"
  | "parse-style-image"
  | "beat-audio"
  | "studio-assistant";
```

这些场景与当前 `OfficialModelFeature` 基本一致。区别是：

- `OfficialModelFeature` 用于用户可理解的计费行为。
- `ModelScenario` 用于平台内部选择模型。

第一阶段可以让两者共用同一组字符串，后续如有需要再拆分。例如 `scene` 计费仍是一次完整场景，但内部可能进一步拆出 `writer`、`character`、`cinema`、`scene-image` 等子 profile。

### Profile 分层

Profile 是供应商配置的复用单元，不是用户可见概念。

建议第一版 profile：

| Profile | 模型域 | 用途 | 默认回退 |
| --- | --- | --- | --- |
| `text-main` | Text | 开局、续写、Studio 助手等高质量文本 | `TEXT_*` |
| `text-fast` | Text | 插入互动、轻量改写 | `text-main` |
| `text-lite` | Text | 分类、低成本判断 | `text-fast` -> `text-main` |
| `vision-main` | Vision | 参考图解析等更需要准确性的识图 | `VISION_*` 或 `TEXT_*` |
| `vision-fast` | Vision | 点击画面判断等低延迟识图 | `vision-main` |
| `image-scene` | Image | 主场景图 | `IMAGE_*` |
| `image-character` | Image | 角色肖像 | `image-scene` |
| `tts-main` | TTS | 配音合成 | `TTS_*` |

第一阶段不要把 `Writer`、`CharacterDesigner`、`Cinematographer` 全部暴露为顶层配置。它们可以在引擎内部继续共用 `text-main`，等 usage 数据证明有必要时再把 agent 级路由纳入 profile。

### 默认路由

建议默认映射：

| 场景 | Text profile | Image profile | Vision profile | TTS profile |
| --- | --- | --- | --- | --- |
| `start` | `text-main` | `image-scene` | - | `tts-main` |
| `scene` | `text-main` | `image-scene` | - | `tts-main` |
| `vision` | - | - | `vision-fast` | - |
| `classify-freeform` | `text-lite` | - | - | - |
| `insert-beat` | `text-fast` | - | - | - |
| `parse-style-image` | - | - | `vision-main` | - |
| `beat-audio` | - | - | - | `tts-main` |
| `studio-assistant` | `text-main` | - | - | - |

这个默认路由的重点是先把“强文本”和“便宜文本”分开，把低成本分类和短互动从核心叙事模型里拆出去。

### 环境变量形态

第一阶段使用环境变量，不引入后台数据库配置。

基础环境变量继续保留，作为默认 fallback：

```env
TEXT_BASE_URL=
TEXT_API_KEY=
TEXT_MODEL=
TEXT_PROVIDER=

IMAGE_BASE_URL=
IMAGE_API_KEY=
IMAGE_MODEL=
IMAGE_PROVIDER=

VISION_BASE_URL=
VISION_API_KEY=
VISION_MODEL=
VISION_PROVIDER=

TTS_BASE_URL=
TTS_API_KEY=
TTS_SPEECH_MODEL=
```

新增 profile 级覆盖变量采用统一命名：

```env
MODEL_PROFILE_TEXT_MAIN_BASE_URL=
MODEL_PROFILE_TEXT_MAIN_API_KEY=
MODEL_PROFILE_TEXT_MAIN_MODEL=
MODEL_PROFILE_TEXT_MAIN_PROVIDER=

MODEL_PROFILE_TEXT_FAST_BASE_URL=
MODEL_PROFILE_TEXT_FAST_API_KEY=
MODEL_PROFILE_TEXT_FAST_MODEL=
MODEL_PROFILE_TEXT_FAST_PROVIDER=

MODEL_PROFILE_TEXT_LITE_BASE_URL=
MODEL_PROFILE_TEXT_LITE_API_KEY=
MODEL_PROFILE_TEXT_LITE_MODEL=
MODEL_PROFILE_TEXT_LITE_PROVIDER=
```

图像、识图、TTS 同理：

```env
MODEL_PROFILE_IMAGE_SCENE_*
MODEL_PROFILE_IMAGE_CHARACTER_*
MODEL_PROFILE_VISION_MAIN_*
MODEL_PROFILE_VISION_FAST_*
MODEL_PROFILE_TTS_MAIN_BASE_URL=
MODEL_PROFILE_TTS_MAIN_API_KEY=
MODEL_PROFILE_TTS_MAIN_SPEECH_MODEL=
```

路由映射可以先内置默认值，再允许用 JSON 覆盖：

```env
OFFICIAL_MODEL_ROUTING_JSON='{
  "start": { "text": "text-main", "image": "image-scene", "tts": "tts-main" },
  "scene": { "text": "text-main", "image": "image-scene", "tts": "tts-main" },
  "insert-beat": { "text": "text-fast" },
  "classify-freeform": { "text": "text-lite" },
  "vision": { "vision": "vision-fast" },
  "parse-style-image": { "vision": "vision-main" },
  "beat-audio": { "tts": "tts-main" },
  "studio-assistant": { "text": "text-main" }
}'
```

MVP 可以先实现 profile 覆盖变量和内置默认路由；JSON 覆盖作为第二步。这样能减少一次性复杂度。

### 回退规则

ProviderConfig 回退规则：

```text
场景指定 profile
  -> profile 自身配置
  -> profile fallback
  -> 模型域默认配置
```

例如 `insert-beat`：

```text
insert-beat.text = text-fast
  -> MODEL_PROFILE_TEXT_FAST_*
  -> MODEL_PROFILE_TEXT_MAIN_*
  -> TEXT_*
```

`vision-fast`：

```text
MODEL_PROFILE_VISION_FAST_*
  -> MODEL_PROFILE_VISION_MAIN_*
  -> VISION_*
  -> TEXT_*
```

图像和 TTS：

```text
image-character -> image-scene -> IMAGE_*
tts-main -> TTS_*
```

配置缺失时应尽量回退，而不是直接让服务启动失败。只有基础必需变量缺失才失败：官方模式需要 `TEXT_*`、`IMAGE_*`，Vision 可以回退到 Text，TTS 可以为空表示关闭。

### 代码边界

建议新增：

```text
lib/modelRouting.ts
```

职责：

- 定义 `ModelScenario`、`ModelProfileId`、`ModelRoute`。
- 读取 profile 环境变量。
- 根据场景返回 `EngineConfig`。
- 把实际 route 元数据附加到 `EngineConfig`，供 usage 记录使用。

建议 public helper：

```ts
loadEngineConfigForScenario("start")
loadEngineConfigForScenario("insert-beat")
```

现有 `loadEngineConfig()` 继续保留，作为默认配置入口和 BYOK fallback。API route 应逐步从 `loadEngineConfig()` 迁移到 `loadEngineConfigForScenario(...)`。

### Usage 记录扩展

usage 记录里需要增加路由元数据：

```ts
modelRoute: {
  scenario: "insert-beat",
  profiles: {
    text: "text-fast"
  }
}
```

第一版可以先放进 `metadata`，后续数据库字段稳定后再单独加列。

### 实施顺序

1. 新增 `lib/modelRouting.ts` 和类型。
2. 让 `loadEngineConfigForScenario(scenario)` 返回带场景 profile 的 `EngineConfig`。
3. 把核心 API route 切到场景配置：
   - `/api/start`
   - `/api/scene`
   - `/api/vision`
   - `/api/classify-freeform`
   - `/api/insert-beat`
   - `/api/parse-style-image`
   - `/api/beat-audio`
   - `/api/studio/projects/[id]/assistant`
4. usage metadata 记录 `scenario` 和 `profiles`。
5. 先验证不设置新环境变量时行为完全等价。
6. 再在线上逐步设置 `MODEL_PROFILE_TEXT_FAST_*`、`MODEL_PROFILE_TEXT_LITE_*` 做成本优化。

### 第一批文本 Agent 调整

第一批不删除文本 agent，而是先把核心叙事和辅助文本任务分层。原因是当前 `directScene` 已经把 Writer 的 `<plan>` 流作为并行调度锚点，直接合并或删除 CharacterDesigner / Cinematographer 会影响图像、角色、TTS 和流式首屏链路。

当前落地策略：

| Agent / 步骤 | Profile | 原因 |
| --- | --- | --- |
| Writer | `text-main` | 核心叙事、结构化 plan、story prose、choices 和 memory patch，质量优先。 |
| CharacterDesigner 文本卡 | `text-fast` | 只把 Writer 的角色意图翻译成视觉 / 声音卡，不应该发明剧情事实。 |
| Cinematographer | `text-fast` | 把场景概要转成英文构图 prompt，属于媒体辅助任务。 |
| StyleSelector | `text-lite` | 自动画风选择是边缘能力，失败可回退默认画风。 |
| FreeformClassifier | `text-lite` | 低成本分类任务，已在 API 场景路由层走 `classify-freeform`。 |
| InsertBeat | `text-fast` | 短文本场内互动，不生成图像。 |

实现边界：

- `EngineConfig.text` 仍表示当前场景默认文本模型。
- `EngineConfig.textProfiles` 可选挂载 `main / fast / lite` 三个内部文本 profile。
- 如果没有 `textProfiles`，所有 agent 自动回退到 `EngineConfig.text`，BYOK 和旧配置不受影响。

后续评估：

- 如果 `Cinematographer` 对图像质量提升不明显，可以尝试把它合并进 Painter prompt builder 或 Writer plan。
- 如果 `StyleSelector` 的自动选择价值低，可以改成规则映射或完全依赖用户显式风格。
- `CharacterDesigner` 暂时保留，因为它连接角色一致性、肖像和 TTS 音色，是媒体资产链路的一部分。

## Provider Gateway

Provider Gateway 应屏蔽供应商差异，不让 Creative Engine 直接关心不同厂商协议。

职责：

- 归一化 OpenAI-compatible base URL。
- 应用 provider protocol 默认值。
- 支持流式和非流式文本。
- 把图像生成供应商和文本供应商分开处理。
- 支持带图片输入的 vision chat-completions。
- 统一超时、重试和取消。
- 归一化 usage 信息。
- 记录 requestId 和模型路由元数据。

当前相关实现：

- `lib/ai-client/chat.ts`
- `lib/ai-client/image.ts`
- `lib/ai-client/vision.ts`
- `lib/tts-client/`
- `lib/byoProxy.ts`

长期看，这些文件应保持为底层 adapter。产品决策，如模型模式、计费、路由选择，应位于它们之上。

## 用量记录

每次官方模型操作都应该写入 usage record。

当前实现：

- `lib/modelUsage.ts` 提供 `startOfficialModelUsage(...)`。
- 官方模式 API 路由会输出 `[model-usage]` 结构化日志。
- 已覆盖 `/api/start`、`/api/scene`、`/api/vision`、`/api/classify-freeform`、`/api/insert-beat`、`/api/parse-style-image`、`/api/beat-audio` 和 Studio assistant。
- 当前只记录脱敏元信息：用户、功能入口、模型域、模型名、供应商 host、耗时、成功 / 失败、少量结果摘要。
- 不记录 prompt、图片内容、API Key 或完整响应。
- 如果 D1 `DB` binding 可用，会写入 `model_usage_records`。
- 如果 D1 不可用，不阻断请求，只保留结构化日志并输出 persist skipped warning。

这一步的定位是“计费锚点”和“成本观测锚点”。当前已具备数据库落点，但还没有余额预检查、购买充值、后台管理和用户可见账单 UI。

建议字段：

```ts
export type ModelUsageRecord = {
  id: string;
  requestId: string;
  userId: string;
  mode: ModelAccessMode;
  billableKind: BillableUsageKind;
  agentId?: string;
  modelRole: "text" | "image" | "vision" | "tts";
  textModelRole?: TextModelRole;
  provider: string;
  baseUrlHost: string;
  model: string;
  startedAt: string;
  endedAt: string;
  durationMs: number;
  success: boolean;
  fallbackUsed?: boolean;
  errorCode?: string;
  errorMessage?: string;
  promptTokens?: number;
  completionTokens?: number;
  cachedPromptTokens?: number;
  imageCount?: number;
  ttsCharacters?: number;
  creditsCharged?: number;
};
```

Usage record 是可观测性事实，不等同于计费流水。

## 点数流水

点数应通过 append-only ledger 记录，不要只修改一个 balance 字段。

当前实现：

- `credit_ledger_entries` 是 append-only 流水表。
- 成功的官方 usage 会按固定价格写入一条 `charge` 流水。
- 失败的 usage 不扣费。
- `/api/billing/summary` 可返回当前用户余额、最近 usage 和最近 ledger。
- 当前已有匿名每日额度预检查：`start`、`scene`、`vision`、`insert-beat`、`parse-style-image`、`beat-audio`、`studio-assistant` 会在调用官方模型前检查当日已消费点数，超过 `OFFICIAL_DAILY_CREDIT_LIMIT`（默认 50）则返回 429。D1 不可用时检查会 best-effort 放行，避免阻断官方模式跑通。
- 当前还不是正式余额预留体系，所以并发请求仍可能超过每日上限；后续接入账号和充值后，应改成余额预留 / pending charge / 成功确认或失败释放。

建议流水字段：

```ts
export type CreditLedgerEntry = {
  id: string;
  userId: string;
  requestId?: string;
  kind:
    | "grant"
    | "purchase"
    | "charge"
    | "refund"
    | "adjustment";
  amount: number;
  billableKind?: BillableUsageKind;
  reason: string;
  createdAt: string;
};
```

MVP 扣费流程：

```text
1. 官方请求开始前检查余额。
2. 创建 pending charge 或预留点数。
3. 执行模型链路。
4. 成功后确认扣费。
5. 失败时释放预留或写退款流水。
```

如果第一版不想实现 pending reservation，可以先只在成功后扣费。这样实现简单，但需要在请求前仍然做余额预检查，否则余额不足的用户也可能触发昂贵调用。

## 失败与退款策略

建议 MVP 策略：

- 完整场景生成失败，且没有返回可播放场景：不扣费。
- 模型降级但返回了可播放场景：正常扣费，但记录 `fallbackUsed`。
- 图像生成失败但返回了 mock / fallback 图：可部分扣费，或标记 degraded 并不扣图像部分。
- TTS 失败：不扣该句 TTS 费用。
- BYOK 供应商失败：不扣 StoryPlay 官方模型点数。

## 后台控制

平台需要一个面向管理员的模型运营视图。

初始控制项：

- 按角色配置官方模型。
- 配置 `BillableUsageKind` 价格。
- 设置用户每日上限。
- 全局供应商 kill switch。
- fallback 模型配置。
- 按模型查看错误率和延迟。
- 按供应商 / 模型 / 行为估算成本。

第一阶段可以先用环境变量和日志。后续应迁移到数据库表和后台 UI。

## 推荐实施阶段

### Phase 0：官方模式跑通

目标：使用官方服务端 Key 跑通生产。

任务：

- 配置 `TEXT_*`、`IMAGE_*`、`VISION_*`，可选 `TTS_*`。
- 所有文本 agent 先共用一个强文本模型。
- 保留 BYOK 设置，但不要让它成为默认产品路径。
- 验证 `/api/start`、`/api/scene`、`/api/vision`、`/api/insert-beat`、`/api/classify-freeform`、`/api/beat-audio`。

### Phase 1：显式模型模式

目标：把官方模式和 BYOK 变成真实产品状态。

任务：

- 给客户端设置增加 `modelMode: "official" | "byok"`。
- 更新设置页文案，清晰区分官方模式和 BYOK。
- 官方模式保持默认。
- 确保 BYOK 永远不使用官方供应商 Key。
- 确保官方模式不会因为本地存在 BYOK Key 而被隐式切走。

### Phase 2：用量日志

目标：先观测真实成本，再开始向用户收费。

任务：

- 增加模型 usage record。（已完成：结构化日志 + D1 `model_usage_records`）
- 给 scene、vision、classify、insert beat、TTS 路由挂 `requestId`。（部分完成：usage event 已有 `id`，但还未贯穿到下游 adapter）
- 记录 agent id、模型、耗时、成功失败、可用时记录 token usage。（部分完成：已记录模型、耗时、成功失败；token / image / TTS 字符数待接入）
- 增加轻量后台或脚本报表。

### Phase 3：点数计费

目标：官方模式按用户可理解的行为扣费。

任务：

- 增加用户点数余额和 ledger。（第一版已完成：`credit_ledger_entries`，余额由流水求和）
- 增加固定点数价格。
- 昂贵操作前检查余额。（匿名每日额度版已完成；正式账号余额预留待完成）
- 成功后扣费。（已完成：best-effort 写 ledger）
- 失败退款或不扣费。（已完成：失败不扣费；退款流程待后续 pending reservation）
- BYOK 不消耗官方模型点数。

### Phase 4：Text 模型路由

目标：在不伤害剧情质量的情况下降低官方模型成本。

任务：

- 增加文本模型角色配置。
- Writer 走高质量模型。
- 分类、画风、分镜等轻量任务走便宜模型。
- 增加 per-role fallback。
- 跑 `pnpm agent:test`、`pnpm typecheck` 和手动 playthrough。

### Phase 5：后台模型控制台

目标：无需发版也能运营模型成本和稳定性。

任务：

- 把模型路由配置存入数据库。
- 把价格配置存入数据库。
- 增加后台 UI 管理模型路由、价格、限额和 kill switch。
- 增加失败率、延迟、token、图像用量和点数消耗仪表盘。

## 待决策问题

- BYOK 是否完全免费，还是对服务端代理 / 存储 / 发布功能收少量服务点？
- 预生成场景是在生成时扣费，还是在用户真正消费时扣费？
- 官方点数是做订阅赠送、单次购买，还是两者都支持？
- 创作者 playtest 生成是否应和玩家消耗分开计费？
- TTS 是否默认开启，还是因为小调用多而默认关闭？

## 近期建议

生产验证阶段建议：

```text
官方模式：
  TEXT_MODEL=anthropic/claude-sonnet-4.6
  VISION_MODEL=google/gemini-3.1-flash-lite
  IMAGE_* 使用当前已验证可用的图像供应商
  TTS 可选

BYOK 模式：
  保留当前 localStorage 设置路径。
  UI 上重定位为高级 / 自费模式。
```

先完成 Phase 1-3，再深入做 per-agent 路由。这样可以先稳定商业行为和用户预期，再优化模型成本。
