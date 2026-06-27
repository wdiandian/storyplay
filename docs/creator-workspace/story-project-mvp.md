# StoryProject MVP

Status: Implemented foundation / Editor pending.

This document records the first implemented Creator Workspace slice. The goal is to establish `StoryProject` as the authoring source of truth before building heavier story editing tools.

## What This Phase Solves

The project now has a separate authoring model for creators:

- `StoryProject` is the long-lived editable story project.
- Story SKU remains the distribution and homepage package.
- Runtime `Session` remains the play experience state.

This avoids treating preset homepage SKU data as the main creative source.

## Implemented Surface

### Routes

- `/studio/projects`
  - Lists local story projects.
  - Shows project status, audience, tags, generation state, and update time.
  - Links to project detail shells.

- `/studio/projects/new`
  - Creates a new story project from a lightweight brief.
  - Captures title, logline, synopsis, audience, genres, moods, world setting, protagonist, conflict, tone, and visual style.

- `/studio/projects/[projectId]`
  - Editable project editor MVP.
  - Supports editing and saving core authoring fields through `PUT /api/studio/projects/:id`.
  - Supports lightweight Act / Scene structure editing.
  - Shows project-side PlaytestRecord list and selected playtest build details.
  - Keeps character assets, complex scene graph editing, playtest generation, and publish bridge as later areas.

### API

- `GET /api/studio/projects`
  - Returns all projects.

- `POST /api/studio/projects`
  - Creates a project.
  - Requires a title and at least one of logline or synopsis.

- `GET /api/studio/projects/:id`
  - Returns one project.

- `PUT /api/studio/projects/:id`
  - Updates one project.

- `DELETE /api/studio/projects/:id`
  - Deletes one project.

- `POST /api/studio/projects/:id/playtest`
  - Compiles one StoryProject into the current `/play?custom=1` start payload.
  - Returns `worldSetting`, `styleGuide`, orientation, language, and compile warnings.
  - Creates a lightweight project-side PlaytestRecord.
  - Marks the project as playtest-ready without directly calling the generation model.

### Storage

Projects are stored locally at:

```text
.storyplay/studio/projects.json
```

This matches the current SKU draft storage strategy and keeps the first phase independent from auth, user permissions, collaboration, and database migration.

Storage access is now behind a provider interface. See:

- [../infrastructure/studio-storage-roadmap.md](../infrastructure/studio-storage-roadmap.md)

## Schema Scope

The implemented schema covers:

- Basic metadata: title, logline, synopsis, language, audience, tags.
- Creative taxonomy: genres and moods.
- World: setting, rules, tone, locations.
- Narrative: protagonist, core conflict, mysteries, chapter goals, creator notes.
- Structure: Acts, Scenes, selected Act, and selected Scene.
- Characters: reserved editable character assets.
- Interaction policy: intensity, choice style, branch notes, freeform input.
- Visual direction: style prompt, cover, first scene.
- Runtime policy: orientation, style guide, TTS toggle, prefetch depth.
- Generation state: first-act path and status placeholders.
- Publish state: draft/playtest/published and optional SKU binding.

## Playtest Compile MVP

The first playtest bridge reuses the existing live `/play?custom=1` path.

Flow:

```text
StoryProject editor
  -> save project
  -> POST /api/studio/projects/:id/playtest
  -> compile StoryProject into StartRequest
  -> append PlaytestRecord to StoryProject
  -> write sessionStorage("storyplay:custom")
  -> open /play?custom=1
  -> existing /api/start or client engine generates the first playable scene
  -> PATCH /api/studio/projects/:id/playtests/:playtestId
  -> write session id and first-scene result back to StoryProject
```

This keeps the first bridge small. It does not store a generated runtime build yet; it records that a playtest build was created, turns project fields into the same payload the current play page already understands, and writes back the first successful playable scene result.

Current PlaytestRecord fields:

- `id`
- `status`
- `createdAt`
- `updatedAt`
- `sourceProjectUpdatedAt`
- `startRequest`
- `warnings`
- `sessionId`
- `summary`
- `firstSceneId`
- `firstSceneKey`
- `firstSceneImageUrl`
- `sceneCount`
- `characterCount`
- `notes`

The editor currently shows:

- recent playtest records
- selected playtest status and ID
- source project update time
- recovered session ID and first-scene summary when `/play` starts successfully
- warning count and warning messages
- compiled start input summary

### Playtest Result Callback

`PATCH /api/studio/projects/:id/playtests/:playtestId` accepts the minimal first-scene result from `/play`.

Current callback payload:

- `status`
- `sessionId`
- `summary`
- `firstSceneId`
- `firstSceneKey`
- `firstSceneImageUrl`
- `sceneCount`
- `characterCount`
- `notes`

The `/play` page calls this route after the first scene has been generated and the initial runtime `Session` has been created. The callback is intentionally non-blocking: if the writeback fails, the player still enters the playtest.

## Not Implemented Yet

The following remain intentionally out of scope for this slice:

- Complex chapter and scene graph editing.
- Character asset editor.
- Project to runtime `Session` compiler.
- Stored runtime playtest builds.
- Full playtest completion callbacks after later scenes and ending states.
- Backwriting accepted playtest artifacts into the project.
- Publishing a project into a Story SKU.
- Database persistence and account ownership.

## Roadmap Correction

The minimum creator MVP is not deeper Act / Scene editing. The priority is:

```text
StoryProject -> Story SKU -> homepage/story list -> /play
```

See [creator-mvp-publish-loop.md](./creator-mvp-publish-loop.md).

Act / Scene structure and Scene Playtest remain useful later upgrades, but they should not block the publishable story flow.

## Next Roadmap

1. Publish bridge
   - Convert a StoryProject into a Story SKU candidate.
   - Store source project metadata on the SKU.
   - Keep SKU as the distribution package, not the authoring source.

2. Discovery integration
   - Show creator-published SKUs on homepage/story list.
   - Keep preset stories untouched.
   - Add a local/creator category if needed.

3. Player start
   - Let a player click the published SKU and enter `/play`.
   - Reuse the existing custom start payload for MVP if that is the shortest path.

4. Creator enhancements
   - Scene-level playtest loop.
   - Structure editing controls.
   - Generated result review and accept-back.
