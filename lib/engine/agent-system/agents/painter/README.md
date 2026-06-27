# Painter Agent

Owner: internal engine infrastructure.

The Painter owns final scene image generation. It is an image agent, not a text
LLM agent, and must preserve reference image priority and image fallback paths.

Current migration state:

- Contract remains exported from `agent-system/contracts.ts`.
- Runtime implementation remains in `engine/agents/painter.ts`.
- Fixtures in this directory capture reference collection behavior.

