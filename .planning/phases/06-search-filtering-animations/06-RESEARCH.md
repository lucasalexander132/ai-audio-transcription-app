# Phase 06: Search Filtering Animations - Research

**Researched:** 2026-02-10
**Domain:** Motion layout animations, AnimatePresence, list filtering choreography, iOS PWA performance
**Confidence:** HIGH

## Summary

This phase adds visual motion to the transcript card list as search results change. The search filtering logic itself is already built (Phase 05). The current transcript list is a plain `div.map()` over `displayTranscripts` with no animation. Cards appear and disappear instantly when the search query filters them.

The implementation requires three Motion features working together: (1) `AnimatePresence` with `mode="popLayout"` to orchestrate enter/exit animations, (2) the `layout` prop on each card to animate smooth repositioning when siblings are added/removed, and (3) variant-based stagger for the initial page load entrance. All three require upgrading the LazyMotion feature loader from `domAnimation` to `domMax` -- this is a one-line change in `app/lib/motion/features.ts` but adds approximately 10kb to the async chunk (from ~6kb to ~16kb).

The "standard premium feel" goal maps to: short durations (150-250ms), ease-out curves for exits, ease-in-out or gentle spring for enters, opacity+scale for enter/exit (GPU-composited, safe for iOS 30-40fps), and a modest stagger (40-60ms per card, capped at 8-10 cards). Layout repositioning uses transforms internally (Motion's FLIP technique), which is also GPU-friendly.

**Primary recommendation:** Upgrade `domAnimation` to `domMax`, wrap the card list in `AnimatePresence mode="popLayout"`, add `layout` prop to each card's wrapper, and use variants with `stagger()` for initial entrance. Keep all animations on opacity+transform (GPU-composited) for iOS PWA performance.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `motion` | ^12.34.0 | Already installed; provides AnimatePresence, layout animations, m components | Same library, just upgrading feature set from domAnimation to domMax |
| `domMax` feature set | (part of motion) | Adds layout animations (HTMLProjectionNode + MeasureLayout) to LazyMotion | Required for `layout` prop to work; verified in source: `domMax = domAnimation + drag + layout` |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `AnimatePresence` | (part of motion) | Orchestrates exit animations before DOM removal | Always available as a standalone component; not part of feature bundles |
| `LayoutGroup` | (part of motion) | Synchronizes layout animations across sibling components | Needed if cards span multiple independent parent containers |
| `stagger()` | (part of motion) | Generates progressive delays for variant transitions | Used for initial page load entrance cascade |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `domMax` (~16kb async) | Keep `domAnimation` + CSS-only repositioning | CSS cannot animate layout reflow smoothly; only Motion's FLIP technique handles gap-closing. The 10kb increase is justified by layout animation quality. |
| `mode="popLayout"` | `mode="sync"` (default) | "sync" keeps exiting items in document flow during exit, preventing remaining items from repositioning until exit completes. "popLayout" pops exiting items to absolute positioning immediately so remaining items reflow during exit. |
| `layout` prop on cards | Manual `transform` tracking | Would require measuring positions manually and computing deltas -- this is exactly what Motion's layout feature automates via FLIP |
| Variant stagger | Manual `transition-delay` per index | Variants + stagger() is the idiomatic Motion pattern; manual delays don't compose with AnimatePresence |

**Installation:**
```bash
# No new packages needed -- motion is already installed.
# Only change: features.ts export from domAnimation to domMax.
```

## Architecture Patterns

### Recommended Project Structure
```
app/
├── lib/
│   └── motion/
│       └── features.ts               # MODIFY: change domAnimation → domMax
├── components/
│   └── library/
│       ├── transcript-card.tsx        # MODIFY: wrap inner content in m.div with layout
│       └── animated-card-list.tsx     # NEW: AnimatePresence + stagger wrapper
└── (app)/
    └── transcripts/
        └── page.tsx                   # MODIFY: use AnimatedCardList instead of plain map
```

### Pattern 1: Upgrade domAnimation to domMax
**What:** One-line change in the feature loader to include layout animation support.
**When to use:** When any component in the app needs the `layout` prop.
**Example:**
```typescript
// app/lib/motion/features.ts
// Source: verified in node_modules/framer-motion/dist/es/render/dom/features-max.mjs
"use client";

import { domMax } from "motion/react";  // was: domAnimation
export default domMax;
```

### Pattern 2: AnimatePresence with popLayout for Filtered Lists
**What:** Wraps the card list so exiting cards animate out while remaining cards immediately reflow to close gaps.
**When to use:** Any list where items are conditionally rendered based on a filter/search.
**Example:**
```typescript
// Source: motion.dev/docs/react-animate-presence, popLayout mode documentation
import { AnimatePresence } from "motion/react";
import { m } from "motion/react-m";

const cardVariants = {
  initial: { opacity: 0, scale: 0.96 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.96 },
};

<div style={{ position: "relative" }}>  {/* popLayout needs non-static parent */}
  <AnimatePresence mode="popLayout" initial={false}>
    {displayTranscripts.map((transcript) => (
      <m.div
        key={transcript._id}
        layout
        variants={cardVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={{ duration: 0.2, ease: "easeOut" }}
      >
        <TranscriptCard ... />
      </m.div>
    ))}
  </AnimatePresence>
</div>
```

### Pattern 3: Staggered Entrance on Initial Page Load
**What:** Cards cascade in one-by-one when the page first loads.
**When to use:** Once, on the initial render of the transcript list.
**Example:**
```typescript
// Source: motion.dev/docs/stagger, variant delayChildren documentation
import { stagger } from "motion/react";
import { m } from "motion/react-m";

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      delayChildren: stagger(0.05, { startDelay: 0.1 }),
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.25, ease: "easeOut" },
  },
};

// In the list wrapper:
<m.div
  variants={containerVariants}
  initial="hidden"
  animate="visible"
>
  {displayTranscripts.map((transcript) => (
    <m.div key={transcript._id} variants={cardVariants} layout>
      <TranscriptCard ... />
    </m.div>
  ))}
</m.div>
```

### Pattern 4: Empty State Transition
**What:** When search narrows to zero results, the empty state fades in; when results return, it fades out.
**When to use:** Transition between "has results" and "no results" states.
**Example:**
```typescript
<AnimatePresence mode="wait">
  {displayTranscripts.length === 0 ? (
    <m.div
      key="empty"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <EmptyState type={isSearchActive ? "search" : activeTab} />
    </m.div>
  ) : (
    <m.div key="list" ...>
      {/* card list */}
    </m.div>
  )}
</AnimatePresence>
```

### Pattern 5: Dual-Div Structure for Gap Animation
**What:** Outer `m.div` handles height collapse (closing the gap), inner content handles opacity/scale.
**When to use:** When gaps between cards need to animate closed smoothly during exit.
**Why:** Margin and gap CSS properties are NOT included in height-based animations. Animating the outer wrapper's height to 0 on exit naturally closes the gap.
**Example:**
```typescript
// Source: theodorusclarence.com/blog/list-animation
<m.div
  key={transcript._id}
  layout
  initial={{ height: "auto", opacity: 1 }}
  exit={{ height: 0, opacity: 0 }}
  transition={{ duration: 0.2, ease: "easeOut" }}
  style={{ overflow: "hidden" }}
>
  <div style={{ padding: "6px 0" }}> {/* padding replaces gap */}
    <TranscriptCard ... />
  </div>
</m.div>
```
**Note:** This approach may be unnecessary if `popLayout` mode handles the gap-closing via layout animations. Test `popLayout` first; only add the dual-div pattern if gaps don't close smoothly.

### Anti-Patterns to Avoid
- **Using `motion.div` instead of `m.div`:** LazyMotion strict mode is enforced. Using `motion.div` will either throw an error or defeat code-splitting by pulling in the full bundle.
- **Animating `width`, `height`, `top`, `left` directly:** These trigger layout recalculation every frame. The `layout` prop uses FLIP (transform-based) which is GPU-composited. Only use height animation for the dual-div exit pattern where it's a single measurement.
- **Missing `key` prop on AnimatePresence children:** AnimatePresence tracks children by `key`. Without unique, stable keys, exit animations won't fire. Use `transcript._id` (Convex document ID).
- **Forgetting `position: relative` on popLayout parent:** `popLayout` mode uses `position: absolute` for exiting elements. The parent must have `position: relative` (or any non-static) for correct positioning.
- **Over-staggering large lists:** 50ms delay x 30 cards = 1.5 seconds before the last card appears. Cap the stagger effect at 8-10 cards; cards beyond the cap should appear simultaneously.
- **Using `initial={false}` incorrectly:** Setting `initial={false}` on `AnimatePresence` prevents the initial mount animation for all children. This is CORRECT for search filtering (don't animate cards already visible), but WRONG for the initial page load stagger (where you want the entrance).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Smooth repositioning when cards exit | Manual position tracking + transform calculations | Motion `layout` prop | FLIP technique is complex (measure, invert, play); Motion handles it automatically including interruptions mid-animation |
| Exit animations before DOM removal | `setTimeout` + `display: none` | `AnimatePresence` | Race conditions with rapid filtering, memory leaks from orphaned timeouts, no interrupt handling |
| Staggered entrance delays | `style={{ animationDelay: index * 50 }}` with CSS keyframes | Motion `stagger()` with variants | Stagger integrates with AnimatePresence lifecycle; CSS delays don't coordinate with conditional rendering |
| Gap closing after card removal | Manual height measurement + CSS transitions | `popLayout` mode + `layout` prop | Layout reflow timing is browser-dependent; Motion coordinates exit animation with sibling reflow |

**Key insight:** The combination of AnimatePresence + layout + popLayout is the standard Motion pattern for filtered lists. Each piece solves a specific sub-problem (exit animation, repositioning, immediate reflow). Attempting to solve any of these individually with CSS or manual JS will miss the coordination between them.

## Common Pitfalls

### Pitfall 1: popLayout + layout Opacity Bug (Issue #2416)
**What goes wrong:** When using `AnimatePresence mode="popLayout"` with elements that have both `layout` and `exit` opacity animations, exit opacity may not fire consistently (every other item).
**Why it happens:** Known bug in Motion where popLayout mode doesn't consistently trigger opacity exit animations on elements with the layout prop.
**How to avoid:** Test thoroughly during implementation. If the bug manifests: (a) try separating the layout wrapper from the exit animation wrapper (outer div has `layout`, inner div has exit), or (b) use `mode="sync"` instead of `popLayout` and animate gap-closing via the dual-div height technique instead.
**Warning signs:** Cards disappear instantly instead of fading out, but only intermittently.

### Pitfall 2: Layout Animation Without domMax
**What goes wrong:** Cards don't reposition smoothly; the `layout` prop appears to have no effect.
**Why it happens:** The `layout` prop requires the layout feature (HTMLProjectionNode + MeasureLayout), which is only included in `domMax`, not `domAnimation`.
**How to avoid:** Upgrade `features.ts` to export `domMax` BEFORE adding any `layout` props to components.
**Warning signs:** No errors in console, but cards snap to new positions instead of animating.

### Pitfall 3: Stagger Blocking Interaction
**What goes wrong:** User can't scroll or interact while 20+ cards stagger in over 1-2 seconds.
**Why it happens:** Long stagger delays on large lists block perceived interactivity.
**How to avoid:** Cap the visual stagger at 8-10 items. Cards beyond the cap render with the same delay as the cap item (effectively appearing simultaneously). Total stagger duration should not exceed 500ms.
**Warning signs:** Page feels frozen or slow on first load with many transcripts.

### Pitfall 4: iOS PWA 30fps Layout Thrashing
**What goes wrong:** Animations feel janky on iOS PWA standalone mode.
**Why it happens:** iOS PWA standalone mode runs at 30-40fps. Layout animations that trigger reflow every frame will drop frames.
**How to avoid:** (a) Keep all animated properties on the compositor (opacity, transform only), (b) the `layout` prop uses transforms internally (FLIP technique) which is GPU-composited, (c) avoid animating height/width except in the exit dual-div pattern, (d) keep durations short (150-250ms) so even at 30fps there are enough frames for perceived smoothness (4-8 frames).
**Warning signs:** Animations look choppy only on iOS Home Screen app but smooth in Safari browser tab.

### Pitfall 5: AnimatePresence Rapid State Changes
**What goes wrong:** Typing quickly in search causes animation artifacts -- cards flicker or get stuck mid-animation.
**Why it happens:** Each keystroke (after debounce) triggers a new set of enter/exit animations. If the previous animation hasn't completed, AnimatePresence may queue or interrupt poorly.
**How to avoid:** The existing 300ms debounce + useStableQuery already rate-limits how often `displayTranscripts` changes. Do NOT reduce the debounce for animation smoothness. Additionally, keep animation durations under the debounce window (< 300ms) so animations complete before the next filter change arrives.
**Warning signs:** Cards appear stuck at partial opacity or scale after rapid typing.

### Pitfall 6: Margin/Gap Not Animating on Exit
**What goes wrong:** Cards fade out and scale down, but the gap they occupied remains until the element is removed from DOM, causing a visible empty space that snaps closed.
**Why it happens:** CSS `gap` on the parent flex container creates space between items. When a card exits (but is still in DOM for the animation), the gap persists.
**How to avoid:** Two approaches: (a) Use `popLayout` mode which removes the element from flow immediately, or (b) Replace CSS `gap` with per-card padding/margin and animate it to 0 on exit.
**Warning signs:** Empty rectangular spaces where cards were, snapping closed after exit animation completes.

### Pitfall 7: layoutScroll for Scrollable Containers
**What goes wrong:** Layout animations measure incorrect positions when the card list is scrolled.
**Why it happens:** Motion doesn't measure scroll offset of every ancestor for performance. If the card list is inside a scrollable container, positions are measured relative to the viewport, not the scroll container.
**How to avoid:** Add `layoutScroll` prop to the scrollable ancestor. In the current codebase, the page itself scrolls (no explicit scroll container), so this may not be an issue. Test with a scrolled-down list.
**Warning signs:** Cards animate to wrong positions when the list is scrolled past the viewport top.

## Code Examples

### Complete Animated Card List Component
```typescript
// app/components/library/animated-card-list.tsx
"use client";

import { AnimatePresence, stagger } from "motion/react";
import { m } from "motion/react-m";
import { TranscriptCard } from "./transcript-card";
import type { Id } from "@/convex/_generated/dataModel";

// Stagger entrance variants for initial page load
const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      delayChildren: stagger(0.05, { startDelay: 0.1 }),
    },
  },
};

// Per-card animation variants
const cardVariants = {
  hidden: { opacity: 0, y: 8, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.2, ease: "easeOut" },
  },
  exit: {
    opacity: 0,
    scale: 0.96,
    transition: { duration: 0.15, ease: "easeIn" },
  },
};

interface AnimatedCardListProps {
  transcripts: Array<{
    _id: Id<"transcripts">;
    title: string;
    createdAt: number;
    duration?: number;
    status: string;
    source?: string;
    isStarred?: boolean;
  }>;
  tagsByTranscript: Map<string, string[]>;
  speakersByTranscript: Map<string, string[]>;
  onCardClick: (id: string) => void;
  isInitialLoad: boolean;  // true only on first render
}

export function AnimatedCardList({
  transcripts,
  tagsByTranscript,
  speakersByTranscript,
  onCardClick,
  isInitialLoad,
}: AnimatedCardListProps) {
  return (
    <m.div
      className="flex flex-col"
      style={{ gap: 12, padding: "0 24px", paddingBottom: 120, position: "relative" }}
      variants={isInitialLoad ? containerVariants : undefined}
      initial={isInitialLoad ? "hidden" : false}
      animate="visible"
    >
      <AnimatePresence mode="popLayout" initial={false}>
        {transcripts.map((transcript) => (
          <m.div
            key={transcript._id}
            layout
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <TranscriptCard
              transcript={transcript}
              tags={tagsByTranscript.get(transcript._id) ?? []}
              speakers={speakersByTranscript.get(transcript._id) ?? []}
              onClick={() => onCardClick(transcript._id)}
            />
          </m.div>
        ))}
      </AnimatePresence>
    </m.div>
  );
}
```

### Feature Loader Upgrade (One-Line Change)
```typescript
// app/lib/motion/features.ts
"use client";

import { domMax } from "motion/react";  // Changed from domAnimation
export default domMax;
```

### Empty State with Crossfade
```typescript
// In transcripts/page.tsx, replace the conditional rendering:
<AnimatePresence mode="wait">
  {isLoading ? (
    <m.div key="skeleton" exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
      {/* skeleton cards */}
    </m.div>
  ) : displayTranscripts.length === 0 ? (
    <m.div
      key="empty"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <EmptyState type={isSearchActive ? "search" : activeTab} />
    </m.div>
  ) : (
    <m.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <AnimatedCardList ... />
    </m.div>
  )}
</AnimatePresence>
```

### Stagger Cap Pattern
```typescript
// Cap stagger so that items beyond index 8 appear simultaneously
const STAGGER_CAP = 8;

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      // stagger only applies to first N children via delayChildren;
      // children beyond STAGGER_CAP use the same delay
      delayChildren: stagger(0.05, { startDelay: 0.1 }),
    },
  },
};

// In the card variant, cap the delay:
// Note: stagger() handles this automatically -- it continues incrementing.
// To cap, use a custom transition per-item based on index instead:
const getCardTransition = (index: number) => ({
  duration: 0.2,
  ease: "easeOut" as const,
  delay: 0.1 + Math.min(index, STAGGER_CAP) * 0.05,
});

// Usage:
{transcripts.map((transcript, index) => (
  <m.div
    key={transcript._id}
    layout
    initial={{ opacity: 0, y: 8, scale: 0.98 }}
    animate={{
      opacity: 1,
      y: 0,
      scale: 1,
      transition: isInitialLoad ? getCardTransition(index) : { duration: 0.2 },
    }}
    exit={{
      opacity: 0,
      scale: 0.96,
      transition: { duration: 0.15, ease: "easeIn" },
    }}
  >
    <TranscriptCard ... />
  </m.div>
))}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `framer-motion` AnimatePresence `mode="exitBeforeEnter"` | `mode="wait"` (renamed) | framer-motion v7 | Same behavior, just renamed |
| `AnimateSharedLayout` wrapper | `LayoutGroup` + `layout` prop | framer-motion v6 | AnimateSharedLayout fully removed |
| Manual FLIP calculations | `layout` prop on motion/m components | framer-motion v2+ | Built-in, handles interruptions, springs, and crossfade |
| CSS `transition-delay` per item | `stagger()` function from motion/react | motion v12 | Dedicated stagger function works with variants lifecycle |
| `domAnimation` for basic animations | `domMax` when layout needed | Since LazyMotion existed | One-line feature upgrade when project needs grow |

**Deprecated/outdated:**
- `AnimateSharedLayout`: Removed. Use `LayoutGroup` instead.
- `mode="exitBeforeEnter"`: Renamed to `mode="wait"`.
- `positionTransition` prop: Replaced by `layout` prop.

## Open Questions

1. **popLayout + layout opacity consistency (Issue #2416)**
   - What we know: There's a reported bug where `mode="popLayout"` intermittently fails to trigger opacity exit animations on elements with `layout`. The bug was reported in 2023 and may or may not be fixed in v12.34.0.
   - What's unclear: Whether this affects the current version. The GitHub issue doesn't have a clear resolution tag.
   - Recommendation: Implement with `popLayout` first. If intermittent exit failures occur, fall back to `mode="sync"` with the dual-div height animation pattern for gap-closing.

2. **Stagger cap implementation**
   - What we know: Motion's `stagger()` function doesn't have a built-in cap. It will stagger indefinitely based on child count.
   - What's unclear: Whether a large stagger (e.g., 20 items at 50ms each = 1s total) feels acceptable or needs capping.
   - Recommendation: Use per-item `transition.delay` with `Math.min(index, 8) * 0.05` to cap at 8 items, so total stagger time is ~400ms maximum. Cards beyond index 8 appear simultaneously at the 400ms mark.

3. **Whether current page-level scroll needs layoutScroll**
   - What we know: The transcript list scrolls via the page body, not a scroll container. Motion docs say `layoutScroll` is needed for scrollable elements so layout measurements account for scroll offset.
   - What's unclear: Whether page-level scroll (body scrolling) is automatically handled or needs `layoutScroll` on the page wrapper.
   - Recommendation: Test without `layoutScroll` first. If cards animate to incorrect positions when scrolled, add `layoutScroll` to the outermost scrollable ancestor.

## Sources

### Primary (HIGH confidence)
- **Source code verification** (`node_modules/framer-motion/dist/es/render/dom/features-animation.mjs` and `features-max.mjs`): Confirmed `domMax = domAnimation + drag + layout`. Layout feature provides HTMLProjectionNode + MeasureLayout.
- **Source code verification** (`node_modules/motion/dist/es/react.mjs`): Confirmed `motion/react` re-exports all of `framer-motion`, so `domMax` import from `motion/react` works.
- **Codebase inspection** of `app/(app)/transcripts/page.tsx`: Current card list is plain `div.map()` with no animation wrappers.
- **Phase 05 Summary** (`05-02-SUMMARY.md`): Confirmed `domAnimation` currently in use, LazyMotion strict mode enforced, `m.div` required.
- [StaticMania - Animate Layout Changes in Next.js Using Motion's layout Prop](https://staticmania.com/blog/animate-layout-in-next.js-using-motions-layout-prop) - Verified layout + AnimatePresence pattern, layoutScroll, LayoutGroup usage in Next.js App Router.
- [Theodore Clarence - List Animation using Motion for React](https://theodorusclarence.com/blog/list-animation) - Dual-div pattern for height/gap animation, verified forwardRef requirement.

### Secondary (MEDIUM confidence)
- [Maxime Heckel - Everything about Framer Motion layout animations](https://blog.maximeheckel.com/posts/framer-motion-layout-animations/) - Comprehensive layout animation patterns; confirmed layout="position" vs layout=true behavior.
- [LogRocket - Creating React animations with Motion](https://blog.logrocket.com/creating-react-animations-with-motion/) - Confirmed bundle size: LazyMotion reduces to ~6kb initial; domMax ~25kb.
- [Motion.dev - AnimatePresence docs](https://motion.dev/docs/react-animate-presence) - popLayout mode behavior (element removed from flow, position: absolute).
- [Motion.dev - Layout Animations docs](https://motion.dev/docs/react-layout-animations) - layoutScroll, layout prop options.
- [Motion.dev - Stagger docs](https://motion.dev/docs/stagger) - stagger() function API, from/startDelay options.

### Tertiary (LOW confidence)
- [GitHub Issue #2416](https://github.com/motiondivision/motion/issues/2416) - popLayout + layout opacity bug. Reported 2023, resolution status unclear for v12.34.0.
- [GitHub Issue #1585](https://github.com/motiondivision/motion/issues/1585) - domAnimation/domMax documented sizes may not match actual bundle sizes. Low impact since we're already committed to domMax.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Source code verified domMax contents; motion v12.34.0 already installed
- Architecture: HIGH - AnimatePresence + layout + popLayout is the documented standard pattern for filtered lists, confirmed across multiple authoritative sources
- Pitfalls: MEDIUM - The popLayout+layout opacity bug (#2416) status is unclear for current version; iOS PWA performance is a known concern from project STATE.md but specific thresholds untested
- Code examples: HIGH - Patterns verified against official docs and real-world implementations

**Research date:** 2026-02-10
**Valid until:** 2026-03-10 (30 days; motion v12 is stable, layout animations are a mature feature)
