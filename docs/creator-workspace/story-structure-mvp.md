# Story Structure MVP

Status: Implemented first pass.

This slice turns `StoryProject` from a flat planning form into a lightweight story structure editor. It is intentionally list-based: no graph canvas, no drag sorting, and no generated asset acceptance yet.

## Goal

Creators need a stable place to describe how a story unfolds before asking the runtime engine to generate a playable scene.

The structure layer introduces:

- Act: a larger story phase with a goal, conflict, pacing, and notes.
- Scene: a playable planning unit with location, cast, purpose, opening event, expected choices, emotional beat, and notes.
- Selected Act / Scene: the current source node used by playtest compilation.

## Implemented Schema

`StoryProject.structure` contains:

- `acts`
- `selectedActId`
- `selectedSceneId`

Each Act contains:

- `id`
- `title`
- `goal`
- `conflict`
- `pacing`
- `notes`
- `scenes`
- `source`

Each Scene contains:

- `id`
- `title`
- `location`
- `characters`
- `purpose`
- `openingEvent`
- `playerChoices`
- `emotionalBeat`
- `notes`
- `source`

Old projects are normalized with one default Act and one default Scene, so no manual migration is required.

## Studio Surface

The project detail editor now includes a `故事结构` section:

- Act list on the left.
- Scene list under each Act.
- Selected Act / Scene editor on the right.
- Add Act.
- Add Scene under selected Act.
- Playtest selected Scene.
- Show latest Scene playtest result summary.

Deletion and sorting are deliberately excluded from this first pass to avoid accidental content loss while the authoring model is still moving.

## Playtest Compiler

`compileStoryProjectToStartRequest(project)` now reads the selected Act and selected Scene.

The compiled `worldSetting` includes:

- selected Act title, goal, conflict, pacing, notes
- selected Scene title, location, characters, purpose, opening event, expected player choices, emotional beat, notes

The playtest build also returns:

- `sourceActId`
- `sourceSceneId`

`PlaytestRecord` stores these fields so later result recovery can be attached back to the correct planning node.

## Not Implemented Yet

- Delete Act / Scene.
- Reorder Act / Scene.
- Per-scene playtest button.
- Accept generated scene text or images back into the Scene.
- Store runtime generated scene snapshots under Scene.
- Publish selected structure into a release build or SKU.

## Next Steps

1. Add controlled deletion with confirmation.
2. Add simple up/down ordering.
3. Add generated result review and accept-back into the selected Scene.
4. Add dedicated per-scene playtest API paths if the generic project playtest route becomes ambiguous.
