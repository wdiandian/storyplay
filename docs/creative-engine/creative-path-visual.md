# StoryPlay 创作路径可视化

Status: Visual Aid.

这份文档只用于辅助理解 Creative Engine 的当前运行链路和后续 Creator System 方向，不作为代码事实来源。当前实现事实请优先看 [README.md](README.md) 和 [../agent-system/overview.md](../agent-system/overview.md)。

## 1. 当前最短链路

```mermaid
flowchart LR
  A[用户输入故事想法] --> B[创建 Session]
  B --> C{是否自动画风}
  C -->|是| D[StyleSelector 选择画风]
  C -->|否| E[使用用户指定画风]
  D --> F[directScene]
  E --> F
  F --> G[Writer 输出 plan / story / choices]
  G --> H[CharacterDesigner 生成角色资产]
  G --> I[Cinematographer 生成镜头 prompt]
  H --> J[Painter 生成场景图]
  I --> J
  G --> K[proseSplitter 拆 beat]
  J --> L[返回可播放 Scene]
  K --> L
```

当前产品更接近“实时故事生成器”：玩家给一个命题，系统生成一幕可玩的视觉故事。它还不是完整的创作者工作台。

## 2. Agent System 在哪里

```mermaid
flowchart TD
  CE[Creative Engine\n整体创作链路] --> S[Session / StoryState]
  CE --> P[Scene / Beat]
  CE --> AS[Agent System\n内部执行基建]
  AS --> W[Writer]
  AS --> SS[StyleSelector]
  AS --> CD[CharacterDesigner]
  AS --> CINE[Cinematographer]
  AS --> PA[Painter]
  AS --> V[Vision]
  AS --> FC[FreeformClassifier]
  AS --> IB[InsertBeat]
  AS --> TTS[Voice / TTS]
```

`agent-system/` 是 Creative Engine 下面的内部基建板块。agent / skill 不给创作者编辑；后续 Creator System 只能产出产品层配置，再由内部 agent 消费。

## 3. 模型 API 对应关系

```mermaid
flowchart LR
  W[Writer] --> TEXT[TEXT model role]
  SS[StyleSelector] --> TEXT
  CD[CharacterDesigner] --> TEXT
  CD --> IMAGE[IMAGE model role]
  CD --> TTS[TTS provider role]
  CINE[Cinematographer] --> TEXT
  PA[Painter] --> IMAGE
  V[Vision] --> VISION[VISION model role]
  FC[FreeformClassifier] --> TEXT
  IB[InsertBeat] --> TEXT
  VOICE[Voice / TTS] --> TTS
```

代码里不是每个 agent 写死模型，而是通过文本、图像、视觉、语音几类 provider / model role 读取配置。后续升级模型时，应按 agent 逐个验证，而不是全局一次替换。

## 4. 当前资产与后续产品化

| 当前已有 | 当前位置 | 后续 Creator System 可产品化为 |
| --- | --- | --- |
| 故事命题 | `Session.worldSetting` | World Config / Story Brief |
| 画风 | `Session.styleGuide` | Visual Style Config |
| 角色 | `Session.characters` | Character Config |
| 故事记忆 | `Session.storyState` | Narrative State / Story Bible |
| 场景与节拍 | `Scene` / `Beat` | Scene Editor / Beat Editor |
| 分支选择 | `choices` | Branch Graph |

Creator System 后续应该编辑的是这些产品层资产，不是底层 agent contract、skill、parser、fallback 或 provider fallback。

## 5. 后续边界

```mermaid
flowchart LR
  Creator[创作者] --> ProductConfig[产品层配置]
  ProductConfig --> World[World Config]
  ProductConfig --> Character[Character Config]
  ProductConfig --> Narrative[Narrative Rules]
  ProductConfig --> Visual[Visual Style Config]
  ProductConfig --> Interaction[Interaction Rules]
  ProductConfig --> Engine[Creative Engine]
  Engine --> Agents[Internal Agent System]
```

维护原则：

- 改创作链路、Session、StoryState、Creator System 配置：更新 `creative-engine/`。
- 改 agent prompt、parser、fallback、contract、fixture：更新 `agent-system/`。
- 不把创作者配置系统和 agent / skill 系统混成一层。
