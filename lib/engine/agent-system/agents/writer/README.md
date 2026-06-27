# Writer Agent

Owner: internal engine infrastructure.

The Writer owns scene planning, story prose, choices, and memory updates. Its
runtime protocol is intentionally not creator-editable.

Current migration state:

- Contract remains exported from `agent-system/contracts.ts`.
- Runtime implementation remains in `engine/agents/writer.ts`.
- Fixtures in this directory are used by smoke tests before further file splits.

