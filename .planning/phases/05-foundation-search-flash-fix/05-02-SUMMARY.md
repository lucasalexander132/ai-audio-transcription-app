---
phase: 05-foundation-search-flash-fix
plan: 02
subsystem: ui
tags: [motion, animation, LazyMotion, code-splitting, reduced-motion, accessibility]

# Dependency graph
requires:
  - phase: 05-foundation-search-flash-fix
    provides: "Phase 05 plan 01 search flash fix foundation"
provides:
  - "motion library installed and available via LazyMotion async loading"
  - "MotionProvider wrapping all (app) pages with LazyMotion + MotionConfig"
  - "CSS reduced-motion baseline disabling animations for accessibility"
affects: [06-micro-interactions-recording, 07-micro-interactions-library, 08-page-transitions]

# Tech tracking
tech-stack:
  added: [motion v12]
  patterns: [LazyMotion code-splitting, MotionConfig reducedMotion, CSS prefers-reduced-motion baseline]

key-files:
  created:
    - app/lib/motion/features.ts
    - app/components/providers/motion-provider.tsx
  modified:
    - app/(app)/layout.tsx
    - app/globals.css

key-decisions:
  - "Used domAnimation (not domMax) to keep bundle ~6kb; domMax adds ~10kb for drag/layout not needed until Phase 06+"
  - "MotionProvider wraps children but not FABMenu to avoid unnecessary re-renders"
  - "Used --legacy-peer-deps for npm install due to react-voice-visualizer React 18 peer dep conflict"

patterns-established:
  - "LazyMotion strict mode: all animated components must use m.div (not motion.div) to prevent full bundle loads"
  - "MotionConfig reducedMotion='user': respects OS prefers-reduced-motion setting automatically"
  - "CSS reduced-motion baseline with 0.01ms duration (not 0s) to preserve animationend events"

# Metrics
duration: 2min
completed: 2026-02-10
---

# Phase 05 Plan 02: Motion Animation Foundation Summary

**Motion v12 installed with LazyMotion async code-splitting, MotionConfig reduced-motion, and CSS prefers-reduced-motion baseline**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-10T17:17:41Z
- **Completed:** 2026-02-10T17:19:23Z
- **Tasks:** 2
- **Files modified:** 5 (including package.json and package-lock.json)

## Accomplishments
- Installed motion v12 with React 19 support as animation foundation
- Created async feature loader for LazyMotion code-splitting (~6kb async chunk instead of ~34kb in main bundle)
- Created MotionProvider with LazyMotion strict mode + MotionConfig reducedMotion="user"
- Wired MotionProvider into (app)/layout.tsx wrapping all authenticated page content
- Added CSS prefers-reduced-motion baseline to globals.css for CSS-based animations

## Task Commits

Each task was committed atomically:

1. **Task 1: Install motion and create LazyMotion feature loader** - `ccaeaa6` (feat)
2. **Task 2: Create MotionProvider, wire into app layout, add CSS reduced-motion baseline** - `50b637b` (feat)

## Files Created/Modified
- `app/lib/motion/features.ts` - Async feature loader exporting domAnimation for LazyMotion
- `app/components/providers/motion-provider.tsx` - MotionProvider wrapping LazyMotion + MotionConfig
- `app/(app)/layout.tsx` - Added MotionProvider wrapping children
- `app/globals.css` - Added prefers-reduced-motion media query baseline
- `package.json` - Added motion v12 dependency

## Decisions Made
- Used `motion` v12 package (not `framer-motion`) for React 19 compatibility
- Used `domAnimation` instead of `domMax` to keep async chunk small (~6kb vs ~34kb); can upgrade when drag/layout animations needed in Phase 06+
- Placed MotionProvider inside layout div wrapping only children, keeping FABMenu outside to avoid re-renders
- Used `--legacy-peer-deps` for npm install due to pre-existing react-voice-visualizer React 18 peer dep conflict
- Used 0.01ms (not 0s) for CSS reduced-motion durations to preserve animationend event firing

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- npm install failed initially due to react-voice-visualizer requiring React ^18.2.0 while project uses React 19.2.4. Resolved with `--legacy-peer-deps` flag, which is standard for React 19 projects with older peer dependencies.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Animation infrastructure is ready for Phase 06-08 to build upon
- All animated components must use `m.div` (not `motion.div`) due to LazyMotion strict mode
- `domAnimation` sufficient through Phase 07; Phase 08 page transitions may need upgrade to `domMax` if layout animations are required
- CSS reduced-motion baseline catches any CSS transitions/animations MotionConfig doesn't cover

---
*Phase: 05-foundation-search-flash-fix*
*Completed: 2026-02-10*
