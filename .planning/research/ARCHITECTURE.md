# Architecture Patterns: Micro Interactions & Animations

**Domain:** Animations in Next.js 15 App Router with Convex real-time data
**Researched:** 2026-02-10
**Overall confidence:** HIGH (core patterns), MEDIUM (page transitions due to App Router limitations)

## Executive Summary

Adding animations to this Next.js 15 App Router + Convex application requires careful integration at three distinct levels: **page transitions** (cross-route navigation), **intra-page animations** (tab switching, content reveals), and **data-driven animations** (list filtering as Convex query results change). Each level has different constraints and requires different architectural approaches.

The recommended animation library is **Motion** (formerly Framer Motion), installed as the `motion` npm package with imports from `motion/react`. Motion is the dominant React animation library with first-class support for layout animations, exit animations via `AnimatePresence`, and staggered list animations -- all three patterns needed here.

Page transitions in the App Router remain the most architecturally complex piece. The App Router unmounts and remounts page components during navigation, preventing standard `AnimatePresence` exit animations from working without a workaround. The proven approach uses a **FrozenRouter** pattern that freezes the layout router context during exit animations, combined with `AnimatePresence` keyed on the current route segment. This pattern is well-documented, community-tested, and verified to work with Next.js 15.

For Convex real-time data, the key insight is that `useQuery` returns `undefined` during loading and between query parameter changes. A **useStableQuery** hook prevents flash-of-undefined by holding the previous result in a ref until new data arrives. Combining this with Motion's `AnimatePresence` and `layout` prop creates smooth, animated transitions as search results filter in real time.

## Layout Hierarchy & Animation Provider Placement

### Current Layout Tree

```
app/layout.tsx (Root - Server Component)
  ConvexAuthNextjsServerProvider
    html > body
      ConvexClientProvider
        app/(app)/layout.tsx (Client Component)
          auth check + redirect
          div.min-h-screen.bg-background
            {children}         <-- PAGE CONTENT RENDERS HERE
            <FABMenu />        <-- Fixed-position FAB
```

### Modified Layout Tree with Animation Support

```
app/layout.tsx (Root - Server Component) [NO CHANGES]
  ConvexAuthNextjsServerProvider
    html > body
      ConvexClientProvider
        app/(app)/layout.tsx (Client Component) [MODIFIED]
          auth check + redirect
          div.min-h-screen.bg-background
            <PageTransitionProvider>     <-- NEW: wraps {children}
              {children}
            </PageTransitionProvider>
            <FABMenu />                  <-- UNCHANGED: stays outside transition
```

### Why This Placement

1. **PageTransitionProvider wraps `{children}` inside `(app)/layout.tsx`**: This is the only layout that persists across all authenticated routes (`/transcripts`, `/record`, `/settings`, `/transcripts/[id]`). Since layouts do not re-render on navigation, this is the stable mount point needed for `AnimatePresence` to detect route changes and run exit animations.

2. **FABMenu stays outside the transition wrapper**: The FAB is a persistent UI element that should NOT animate during page transitions. It already conditionally hides on transcript detail pages via pathname check. Keeping it outside the `PageTransitionProvider` means it remains stable during transitions.

3. **Root layout is NOT modified**: The root layout is a Server Component and contains provider setup (Convex, fonts). Animation logic is client-only and belongs in the `(app)` client layout.

## Component Architecture: New Components

### 1. PageTransitionProvider (NEW)

**File:** `app/components/transitions/page-transition-provider.tsx`
**Type:** Client component
**Purpose:** Enables animated transitions between routes within the `(app)` route group.

**Architecture:**

```
PageTransitionProvider
  AnimatePresence mode="wait"
    motion.div key={segment}      <-- keyed on current route segment
      FrozenRouter                <-- preserves router context during exit
        {children}                <-- actual page content
```

**How it works:**

1. Uses `useSelectedLayoutSegment()` (from `next/navigation`) to detect the current route segment. For the `(app)` layout, this returns `"transcripts"`, `"record"`, `"settings"`, etc.

2. `AnimatePresence` with `mode="wait"` ensures the exiting page completes its exit animation before the entering page mounts.

3. The `motion.div` is keyed on `segment`, so when the segment changes (e.g., navigating from `/transcripts` to `/record`), AnimatePresence sees a new key, triggers the exit animation on the old content, then mounts the new content with an enter animation.

4. `FrozenRouter` wraps children inside the motion.div to prevent the Next.js router context from updating during the exit animation (which would cause the exiting page to flash the new page's content).

**Critical implementation detail -- FrozenRouter:**

```typescript
import { LayoutRouterContext } from
  "next/dist/shared/lib/app-router-context.shared-runtime";
```

This import is verified to exist in Next.js 15.5.12 (the version installed in this project). The `LayoutRouterContext` is a React context that the App Router uses to pass segment data to child components. FrozenRouter intercepts this context and provides the previous value during exit animations.

**Confidence:** HIGH -- This pattern is the standard community solution for App Router page transitions. The `LayoutRouterContext` import path is verified against the installed Next.js version. However, this is an internal API and could change in future Next.js versions.

### 2. AnimatedTabContent (NEW)

**File:** `app/components/transitions/animated-tab-content.tsx`
**Type:** Client component
**Purpose:** Provides slide/crossfade transitions when switching between tabs.

**Architecture:**

```
AnimatedTabContent
  AnimatePresence mode="wait" initial={false}
    motion.div key={activeTab}
      {children}
```

**How it works:**

This is simpler than page transitions because tab switching happens within a single page component (no router involvement). The `activeTab` state variable already exists in both the transcript detail page and the record page. Wrapping the tab content area with `AnimatePresence` and keying on the active tab provides enter/exit animations.

**Direction-aware sliding:** Track the previous tab index to determine slide direction. If switching from tab 0 to tab 1, slide content left (new content enters from right). If switching from tab 1 to tab 0, slide content right (new content enters from left).

**Where used:**
- `app/(app)/transcripts/[id]/page.tsx` -- Transcript/Summary tab switcher (lines 698-744)
- `app/(app)/record/page.tsx` -- Microphone/Upload tab switcher (lines 116-185, 188-287)

**Confidence:** HIGH -- Standard Motion pattern, no App Router complications. `AnimatePresence` with keyed children is the textbook approach for tab transitions.

### 3. AnimatedTranscriptList (NEW or WRAPPER)

**File:** `app/components/library/animated-transcript-list.tsx`
**Type:** Client component
**Purpose:** Animates transcript cards as they enter/exit during search filtering.

**Architecture decision: Wrapper, not replacement.** The existing `TranscriptCard` component has complex swipe-to-delete logic, star toggling, and tag display. Rather than modifying it to be a motion component, wrap each card in an `AnimatedListItem` that handles the motion animation layer.

```
AnimatedTranscriptList
  AnimatePresence mode="popLayout"      <-- popLayout for smooth reflow
    AnimatedListItem key={transcript._id}  <-- one per card
      motion.div layout                    <-- layout prop for position animation
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96 }}
        TranscriptCard                     <-- existing component, unchanged
```

**Why `mode="popLayout"`:** When a card is filtered out, `popLayout` immediately removes it from document flow so remaining cards can smoothly reflow to new positions. The removed card plays its exit animation from its "popped" position (overlaid). This pairs perfectly with the `layout` prop on remaining cards, which animates them to their new positions.

**Why wrapper instead of modifying TranscriptCard:** TranscriptCard already uses refs, touch handlers, and translateX transforms for swipe-to-delete. Adding motion props directly would create conflicts between Motion's transform management and the manual swipe transforms. A wrapper keeps concerns separated.

**Ref forwarding requirement:** `AnimatePresence` with `popLayout` mode requires direct children to forward refs. `AnimatedListItem` must use `React.forwardRef`.

**Confidence:** HIGH -- This is a well-documented Motion pattern. The wrapper approach avoids conflicts with existing swipe logic.

### 4. useStableQuery Hook (NEW)

**File:** `app/lib/hooks/use-stable-query.ts`
**Type:** Custom hook
**Purpose:** Prevents flash-of-undefined when Convex query parameters change (fixes the search results flash bug).

**The problem:** On the transcripts page, when the user types in search, `debouncedSearch` changes, which causes `useQuery(api.transcripts.search, { searchTerm: debouncedSearch })` to return `undefined` momentarily while the new query loads. During this undefined window, the component falls back to showing `filteredTranscripts` (the unfiltered list), causing a visible flash of all transcripts before the filtered results appear.

**The solution:**

```typescript
export const useStableQuery = ((name, ...args) => {
  const result = useQuery(name, ...args);
  const stored = useRef(result);

  if (result !== undefined) {
    stored.current = result;
  }

  return stored.current;
}) as typeof useQuery;
```

When query args change, the hook continues returning the previous result until the new result arrives. This eliminates the flash because the component never sees `undefined` between valid results.

**Integration point:** Replace `useQuery` with `useStableQuery` for the search results query in `app/(app)/transcripts/page.tsx` (line 27-29). The `allTranscripts` query does NOT need this treatment because its args never change.

**Confidence:** HIGH -- This pattern is documented on the official Convex blog (stack.convex.dev). It is a direct application of React's `useRef` for value persistence.

## Integration Points with Existing Components

### Modified Components (Minimal Changes)

| Component | File | Change | Reason |
|-----------|------|--------|--------|
| AppLayout | `app/(app)/layout.tsx` | Wrap `{children}` with `PageTransitionProvider` | Page transition mount point |
| TranscriptsPage | `app/(app)/transcripts/page.tsx` | Replace card list div with `AnimatedTranscriptList`; use `useStableQuery` for search | List filtering animation + flash fix |
| TranscriptDetailContent | `app/(app)/transcripts/[id]/page.tsx` | Wrap tab content area with `AnimatedTabContent` | Tab slide transitions |
| RecordPage | `app/(app)/record/page.tsx` | Wrap tab content area with `AnimatedTabContent` | Tab slide transitions |

### Unmodified Components

| Component | File | Why No Changes |
|-----------|------|----------------|
| FABMenu | `app/components/navigation/fab-menu.tsx` | Already has CSS keyframe animations; stays outside page transitions |
| TranscriptCard | `app/components/library/transcript-card.tsx` | Wrapped by AnimatedListItem; internal logic unchanged |
| SearchBar | `app/components/library/search-bar.tsx` | No animation needed on the input itself |
| FilterTabs | `app/components/library/filter-tabs.tsx` | Already has CSS transition on colors; no additional animation needed |
| AudioPlayer | `app/components/audio/audio-player.tsx` | Fixed-position element; unrelated to transitions |
| Root layout | `app/layout.tsx` | Server Component; animation is client-only |
| ConvexClientProvider | `app/ConvexClientProvider.tsx` | Provider; no visual component |

## Data Flow: Animated Search Filtering

This is the most complex animation scenario because it combines Convex real-time data, debounced user input, and animated list rendering.

### Current Data Flow (with flash bug)

```
User types in SearchBar
  -> searchInput state updates
  -> useDebounce(searchInput, 300) -> debouncedSearch
  -> useQuery(api.transcripts.search, { searchTerm: debouncedSearch })
  -> returns undefined (flash!) then results
  -> displayTranscripts computed from results
  -> map() renders TranscriptCard list
```

### Fixed + Animated Data Flow

```
User types in SearchBar
  -> searchInput state updates
  -> useDebounce(searchInput, 300) -> debouncedSearch
  -> useStableQuery(api.transcripts.search, { searchTerm: debouncedSearch })
  -> returns PREVIOUS results until new ones arrive (no flash)
  -> displayTranscripts computed from stable results
  -> AnimatedTranscriptList renders with AnimatePresence
    -> Cards leaving: exit animation (fade + scale down)
    -> Cards staying: layout animation (smooth position change)
    -> Cards entering: enter animation (fade + scale up)
```

### Timing Considerations

- **Debounce delay (300ms):** Already in place. Prevents rapid-fire queries. Good default.
- **Animation duration:** Keep enter/exit at 150-200ms. Must be fast enough that results feel responsive but visible enough to be perceived as intentional.
- **Total perceived latency:** 300ms debounce + Convex query time (~50-100ms for local) + 200ms animation = ~600ms from last keystroke to final animated state. This is acceptable for search UX.

## Animation Specifications

### Page Transitions

| Property | Enter | Exit | Duration | Easing |
|----------|-------|------|----------|--------|
| opacity | 0 -> 1 | 1 -> 0 | 200ms | easeOut |
| y | 8px -> 0 | 0 -> -8px | 200ms | easeOut |

These are subtle -- a slight upward slide with fade. Heavy page transitions (full slides, rotations) feel wrong for a utility app. The goal is "premium and subtle," not "flashy."

### Tab Slide Transitions

| Property | Enter (forward) | Exit (forward) | Duration | Easing |
|----------|-----------------|-----------------|----------|--------|
| opacity | 0 -> 1 | 1 -> 0 | 200ms | easeInOut |
| x | 24px -> 0 | 0 -> -24px | 200ms | easeInOut |

Direction reverses when going backward (tab index decreasing). The x offset is small (24px, not full-width) for a subtle, smooth feel.

### List Item Enter/Exit

| Property | Enter | Exit | Duration | Easing |
|----------|-------|------|----------|--------|
| opacity | 0 -> 1 | 1 -> 0 | 150ms | easeOut |
| scale | 0.96 -> 1 | 1 -> 0.96 | 150ms | easeOut |
| y | 8px -> 0 | -- | 150ms | easeOut |

List items use `layout` prop for position animation (spring-based, default Motion spring). The `popLayout` mode on AnimatePresence means exiting items animate out while remaining items smoothly reposition.

## Anti-Patterns to Avoid

### Anti-Pattern 1: Using template.tsx for Page Transitions

**What:** Next.js template.tsx re-renders on every navigation, which seems ideal for transitions.
**Why bad:** template.tsx only supports enter animations (via `initial` + `animate`). It cannot do exit animations because the old template instance is already unmounted by the time the new one renders. There is no `AnimatePresence` wrapper to detect removal.
**Instead:** Use the FrozenRouter + AnimatePresence pattern in `layout.tsx`, which persists across navigation and can detect segment changes.

### Anti-Pattern 2: Animating the TranscriptCard Component Directly

**What:** Adding `motion.div` props directly to the TranscriptCard's root element.
**Why bad:** TranscriptCard already manages its own `transform: translateX()` for swipe-to-delete. Motion would conflict with this by trying to control the same transform property. The swipe animation uses manual state (`offsetX`) and inline styles, which would fight with Motion's animation system.
**Instead:** Wrap TranscriptCard in a separate `AnimatedListItem` component that handles enter/exit/layout animations at the wrapper level, leaving TranscriptCard's internal transforms untouched.

### Anti-Pattern 3: Animating Inside Convex Query Loading States

**What:** Showing animation while waiting for Convex data to load (e.g., animating skeleton loaders between real data).
**Why bad:** Convex queries are real-time subscriptions. The initial load is the only "loading" state; after that, data updates push automatically. Adding animation delays to subscription updates makes the UI feel sluggish instead of real-time.
**Instead:** Only animate the transition between data states (old results -> new results), not the loading state. Use `useStableQuery` to bridge the gap so there is no visible loading flash.

### Anti-Pattern 4: Using View Transitions API

**What:** Using the experimental `viewTransition` flag in `next.config.ts` or the `next-view-transitions` package.
**Why bad:** The View Transitions API is experimental in Next.js, only works in Chromium browsers (not Safari, which is the primary browser for this iOS-targeted PWA), and the Next.js integration is explicitly marked as not recommended for production.
**Instead:** Use Motion (Framer Motion) which works in all browsers via JavaScript-based animations and has a mature, stable API.

### Anti-Pattern 5: Heavy Page Transitions

**What:** Full-page slides, 3D transforms, or long-duration (500ms+) transitions.
**Why bad:** This is a utility app for transcription. Users navigate frequently between library, record, and transcript detail. Long transitions add friction. Mobile users are especially sensitive to navigation delays.
**Instead:** Keep page transitions under 200ms with subtle opacity and minimal position changes. The transitions should feel "effortless" rather than "impressive."

## Build Order (Dependency-Informed)

The following order is based on actual code dependencies between the components.

### Phase 1: Foundation (No Visual Changes Yet)

1. **Install Motion:** `npm install motion`
2. **Create `useStableQuery` hook** -- standalone utility, no UI changes
3. **Create `PageTransitionProvider` + `FrozenRouter`** -- standalone component, not yet integrated

**Rationale:** These are the building blocks. None of them change the UI yet, so they can be built and tested in isolation.

### Phase 2: Search Flash Fix + List Animations

4. **Fix search flash:** Replace `useQuery` with `useStableQuery` for search results in TranscriptsPage
5. **Create `AnimatedListItem` wrapper** and **`AnimatedTranscriptList`**
6. **Integrate into TranscriptsPage:** Replace the card list rendering with AnimatedTranscriptList

**Rationale:** The search flash is a bug fix (not a new feature) and should be addressed first. List animations build on `useStableQuery` because the flash fix ensures stable data for animation. This phase produces the highest-impact visual improvement (animated card filtering).

### Phase 3: Tab Animations

7. **Create `AnimatedTabContent`** component
8. **Integrate into transcript detail page** (Transcript/Summary tabs)
9. **Integrate into record page** (Microphone/Upload tabs)

**Rationale:** Tab animations are self-contained within their respective pages and have no dependencies on the page transition system. They can be built independently.

### Phase 4: Page Transitions

10. **Integrate `PageTransitionProvider`** into `(app)/layout.tsx`
11. **Test across all routes** (transcripts, record, settings, transcript detail)

**Rationale:** Page transitions are the riskiest feature because they depend on Next.js internal APIs (`LayoutRouterContext`). They are also the most architecturally invasive (modifying the layout component). Building them last means the other animations are already working and won't be destabilized by layout changes. If page transitions prove problematic, the other animations still ship.

## File Structure Summary

### New Files

```
app/
  components/
    transitions/
      page-transition-provider.tsx    -- FrozenRouter + AnimatePresence wrapper
      animated-tab-content.tsx        -- Tab slide transition wrapper
  lib/
    hooks/
      use-stable-query.ts             -- Stable Convex query for flash prevention
  components/
    library/
      animated-transcript-list.tsx    -- AnimatePresence list with layout animations
```

### Modified Files

```
app/(app)/layout.tsx                  -- Add PageTransitionProvider around {children}
app/(app)/transcripts/page.tsx        -- Use useStableQuery, AnimatedTranscriptList
app/(app)/transcripts/[id]/page.tsx   -- Use AnimatedTabContent for tabs
app/(app)/record/page.tsx             -- Use AnimatedTabContent for tabs
package.json                          -- Add motion dependency
```

## Technology Decision

**Library:** Motion (the `motion` npm package, formerly Framer Motion)
**Version:** Latest (12.x as of research date)
**Install:** `npm install motion`
**Import:** `import { motion, AnimatePresence } from "motion/react"`

**Why Motion over alternatives:**

| Criterion | Motion | CSS Transitions | GSAP | View Transitions API |
|-----------|--------|-----------------|------|---------------------|
| Exit animations | AnimatePresence | Requires manual DOM management | Timeline-based, manual | Browser-native but Chromium-only |
| Layout animations | `layout` prop (automatic FLIP) | Not possible | FlipPlugin (paid) | Limited |
| React integration | First-class (motion.div) | Via className toggling | Via refs and useEffect | Experimental in React |
| Bundle size | ~33KB gzipped | 0KB | ~27KB core | 0KB |
| Safari support | Full | Full | Full | None |
| Learning curve | Low (declarative) | Low | Medium (imperative) | Low but limited API |

Motion wins because: (1) `AnimatePresence` is the only declarative solution for exit animations in React, (2) the `layout` prop provides automatic FLIP animations for list reordering which would require significant manual code otherwise, (3) Safari support is critical for this iOS-first PWA, and (4) the declarative API (`initial`, `animate`, `exit` props) integrates naturally with React's rendering model.

## Sources

- [FrozenRouter page transition pattern for App Router](https://www.imcorfitz.com/posts/adding-framer-motion-page-transitions-to-next-js-app-router) -- Verified approach, HIGH confidence
- [Next.js App Router page transition discussion](https://github.com/vercel/next.js/discussions/42658) -- Community validation of the FrozenRouter pattern
- [next-transition-router package](https://github.com/ismamz/next-transition-router) -- Alternative approach evaluated and rejected (adds dependency for something achievable with ~50 lines of code)
- [Motion (formerly Framer Motion) official site](https://motion.dev) -- Library home, current API
- [List animation with AnimatePresence](https://theodorusclarence.com/blog/list-animation) -- Verified dual-div pattern for height animations, HIGH confidence
- [useStableQuery pattern for Convex](https://stack.convex.dev/help-my-app-is-overreacting) -- Official Convex blog, HIGH confidence
- [AnimatePresence popLayout mode example](https://framermotionexamples.com/example/framer-motion-animatepresence-poplayout-mode) -- Verified popLayout + layout prop combination
- [LayoutRouterContext in Next.js source](https://github.com/vercel/next.js/blob/canary/packages/next/src/shared/lib/app-router-context.shared-runtime.ts) -- Verified export exists; import path confirmed against installed Next.js 15.5.12
- [Next.js viewTransition experimental config](https://nextjs.org/docs/app/api-reference/config/next-config-js/viewTransition) -- Evaluated and rejected (experimental, Chromium-only)
- [Motion npm package](https://www.npmjs.com/package/motion) -- Verified current package name (not framer-motion), version 12.x

## Confidence Assessment

| Area | Confidence | Rationale |
|------|------------|-----------|
| Motion as animation library | HIGH | Dominant ecosystem choice, verified API, Safari support confirmed |
| List filtering animations | HIGH | Standard AnimatePresence + layout prop pattern, well-documented |
| Tab slide transitions | HIGH | Simple AnimatePresence with keyed children, no App Router complications |
| useStableQuery flash fix | HIGH | Pattern from official Convex blog, mechanically simple |
| Page transitions (FrozenRouter) | MEDIUM | Relies on internal Next.js API (`LayoutRouterContext`); works today on 15.5.12 but could break in future versions. Community-standard approach with no official alternative. |
| Build order | HIGH | Based on actual code dependency analysis of the existing codebase |
