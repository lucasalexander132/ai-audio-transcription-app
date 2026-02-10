---
phase: 06-search-filtering-animations
plan: 01
subsystem: ui
tags: [motion, animation, AnimatePresence, layout, search, domMax, FLIP, stagger]

# Dependency graph
requires:
  - phase: 05-foundation-search-flash-fix
    provides: domAnimation foundation, MotionProvider with LazyMotion strict mode, useStableQuery for flash-free search
provides:
  - AnimatedCardList component with enter/exit/layout animations
  - domMax feature set (layout + drag capabilities)
  - Animated search filtering with staggered entrance
  - AnimatePresence crossfade between loading/empty/list states
affects: [phase-07, phase-08]

# Tech tracking
tech-stack:
  added: [domMax (upgraded from domAnimation, ~6kb to ~16kb async chunk)]
  patterns:
    - AnimatePresence popLayout for immediate flow removal during card exit
    - layout prop for FLIP-based repositioning of remaining cards
    - useRef stagger cap pattern (initial load only, capped at 8 cards)
    - AnimatePresence mode="wait" for state crossfades (loading/empty/list)

key-files:
  created:
    - app/components/library/animated-card-list.tsx
  modified:
    - app/lib/motion/features.ts
    - app/(app)/transcripts/page.tsx

key-decisions:
  - "Used m from motion/react instead of motion/react-m (module doesn't exist in Motion v12)"
  - "Upgraded domAnimation to domMax (~6kb to ~16kb async chunk) for layout animation support"
  - "AnimatePresence popLayout mode for immediate flow removal during card exit"
  - "Stagger entrance capped at 8 cards (500ms max total) to avoid slow initial load"

patterns-established:
  - "AnimatePresence popLayout + layout prop pattern: wrap items in m.div with layout, AnimatePresence mode=popLayout for smooth enter/exit/reposition"
  - "useRef stagger cap: isInitialLoad ref flips to false after first render, stagger only applies on mount"
  - "State crossfade: AnimatePresence mode=wait wrapping loading/empty/list m.div states with key-based switching"

# Metrics
duration: 4min
completed: 2026-02-10
---

# Phase 06 Plan 01: Animated Card List Summary

**AnimatedCardList with AnimatePresence popLayout, FLIP layout repositioning, and staggered entrance for search filtering transitions using domMax**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-02-10
- **Completed:** 2026-02-10
- **Tasks:** 3 (2 auto + 1 human-verify checkpoint)
- **Files modified:** 3

## Accomplishments
- Upgraded LazyMotion feature set from domAnimation to domMax, unlocking layout and drag animation capabilities
- Created AnimatedCardList component that wraps TranscriptCard items in m.div wrappers with enter/exit/layout animations
- Integrated animated card list into transcripts page with AnimatePresence crossfade between loading skeleton, empty state, and card list
- User-verified: staggered entrance, search exit/enter animations, empty state crossfade, and rapid typing resilience all approved

## Task Commits

Each task was committed atomically:

1. **Task 1: Upgrade LazyMotion features from domAnimation to domMax** - `2535937` (feat)
2. **Task 2: Create AnimatedCardList and integrate into transcripts page** - `e4db7d8` (feat)
3. **Task 3: Human verification checkpoint** - approved by user (no commit)

**Plan metadata:** (pending this commit)

## Files Created/Modified
- `app/lib/motion/features.ts` - Exports domMax instead of domAnimation for LazyMotion provider
- `app/components/library/animated-card-list.tsx` - New component: AnimatePresence popLayout + layout prop + staggered entrance for transcript cards
- `app/(app)/transcripts/page.tsx` - Uses AnimatedCardList, wraps loading/empty/list states in AnimatePresence mode="wait" crossfade

## Decisions Made
- **Used `m` from `motion/react` instead of `motion/react-m`:** The plan specified `import { m } from "motion/react-m"` but this module does not exist in Motion v12. Both `m` and `AnimatePresence` are exported from `motion/react`.
- **Upgraded domAnimation to domMax:** Increases async chunk from ~6kb to ~16kb but required for layout prop (FLIP repositioning) which is the core animation behavior.
- **AnimatePresence popLayout mode:** Exiting cards are immediately removed from document flow so remaining cards can reposition without waiting for exit animation to complete. This prevents layout shifts.
- **Stagger capped at 8 cards:** Initial entrance uses 50ms stagger with 100ms start delay, capped at 8 cards (500ms max total). Prevents slow perceived load for large lists.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Used `m` from `motion/react` instead of `motion/react-m`**
- **Found during:** Task 2 (Create AnimatedCardList)
- **Issue:** Plan specified `import { m } from "motion/react-m"` but this module does not exist in Motion v12. The `m` component is exported from `motion/react` alongside `AnimatePresence`.
- **Fix:** Used `import { AnimatePresence, m } from "motion/react"` in both `animated-card-list.tsx` and `page.tsx`
- **Files modified:** `app/components/library/animated-card-list.tsx`, `app/(app)/transcripts/page.tsx`
- **Verification:** TypeScript compilation and build both pass
- **Committed in:** `e4db7d8` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Import path correction required for Motion v12 compatibility. No scope creep.

## Issues Encountered
None beyond the import path deviation noted above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- domMax feature set is loaded and available for all future animation work
- AnimatedCardList pattern established for reuse in other list views
- Phase 07 (tab slide transitions) can build on the same MotionProvider + domMax infrastructure
- Phase 08 (page transitions) will use the same animation foundation

---
*Phase: 06-search-filtering-animations*
*Completed: 2026-02-10*
