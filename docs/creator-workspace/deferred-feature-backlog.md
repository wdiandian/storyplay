# Creator Workspace Deferred Feature Backlog

Status: Backlog.

This file records planned creator features that are intentionally not part of the minimum publish MVP.

The current MVP priority remains:

```text
StoryProject -> Story SKU -> homepage/story list -> /play
```

Everything below should be revisited after that loop works end to end.

The immediate next creator milestone is documented in [opening-package-editor.md](./opening-package-editor.md). That milestone is not considered deferred because it directly improves the core creator MVP: fixed first-scene authoring.

## A. Story Structure Editor

Purpose:

- Help creators plan a story as Acts and Scenes.
- Make story intent more structured than a single synopsis.

Important boundary:

- Current Act / Scene planning is not a full plot tree.
- The next MVP should focus on `Opening Package`, not a broad Act / Scene management tool.

Already partially implemented:

- `StoryProject.structure`
- Act list
- Scene list
- selected Act / Scene editor
- basic add Act / add Scene

Deferred:

- delete Act / Scene with confirmation
- reorder Act / Scene
- collapse / expand long structures
- scene templates
- validation by structure completeness
- graph or node view

Still deferred after Opening Package:

- multi-scene authored graph
- conditions
- state mutations
- endings
- visual plot-tree editor

## B. Scene Playtest

Purpose:

- Let creators test one planned Scene instead of the whole project.
- Attach playtest results back to the source Scene.

Already partially implemented:

- Scene-level playtest action
- `sourceActId`
- `sourceSceneId`
- filtered playtest list for selected Scene
- `Scene.lastPlaytest`

Deferred:

- dedicated scene playtest API route
- retry / duplicate playtest actions
- compare multiple playtests for one Scene
- mark one playtest as preferred
- full multi-scene completion callback

## C. Generated Result Review

Purpose:

- Let creators decide whether AI-generated playtest output should become part of the project.

Deferred:

- accept generated summary into Scene notes
- accept generated first scene key as location reference
- accept generated image URL as visual reference
- reject / archive generated result
- show generated result diff against original Scene plan
- store accepted generated artifacts separately from author-written source fields

## D. Character Asset Editor

Purpose:

- Let creators define and lock reusable characters.

Deferred:

- character card editor
- role / relationship editor
- portrait reference
- voice notes / voice reference
- lock character identity across scenes
- attach characters to Scenes

## E. Versioning And Build History

Purpose:

- Make publish/playtest history understandable as versions.

Deferred:

- Draft Build
- Playtest Build
- Release Build
- version notes
- rollback
- duplicate project
- compare builds

## F. Moderation, Ownership, Collaboration

Purpose:

- Support real deployment and multi-user creator workflows.

Deferred:

- account ownership
- permissions
- review / approval status
- moderation flags
- audit log
- collaboration

## Development Rule

Do not resume these items until the minimum publish loop is working:

1. Create StoryProject.
2. Publish StoryProject as Story SKU.
3. Show published SKU on discovery surfaces.
4. Start `/play` from the published SKU.
