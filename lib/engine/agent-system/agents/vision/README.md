# Vision Agent

Owner: internal engine infrastructure.

The Vision agent interprets annotated background clicks and classifies them as
in-scene interaction or scene change.

Current migration state:

- Contract remains exported from `agent-system/contracts.ts`.
- Runtime implementation remains in `engine/vision.ts`.
- Parser and fallback currently live in the runtime call site.

