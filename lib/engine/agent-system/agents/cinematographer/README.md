# Cinematographer Agent

Owner: internal engine infrastructure.

The Cinematographer turns Writer scene intent into an image-composition prompt.
It must preserve POV constraints and output a stable `shotType` plus English
`integratedPrompt`.

Current migration state:

- Contract remains exported from `agent-system/contracts.ts`.
- Prompt helpers remain in `engine/prompts.ts`.
- Fixtures in this directory capture parser and fallback behavior.

