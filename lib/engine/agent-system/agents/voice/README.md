# Voice Agent

Owner: internal engine infrastructure.

The Voice agent covers per-beat speech synthesis. Character voice provisioning
remains an internal CharacterDesigner stage.

Current migration state:

- Contract remains exported from `agent-system/contracts.ts`.
- Runtime implementation remains in `engine/voice.ts` and provider resolution in
  `engine/orchestrator.ts`.
- Fallback behavior remains silent audio degradation.

