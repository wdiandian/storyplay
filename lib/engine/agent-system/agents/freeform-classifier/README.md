# FreeformClassifier Agent

Owner: internal engine infrastructure.

The FreeformClassifier classifies player free text at a choice node as an
in-scene beat or a scene change.

Current migration state:

- Contract remains exported from `agent-system/contracts.ts`.
- Runtime implementation remains in `engine/orchestrator.ts`.
- Parser and fallback currently live in the runtime call site.

