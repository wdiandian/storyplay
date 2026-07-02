# Creator Workspace: Asset, Blueprint, Fixed Runtime Roadmap

Status: Active direction.

This document replaces the earlier "fixed opening first" emphasis with a heavier creator workflow:

```text
Story idea
  -> story blueprint
  -> asset preproduction
  -> playtest
  -> fix accepted runtime path
  -> publish as Story SKU
  -> players consume fixed content first, AI continues only when needed
```

## Product Thesis

StoryPlay should not be only a live AI story generator. The creator MVP should become:

- AI-assisted authoring for the creator.
- Fixed playable story packages for distribution.
- Live generation as a fallback or extension layer.

This lowers runtime cost, improves first-play latency, makes quality easier to control, and gives creators a shareable artifact.

## Core Modules

### 1. Story Blueprint

The blueprint is the creative contract for generation and editing.

It should contain:

- World premise, rules, locations, social structure, taboos.
- Main goal, phase outline, required beats, ending direction.
- Character relationship map.
- Supporting cast notes.
- Guardrails for what must not happen.

The blueprint is not a scene-by-scene tree. It is a story rail that allows player variance while keeping the story moving toward the intended ending.

### 2. Asset Library

Assets are pre-produced or uploaded before publishing.

MVP asset types:

- Cover image.
- First scene image.
- Fixed character reference images for main characters.

Each asset should keep:

- `id`
- `kind`
- `url`
- `prompt`
- `source`: uploaded, generated, imported, manual
- `status`: empty, ready, failed
- optional provider/model metadata

This prepares the product for object storage. Local URL fields remain supported during MVP.

### 3. Interaction And Visual Strategy

The current "interaction intensity" is too vague. It should stay as a compatibility field in schema, but it should not be the primary creator control. Creator UI should expose operational settings:

- Play mode: read-heavy, choice-driven, free-explore.
- Choice density: low, medium, high.
- Branching mode: convergent, short-branch, multi-ending.
- Free input mode: off, playtest-only, always.
- Visual generation mode: first-scene-only, key-scenes, every-scene.

These settings can map to runtime policy and prompt constraints. They are also easier for creators to understand than "light/medium/strong interaction".

Current effectiveness:

| Field | Product meaning | Current behavior | Level |
| --- | --- | --- | --- |
| `freeformInputMode` | Whether players can type custom actions | Hard controls the play page input. `playtest-only` allows creator playtests and disables published player runs. | Hard |
| `playMode` | Reading-heavy, choice-led, or exploratory experience | Enters the compiled generation context and published SKU runtime metadata. | Prompt/runtime policy |
| `choiceDensity` | How often choices should appear | Enters the compiled generation context and published SKU runtime metadata. | Prompt/runtime policy |
| `branchingMode` | Whether branches return to mainline, stay short, or support multiple endings | Enters the compiled generation context and published SKU runtime metadata. | Prompt/runtime policy |
| `choiceStyle` | How choices should be written | Enters the compiled generation context. | Prompt |
| `branchNotes` | Creator notes for meaningful branches | Enters the compiled generation context. | Prompt |
| `visualGenerationMode` | Cost and image frequency preference | Stored in runtime metadata and visible to the play flow, but the engine still needs image scheduling work before it can hard-skip scene images. | Partial |
| `visual.stylePrompt` | Visual style for generated cover, first scene, and runtime images | Used as `styleGuide` in playtest generation and asset prompts. | Prompt |
| `visual.cover` / `visual.firstScene` | Prepared images | Maintained through the asset library and publish preview. Manual URL fields are no longer primary UI. | Asset metadata |
| `interaction.intensity` | Legacy broad intensity | Kept only for old projects/import compatibility. It should not be edited in the main UI. | Legacy |

### 4. Fixed Runtime Package

After playtesting, the creator can accept a generated run and freeze it into a package.

Fixed package goals:

- Let players replay accepted story content without calling the model each time.
- Allow sharing a specific generated path.
- Allow the creator to keep editing and republish later.
- Keep live AI continuation available after the fixed package ends or when the player exits the fixed path.

MVP fixed package can start with:

- accepted scene list
- current beat graph
- images
- character state
- story state
- source playtest id

## First Implementation Slice

Do not immediately delete the old opening package runtime path. It is already part of the publish flow. Instead:

1. Rename the product concept in UI from "fixed first scene" toward "opening runtime seed" or "first playable scene".
2. Add StoryProject fields for asset library and blueprint expansion.
3. Add UI for cover / first scene / character reference assets.
4. Replace the visible "interaction intensity" control with concrete strategy controls.
5. Keep the old `openingPackage` schema as a compatibility layer until fixed runtime package exists.

## Creator Editor IA After Cleanup

The editor should avoid making creators fill the same intent in multiple places.

Main flow:

1. Basic info: title, core promise, synopsis, protagonist/player position, core conflict, audience, tags.
2. World: setting, rules, locations, tone.
3. Story Blueprint: main goal, phase outline, required beats, ending direction, guardrails.
4. Opening playable slice: compatibility layer for the current first-scene publishing path.
5. Asset Library: cover, first scene image, main character references.
6. Interaction Strategy: play mode, choice density, branching mode, free input mode, choice style, branch notes.
7. Visual Strategy: visual generation frequency and style prompt.

Fields that are still useful but should not dominate the MVP editing flow:

- Relationship arc.
- Supporting cast / factions.
- Creator notes.
- Full act / scene structure editor.

These can remain in the schema and compiler, and can return later as advanced panels or AI assistant targets.

## Roadmap

### Phase A: Schema And Editor Reframe

Goal: make the creator workspace data model match the new product direction.

Tasks:

- Add `assets` to StoryProject.
- Add richer `storyBlueprint` fields or extend `storyOutline`.
- Add `fixedRuntimePackages` placeholder type.
- Add character reference image fields.
- Update editor sections:
  - Story Blueprint
  - Characters And Relationships
  - Asset Library
  - Interaction And Visual Strategy
- Keep publish/playtest behavior compatible.

### Phase B: Asset Generation And Upload

Goal: creators can prepare visual assets before first play.

Tasks:

- Cover generation modal.
- First scene image generation modal.
- Character reference image generation for main characters.
- Upload support.
- Store image URLs through the existing project save path.
- Later: move files to object storage.

### Phase C: Agent Consumption

Goal: generation uses creator-authored assets and blueprint fields.

Tasks:

- Feed character reference images into Painter reference priority.
- Feed character relationship map into Writer and CharacterDesigner.
- Feed visual strategy into image generation policy.
- Feed play mode, choice density, and branching mode into Writer prompts.
- Add tests around compiler output and prompt payload.

### Phase D: Fixed Runtime Package

Goal: accepted playtests become reusable player content.

Tasks:

- Store playtest runtime scenes.
- Add "accept as fixed package" from playtest result.
- Publish SKU with fixed package metadata.
- `/play` loads fixed package first.
- AI continuation starts only after the fixed package ends or when the player takes an unsupported path.

MVP status:

- Implemented: playtest writes back recorded runtime history, selected playtest can be fixed into a runtime package, publish includes the package, and `/play` loads it before live generation.
- Current limitation: fixed package stores the accepted linear path and replays recorded choices. Full package versioning, share links, analytics, and creator-side branch editing remain deferred.

### Phase E: Sharing And Cost Control

Goal: fixed content becomes a distribution asset.

Tasks:

- Share fixed story path.
- Track fixed package usage.
- Add package versioning.
- Add cost policy: fixed content, limited AI continuation, full AI sandbox.

## Deferred Features

- Full node graph editor.
- Collaborative editing.
- Asset version comparison.
- Multi-character pose sheet editor.
- Advanced branching analytics.
- Marketplace-level content moderation.

