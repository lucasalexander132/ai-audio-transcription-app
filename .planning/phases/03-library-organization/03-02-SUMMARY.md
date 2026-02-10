---
phase: 03-library-organization
plan: 02
subsystem: frontend-library
tags: [search, filter-tabs, starring, transcript-card, debounce, empty-states]

dependency-graph:
  requires: [03-01]
  provides: [search-ui, filter-tabs, star-toggle-ui, transcript-cards, empty-states]
  affects: [03-03]

tech-stack:
  added: []
  patterns: [debounce-hook, client-side-filtering, batch-tag-lookup]

file-tracking:
  key-files:
    created:
      - app/lib/hooks/use-debounce.ts
      - app/components/library/search-bar.tsx
      - app/components/library/filter-tabs.tsx
      - app/components/library/transcript-card.tsx
    modified:
      - app/(app)/transcripts/page.tsx

decisions:
  - id: "03-02-01"
    decision: "Search independent of tabs"
    rationale: "Per CONTEXT.md, search always searches all transcripts regardless of active tab"
    impact: "When search is active, tab filter is hidden; search results shown with count header"
  - id: "03-02-02"
    decision: "Collapsible search bar via header toggle"
    rationale: "Saves vertical space on mobile; search button in header toggles search bar visibility"
    impact: "Search bar slides in below header when toggled, auto-focuses input"
  - id: "03-02-03"
    decision: "Client-side tab filtering on fetched data"
    rationale: "Per RESEARCH.md, user datasets are small enough (<1000); avoids multiple Convex subscriptions"
    impact: "Single useQuery(api.transcripts.list) with useMemo filtering per tab"

metrics:
  duration: "3 min"
  completed: "2026-02-10"
---

# Phase 3 Plan 2: Library Page Overhaul Summary

Rebuilt the transcript library page with working search, filter tabs, star toggle, and enhanced transcript cards with tag chips and per-tab empty states.

## One-Liner

Interactive library page with debounced Convex search, All/Recent/Starred/Meetings filter tabs, star toggle on cards, tag chip display, and contextual empty states

## What Was Done

### Task 1: Search Bar, Filter Tabs, and Debounce Hook
- Created `useDebounce<T>(value, delay)` generic hook using useState + useEffect + setTimeout pattern
- Created `SearchBar` component with search icon, text input, and conditional clear (X) button; pill shape with warm palette styling
- Created `FilterTabs` component with horizontal scrollable pill buttons, active/inactive styling with transitions

### Task 2: Transcript Card with Star Toggle
- Created `TranscriptCard` component with source-aware icons (mic for recording, upload arrow for upload, document for completed)
- Star button calls `useMutation(api.transcripts.toggleStar)` with `e.stopPropagation()` to prevent card navigation
- Shows filled star in `#D4622B` when starred, outline star in `#B5A99A` when not
- Info row shows date, duration, and status badge (recording/processing/completed/error)
- Tag chips row renders first 5 tags with "+N more" overflow indicator
- Includes `formatDate` and `formatDuration` helper functions

### Task 3: Transcripts Page Rewrite
- Added debounced search: `searchInput` state with `useDebounce(searchInput, 300)` feeding into `useQuery(api.transcripts.search)` with `"skip"` for <2 chars
- Tab filtering via `useMemo` on `allTranscripts`: All (exclude recording), Recent (7 days), Starred (`isStarred`), Meetings (tag name match via `allTranscriptTags`)
- Search is fully independent of tabs: when active, tabs are hidden and search results shown with count header
- Built `tagsByTranscript` Map from `allTranscriptTags` batch query for efficient per-card tag chip rendering
- Empty states per tab: microphone (All), clock (Recent), star (Starred), tag (Meetings), magnifying glass (search)
- Loading skeleton with 3 animated pulse cards
- Search button in header toggles `showSearch` state; clearing search resets input

## Deviations from Plan

None - plan executed exactly as written.

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| Search independent of tabs | Per CONTEXT.md: search always searches all transcripts, tabs have no effect on search results |
| Collapsible search bar | Saves vertical space on mobile; toggled via header button |
| Client-side tab filtering | Small user datasets; single Convex subscription + useMemo filtering |
| 300ms debounce, min 2 chars | Standard search UX timing; prevents empty string errors with Convex search index |
| Batch tag lookup via Map | Single `getAllTranscriptTags` query mapped to `Map<transcriptId, tagName[]>` avoids N+1 |

## Verification

- `npx tsc --noEmit` passes with zero errors
- `npx next build` succeeds; `/transcripts` route compiles to 3.48 kB
- All components export correctly and compose in the page
- SearchBar, FilterTabs, TranscriptCard all accept correct prop types
- Star toggle wired to `api.transcripts.toggleStar` mutation
- Search wired to `api.transcripts.search` query with debounce and skip
- Tag chips wired to `api.tags.getAllTranscriptTags` query

## Commits

| Hash | Type | Description |
|------|------|-------------|
| 465c92d | feat | Create search bar, filter tabs, and debounce hook |
| 094e6b2 | feat | Create transcript card with star toggle and tag chips |
| d911c52 | feat | Rewrite transcripts page with search, tabs, and enhanced cards |

## Next Phase Readiness

Plan 03-03 (export + tag picker) can now proceed. The library page is fully functional with:
- Search and filter tabs operational
- Star toggle wired to backend
- Tag chips displaying from batch query
- TranscriptCard component ready for reuse in any list context
- All empty states rendering correctly per tab
