# Agent Directories

This directory is the governance home for StoryPlay internal agents. These
files are engine infrastructure and are not creator-editable.

Runtime code is still being migrated incrementally. During R1/R2, each agent
directory first receives ownership notes and fixtures; contract, skill, parser,
prompt, and fallback files move here only after focused regression coverage
exists.

| Agent | Runtime today | Fixture status |
| --- | --- | --- |
| writer | `engine/agents/writer.ts` | plan coercion |
| style-selector | `engine/agents/styleSelector.ts` | runtime fallback |
| character-designer | `engine/agents/characterDesigner.ts` | invalid JSON fallback |
| cinematographer | `agent-system/contracts.ts`, `engine/prompts.ts` | empty output fallback |
| painter | `engine/agents/painter.ts` | reference priority |
| vision | `engine/vision.ts` + `agent-system/agents/vision/parser.ts` | invalid classify fallback |
| freeform-classifier | `engine/orchestrator.ts` + `agent-system/agents/freeform-classifier/parser.ts` | invalid classify fallback |
| insert-beat | `engine/director.ts`, `engine/orchestrator.ts` + `agent-system/agents/insert-beat/parser.ts` | empty output fallback, POV lineDelivery |
| voice | `engine/voice.ts`, `engine/orchestrator.ts` | contract metadata |

Migration rule:

1. Add or update fixture first.
2. Move parser / fallback / prompt helper for one agent only.
3. Keep the public API and model protocol unchanged.
4. Run `pnpm agent:test` and `pnpm typecheck`.
