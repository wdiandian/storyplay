# Cloudflare Workers Deployment

Status: recommended first online deployment path.

The project already uses OpenNext for Cloudflare Workers:

```text
pnpm build:cf
pnpm deploy:cf
```

## Current Deployment Shape

Core player experience can run on Cloudflare Workers.

Studio MVP storage now supports:

```text
local dev -> .storyplay/studio/*.json
Cloudflare -> KV binding named KV
```

This keeps StoryProject, SKU drafts, and creator-published SKUs persistent after deploy.

## Required Cloudflare Resources

For the current online MVP, KV is required. Without KV, Studio project and SKU
publish data will not persist correctly on Cloudflare Workers.

Create a KV namespace:

```bash
pnpm exec wrangler kv namespace create KV
```

Copy the returned `id` into `wrangler.jsonc`:

```jsonc
"kv_namespaces": [
  {
    "binding": "KV",
    "id": "xxxx"
  }
]
```

Optional later:

- D1 for relational/project query storage
- R2 for generated images, uploaded references, audio, and exports

## Required Runtime Variables

Set these in Cloudflare Dashboard or with `wrangler secret put`.

Secrets:

```text
TEXT_API_KEY
IMAGE_API_KEY
VISION_API_KEY
```

Runtime variables:

```text
TEXT_BASE_URL
TEXT_MODEL
IMAGE_BASE_URL
IMAGE_MODEL
IMAGE_PROVIDER
VISION_BASE_URL
VISION_MODEL
MOCK_IMAGE=false
```

Optional:

```text
TTS_BASE_URL
TTS_API_KEY
TTS_SPEECH_MODEL
IMAGE_TIMEOUT_MS
IMAGE_HEDGE_MS
FAL_IMAGE_EDIT_MODEL
```

Public build-time variables, only if needed:

```text
NEXT_PUBLIC_IMAGE_PROXY_URL
NEXT_PUBLIC_IMAGE_PROXY_ALLOWED_HOSTS
NEXT_PUBLIC_UMAMI_SRC
NEXT_PUBLIC_UMAMI_WEBSITE_ID
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
```

## Deploy

Recommended on GitHub Actions, Linux, or WSL:

```bash
pnpm install
pnpm typecheck
pnpm build:cf
pnpm deploy:cf
```

OpenNext prints a warning on Windows and can fail while bundling middleware. If deploying from Windows, use WSL or GitHub Actions.

For the current recommended server deployment path, see [tencent-cloud-server.md](tencent-cloud-server.md).

## Post-Deploy Smoke Test

1. Open the homepage.
2. Start a preset story.
3. Open Studio runtime status:

```text
/api/studio/runtime-status
```

4. Create a StoryProject.
5. Publish it.
6. Refresh the page and verify the project still exists. This confirms KV storage is active.

## Known Limits

- KV is acceptable for the current single-user MVP and lightweight Studio state.
- KV is not the final multi-user database.
- Before real users, add auth, ownership checks, rate limits, and either D1 or Supabase for project records.
