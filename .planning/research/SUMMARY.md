# Project Research Summary

**Project:** AI Audio Transcription PWA -- Milestone v1.1 Micro Interactions
**Domain:** Animation and micro-interaction patterns for mobile-first Next.js PWA
**Researched:** 2026-02-10
**Confidence:** HIGH

## Executive Summary

Milestone v1.1 adds premium-feeling animations to an existing, fully functional Next.js 15 + Convex PWA. The research confirms a **two-tier animation strategy**: use CSS-only animations (Tailwind transitions + `tailwindcss-animate` plugin) for simple micro-interactions like button press states and tab indicator slides, and use **Motion v12** (formerly Framer Motion) for the complex orchestration work that CSS cannot do -- exit animations on unmount, layout-aware list filtering, and animated page transitions. This approach keeps the bundle impact contained at approximately 28kb of added JS (mostly async-loaded) while delivering the four target features: page transitions, tab slide transitions, search filtering animations, and the search flash bug fix.

The recommended build approach is to **fix the search flash bug first** (a logic fix using a `useStableQuery` hook that bridges Convex's undefined-during-reload behavior), then layer animations on top of stable data. The architecture places a `PageTransitionProvider` with a `FrozenRouter` pattern inside the existing `(app)/layout.tsx` to enable route-level exit animations in the App Router, an `AnimatedTabContent` wrapper for directional tab slides, and an `AnimatedTranscriptList` wrapper that uses `AnimatePresence mode="popLayout"` with layout props for smooth card filtering. Critically, existing components like `TranscriptCard` remain unmodified -- animations are applied via wrapper components to avoid conflicts with existing swipe-to-delete transforms.

The primary risks are: (1) page transitions depend on an internal Next.js API (`LayoutRouterContext`) that could break on version updates -- mitigated by pinning the Next.js version and wrapping in a try/catch with graceful degradation; (2) iOS PWA standalone mode runs animations at 30-40fps instead of 60fps -- mitigated by budgeting for lower frame rates, using short durations (200-250ms), and preferring opacity fades over position slides; (3) Convex real-time subscriptions can interrupt mid-animation with re-renders -- mitigated by `useStableQuery` and `React.memo` isolation on animated card wrappers. All animations must respect `prefers-reduced-motion` from day one using Motion's `MotionConfig reducedMotion="user"` wrapper.

## Key Findings

### Recommended Stack Additions

Three new dependencies are needed, adding roughly 28kb of JS to the existing bundle.

**Core technologies:**

- **`tailwindcss-animate` v1.0.7** (dev dependency, ~3kb CSS): CSS-only enter/exit animation utilities compatible with Tailwind v3.4.1. Provides `animate-in`, `fade-in`, `slide-in-from-*` classes used by shadcn/ui. Covers button feedback, tab indicator slides, toast appearances, and simple fades.
- **`motion` v12.34.0** (~4.6kb initial + ~15kb async via LazyMotion/domAnimation): The `motion` npm package (NOT `framer-motion`) with imports from `"motion/react"` (NOT `"framer-motion"`). Provides `AnimatePresence` for exit animations, `layout` prop for FLIP-style repositioning, and variant-based stagger. Required for anything involving unmount animations or coordinated list transitions. React 19 compatible.
- **`next-transition-router`** (optional, <8kb, beta): Evaluated but **not recommended** for the primary approach. The FrozenRouter + AnimatePresence pattern achieves the same result in ~50 lines with no additional dependency. Reserve as a fallback if FrozenRouter proves unstable.

**Key version constraint:** The project uses Tailwind v3.4.1, NOT v4. Use `tailwindcss-animate` (v3 compatible), NOT `tw-animate-css` (v4 only). The project uses Next.js 15.5.12 with React 19. Use `motion` (v12+), NOT `framer-motion` (frozen at v11, React 18 only).

### Expected Features

**Must ship (table stakes for a "polished" PWA):**

- Fix search flash bug -- logic bug where debounce gap shows unfiltered list; must fix BEFORE any animation work
- `prefers-reduced-motion` support -- foundation for all animation work; ~35% of adults 40+ have vestibular sensitivity
- Touch press states on interactive elements -- CSS-only, 30 minutes of work, makes every button feel alive
- Tab content slide transitions -- medium complexity, high perceived value on transcript detail page
- Search/filter list animations -- cards fading/repositioning as results change eliminates jarring re-renders

**Should ship (differentiators):**

- Animated page transitions -- the single biggest "premium feel" upgrade; slide-and-fade between routes mimics iOS navigation stack
- Active tab indicator animation -- `layoutId`-based sliding underline, small touch that adds polish
- Search bar expand/collapse animation -- eliminates the hard-cut on search toggle

**Defer to post-v1.1:**

- Gesture-based tab swiping (high complexity, low incremental value over tap transitions)
- Shared element / hero transitions (requires View Transitions API which is experimental in Next.js 15)
- Pull-to-refresh animation (browser default is acceptable)
- Haptic feedback (not supported on iOS Safari)
- Scroll-linked header compression (nice polish, not core to animation milestone)
- FAB menu spring animation (lower priority, existing CSS keyframes are adequate)

### Architecture Approach

The animation layer integrates at three levels without modifying any existing component internals. A `PageTransitionProvider` wraps `{children}` in the `(app)/layout.tsx`, using `AnimatePresence` keyed on `useSelectedLayoutSegment()` with a `FrozenRouter` that freezes the router context during exit animations. Inside individual pages, `AnimatedTabContent` wraps tab panels with directional slide animations, and `AnimatedTranscriptList` wraps the card list with `AnimatePresence mode="popLayout"` and layout props for smooth repositioning. The FAB menu, TranscriptCard internals, FilterTabs, AudioPlayer, and root layout remain entirely unchanged.

**New components (4 files):**

1. **PageTransitionProvider** (`app/components/transitions/page-transition-provider.tsx`) -- FrozenRouter + AnimatePresence for route-level enter/exit animations
2. **AnimatedTabContent** (`app/components/transitions/animated-tab-content.tsx`) -- direction-aware slide/crossfade for tab switching
3. **AnimatedTranscriptList** (`app/components/library/animated-transcript-list.tsx`) -- AnimatePresence + layout prop list wrapper; wraps TranscriptCard without modifying it
4. **useStableQuery** (`app/lib/hooks/use-stable-query.ts`) -- holds previous Convex query result during loading to prevent flash-of-undefined

**Modified components (4 files, minimal changes):**

1. `app/(app)/layout.tsx` -- wrap `{children}` with `PageTransitionProvider`
2. `app/(app)/transcripts/page.tsx` -- use `useStableQuery` for search, use `AnimatedTranscriptList`
3. `app/(app)/transcripts/[id]/page.tsx` -- wrap tab content with `AnimatedTabContent`
4. `app/(app)/record/page.tsx` -- wrap tab content with `AnimatedTabContent`

### Critical Pitfalls

1. **AnimatePresence exit animations silently fail in App Router** -- The App Router unmounts pages immediately on navigation, so exit animations never play unless you use the FrozenRouter pattern (freezes `LayoutRouterContext` during exit). This relies on an internal Next.js API. **Prevent by:** using FrozenRouter with try/catch degradation, pinning Next.js version, adding CI test for the import path.

2. **Wrong package: `framer-motion` does not work with React 19** -- The old `framer-motion` package is frozen at v11 (React 18 only). Must install `motion` and import from `"motion/react"`. **Prevent by:** installing `motion` (not `framer-motion`), verifying import paths in code review.

3. **Convex subscriptions interrupt mid-animation** -- `useQuery` returns `undefined` between parameter changes, causing flash-of-undefined that the animation system amplifies rather than hides. **Prevent by:** using `useStableQuery` hook to bridge loading gaps, wrapping animated cards in `React.memo` with custom comparator.

4. **Search flash bug must be fixed BEFORE adding animations** -- The existing debounce timing bug causes unfiltered results to briefly appear. Adding animations to this broken flow makes it dramatically worse (animated flash is more distracting than instant flash). **Prevent by:** fixing the bug as the first task in the milestone.

5. **iOS PWA standalone mode runs at 30-40fps** -- The standalone WebKit process has lower GPU priority than Safari. Animations that look smooth in Safari testing feel sluggish when launched from home screen. **Prevent by:** testing in standalone mode from day one, budgeting 40fps (not 60fps), preferring opacity fades over position slides, keeping durations at 200-250ms.

## Implications for Roadmap

Based on combined research, the milestone breaks naturally into 4 phases with clear dependency ordering. The total scope is modest -- 4 new files, 4 modified files, 3 npm packages.

### Phase 1: Foundation + Search Flash Fix

**Rationale:** Installs dependencies, creates reusable hooks/utilities, and fixes the prerequisite bug. No visual animation changes yet. This phase produces the building blocks every subsequent phase depends on.

**Delivers:**
- Motion library installed and configured with LazyMotion + domAnimation
- `tailwindcss-animate` plugin added to Tailwind config
- `MotionConfig reducedMotion="user"` wrapper in place (accessibility foundation)
- `useStableQuery` hook created and integrated for search
- Search flash bug eliminated (stable data regardless of debounce/query timing)
- Animation timing constants defined (durations, easing curves)

**Addresses features:** Fix search flash bug, `prefers-reduced-motion` support

**Avoids pitfalls:** Wrong package installation (Pitfall 3), accessibility violations (Pitfall 9), animated flash bug amplification (Pitfall 5)

**Estimated complexity:** Low. Mostly configuration and a 15-line hook.

### Phase 2: Search Filtering Animations

**Rationale:** Builds directly on Phase 1's stable data layer. List animations are the highest-impact visual improvement and validate that Motion + AnimatePresence works correctly with Convex data flow. The `AnimatedTranscriptList` wrapper approach is proven and avoids conflict with existing swipe-to-delete transforms.

**Delivers:**
- `AnimatedTranscriptList` and `AnimatedListItem` components
- Cards fade + scale on enter/exit during search filtering
- Remaining cards smoothly reposition via layout animation
- Staggered entrance on initial load (30-50ms per item, capped at 300ms total)
- Touch press states on interactive elements (CSS-only quick win)

**Addresses features:** List item animations during filtering, touch feedback, staggered list entrance

**Avoids pitfalls:** Convex subscription interruption (Pitfall 4, via useStableQuery + React.memo), GPU memory exhaustion (Pitfall 6, limit concurrent animated elements), layout thrashing (Pitfall 7, use Motion's layout prop for batched FLIP), CLS from stagger (Pitfall 12, reserve space, animate only opacity + transform)

**Estimated complexity:** Medium. The `popLayout` + `layout` pattern is well-documented but needs performance testing on real iOS devices in PWA standalone mode.

### Phase 3: Tab Slide Transitions

**Rationale:** Self-contained within individual pages (no router involvement), no dependencies on the page transition system. Lower architectural risk than page transitions. Delivers visible polish on the transcript detail page, which is the most-used screen.

**Delivers:**
- `AnimatedTabContent` component with direction-aware sliding
- Transcript/Summary tab transitions on detail page (slide left/right based on tab position)
- Microphone/Upload tab transitions on record page
- Active tab indicator slide animation (optional, `layoutId`-based)

**Addresses features:** Tab content transitions, active tab indicator animation

**Avoids pitfalls:** Tab animation showing loading skeleton during slide (Pitfall 11, use AnimatePresence `mode="wait"` so exit completes before enter starts, prefetch data in parent), spring animations feeling laggy on mobile (Pitfall 13, use short tween/ease curves, not bouncy springs)

**Estimated complexity:** Low-Medium. Standard AnimatePresence with keyed children. Direction tracking requires comparing previous/current tab index.

### Phase 4: Page Transitions

**Rationale:** The riskiest feature because it depends on internal Next.js APIs and modifies the layout component. Built last so that if it proves problematic, all other animations still ship. This is the single biggest "premium feel" upgrade -- but it is also the most architecturally invasive.

**Delivers:**
- `PageTransitionProvider` with FrozenRouter
- Subtle fade + translateY(8px) transitions between all routes
- Forward/back navigation awareness
- Graceful degradation if FrozenRouter import breaks

**Addresses features:** Animated page transitions

**Avoids pitfalls:** AnimatePresence exit failure in App Router (Pitfall 1, FrozenRouter pattern), internal API breakage (Pitfall 2, try/catch with graceful degradation + pinned version), heavy transitions feeling slow (Anti-pattern 5, keep under 200ms with subtle opacity + minimal position change), iOS calc() crash (Pitfall 10, never transition calc()-based properties)

**Estimated complexity:** Medium-High. FrozenRouter is a well-documented community pattern, but it accesses internal APIs and must be tested across all route combinations. If it proves too fragile, this phase can be cut without affecting Phases 1-3.

### Phase Ordering Rationale

1. **Phase 1 first** because every other phase depends on Motion being installed, accessibility foundations being in place, and the search flash bug being fixed. Animations built on broken data make the UX worse, not better.

2. **Phase 2 before tabs or page transitions** because list animations produce the highest-impact visual improvement (the library page is the most-visited screen) and validate that the Motion + Convex integration works correctly before tackling more complex scenarios.

3. **Phase 3 before page transitions** because tab animations are self-contained (no router involvement, no internal API dependency) and lower risk. They can ship independently if Phase 4 encounters problems.

4. **Phase 4 last** because it is the only phase that touches the layout component and depends on an internal Next.js API. Building it last means all other animations are stable and will not be destabilized by layout-level changes. If page transitions prove unworkable, the milestone still delivers three of four features.

**Dependency chain:**
```
Phase 1 (Foundation + Flash Fix)
  -> Phase 2 (List Animations)
  -> Phase 3 (Tab Transitions)  [no dependency on Phase 2]
  -> Phase 4 (Page Transitions) [no dependency on Phase 2 or 3, but benefits from lessons learned]
```

Phases 2 and 3 are independent of each other and could theoretically be parallelized or reordered.

### Research Flags

**Phases that need careful implementation research during planning:**

- **Phase 4 (Page Transitions):** The FrozenRouter pattern relies on `next/dist/shared/lib/app-router-context.shared-runtime` which is an internal API. Verified against Next.js 15.5.12, but must test against the exact installed version. Consider building a minimal proof-of-concept before writing the full implementation. If the LayoutRouterContext import fails, fall back to no page transitions (graceful degradation) or evaluate the View Transitions API (once Next.js stabilizes it).

**Phases with standard, well-documented patterns (skip deep research):**

- **Phase 1 (Foundation):** Package installation, hook creation, Tailwind plugin config. All thoroughly documented.
- **Phase 2 (List Animations):** AnimatePresence + layout prop is textbook Motion. The `useStableQuery` pattern is from official Convex blog. Well-trodden ground.
- **Phase 3 (Tab Transitions):** AnimatePresence with keyed children. No router complications. Standard pattern.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All versions verified on npm within 24 hours of research. Motion v12.34.0 confirmed React 19 compatible. tailwindcss-animate confirmed Tailwind v3 compatible. Bundle sizes verified via official docs. |
| Features | HIGH | Timing specs from NNGroup research and Material Design 3. Feature prioritization based on codebase analysis and UX research. Search flash bug root cause confirmed by reading actual source code. |
| Architecture | HIGH (core) / MEDIUM (page transitions) | List animations, tab transitions, useStableQuery all use standard, well-documented patterns. Page transitions via FrozenRouter are community-standard but depend on internal Next.js API. |
| Pitfalls | MEDIUM-HIGH | Critical pitfalls (App Router exit failure, wrong package, Convex flash, search bug, accessibility) verified with official sources. iOS PWA performance penalty confirmed via Apple Forums. iOS Safari calc() crash has multiple reports but no official WebKit confirmation. |

**Overall confidence:** HIGH

### Gaps to Address

- **iOS PWA standalone mode performance:** Budget 40fps, not 60fps, but exact performance characteristics need validation on a physical iOS device in standalone mode. Cannot be simulated.
- **FrozenRouter stability across Next.js updates:** The `LayoutRouterContext` import path has changed between Next.js 13, 14, and 15. Must pin Next.js version and add a CI test that verifies the import path resolves. If a future upgrade breaks it, page transitions degrade to instant cuts (not a crash).
- **Layout animation performance at scale:** Using `layout` prop on 20+ transcript cards simultaneously may cause layout thrashing on budget devices. Need to profile and potentially limit layout animations to viewport-visible cards only.
- **domAnimation vs domMax:** Starting with `domAnimation` (~20kb) which covers AnimatePresence and basic animations. If list repositioning via the `layout` prop requires `domMax` (~30kb), the bundle increases by ~10kb. Test with `domAnimation` first; upgrade only if layout animations fail to work.

## Sources

### Primary (HIGH confidence)

**Motion / Animation Library:**
- [Motion installation docs](https://motion.dev/docs/react-installation) -- import paths, React 19 setup
- [Motion LazyMotion docs](https://motion.dev/docs/react-lazy-motion) -- bundle size optimization (4.6kb + 15kb async)
- [Motion AnimatePresence docs](https://motion.dev/docs/react-animate-presence) -- exit animation patterns, modes
- [Motion accessibility docs](https://motion.dev/docs/react-accessibility) -- reducedMotion support
- [Motion performance guide](https://motion.dev/docs/performance) -- GPU-accelerated property list
- [Motion upgrade guide](https://motion.dev/docs/react-upgrade-guide) -- framer-motion to motion migration
- [motion on npm](https://www.npmjs.com/package/motion) -- v12.34.0, 3.6M weekly downloads

**Next.js / React:**
- [Next.js viewTransition config](https://nextjs.org/docs/app/api-reference/config/next-config-js/viewTransition) -- experimental status confirmed
- [React Labs: View Transitions](https://react.dev/blog/2025/04/23/react-labs-view-transitions-activity-and-more) -- React ViewTransition experimental
- [useDeferredValue](https://react.dev/reference/react/useDeferredValue) -- search input handling

**Convex:**
- [Help, my app is overreacting! -- Convex Blog](https://stack.convex.dev/help-my-app-is-overreacting) -- useStableQuery pattern
- [Convex React client docs](https://docs.convex.dev/client/react) -- useQuery subscription behavior

**CSS / Tailwind:**
- [tailwindcss-animate GitHub](https://github.com/jamiebuilds/tailwindcss-animate) -- v3-compatible animation utilities
- [Tailwind CSS animation utilities](https://tailwindcss.com/docs/animation) -- built-in animate-* classes

**UX Research:**
- [NNGroup: Animation Duration](https://www.nngroup.com/articles/animation-duration/) -- timing best practices
- [Material Design 3: Easing and Duration](https://m3.material.io/styles/motion/easing-and-duration) -- easing curves
- [prefers-reduced-motion -- MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion) -- accessibility

### Secondary (MEDIUM confidence)

**Next.js App Router Animation Patterns:**
- [FrozenRouter page transition pattern](https://www.imcorfitz.com/posts/adding-framer-motion-page-transitions-to-next-js-app-router) -- community solution
- [GitHub Discussion #42658: Route transitions in app directory](https://github.com/vercel/next.js/discussions/42658) -- community validation
- [Motion Issue #2411: exit not working in App Router](https://github.com/framer/motion/issues/2411) -- confirmed issue

**Performance / iOS:**
- [Standalone PWA slow performance on iOS 16 -- Apple Forums](https://developer.apple.com/forums/thread/714477) -- performance penalty confirmed
- [Forced reflow -- Chrome DevTools](https://developer.chrome.com/docs/performance/insights/forced-reflow) -- layout thrashing
- [Web Animation Performance Tier List -- Motion](https://motion.dev/blog/web-animation-performance-tier-list) -- property rankings
- [Mobile Safari CSS crash with calc()](https://www.elfboy.com/blog/mobile_safari_crashes_with_css_transition_and_calc) -- iOS crash bug

**Accessibility:**
- [Accessible Animations in React -- Josh Comeau](https://www.joshwcomeau.com/react/prefers-reduced-motion/) -- React patterns
- [No-motion-first approach -- Tatiana Mac](https://www.tatianamac.com/posts/prefers-reduced-motion) -- design philosophy

---
*Research completed: 2026-02-10*
*Ready for roadmap: yes*
