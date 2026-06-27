# Agent System

Status: Current.

Agent System 是 StoryPlay 当前已经落地的内部智能体基建板块。它不是创作者可编辑系统。

## 当前事实

- 当前注册 9 个 agent：
  - Writer
  - StyleSelector
  - CharacterDesigner
  - Cinematographer
  - Painter
  - Vision
  - FreeformClassifier
  - InsertBeat
  - Voice / TTS
- 当前统一入口在 `lib/engine/agent-system/`。
- 当前每个 agent 都已有治理目录：`lib/engine/agent-system/agents/<agent>/`。
- 当前 `contracts.ts` 和 `skills.ts` 仍是统一出口，尚未完全拆成每个 agent 独立文件。
- 当前 `freeform-classifier`、`vision`、`insert-beat` 的 parser/fallback 已迁入各自 agent 目录。
- 当前其他 agent 的主要 runtime 仍在历史位置，例如 `lib/engine/agents/*`、`director.ts`、`orchestrator.ts`、`vision.ts`、`voice.ts`。
- 当前验证命令：

```bash
pnpm agent:inventory
pnpm agent:test
pnpm typecheck
```

## 阅读顺序

1. [overview.md](overview.md)  
   当前框架、文件地址、更新指南。开发时优先看这个。

2. [refactor-plan.md](refactor-plan.md)  
   重构路线和后续 roadmap。里面包含历史阶段说明，阅读时以“当前落地状态”和“R1/R2 当前执行状态”为准。

3. [skills.md](skills.md)  
   9 个 agent 的职责和 skill 文档草案。它是内部维护资料，不是创作者编辑面板。

## 和 Creative Engine 的关系

```text
Creative Engine
  整体创作链路
  Session / Scene / Beat / StoryState
  Creator System 产品层衔接
  └─ Agent System
      内部 agent contract / skill / parser / fallback / runtime / fixtures
```

如果改“某个 agent 怎么工作”，改 `agent-system/`。  
如果改“整个创作链路或创作者可编辑配置”，改 `creative-engine/`。

## 不要误解

- Agent System 已经能作为维护基建使用，但还不是最终完全拆分形态。
- `agent-system/agents/<agent>/contract.ts`、`skill.ts`、`prompt.ts` 目前多数还没拆出来，是后续演进目标。
- Creator System 不能直接暴露 agent contract / skill / parser / fallback 给创作者。

