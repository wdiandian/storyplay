# StyleSelector Agent

Owner: internal engine infrastructure.

The StyleSelector maps a story premise to one built-in visual style. It cannot
create new creator-editable styles through the agent contract.

Current migration state:

- Contract remains exported from `agent-system/contracts.ts`.
- Runtime implementation remains in `engine/agents/styleSelector.ts`.
- Fixtures in this directory capture runtime fallback and contract metadata.

