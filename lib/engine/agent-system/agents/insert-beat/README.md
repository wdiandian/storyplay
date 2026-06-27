# InsertBeat Agent

Owner: internal engine infrastructure.

The InsertBeat agent creates one transient in-scene response to a player action.
It must not introduce new characters, change scenes, or render a new image.

Current migration state:

- Contract remains exported from `agent-system/contracts.ts`.
- Runtime implementation remains in `engine/director.ts` and `engine/orchestrator.ts`.
- Parser and fallback currently live in the runtime call site.

