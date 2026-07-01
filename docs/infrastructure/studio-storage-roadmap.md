# Studio Storage Roadmap

Status: Foundation implemented / Cloudflare KV MVP adapter implemented / Production database adapters pending.

This document defines the storage direction for Creator Workspace and SKU management. The goal is to keep local MVP development fast while making server deployment a provider swap instead of a product rewrite.

## Current State

### StoryProject

Implemented store interface:

- `listProjects`
- `getProject`
- `saveProject`
- `deleteProject`

Current provider:

```text
file -> .storyplay/studio/projects.json
cloudflare -> KV key studio:story-projects:v1
```

Code:

```text
lib/storyProject/store.ts
```

### SKU Draft

Implemented store interface:

- `listDrafts`
- `saveDraft`
- `deleteDraft`
- `clearDrafts`

Current provider:

```text
file -> .storyplay/studio/sku-drafts.json
cloudflare -> KV key studio:story-sku-drafts:v1
```

### Published Story SKU

Implemented store path:

```text
file -> .storyplay/studio/published-skus.json
cloudflare -> KV key studio:published-story-skus:v1
```

Code:

```text
lib/storySku/draftStore.ts
```

## Why SKU Storage Is Included

SKU is not the main authoring system, but it is part of the deployment and publishing boundary.

The expected flow is:

```text
StoryProject -> Playtest Build -> Publish Candidate -> Story SKU -> Homepage / Story List
```

If StoryProject uses production storage while SKU draft/publish state remains file-only, the publish bridge will need to solve storage twice. Therefore SKU storage should share the same provider strategy, but SKU UI and SKU product scope should stay secondary for now.

## Deployment Implications

The current file provider is good for:

- Local development.
- MVP validation.
- Single-machine demos.
- API and UI contract testing.

The current file provider is not enough for:

- Vercel serverless deployment.
- Cloudflare Workers deployment.
- Multi-user projects.
- Multi-instance servers.
- Account ownership and permissions.
- Long-lived production assets.

Production deployment needs:

- Database storage for project and SKU records.
- Object storage for covers, scene images, references, audio, and project bundles.
- Ownership and permission checks at the API boundary.

For the current single-user online MVP, Cloudflare KV is enough to keep Studio projects and creator-published SKUs from disappearing after deploy. It is not the final multi-user storage layer.

## Recommended Production Shape

### Option A: Supabase / Postgres

Best for fast product validation.

Recommended tables:

```sql
story_projects (
  id text primary key,
  owner_id text not null,
  title text not null,
  status text not null,
  schema_version integer not null,
  project_json jsonb not null,
  created_at timestamptz not null,
  updated_at timestamptz not null
);

story_sku_drafts (
  id text primary key,
  owner_id text not null,
  sku_id text not null,
  draft_json jsonb not null,
  created_at timestamptz not null,
  updated_at timestamptz not null
);
```

Keep `project_json` as JSON first. Do not split every StoryProject subfield into columns until the editor and query needs stabilize.

### Option B: Cloudflare D1 / R2

Best for Cloudflare-first deployment.

Recommended tables:

```sql
story_projects (
  id text primary key,
  owner_id text not null,
  title text not null,
  status text not null,
  schema_version integer not null,
  project_json text not null,
  created_at integer not null,
  updated_at integer not null
);

story_sku_drafts (
  id text primary key,
  owner_id text not null,
  sku_id text not null,
  draft_json text not null,
  created_at integer not null,
  updated_at integer not null
);
```

Use R2 for generated images, uploaded references, audio, and exported bundles.

## Provider Roadmap

### Phase 1: Local Provider

Done.

- StoryProject file provider.
- SKU draft file provider.
- API routes depend on the store abstraction, not raw filesystem code.

### Phase 2: Database Adapter

Partially done for Cloudflare MVP via KV. Full database adapter remains the next production step.

- Add `DatabaseStoryProjectStore`.
- Add `DatabaseStorySkuDraftStore`.
- Keep the same store method contracts.
- Select provider using environment config.
- Add ownership fields after auth boundary is confirmed.

Suggested env shape:

```text
STUDIO_STORE_PROVIDER=file | d1 | supabase
```

### Phase 3: Asset Storage

Initial local provider implemented for the single-server MVP.

- Generated/uploaded creator images are stored under `public/studio-assets`.
- The public URL is `/studio-assets/...`.
- Docker deployment should mount `/app/public/studio-assets` as a persistent volume.
- Future production providers should move these objects to Tencent COS, R2, or Supabase Storage.
- Store images/audio in object storage for multi-instance production.
- Keep StoryProject fields as asset references, not inline base64.
- Add cleanup rules for deleted projects and discarded generations.

Current env:

```text
STUDIO_ASSET_PUBLIC_BASE_URL=/studio-assets
```

Current local storage code:

```text
lib/storyProject/assetStorage.ts
```

### Phase 4: Publish Bridge

After project editor and playtest are stable.

- Compile StoryProject into a publish candidate.
- Save candidate as SKU draft.
- Review and publish SKU to homepage/story list source.
- Preserve source project ID and build version.

## Development Rule

Product code should call store methods, not read or write `.storyplay` directly.

Allowed:

```ts
const store = getStoryProjectStore();
await store.saveProject(project);
```

Avoid:

```ts
writeFile(".storyplay/studio/projects.json", ...);
```

This keeps local MVP, server deployment, and future database migration aligned.
