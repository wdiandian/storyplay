# StoryPlay Design System

Status: Current UI Baseline / Design Reference.

This is the working product UI baseline for the `StoryPlay` to `StoryPlay`
conversion. It deliberately replaces the earlier Clay-heavy direction with a
more product-specific composite reference.

Reference index: [design-references/getdesign-reference-index.md](design-references/getdesign-reference-index.md).

## Product Position

StoryPlay is an AI interactive visual story product. The homepage is not a
marketing page, an open-source project page, a chat clone, or a generic AI
factory. It should make one action obvious: start or continue a playable story.

Design goals:

- Make the prompt and story presets feel like the product, not decoration.
- Keep generated story art as the most expressive visual layer.
- Keep controls quiet, readable, and task-focused.
- Avoid unrelated repository, team, protocol, social, or community surfaces in
  the core product shell.
- Change UI in small passes from the restored baseline, with screenshot checks
  after each meaningful pass.

## External Reference Mix

| Reference | Adopt | Avoid |
| --- | --- | --- |
| Notion | Calm structure, readable hierarchy, understated controls | Blank-document emptiness |
| Claude | Warm AI prompt focus, clear creation affordance, restrained copy | Assistant/chat dominance |
| Pinterest | Image-first discovery flow, scannable card rhythm | Pure social feed behavior |
| PlayStation | Game-like media card polish, hover/focus confidence | Console-store heaviness |
| Runway | Cinematic playback/generation surfaces | Using media-editor chrome on homepage |
| Clay | Soft craft and tactility as a minor accent | Clay as the whole visual identity |

## Theme Direction

Support light and dark mode from the beginning, but do not make dark mode the
only identity.

- Light mode: Claude-like warm paper canvas, near-black text, shallow beige
  cards, muted sage, and a restrained clay-orange action color.
- Dark mode: warm black canvas, paper text, muted warm surfaces, and a lifted
  clay-orange action color for contrast.
- Both modes must keep text contrast strong and avoid neon/cyberpunk styling.
- Theme state persists in `localStorage.storyplay:theme`.

### Proposed Tokens

| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| `--sp-bg` | `#efeae0` | `#1a1a1a` | Page canvas |
| `--sp-surface` | `#f7f2e8` | `#23211e` | Inputs, menus, modals |
| `--sp-surface-muted` | `#e5dfd2` | `#2f2b25` | Secondary controls |
| `--sp-border` | `#d7d0c3` | `#4a4035` | Hairline borders |
| `--sp-text` | `#1a1a1a` | `#efeae0` | Primary copy |
| `--sp-text-muted` | `#6f695f` | `#c9c0b2` | Secondary copy |
| `--sp-accent` | `#cd6f47` | `#d9825b` | Primary action and active state |
| `--sp-accent-soft` | `#ead0c1` | `#4f3025` | Soft emphasis |
| `--sp-story` | `#1a1a1a` | `#efeae0` | "story" / "故事" semantic word |
| `--sp-play` | `#cd6f47` | `#d9825b` | "play" / "体验" semantic word |
| `--sp-focus` | `#6b8a6f` | `#bdcec0` | Focus ring and success state |

These tokens follow the Claude reference palette: warm paper, shallow beige
cards, strong black, clay orange, and sage greens. Orange is used for action and
the "play/体验" semantic word; sage is reserved for focus and quiet support.

## Typography

- Use `Noto Serif SC` for Chinese hero, brand, and creative input text, with
  Inter for compact controls. This keeps the product warmer and less technical.
- Brand wordmark: compact, 900 weight; `story` is neutral text and `play` uses
  the clay-orange primary color.
- Hero headline: 800-900 weight, not slogan-heavy. In Chinese, use a title where
  "故事" appears before "体验" so it can map to story/play.
- Body/UI: 400-600 weight, short labels, no decorative letter spacing.
- Story content can be more literary than product chrome, but homepage controls
  should stay practical.

## Shape And Spacing

| Pattern | Radius | Use |
| --- | --- | --- |
| Small controls | 8-10px | Buttons, selects, compact menus |
| Inputs and panels | 12-16px | Prompt field, dropdown panels |
| Story cards | 16-20px | Preset cards and gallery items |
| Pills | 9999px | Categories and compact filters |

Spacing rules:

- Keep first-screen vertical rhythm compact enough that prompt and first row of
  stories are visible on common laptop heights.
- Do not nest cards inside cards.
- Avoid full-screen decorative sidebars until navigation structure is real.
- Avoid floating ornamental blobs, heavy gradients, or one-note palettes.

## Homepage Rules

### Header

- Left: StoryPlay wordmark.
- Right: language, settings, user state, and later theme toggle.
- No GitHub, X/Twitter, team, repository, protocol, or legal links.
- Keep navigation Chinese/localized where visible in the Chinese product flow.

### Hero And Prompt

The restored homepage baseline is the starting point.

- Keep the prompt central and product-relevant.
- Do not copy unrelated screenshot layouts literally.
- The large input can become richer, but only with controls that already map to
  the product: gender, art style, plot style, pacing, import, start.
- The sentence equivalent to "杈撳叆鎯虫硶銆侀厤缃鏍?.." should be reduced into a
  compact hint or helper affordance, not repeated as visible instructional body
  copy.
- Do not add unexplained buttons, modes, badges, or fake product features.

### Categories

Categories are a discovery taxonomy, not hero decoration.

- Place categories directly above the story grid or as a compact sticky filter
  attached to the grid header.
- Initial taxonomy can be UI-only: Featured, Romance, Suspense, Fantasy,
  Sci-Fi, Slice.
- Do not mutate child SKU/story data until the content model is designed.
- Mobile categories should scroll horizontally.

### Story Cards

- Preserve the current card mechanics unless there is a concrete improvement.
- Increase scan clarity before changing visual language.
- Story image remains dominant.
- Title and start affordance should be readable without hover on mobile.
- Hover/focus may add a subtle outline, lift, or action reveal on desktop.
- Avoid tiny cards on desktop; prefer fewer columns over cramped cards.
- Do not invent metadata that is not backed by data.

### Sidebar

Sidebar is planned, not mandatory for the first homepage polish pass.

- Character.AI is only a reference for future recent-story navigation.
- If introduced, it must be Chinese/localized and should support real routes:
  Home, New Story, My Stories, Gallery/Explore, Settings.
- Do not add the old project as a main nav item in the first MVP.
- Mobile should use a drawer only when navigation density justifies it.

## Play And Media Pages

Use the same tokens, but allow more cinematic treatment:

- Dark surfaces can be stronger on `/play`.
- Runway-like media preview patterns are allowed around generated scenes.
- Controls should remain compact and readable; do not turn playback into a
  marketing hero.

## Implementation Discipline

1. Update tokens and theme primitives first.
2. Polish existing homepage hierarchy before adding new layout structures.
3. Add category UI only where it belongs near the grid.
4. Adjust story cards after confirming grid density and mobile behavior.
5. Plan sidebar separately from the homepage prompt polish.
6. Run `pnpm check` and inspect screenshots after UI passes.

## Current Product Surface Rules

- Homepage contains only brand, creation controls, and playable story presets.
- Footer, project team, community QR code, open-source repository, CLA, and old
  legal links stay removed from the main surface.
- `/terms` and `/privacy` remain placeholders until StoryPlay-specific policies
  are written.
- Internal technical contracts such as `@storyplay/*` imports, localStorage keys,
  and `.storyplay` story export format are intentionally unchanged in this
  phase.
