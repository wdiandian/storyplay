# Platform Infrastructure

Status: Plan / Current Map.

This section tracks StoryPlay platform infrastructure: agent runtime, model
API, server routes, runtime config, data layer, and deployment-facing concerns.
Detailed agent documents remain under `../agent-system/`.

## Scope

- Agent system: registry, contracts, parsers, fallbacks, fixtures, tests.
- Model API: text, image, vision, and TTS provider calls, routing, fallback,
  cost, limits, and BYOK behavior.
- Server API: generation, continuation, vision click, insert beat, audio,
  story packaging, studio routes.
- Runtime config: environment variables, provider keys, user-provided keys,
  deployment config.
- Data layer: database schema, repositories, Supabase, migrations.

## Main Code

- `lib/engine/agent-system/`
- `lib/engine/agents/`
- `lib/engine/director.ts`
- `lib/engine/orchestrator.ts`
- `lib/engine/vision.ts`
- `lib/engine/voice.ts`
- `lib/ai-client/`
- `lib/tts-client/`
- `lib/config.ts`
- `lib/db/`
- `lib/supabase/`
- `app/api/`

## Related Documents

- [../project-modules.md](../project-modules.md)
- [../agent-system/README.md](../agent-system/README.md)
- [../creative-engine/current-architecture.md](../creative-engine/current-architecture.md)
- [../integrations/README.md](../integrations/README.md)

## Model / Runtime Documents

- [model-infrastructure.md](model-infrastructure.md): official hosted models,
  BYOK, usage metering, billing, model routing, and admin controls.
- `api-map.md`: API route responsibilities, input/output contracts, and
  runtime call graph.
- `data-layer.md`: database schema, repositories, and migration strategy.
- `runtime-config.md`: environment variables, deployment config, and local
  development config.
