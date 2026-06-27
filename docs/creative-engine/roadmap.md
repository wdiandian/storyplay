# StoryPlay Creative Roadmap

Status: Plan.

This document defines the next-stage development direction for `StoryPlay`.
It treats the current real-time generation engine as a reusable runtime, then
plans how the product should evolve into a creator-facing interactive story
platform.

## One-Sentence Direction

`StoryPlay` should evolve from a "generate-and-play" experience into a
"creator-controllable interactive story platform", while keeping the current
Creative Engine as the runtime foundation.

That means the next major work is not "add more homepage features". The next
major work is:

1. stabilize the product shell,
2. define creator-owned story assets,
3. build the minimum creator workflow on top of the engine,
4. add debugging and regeneration controls,
5. then move into heavier structured story editing.

## Product Position

Current state:

- The project can already generate and play a visual interactive story in real
  time.
- The product shell is still close to an adapted project, not a mature creator
  product.
- Creator-facing assets are mostly implicit inside runtime structures such as
  `Session`, `StoryState`, `characters`, `history`, `sceneKey`, and prompt
  segments.

Target state:

- User side: start, discover, continue, and play stories cleanly.
- Creator side: define story assets, preview results, regenerate selectively,
  inspect runtime output, and publish versions.
- Engine side: remain the execution layer, not the primary authoring surface.

## Core Principles

1. Do not treat runtime `Session` as the long-term authoring model.
2. Keep `agent-system/` as internal infrastructure, not a creator-editable
   layer.
3. Product configuration should compile down into runtime inputs; creators
   should not edit parsers, contracts, or skills directly.
4. Ship a lightweight creator workflow before attempting a full visual branch
   editor.
5. Build inspection and debugging before building advanced authoring UI.

## Three Main Workstreams

### 1. Product Workstream

Purpose: stabilize the user-facing product shell.

Scope:

- homepage creation entry,
- story discovery and category structure,
- playable entry routing,
- user story library,
- future publishing and sharing surfaces.

This workstream answers: what surfaces exist, how users enter them, and how the
product reads as `StoryPlay` rather than an adapted source project.

### 2. Creator Workstream

Purpose: turn hidden generation assets into explicit creator-owned data.

Scope:

- story concept,
- world setup,
- character assets,
- chapter / scene planning,
- interaction rules,
- creator settings and versioning.

This workstream answers: what a creator is actually editing.

### 3. Engine Workstream

Purpose: keep the current Creative Engine stable and make it consumable by
future creator tools.

Scope:

- runtime contracts,
- parser / fallback quality,
- agent fixtures and tests,
- session generation pipeline,
- story inspection and selective regeneration paths.

This workstream answers: how the authored project becomes a playable runtime.

## Recommended Development Sequence

The sequence should be strict:

1. product shell baseline,
2. creator data model,
3. minimum studio,
4. playtest + debugging loop,
5. structured scene editing,
6. publishing and analytics.

Skipping the data model and debugging layers would make later editor work
fragile and opaque.

## Phase Plan

### Phase 1. Product Shell Baseline

Goal: make `StoryPlay` read as a product, not a modified repository UI.

Includes:

- finalize the homepage MVP direction,
- keep top-level routes coherent,
- keep `Home / Create(or Studio) / My Stories / Play / Gallery` as the target
  navigation structure,
- finish visual cleanup and source-project residue removal,
- keep homepage scope narrow and creation-focused.

Exit criteria:

- the product shell clearly communicates "create and play interactive stories",
- homepage is no longer the main place where product complexity grows,
- creator workflow can be introduced without redesigning the whole shell again.

### Phase 2. Creator Data Layer

Goal: define a creator-owned project model separate from runtime `Session`.

Recommended new top-level model: `StoryProject`.

`StoryProject` should represent authoring state. `Session` should represent
runtime state.

Suggested `StoryProject` sections:

- `meta`
  title, subtitle, slug, language, cover, status
- `concept`
  premise, genre, tone, target fantasy, pacing
- `world`
  world setting, rules, locations, world books, glossary
- `characters`
  role cards, appearance cards, voice cards, relationships
- `narrative`
  story bible, protagonist framing, key mysteries, chapter goals
- `structure`
  chapters, scenes, seeds, branch anchors, fixed nodes vs AI nodes
- `interaction`
  choice rules, freeform policy, visual-click policy, lock rules
- `runtimePolicy`
  style, model strategy, prefetch policy, TTS policy, orientation
- `publish`
  draft build, playtest build, release build, share settings

Exit criteria:

- creator-state data is no longer conceptually mixed with runtime-state data,
- there is a clear transform path from `StoryProject` to playable `Session`.

### Phase 3. Minimum Studio

Goal: ship a lightweight creator workspace before any complex editor.

Recommended first entry:

- `/studio` as the creator workspace,
- `/create` can remain as a simplified story-start flow if needed,
- `/play` remains the runtime playback surface.

Recommended Studio v1 information architecture:

- Overview
  title, premise, progress, recent playtests, quick actions
- Story Setup
  concept, protagonist, genre, tone, pacing, world setup
- Characters
  character list, card editing, portrait regenerate, voice regenerate
- Scenes
  current generated scene history, scene summaries, choice seeds, lock state
- Playtest
  generate session from project, jump into `/play`, inspect outputs

Exit criteria:

- a creator can create a project,
- define basic story assets,
- generate a playable session,
- re-enter the project and continue editing.

### Phase 4. Debugging And Regeneration

Goal: remove the black-box feel from the current engine.

Required capabilities:

- inspect `plan / story / choices / memory`,
- inspect `scenePrompt / sceneKey / cast / active characters`,
- regenerate current scene text,
- regenerate current scene image,
- lock selected outputs,
- disable or constrain prefetch during playtest,
- record why a scene was generated from a given seed or interaction.

This phase is critical. Without it, Studio becomes a thin shell over an opaque
runtime and creators cannot work efficiently.

Exit criteria:

- creators can see what the engine decided,
- creators can selectively retry instead of replaying the whole flow blindly.

### Phase 5. Structured Story Editing

Goal: move from setup-driven generation into explicit narrative structure.

Potential features:

- chapter outline,
- scene manager,
- branch graph,
- fixed choice editing,
- hybrid authored nodes + AI nodes,
- world-book triggers,
- long-form memory layers,
- scene continuity locks.

This phase should start only after Phase 2 through Phase 4 are stable.

### Phase 6. Publishing And Consumption

Goal: turn creator output into a managed product artifact.

Potential features:

- draft / playtest / release versions,
- story sharing,
- export / import,
- save and replay,
- version comparison,
- analytics such as start rate, branch selection, completion rate.

## StoryProject vs Session

This boundary should stay explicit:

`StoryProject`

- creator-owned,
- durable,
- editable,
- versionable,
- used for planning and authoring.

`Session`

- runtime-owned,
- ephemeral or save-state based,
- used for play generation,
- derived from project configuration plus current play history.

Recommended flow:

`StoryProject -> Project Compiler / Session Builder -> Session -> /play`

Later, selected runtime outputs may be written back into the creator workflow,
but they should not collapse the two models into one.

## Minimum Creator Loop

The first complete creator loop should be:

1. create a `StoryProject`,
2. fill story setup,
3. define initial characters,
4. generate a playable `Session`,
5. playtest in `/play`,
6. inspect runtime artifacts,
7. regenerate or edit,
8. save back into the project.

If this loop is not complete, heavier editor work should wait.

## Immediate Next Deliverables

The next implementation documents and tasks should be:

1. `StoryProject` schema draft
2. Studio v1 information architecture
3. project-to-session transformation design
4. playtest debug drawer requirements
5. scene regeneration and lock policy

## Anti-Goals For The Next Stage

Do not prioritize these before the data layer and minimum studio exist:

- full node-based branch editor,
- creator access to low-level agent contracts or skills,
- premature multi-user collaboration,
- deep publishing workflows,
- analytics-heavy back office,
- broad homepage feature expansion.

## Current Priority Order

The practical order from here should be:

1. document the roadmap,
2. define `StoryProject`,
3. design `/studio`,
4. connect project -> playtest,
5. add debug / regeneration,
6. then expand into structured narrative tools.
