---
phase: 05-foundation-search-flash-fix
plan: 01
subsystem: ui
tags: [convex, react, search, useQuery, useRef, debounce]

# Dependency graph
requires:
  - phase: none (first v1.1 phase)
    provides: existing search UI in TranscriptsPage
provides:
  - useStableQuery hook for flash-free Convex query transitions
  - Flash-free search filtering in TranscriptsPage
affects: [06-animation-library-setup, any future phase using Convex queries with dynamic args]

# Tech tracking
tech-stack:
  added: []
  patterns: [useStableQuery (hold previous results during Convex loading), input-aware search state (searchInput vs debouncedSearch)]

key-files:
  created: [app/lib/hooks/use-stable-query.ts]
  modified: [app/(app)/transcripts/page.tsx]

key-decisions:
  - "Used searchInput.length >= 2 (immediate) for isSearchActive instead of debouncedSearch -- prevents flash during both debounce gap and Convex loading gap"
  - "Used precisely-typed generic useStableQuery instead of cast-based typing from Convex blog -- better TypeScript strictness"
  - "Kept useQuery for allTranscripts, allTranscriptTags, allSpeakerLabels -- only search query args change dynamically"

patterns-established:
  - "useStableQuery: wrap any Convex useQuery whose args change dynamically to prevent flash of undefined"
  - "Input-aware search state: use raw input length (not debounced) to determine search mode"

# Metrics
duration: 1min
completed: 2026-02-10
---

# Phase 05 Plan 01: Search Flash Fix Summary

**useStableQuery hook holding previous Convex results during loading + input-aware isSearchActive preventing debounce-gap flash**

## Performance

- **Duration:** 1 min
- **Started:** 2026-02-10T17:16:54Z
- **Completed:** 2026-02-10T17:17:59Z
- **Tasks:** 1
- **Files modified:** 2

## Accomplishments
- Created reusable `useStableQuery` hook that holds previous query results in a `useRef` during Convex loading transitions
- Fixed the search flash bug by switching `isSearchActive` from `debouncedSearch.length >= 2` to `searchInput.length >= 2`
- Search query now uses `useStableQuery` instead of raw `useQuery`, preventing undefined flicker when query args change
- Clearing search returns cleanly to tab-filtered view (no stale search results)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create useStableQuery hook and fix TranscriptsPage search flash** - `eecd7e8` (fix)

## Files Created/Modified
- `app/lib/hooks/use-stable-query.ts` - Convex query wrapper that holds previous results during loading via useRef
- `app/(app)/transcripts/page.tsx` - Updated to import useStableQuery, use it for search query, and use input-aware isSearchActive

## Decisions Made
- Used `searchInput.length >= 2` (immediate) for `isSearchActive` instead of `debouncedSearch.length >= 2` -- this enters "search mode" the instant the user types 2+ characters, preventing any flash of unfiltered results during the debounce delay
- Used precisely-typed generic `useStableQuery<Query extends FunctionReference<"query">>` instead of the `as typeof useQuery` cast from the Convex blog -- better TypeScript strictness and IDE support
- Kept `useQuery` for `allTranscripts`, `allTranscriptTags`, and `allSpeakerLabels` since their args don't change dynamically -- only the search query benefits from `useStableQuery`

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Search flash fix is complete and verified (TypeScript check + build both pass)
- `useStableQuery` hook is reusable for any future Convex queries with dynamic args
- Ready for Phase 05 Plan 02 (animation foundation setup with motion library)

---
*Phase: 05-foundation-search-flash-fix*
*Completed: 2026-02-10*
