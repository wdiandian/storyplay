# storyplay Homepage MVP UI Plan

Status: Plan / Historical UI Recovery Plan.

This document records the intended homepage iteration order after an earlier
over-redesign recovery. Before executing any item, compare it with the current
homepage implementation and avoid repeating work that has already landed.

This is the corrected homepage plan after the failed over-redesign pass. The
current restored homepage is the baseline. Improve it in scoped layers instead
of replacing it with a copied reference layout.

Primary design system: [design-system.md](design-system.md).

## Goals

1. Make storyplay visually distinct from the source project through tokens,
   spacing, and card polish.
2. Add light/dark mode as infrastructure early.
3. Improve the prompt area without adding unrelated buttons or fake modes.
4. Place categories where discovery users expect them: near the story grid.
5. Keep story SKU data, engine behavior, routing, and old project separation
   unchanged.

## Implementation Order

### 1. Theme Infrastructure

- Add semantic CSS variables from [design-system.md](design-system.md).
- Add a small theme toggle in the top bar.
- Persist with `localStorage.storyplay:theme`.
- Respect system preference before a user selects a mode.
- Verify both modes on the restored homepage before changing layout.

### 2. Homepage Visual Polish

- Apply the new warm light/dark tokens to the existing layout.
- Keep the current centered creation flow.
- Adjust typography, borders, and spacing before restructuring controls.
- Keep visible labels localized and product-relevant.

### 3. Prompt Area

- Preserve the existing product controls: prompt, gender, art style, plot style,
  pacing, import, start.
- Consider a larger prompt input only if the existing flow remains clear.
- Collapse the long helper sentence into a compact help affordance.
- Do not add unrelated action buttons, decorative mode labels, or generic AI
  workflow controls.

### 4. Story Categories

- Add category chips as a grid header/filter row, not under the hero as loose
  decoration.
- Initial categories are UI-only and may show the same current cards:
  Featured, Romance, Suspense, Fantasy, Sci-Fi, Slice.
- Do not change story data or child SKU content in this pass.

### 5. Story Card Grid

- Preserve current card mechanics first.
- Improve desktop density so cards are easier to scan.
- Keep image dominant and title readable.
- Use subtle hover/focus polish on desktop; mobile must not depend on hover.
- Avoid invented metadata.

### 6. Sidebar Planning

- Do not implement a persistent sidebar until navigation destinations are real.
- Keep Character.AI as a future reference for recent-story navigation only.
- Any future sidebar must be localized and focused on Home, New Story, My
  Stories, Gallery/Explore, Settings.

## Acceptance Criteria

- Homepage supports light and dark mode.
- The first screen still clearly starts a story.
- Existing controls are not made harder to understand.
- Categories appear in a discovery-appropriate position.
- Card polish improves scanability without changing story content.
- No source-project GitHub/team/legal/open-source surfaces reappear.
- `pnpm check` passes with only known existing warnings.
