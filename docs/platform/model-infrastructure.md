# Model Infrastructure

Status: Plan.

This document defines the model platform direction for StoryPlay. The goal is
to support two product modes:

1. Official hosted models: users play without configuring API keys. StoryPlay
   pays providers and charges user credits / usage counts.
2. BYOK models: advanced users bring their own model keys. Their provider
   quota is used directly, and StoryPlay does not spend official model budget.

This document is the planning baseline for model routing, usage metering,
billing, provider keys, observability, and admin controls.

## Current State

The runtime currently has four model roles:

| Role | Current config | Main consumers |
| --- | --- | --- |
| Text | `TEXT_BASE_URL`, `TEXT_API_KEY`, `TEXT_MODEL`, `TEXT_PROVIDER` | Writer, StyleSelector, CharacterDesigner, Cinematographer, FreeformClassifier, InsertBeat |
| Image | `IMAGE_BASE_URL`, `IMAGE_API_KEY`, `IMAGE_MODEL`, `IMAGE_PROVIDER` | Character portraits, scene painting |
| Vision | `VISION_BASE_URL`, `VISION_API_KEY`, `VISION_MODEL`, `VISION_PROVIDER` | Background click interpretation, style image parsing |
| TTS | `TTS_BASE_URL`, `TTS_API_KEY`, `TTS_SPEECH_MODEL` | Dialogue audio |

The production path reads server environment variables through
`lib/config.ts`.

The BYOK path is partially implemented:

- `components/SettingsModal.tsx` lets users enter text / image / vision / TTS
  settings.
- `lib/clientModelConfig.ts` stores model settings in localStorage.
- `lib/engineClient.ts` chooses client-side BYOK execution when local settings
  exist, otherwise falls back to server API routes.
- `app/api/llm/user-proxy/route.ts` and `lib/byoProxy.ts` provide a CORS proxy
  fallback for user-provided keys.

The main gap is product and infrastructure maturity: model mode is inferred,
text model routing is too coarse, official usage is not metered as billable
events, and admin-side cost controls are not defined.

## Product Modes

### Official Mode

Official mode is the default consumer experience.

Users do not configure provider keys. Requests use StoryPlay-managed provider
credentials and approved model routes.

Official mode requirements:

- No API key setup in the player flow.
- Usage is charged to the user's StoryPlay balance or quota.
- Failed generation should not charge, or should be automatically refunded.
- Platform can change provider / model routing without user action.
- Platform can apply rate limits, daily caps, and abuse controls.

Recommended MVP billing shape:

| Action | Suggested initial charge | Notes |
| --- | ---: | --- |
| Generate opening scene | 10 credits | Full text + image + possible character assets |
| Generate next scene | 10 credits | Full scene pipeline |
| Vision click | 1 credit | Vision model only |
| Insert in-scene beat | 2 credits | Text only, no image |
| Freeform classify | 0 or 1 credit | Often needed for UX; can be absorbed |
| TTS line | 1 credit | Optional, potentially many calls |

The first billing version should charge fixed credits by action, not raw token
cost. Token / image / TTS usage should still be logged so pricing can be tuned
later.

### BYOK Mode

BYOK mode is for advanced users and development/testing.

Users provide their own model credentials for text, image, vision, and TTS.
Those keys are stored client-side unless a server proxy is required for CORS.

BYOK mode requirements:

- Users explicitly opt into BYOK mode.
- BYOK requests do not use StoryPlay official provider keys.
- BYOK requests do not consume official model credits.
- Optional later policy: charge a small service credit for storage, bandwidth,
  project publishing, or server proxy usage.
- The UI must clearly state that model cost is paid to the user's provider.

For MVP, BYOK should be free from StoryPlay model credits. This reduces
friction and keeps power users able to test models rapidly.

## Model Mode

Model access mode should be explicit, not inferred.

Recommended type:

```ts
export type ModelAccessMode = "official" | "byok";
```

Recommended request context:

```ts
export type ModelRunContext = {
  mode: ModelAccessMode;
  userId: string;
  requestId: string;
  billableKind: BillableUsageKind;
  chargePolicy: "charge" | "free" | "refund-on-failure";
};
```

The public product state should have a user-visible setting:

```text
Model Mode
- Official
- Bring Your Own Key
```

Do not rely only on "localStorage contains keys" as the product decision. That
is acceptable as a current fallback, but the platform should move toward an
explicit mode.

## Billable Usage Kinds

Model calls should be charged and logged by user-facing action, not only by
provider request.

Recommended initial enum:

```ts
export type BillableUsageKind =
  | "scene_opening"
  | "scene_next"
  | "scene_prefetch"
  | "vision_click"
  | "insert_beat"
  | "freeform_classify"
  | "tts_line"
  | "image_scene"
  | "image_portrait";
```

Notes:

- `scene_opening` and `scene_next` are composite actions. They may internally
  call Writer, CharacterDesigner, Cinematographer, Painter, portrait rendering,
  and voice provisioning.
- `image_scene` and `image_portrait` should be logged as internal cost events
  even if the user is charged only once for the full scene.
- `scene_prefetch` needs special handling. If prefetch becomes common, charge
  only when the prefetched scene is consumed, or keep a refundable pending
  ledger entry.

## Text Model Routing

The current `TEXT_MODEL` is shared by all text agents. This is simple but
expensive and hard to debug. StoryPlay should add per-agent text routing after
official mode is stable.

Recommended text roles:

```ts
export type TextModelRole =
  | "default"
  | "writer"
  | "character"
  | "cinema"
  | "classifier"
  | "insertBeat"
  | "style";
```

Recommended environment variables:

```text
TEXT_MODEL_DEFAULT=
TEXT_MODEL_WRITER=
TEXT_MODEL_CHARACTER=
TEXT_MODEL_CINEMA=
TEXT_MODEL_CLASSIFIER=
TEXT_MODEL_INSERT_BEAT=
TEXT_MODEL_STYLE=
```

Fallback rule:

```text
role model -> TEXT_MODEL_DEFAULT -> TEXT_MODEL
```

Recommended starting official routes:

| Text role | Suggested model | Reason |
| --- | --- | --- |
| Writer | `anthropic/claude-sonnet-4.6` | Best quality / protocol adherence for story generation |
| Character | `google/gemini-3.1-flash-lite` | Low-cost structured character cards |
| Cinema | `google/gemini-3.1-flash-lite` | English prompt translation, not full narrative |
| Classifier | `deepseek/deepseek-v4-flash` | Cheap classification / normalization |
| InsertBeat | `anthropic/claude-haiku-4.5` or `google/gemini-3.1-flash-lite` | Short prose, low latency |
| Style | `deepseek/deepseek-v4-flash` | Single-label selection |

The first implementation should add a helper instead of scattering role logic:

```ts
resolveTextConfig(config, "writer")
```

or:

```ts
withTextModel(config.text, "writer")
```

## Provider Gateway

The gateway should hide provider-specific details from the engine.

Responsibilities:

- Normalize OpenAI-compatible base URLs.
- Apply provider protocol defaults.
- Support streaming and non-streaming text.
- Support image generation providers separately from text.
- Support vision chat-completions with image input.
- Apply timeouts and retries consistently.
- Report normalized usage.
- Attach request IDs and model route metadata.

Current implementation lives in:

- `lib/ai-client/chat.ts`
- `lib/ai-client/image.ts`
- `lib/ai-client/vision.ts`
- `lib/tts-client/`
- `lib/byoProxy.ts`

Long-term, these should remain low-level adapters. Product decisions such as
model mode, billing, and route selection should live above them.

## Usage Metering

Every official model operation should write a usage record.

Recommended fields:

```ts
export type ModelUsageRecord = {
  id: string;
  requestId: string;
  userId: string;
  mode: ModelAccessMode;
  billableKind: BillableUsageKind;
  agentId?: string;
  modelRole: "text" | "image" | "vision" | "tts";
  textModelRole?: TextModelRole;
  provider: string;
  baseUrlHost: string;
  model: string;
  startedAt: string;
  endedAt: string;
  durationMs: number;
  success: boolean;
  fallbackUsed?: boolean;
  errorCode?: string;
  errorMessage?: string;
  promptTokens?: number;
  completionTokens?: number;
  cachedPromptTokens?: number;
  imageCount?: number;
  ttsCharacters?: number;
  creditsCharged?: number;
};
```

Usage records are observability facts. They are not the billing ledger.

## Billing Ledger

Credits should be tracked in an append-only ledger, not only by mutating a
balance field.

Recommended ledger entry:

```ts
export type CreditLedgerEntry = {
  id: string;
  userId: string;
  requestId?: string;
  kind:
    | "grant"
    | "purchase"
    | "charge"
    | "refund"
    | "adjustment";
  amount: number;
  billableKind?: BillableUsageKind;
  reason: string;
  createdAt: string;
};
```

MVP charge flow:

```text
1. Check balance before official request.
2. Create pending charge or reserve credits.
3. Run model pipeline.
4. On success, commit charge.
5. On failure, release reservation or write refund.
```

If pending reservations are too much for the first version, charge only after
success. This is simpler but does not prevent expensive requests from users
with insufficient balance unless there is a pre-check.

## Failure And Refund Policy

Suggested MVP policy:

- If a complete scene generation fails before returning a playable scene: no
  charge.
- If the model falls back but returns a playable scene: charge normally, but
  mark `fallbackUsed`.
- If image generation fails and mock/fallback image is returned: either charge
  partial credits or mark as degraded and do not charge image component.
- If TTS fails: do not charge the TTS line.
- If a BYOK provider fails: do not charge StoryPlay model credits.

## Admin Controls

The platform needs an admin-facing model operations view.

Initial controls:

- Official model config by role.
- Credit prices by `BillableUsageKind`.
- Per-user daily caps.
- Global provider kill switch.
- Fallback model config.
- Error rate and latency by model.
- Cost estimate by provider / model / billable kind.

This can start as environment variables plus logs. Later it should move to an
admin database table and UI.

## Recommended Implementation Phases

### Phase 0: Official Mode Launch

Goal: run production with official server keys.

Tasks:

- Configure `TEXT_*`, `IMAGE_*`, `VISION_*`, optional `TTS_*`.
- Use one strong text model for all text agents.
- Keep BYOK settings available but not central to the product flow.
- Verify `/api/start`, `/api/scene`, `/api/vision`, `/api/insert-beat`,
  `/api/classify-freeform`, and `/api/beat-audio`.

### Phase 1: Explicit Model Mode

Goal: make official vs BYOK a real product state.

Tasks:

- Add `modelMode: "official" | "byok"` to client settings.
- Update settings UI copy to separate official mode from BYOK.
- Keep official as default.
- Ensure BYOK never uses official provider keys.
- Ensure official mode ignores local BYOK keys unless the user explicitly
  switches modes.

### Phase 2: Usage Logs

Goal: observe real cost before charging users.

Tasks:

- Add model usage records.
- Attach `requestId` to scene, vision, classify, insert beat, and TTS routes.
- Record agent id, model, duration, success/failure, token usage when present.
- Add lightweight admin or script reporting.

### Phase 3: Credit Billing

Goal: charge official mode by user-facing action.

Tasks:

- Add user credit balance and ledger.
- Add fixed credit prices.
- Pre-check balance before expensive operations.
- Charge on success.
- Refund or skip charge on failure.
- Keep BYOK free from model credit charges.

### Phase 4: Text Model Routing

Goal: reduce official model cost without hurting story quality.

Tasks:

- Add text model role config.
- Route Writer to a high-quality model.
- Route classifiers, style selection, and cinema to cheap models.
- Add per-role fallback.
- Run `pnpm agent:test`, `pnpm typecheck`, and manual playthrough checks.

### Phase 5: Admin Model Console

Goal: operate model cost and reliability without code deploys.

Tasks:

- Store model route config in database.
- Store prices in database.
- Add admin UI for model routes, prices, caps, and kill switches.
- Add dashboards for failure rate, latency, token usage, image usage, and
  credit consumption.

## Open Decisions

- Should BYOK mode be fully free, or charge a small service credit for server
  proxy / storage / publish features?
- Should prefetched scenes charge at generation time or consumption time?
- Should official credits be bundled with subscriptions, one-time purchases,
  or both?
- Should creators pay for playtest generation separately from players?
- Should TTS be on by default in official mode, or opt-in because it can create
  many small calls?

## Near-Term Recommendation

For immediate production validation:

```text
Official mode:
  TEXT_MODEL=anthropic/claude-sonnet-4.6
  VISION_MODEL=google/gemini-3.1-flash-lite
  IMAGE_* unchanged from current working image provider
  TTS optional

BYOK mode:
  Keep existing localStorage-based settings.
  Reframe the UI as advanced / self-funded mode.
```

Then implement phases 1-3 before deeper per-agent routing, so commercial
behavior and user expectations are stable before optimizing cost.
