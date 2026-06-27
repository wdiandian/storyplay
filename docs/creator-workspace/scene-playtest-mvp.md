# Scene Playtest MVP

Status: Implemented first pass.

This slice makes a selected Scene the practical unit for creator validation.

## What Changed

- The Story Structure editor exposes a `试玩此场景` action beside the selected Scene.
- Playtest creation still uses `POST /api/studio/projects/:id/playtest`, but the compiler reads the selected Act / Scene.
- `PlaytestRecord` stores `sourceActId` and `sourceSceneId`.
- The right-side playtest list now prioritizes records for the selected Scene.
- The selected Scene stores a lightweight `lastPlaytest` result when `/play` writes back the first generated scene.

## Scene Result Shape

`StoryProjectScene.lastPlaytest` stores:

- `playtestId`
- `status`
- `updatedAt`
- `sessionId`
- `summary`
- `firstSceneId`
- `firstSceneKey`
- `firstSceneImageUrl`
- `sceneCount`
- `characterCount`

This is intentionally a result summary, not accepted source content. The creator's planned Scene fields remain separate.

## Flow

```text
Selected Scene
  -> 试玩此场景
  -> save StoryProject if dirty
  -> create PlaytestRecord with sourceActId/sourceSceneId
  -> /play?custom=1
  -> first scene generated
  -> PATCH PlaytestRecord
  -> copy minimal result into StoryProject.structure.acts[].scenes[].lastPlaytest
```

## Not Implemented Yet

- Accept generated summary into Scene purpose or notes.
- Accept generated image URL as visual reference.
- Dedicated per-scene playtest API path.
- Delete / reorder Scene records.
- Full multi-scene completion callback.
