# Creative Engine

Status: Mixed. This section contains current architecture notes and earlier product-planning analysis.

Creative Engine 是 StoryPlay 的整体创作引擎板块，关注从用户输入到可播放故事的完整链路，以及后续 Creator System 如何接入。

## 当前事实

- 当前运行时核心仍是 `Session` 驱动。
- 当前一幕故事由 `directScene` 串联 Writer、CharacterDesigner、Cinematographer、Painter 等能力生成。
- 当前可播放结构是 `Scene` + `Beat`。
- 当前故事连续性主要依赖 `history`、`characters`、`storyState`、`sceneKey`。
- 当前 Creator System 尚未正式实现。
- 当前创作者还不能系统性编辑 world config、character config、narrative rules、visual style config、interaction rules、asset references。

## 阅读顺序

1. [current-architecture.md](current-architecture.md)  
   Status: Current.  
   当前 Creative Engine 真实代码结构，重点说明“旧 engine runtime + 新 agent-system 治理层”的边界。后续开发优先看这个。

2. [roadmap.md](roadmap.md)  
   Status: Plan.  
   后续开发大方向。定义 `StoryPlay` 如何从实时生成体验走向创作者平台，以及 `StoryProject`、`Studio`、调试层、发布层的阶段顺序。

3. [story-project-schema.md](story-project-schema.md)  
   Status: Plan / Schema Draft.  
   `StoryProject` 第一版创作工程数据模型。用于区分创作态和运行态，并指导后续 `/studio`、工程保存、试玩生成和调试回写。

4. [analysis.md](analysis.md)  
   Status: Historical Analysis + Planning.  
   这是早期对创作引擎和 Creator System 方向的分析。里面很多内容是“建议/规划”，不是全部已实现事实。

5. [creative-path-visual.md](creative-path-visual.md)  
   Status: Visual Aid.  
   用图解方式帮助理解创作路径。它是辅助说明，不作为代码事实来源。

6. [creative-path-visual.html](creative-path-visual.html)  
   Status: Visual Aid.  
   HTML 版本图解，适合给非开发读者看。

## 和 Agent System 的关系

Creative Engine 是上层整体链路，Agent System 是其中的内部执行基建：

```text
Creative Engine
  用户输入
  Session / StoryState
  Scene generation pipeline
  Player interactions
  Creator System planning
  └─ Agent System
      Writer / CharacterDesigner / Cinematographer / Painter / Vision / ...
```

如果改“创作者能配置什么、Session/StoryProject 怎么设计、整体创作路径怎么产品化”，更新这里。  
如果改“某个 agent 的 prompt、parser、fallback、contract、fixture”，更新 `../agent-system/`。

## 不要误解

- `analysis.md` 中的 Creator System、StoryProject、Studio 面板等内容是后续规划，不代表当前已实现。
- 当前项目已经有实时生成引擎，但还没有完整创作者工作台。
- agent / skill 是内部基建，不属于 Creator System 的直接可编辑对象。
