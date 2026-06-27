# Agent System Overview

Status: Current. This is the source of truth for the current Agent System baseline.

Agent System is StoryPlay's internal creative-engine infrastructure. It owns
agent contracts, skills, prompt protocol, parsers, fallbacks, runtime registry,
fixtures, and evaluation hooks.

This layer is not creator-editable. Creator-facing configuration belongs to the
future Creator System product layer and must be translated into internal agent
inputs instead of directly modifying agent contracts or skills.

## Current Status

The agent board has reached a maintainable baseline:

- 9 agent nodes are registered in `lib/engine/agent-system`.
- Each agent has a governance directory under `lib/engine/agent-system/agents`.
- Core contract and skill inventory are centralized and testable.
- Low-risk parser/fallback behavior has started moving into agent-owned files.
- Fixture-driven smoke tests cover inventory, runtime fallback, parser behavior,
  reference priority, and contract metadata.

Validation commands:

```bash
pnpm agent:inventory
pnpm agent:test
pnpm typecheck
```

## Registered Agents

| Agent | Model role | Responsibility | Current governance status |
| --- | --- | --- | --- |
| writer | text | Scene plan, prose, choices, story memory | Contracted; plan fallback fixture |
| style-selector | text | Pick built-in visual style | Runtime fallback fixture |
| character-designer | text / image / tts stage | Character card, portrait, voice provisioning | Invalid JSON fixture |
| cinematographer | text | Convert scene intent into image composition prompt | Empty output fallback fixture |
| painter | image | Generate final scene image with references | Reference priority fixture |
| vision | vision | Interpret annotated background clicks | Parser/fallback moved to agent directory |
| freeform-classifier | text | Classify player free text | Parser/fallback moved to agent directory |
| insert-beat | text | Generate one in-scene transient beat | Parser/fallback moved to agent directory |
| voice | tts | Synthesize beat audio | Contract metadata fixture |

## Source Layout

```text
lib/engine/agent-system/
  types.ts
  contracts.ts
  skills.ts
  registry.ts
  runtime/
    agentRuntime.ts
  agents/
    README.md
    <agent>/
      README.md
      fixtures/
      parser.ts        # present when migrated
```

Runtime implementation still remains partly in the historical engine files. This
is intentional: migrations happen one agent at a time after fixture coverage is
in place.

## Framework Logic

The current framework has four layers:

```text
AgentSkill
  Defines agent responsibility, rules, must-not items, strategy sections, and
  protocol sections.

AgentContract
  Defines agent id, model role, input/output schema descriptors, prompt builder,
  parser, and fallback.

AgentRegistry
  Registers all agent nodes and provides inventory / lookup.

AgentRuntime
  Runs an agent with unified fallback handling and basic telemetry logs.
```

Primary framework files:

| Concern | File |
| --- | --- |
| Public exports | `lib/engine/agent-system/index.ts` |
| Shared types | `lib/engine/agent-system/types.ts` |
| Agent contracts | `lib/engine/agent-system/contracts.ts` |
| Agent skills | `lib/engine/agent-system/skills.ts` |
| Registry and inventory | `lib/engine/agent-system/registry.ts` |
| Runtime execution | `lib/engine/agent-system/runtime/agentRuntime.ts` |
| Agent-owned folders | `lib/engine/agent-system/agents/` |
| Smoke tests | `scripts/test-agent-system.mjs` |
| Inventory script | `scripts/print-agent-inventory.mjs` |

## Runtime File Map

| Agent | Responsibility | Model role | Runtime today |
| --- | --- | --- | --- |
| writer | Generate scene plan, prose, choices, and story memory | text | `lib/engine/agents/writer.ts` |
| style-selector | Pick a built-in visual style from the premise | text | `lib/engine/agents/styleSelector.ts` |
| character-designer | Create character card, portrait, and voice provisioning data | text / image / tts stage | `lib/engine/agents/characterDesigner.ts` |
| cinematographer | Convert scene summary into image composition prompt | text | `lib/engine/agents/cinematographer.ts` |
| painter | Generate final scene image with references | image | `lib/engine/agents/painter.ts` |
| vision | Interpret annotated background clicks | vision | `lib/engine/vision.ts` |
| freeform-classifier | Classify player free text as in-scene interaction or scene change | text | `lib/engine/orchestrator.ts` |
| insert-beat | Generate one transient in-scene beat | text | `lib/engine/director.ts` |
| voice | Synthesize NPC dialogue audio | tts | `lib/engine/voice.ts` |

## Update Guide

Use this table when changing the Agent System. Prefer updating the agent-system
layer first, then touch historical runtime files only when the behavior actually
executes there.

| Change type | Update files |
| --- | --- |
| Change agent responsibility, rules, strategy, or must-not text | `lib/engine/agent-system/skills.ts` |
| Change input/output schema descriptors, model role, or contract metadata | `lib/engine/agent-system/contracts.ts` |
| Add, remove, or rename an agent | `contracts.ts`, `registry.ts`, `types.ts`, `skills.ts`, `agents/<agent>/`, `scripts/test-agent-system.mjs` |
| Change unified execution, fallback logging, telemetry, or runtime result shape | `lib/engine/agent-system/runtime/agentRuntime.ts` |
| Change FreeformClassifier parsing or fallback | `lib/engine/agent-system/agents/freeform-classifier/parser.ts` |
| Change Vision parsing or fallback | `lib/engine/agent-system/agents/vision/parser.ts` |
| Change InsertBeat parsing or fallback | `lib/engine/agent-system/agents/insert-beat/parser.ts` |
| Change Writer main protocol | `lib/engine/agents/writer.ts`, `lib/engine/agent-system/contracts.ts`, Writer fixtures |
| Change prompt text | `lib/engine/prompts.ts`, Writer prompt files under `lib/engine/prompts/`, relevant agent fixtures |
| Change image reference priority | `lib/engine/agents/painter.ts`, `agents/painter/fixtures/` |
| Change character card / portrait / voice provisioning | `lib/engine/agents/characterDesigner.ts`, `agents/character-designer/fixtures/` |
| Change TTS synthesis or provider normalization | `lib/engine/voice.ts`, `lib/engine/orchestrator.ts`, `agents/voice/fixtures/` |
| Change fixture coverage | `lib/engine/agent-system/agents/<agent>/fixtures/` |
| Change smoke test behavior | `scripts/test-agent-system.mjs` |
| Change Agent System documentation | [overview.md](overview.md), [refactor-plan.md](refactor-plan.md) |

## Agent-Owned Files

Agent-owned directories are the preferred long-term maintenance location:

```text
lib/engine/agent-system/agents/<agent>/
  README.md
  fixtures/
  parser.ts        # when parser/fallback has been migrated
  prompt.ts        # future migration target
  contract.ts      # future migration target
  skill.ts         # future migration target
```

Current migrated parser/fallback files:

- `lib/engine/agent-system/agents/freeform-classifier/parser.ts`
- `lib/engine/agent-system/agents/vision/parser.ts`
- `lib/engine/agent-system/agents/insert-beat/parser.ts`

Current fixture-driven tests cover:

- Writer plan coercion.
- StyleSelector runtime fallback.
- CharacterDesigner invalid JSON fallback.
- Cinematographer empty output fallback.
- Painter reference priority.
- Vision invalid classification fallback.
- FreeformClassifier invalid classification fallback.
- InsertBeat empty output and POV lineDelivery behavior.
- Voice contract metadata.

## Maintenance Rules

1. Agent and skill files are internal infrastructure.
2. Do not change `/api/start`, `/api/scene`, Writer tag protocol, or provider
   fallback behavior as part of structure governance.
3. Add or update fixture coverage before moving parser, fallback, or prompt code.
4. Move one agent at a time.
5. After each agent change, run `pnpm agent:test` and `pnpm typecheck`.
6. When changing model routing, prompt protocol, or fallback semantics, update
   [refactor-plan.md](refactor-plan.md).

Recommended validation after agent changes:

```bash
pnpm agent:inventory
pnpm agent:test
pnpm typecheck
```

## Completion Boundary

This phase ends with the Agent System board in a stable baseline, not with every
historical file fully moved. The remaining work is incremental:

- Move more parser/fallback/prompt helpers into each agent directory.
- Split `contracts.ts` and `skills.ts` by agent when imports are ready.
- Add structured run trace for debugging.
- Add golden evals before model or prompt upgrades.
