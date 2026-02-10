# Roadmap: Transcripts

## Completed Milestones

### v1.0 MVP (Shipped 2026-02-10)

Mobile-first PWA for real-time audio transcription with AI-powered summaries. 4 phases, 11 plans, 84 files, 8,586 LOC TypeScript.

<details>
<summary>Phase details</summary>

- [x] **Phase 1: Foundation & Real-Time Transcription** (3 plans) - Auth, recording, live transcription, playback, PWA
- [x] **Phase 2: File Upload & Batch Processing** (2 plans) - Upload audio files for transcription
- [x] **Phase 3: Library & Organization** (3 plans) - Search, filters, tags, export, starred transcripts
- [x] **Phase 4: AI Intelligence & Settings** (3 plans) - Summaries, action items, settings

Full archive: `.planning/milestones/v1.0-ROADMAP.md`
</details>

## Current Milestone: v1.1 Micro Interactions

**Goal:** Add premium-feeling micro interactions -- animated page transitions, tab slides, search filtering animations, and a search flash bug fix. 4 new files, 4 modified files, 3 npm packages.

**Requirements:**
- MICRO-01: Animated page transitions between routes
- MICRO-02: Slide transitions between tabs on transcript detail page with content animate-in
- MICRO-03: Search filtering animates transcript cards in/out as results narrow
- MICRO-04: Fix search flash bug (unfiltered state briefly visible when typing)

### Phases

- [x] **Phase 05: Foundation + Search Flash Fix** (2 plans) - Install animation deps, create useStableQuery hook, fix flash bug, establish accessibility baseline
- [ ] **Phase 06: Search Filtering Animations** - Animated transcript card enter/exit/reposition during search filtering
- [ ] **Phase 07: Tab Slide Transitions** - Direction-aware slide transitions between tabs on transcript detail and record pages
- [ ] **Phase 08: Page Transitions** - Animated route transitions via FrozenRouter + AnimatePresence

### Phase Details

#### Phase 05: Foundation + Search Flash Fix
**Goal**: Users experience stable, flash-free search results and the app respects motion preferences
**Depends on**: Phase 04 (v1.0 complete)
**Requirements**: MICRO-04
**Success Criteria** (what must be TRUE):
  1. Typing in the search bar never shows unfiltered results -- the list either holds the previous results or shows filtered results, with no flash of the full list
  2. Users with "reduce motion" enabled in their OS settings see no animations throughout the app (MotionConfig reducedMotion="user" is active)
  3. Motion library is installed and loadable via LazyMotion (verified by dev tools showing async chunk load, not blocking initial bundle)
**Plans**: 2 plans

Plans:
- [x] 05-01-PLAN.md -- Fix search flash bug with useStableQuery hook + input-aware search
- [x] 05-02-PLAN.md -- Install motion, create MotionProvider, add reduced-motion CSS baseline

#### Phase 06: Search Filtering Animations
**Goal**: Users see transcript cards animate smoothly in and out as search results change
**Depends on**: Phase 05
**Requirements**: MICRO-03
**Success Criteria** (what must be TRUE):
  1. When the user types a search query, cards that no longer match fade out and scale down rather than disappearing instantly
  2. Cards that remain in the filtered results smoothly reposition to close gaps left by removed cards (layout animation)
  3. When clearing the search, returning cards animate in with a fade and scale up
  4. On initial page load, transcript cards appear with a brief staggered entrance animation
**Plans**: TBD

Plans:
- [ ] 06-01: TBD

#### Phase 07: Tab Slide Transitions
**Goal**: Users experience direction-aware slide transitions when switching tabs on transcript detail and record pages
**Depends on**: Phase 05
**Requirements**: MICRO-02
**Success Criteria** (what must be TRUE):
  1. On the transcript detail page, switching from Transcript to Summary tab slides content left, and switching back slides content right (direction follows tab position)
  2. On the record page, switching between Microphone and Upload tabs slides content in the direction matching tab order
  3. Tab content animates in after the slide completes (no blank frame or loading skeleton visible during transition)
  4. The active tab indicator slides smoothly between tab positions rather than jumping
**Plans**: TBD

Plans:
- [ ] 07-01: TBD

#### Phase 08: Page Transitions
**Goal**: Users experience smooth animated transitions when navigating between routes, mimicking native app navigation
**Depends on**: Phase 05
**Requirements**: MICRO-01
**Success Criteria** (what must be TRUE):
  1. Navigating between any routes (library, record, transcript detail, settings) plays a subtle fade + slide transition rather than an instant page swap
  2. The outgoing page animates out before the incoming page animates in (exit animations work correctly in App Router)
  3. If the FrozenRouter pattern fails (e.g., Next.js internal API changes), navigation still works -- pages load instantly with no animation rather than breaking
**Plans**: TBD

Plans:
- [ ] 08-01: TBD

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 01. Foundation & Real-Time Transcription | v1.0 | 3/3 | Complete | 2026-02-10 |
| 02. File Upload & Batch Processing | v1.0 | 2/2 | Complete | 2026-02-10 |
| 03. Library & Organization | v1.0 | 3/3 | Complete | 2026-02-10 |
| 04. AI Intelligence & Settings | v1.0 | 3/3 | Complete | 2026-02-10 |
| 05. Foundation + Search Flash Fix | v1.1 | 2/2 | Complete | 2026-02-10 |
| 06. Search Filtering Animations | v1.1 | 0/? | Not started | - |
| 07. Tab Slide Transitions | v1.1 | 0/? | Not started | - |
| 08. Page Transitions | v1.1 | 0/? | Not started | - |
