# CharacterDesigner Agent

Owner: internal engine infrastructure.

The CharacterDesigner owns character card design, portrait rendering, and voice
resolution as internal stages behind the existing public functions.

Current migration state:

- Contract remains exported from `agent-system/contracts.ts`.
- Runtime implementation remains in `engine/agents/characterDesigner.ts`.
- Fixtures in this directory capture parser and fallback behavior.

