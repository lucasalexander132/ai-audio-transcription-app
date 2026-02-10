# Domain Pitfalls: Micro Interactions & Animations (v1.1)

**Domain:** Adding animations to existing Next.js 15 App Router mobile-first PWA
**Project:** Transcripts app (Next.js 15, React 19, Convex, Tailwind, Zustand)
**Researched:** 2026-02-10
**Confidence:** MEDIUM-HIGH (verified with official docs, GitHub issues, and multiple community sources)

---

## Critical Pitfalls

Mistakes that cause rewrites, broken navigation, or unusable UI on mobile devices.

---

### Pitfall 1: AnimatePresence Exit Animations Silently Fail in Next.js App Router

**What goes wrong:**
You wrap page content in `<AnimatePresence>` with exit animations, but exit animations never play. Pages just pop in instantly. You spend hours debugging before discovering this is a fundamental architectural incompatibility between Motion's AnimatePresence and Next.js App Router's component lifecycle.

**Why it happens:**
Next.js App Router unmounts the previous route's component tree *immediately* when navigation occurs. AnimatePresence needs the old children to remain in the DOM during exit animation, but the router has already destroyed them. This is fundamentally different from Pages Router, where `_app.tsx` wrapping made exit animations trivial.

The App Router `layout.tsx` preserves state across navigations (by design), meaning it never re-renders children with a new key -- which is exactly what AnimatePresence needs to detect component removal.

**Consequences:**
- Exit animations silently do nothing -- no error, no warning
- Developers add more animation code thinking something else is wrong
- Eventually discover the entire page transition approach needs restructuring
- May require the FrozenRouter hack, which accesses internal Next.js APIs that can break on any update

**Prevention:**

1. **Use `template.tsx` instead of `layout.tsx`** for the animation wrapper. `template.tsx` remounts on every navigation, giving AnimatePresence the key change it needs.

2. **Use the FrozenRouter pattern** to prevent route context from updating during exit animation:
```typescript
// This pattern freezes the router context so the old page
// stays rendered during exit animation
"use client";
import { LayoutRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { useContext, useRef } from "react";

function FrozenRouter({ children }: { children: React.ReactNode }) {
  const context = useContext(LayoutRouterContext);
  const frozen = useRef(context).current;
  return (
    <LayoutRouterContext.Provider value={frozen}>
      {children}
    </LayoutRouterContext.Provider>
  );
}
```

3. **Consider the View Transitions API** as an alternative. Next.js 15.2+ has experimental `viewTransition` support that works natively with App Router without the AnimatePresence workaround. Enable via `next.config.ts`:
```typescript
const nextConfig: NextConfig = {
  experimental: {
    viewTransition: true,
  },
};
```

**Warning signs:**
- Exit animations defined but never visually trigger
- `onAnimationComplete` callbacks for exit never fire
- Pages pop in without the expected fade-out of the previous page

**Detection:**
- Add `console.log` in exit animation's `onAnimationComplete` -- if it never fires, this is the problem

**Phase mapping:**
- **Phase 1 (Page Transitions):** Must choose approach before writing any animation code. This decision shapes the entire animation architecture.

**Sources:**
- [Next.js Discussion #42658: How to animate route transitions in app directory](https://github.com/vercel/next.js/discussions/42658) (HIGH confidence -- official GitHub)
- [Solving Framer Motion Page Transitions in Next.js App Router](https://www.imcorfitz.com/posts/adding-framer-motion-page-transitions-to-next-js-app-router) (MEDIUM confidence)
- [Motion Issue #2411: exit not working in Next.js App Router](https://github.com/framer/motion/issues/2411) (HIGH confidence -- official issue tracker)
- [Next.js viewTransition docs](https://nextjs.org/docs/app/api-reference/config/next-config-js/viewTransition) (HIGH confidence -- official docs)

---

### Pitfall 2: FrozenRouter Pattern Relies on Internal Next.js APIs

**What goes wrong:**
You implement the FrozenRouter workaround (Pitfall 1's prevention), it works perfectly, then a Next.js minor version update changes the internal import path and your entire app's page transitions break with a cryptic import error.

**Why it happens:**
The FrozenRouter pattern imports from `next/dist/shared/lib/app-router-context.shared-runtime`, which is an internal, undocumented API path. Next.js makes no stability guarantees for these paths. The import path has already changed between Next.js 13, 14, and 15.

**Consequences:**
- App breaks on `next` package update with no obvious cause
- Build fails with "module not found" errors
- Must audit internal Next.js source code to find new path
- Transition animation code is fragile and version-locked

**Prevention:**
1. **Pin Next.js version precisely** in `package.json` (not `^15.x`, use exact version)
2. **Prefer the View Transitions API** (`experimental.viewTransition`) which is an official, supported API
3. **If using FrozenRouter**, wrap it in a try/catch with graceful degradation:
```typescript
let LayoutRouterContext: React.Context<any>;
try {
  // This path may change between Next.js versions
  LayoutRouterContext = require(
    "next/dist/shared/lib/app-router-context.shared-runtime"
  ).LayoutRouterContext;
} catch {
  // Graceful degradation: no exit animations, but app doesn't break
  LayoutRouterContext = React.createContext(null);
}
```
4. **Add a CI test** that imports the FrozenRouter module to catch breakage early

**Warning signs:**
- You are importing from `next/dist/` (any internal path)
- Build warnings about deprecated internal APIs
- Page transitions suddenly stop working after `npm update`

**Phase mapping:**
- **Phase 1 (Page Transitions):** Architecture decision -- FrozenRouter vs View Transitions API

**Sources:**
- [Next.js Issue #49279: App Router issue with Framer Motion shared layout animations](https://github.com/vercel/next.js/issues/49279) (HIGH confidence)
- [Next.js Discussion #59349: Page transitions in App Dir](https://github.com/vercel/next.js/discussions/59349) (HIGH confidence)

---

### Pitfall 3: Motion Library Import Path and React 19 Compatibility

**What goes wrong:**
You install `framer-motion`, import from `"framer-motion"`, and get cryptic React 19 compatibility errors or hydration mismatches. The library *appears* to install fine but throws runtime errors in components using `AnimatePresence` or `useMotionValue`.

**Why it happens:**
Framer Motion was rebranded to "Motion" starting at v12 (released 2025-01-20). The package is now `motion` with imports from `"motion/react"` instead of `"framer-motion"`. The old `framer-motion` package is effectively frozen at v11, which does NOT support React 19 (which Next.js 15 requires). Installing `framer-motion` with React 19 triggers peer dependency warnings that developers often dismiss.

**Consequences:**
- Runtime errors on any page using animations
- Hydration mismatches in SSR/client boundary
- `AnimatePresence` children not animating properly
- Wasted debugging time on wrong package

**Prevention:**
1. **Install `motion` (not `framer-motion`)**:
```bash
npm install motion
```
2. **Import from `"motion/react"`**:
```typescript
// WRONG (old, React 19 incompatible)
import { motion, AnimatePresence } from "framer-motion";

// CORRECT (v12+, React 19 compatible)
import { motion, AnimatePresence } from "motion/react";
```
3. **All animated components must be Client Components** (`"use client"` directive)
4. Current stable version is 12.34.0 (as of 2026-02-09)

**Warning signs:**
- `npm install` warns about peer dependency on React 18
- Import autocomplete suggests `"framer-motion"` from old tutorials
- `TypeError: Cannot read properties of undefined` in motion components

**Phase mapping:**
- **Phase 0 (Setup):** Install correct package before any animation work begins

**Sources:**
- [Motion & Framer Motion upgrade guide](https://motion.dev/docs/react-upgrade-guide) (HIGH confidence -- official docs)
- [Motion changelog](https://github.com/motiondivision/motion/blob/main/CHANGELOG.md) (HIGH confidence -- v12.0.0 released 2025-01-20)
- [Next.js Discussion #72228: framer-motion for Next.js 15.0.2](https://github.com/vercel/next.js/discussions/72228) (HIGH confidence)

---

### Pitfall 4: Convex Real-Time Subscriptions Interrupt Mid-Animation

**What goes wrong:**
You animate a transcript card expanding, and mid-animation the card snaps to a different size or jumps position. Or you start a page transition and halfway through, the entire component tree re-renders, causing the animation to restart or jump to the end.

**Why it happens:**
Convex `useQuery` hooks create live subscriptions that re-render the component whenever data changes. The Transcripts page has 4 concurrent `useQuery` subscriptions (`api.transcripts.list`, `api.transcripts.search`, `api.tags.getAllTranscriptTags`, `api.transcripts.getAllSpeakerLabels`). Any mutation to the database -- even from another device -- triggers a re-render that interrupts in-progress animations.

The current code structure makes this worse: `displayTranscripts` is recomputed via `useMemo` whenever `allTranscripts`, `searchResults`, or `tagsByTranscript` changes, and the entire list re-renders.

**Consequences:**
- Animations visually stutter or reset during real-time data updates
- Cards jump positions mid-transition
- Tab switch animations restart when background data arrives
- Users see "janky" animations exactly when data is most active

**Prevention:**

1. **Use `useStableQuery` pattern** to prevent loading flashes:
```typescript
import { useQuery } from "convex/react";
import { useRef } from "react";

function useStableQuery(queryFn: any, args: any) {
  const result = useQuery(queryFn, args);
  const stored = useRef(result);

  // Only update ref when we have new data (not undefined/loading)
  if (result !== undefined) {
    stored.current = result;
  }

  return stored.current;
}
```

2. **Isolate animated components with React.memo** to prevent parent re-renders from interrupting child animations:
```typescript
const AnimatedTranscriptCard = React.memo(
  function AnimatedTranscriptCard({ transcript, ...props }) {
    return (
      <motion.div layout layoutId={transcript._id}>
        <TranscriptCard transcript={transcript} {...props} />
      </motion.div>
    );
  },
  (prev, next) => prev.transcript._id === next.transcript._id
    && prev.transcript._updatedAt === next.transcript._updatedAt
);
```

3. **Separate animation state from data state** -- do not derive animation triggers from Convex query results directly. Use a local state layer that buffers updates:
```typescript
const [animationList, setAnimationList] = useState<string[]>([]);

useEffect(() => {
  // Debounce list changes so animations can complete
  const timer = setTimeout(() => {
    setAnimationList(displayTranscripts.map(t => t._id));
  }, 300);
  return () => clearTimeout(timer);
}, [displayTranscripts]);
```

**Warning signs:**
- Animations work in dev (no other users) but stutter in production (real-time updates)
- Animation stutters correlate with Convex subscription activity in network tab
- `displayTranscripts` identity changes even when visible data is identical

**Phase mapping:**
- **Phase 2 (List Animations):** Must implement isolation before animating transcript cards
- **Phase 3 (Tab Animations):** Must isolate tab content from parent Convex subscriptions

**Sources:**
- [Help, my app is overreacting! -- Convex Blog](https://stack.convex.dev/help-my-app-is-overreacting) (HIGH confidence -- official Convex blog)
- [Convex React: useQuery documentation](https://docs.convex.dev/client/react) (HIGH confidence -- official docs)

---

### Pitfall 5: Search Results Flash Unfiltered State (Known Bug)

**What goes wrong:**
When typing in the search box, the full unfiltered transcript list briefly flashes before showing filtered results. This is a known issue in the current codebase.

**Why it happens:**
The current implementation uses `useDebounce(searchInput, 300)` which creates a 300ms gap between typing and `debouncedSearch` updating. During this gap, `isSearchActive` is false (because `debouncedSearch` still has the old value), so `displayTranscripts` returns the full `filteredTranscripts` list. When the debounced value catches up, it switches to search results, causing the visual flash.

Additionally, when `debouncedSearch` updates, `useQuery(api.transcripts.search, ...)` returns `undefined` while the new query runs, creating another flash where `searchResults` is undefined and `isSearchActive` becomes false again.

**Consequences:**
- Visible layout jump every keystroke (list briefly shows all items, then filters)
- Poor perceived performance despite being technically correct
- Adding animations to this broken flow will make it WORSE (animated flash is more distracting than instant flash)

**Prevention:**

1. **Fix the flash BEFORE adding animations.** This is a prerequisite, not a nice-to-have.

2. **Use `useDeferredValue` instead of `useDebounce`** for the search input:
```typescript
import { useDeferredValue } from "react";

const [searchInput, setSearchInput] = useState("");
const deferredSearch = useDeferredValue(searchInput);
// React will keep showing old results while new ones load
```

3. **Use `useStableQuery` for search results** to prevent the undefined flash:
```typescript
const searchResults = useStableQuery(
  api.transcripts.search,
  deferredSearch.length >= 2 ? { searchTerm: deferredSearch } : "skip"
);
// Returns previous results while new query loads, never undefined
```

4. **Show stale content with a visual indicator** instead of flashing to unfiltered:
```typescript
const isPending = searchInput !== deferredSearch;
return (
  <div style={{ opacity: isPending ? 0.7 : 1, transition: "opacity 0.15s" }}>
    {/* List always shows stable results, just dims while updating */}
  </div>
);
```

**Warning signs:**
- Content shifts or jumps when typing in search
- Full list briefly visible between keystrokes
- Layout animations trigger on every keystroke (animating the wrong thing)

**Phase mapping:**
- **Phase 1 (Setup/Fixes):** Fix this BEFORE any list animation work. Animations will amplify the bug.

**Sources:**
- [useDeferredValue -- React docs](https://react.dev/reference/react/useDeferredValue) (HIGH confidence -- official docs)
- [Say no to "flickering" UI](https://www.developerway.com/posts/no-more-flickering-ui) (MEDIUM confidence)

---

## Moderate Pitfalls

Mistakes that cause performance degradation, jank, or poor mobile experience.

---

### Pitfall 6: Mobile Safari GPU Memory Exhaustion from Excess Compositor Layers

**What goes wrong:**
You add `will-change: transform` or `transform: translate3d(0,0,0)` to many elements for "GPU acceleration," and iOS Safari becomes sluggish, animations stutter, or the browser crashes entirely.

**Why it happens:**
Each element with `will-change` or a 3D transform creates a separate GPU compositor layer. Each layer consumes GPU memory (texture memory). Mobile devices have strict GPU memory budgets (iOS Safari shares GPU memory with the OS). When too many layers exist simultaneously, the GPU runs out of memory, forcing fallback to CPU compositing (slow) or crashing.

The Transcripts page renders a list of cards. Putting `will-change: transform` on each card means 20+ compositor layers just for idle cards. During animations, this doubles.

**Consequences:**
- iOS Safari crashes on pages with many animated elements
- Animations become SLOWER than without GPU hints
- Battery drain increases significantly (GPU active for idle elements)
- Memory warnings in Safari Web Inspector

**Prevention:**

1. **Never apply `will-change` permanently.** Add it just before animation starts, remove it after:
```typescript
<motion.div
  onAnimationStart={(e) => {
    (e.target as HTMLElement).style.willChange = "transform, opacity";
  }}
  onAnimationComplete={(e) => {
    (e.target as HTMLElement).style.willChange = "auto";
  }}
/>
```

2. **Limit concurrent animated elements.** For list animations, only animate visible cards (viewport intersection), not the entire list:
```typescript
// Only animate cards that are in/near viewport
const [ref, inView] = useInView({ threshold: 0, rootMargin: "100px" });
return (
  <motion.div
    ref={ref}
    animate={inView ? { opacity: 1, y: 0 } : undefined}
  />
);
```

3. **Maximum 10-15 compositor layers on mobile.** Profile in Safari Web Inspector > Layers tab.

4. **Animate ONLY `transform` and `opacity`** -- these are the only two properties that can be composited without layout/paint. Animating `width`, `height`, `top`, `left`, `padding`, `margin`, `border-radius`, `box-shadow`, or `background-color` triggers layout or paint on every frame.

**Warning signs:**
- Safari Web Inspector Layers tab shows 20+ layers
- Memory usage spikes during page load (not animation)
- Device feels warm during normal browsing
- FPS drops below 30 on iPhone during scroll

**Detection:**
- Safari Web Inspector > Layers tab shows layer count
- Chrome DevTools > Performance > check "Layout" and "Paint" events during animation
- Chrome DevTools > Rendering > "Layer borders" checkbox

**Phase mapping:**
- **Phase 2 (List Animations):** Critical for transcript card animations
- **Phase 3 (Tab Animations):** Monitor layer count during tab switch

**Sources:**
- [CSS GPU Acceleration: will-change & translate3d Guide](https://www.lexo.ch/blog/2025/01/boost-css-performance-with-will-change-and-transform-translate3d-why-gpu-acceleration-matters/) (MEDIUM confidence)
- [Web Animation Performance Tier List -- Motion Magazine](https://motion.dev/blog/web-animation-performance-tier-list) (HIGH confidence -- official Motion blog)
- [CSS performance optimization -- MDN](https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Performance/CSS) (HIGH confidence -- MDN)

---

### Pitfall 7: Layout Thrashing During List Filter Animations

**What goes wrong:**
When search filters narrow results, remaining cards animate to new positions but the animation is choppy (15-20fps instead of 60fps). Users see visible stutter as cards slide into place.

**Why it happens:**
Layout thrashing occurs when JavaScript reads a layout property (e.g., `getBoundingClientRect()`, `offsetHeight`, `scrollTop`), then writes to the DOM (changing styles), then reads again. Each read after a write forces the browser to synchronously recalculate layout (a "forced reflow").

Motion's `layout` prop internally reads element positions using `getBoundingClientRect()`. If Convex subscription updates trigger React re-renders between these reads and the subsequent animation writes, forced reflows occur on every frame.

**Consequences:**
- Animations drop to 10-20fps during list reordering
- Visible jank when cards move to new positions
- Worse on older/budget mobile devices
- Users perceive the animation as making the app SLOWER (worse than no animation)

**Prevention:**

1. **Batch DOM reads before writes.** Use `requestAnimationFrame` to schedule writes after reads:
```typescript
// Bad: interleaved reads and writes
cards.forEach(card => {
  const rect = card.getBoundingClientRect(); // READ (forces layout)
  card.style.transform = `translateY(${rect.top}px)`; // WRITE (invalidates layout)
});

// Good: batch all reads, then all writes
const rects = cards.map(card => card.getBoundingClientRect()); // All READS
requestAnimationFrame(() => {
  cards.forEach((card, i) => {
    card.style.transform = `translateY(${rects[i].top}px)`; // All WRITES
  });
});
```

2. **Use Motion's `layout` prop** which handles FLIP animations correctly:
```typescript
// Motion handles the read-write batching internally
<motion.div layout layoutId={transcript._id}>
  <TranscriptCard />
</motion.div>
```

3. **Avoid reading layout properties during animation callbacks.** Never call `getBoundingClientRect()`, `offsetHeight`, `scrollTop`, or `getComputedStyle()` inside `onAnimationStart`, `onUpdate`, or animation loops.

4. **Use `content-visibility: auto`** on off-screen transcript cards to skip their layout calculation entirely.

**Warning signs:**
- Chrome DevTools Performance tab shows yellow "Layout" bars exceeding 16ms
- "Forced reflow" warnings in Performance insights panel
- Frame rate drops only during list changes, not during simple opacity/transform animations

**Detection:**
- Chrome DevTools > Performance tab > Record during list filter
- Look for purple "Layout" events that exceed 10ms
- Check for "Forced reflow is a likely performance bottleneck" warnings

**Phase mapping:**
- **Phase 2 (List Animations):** Profile early, before committing to an animation pattern

**Sources:**
- [Forced reflow -- Chrome DevTools](https://developer.chrome.com/docs/performance/insights/forced-reflow) (HIGH confidence -- official Chrome docs)
- [Avoid large, complex layouts and layout thrashing -- web.dev](https://web.dev/articles/avoid-large-complex-layouts-and-layout-thrashing) (HIGH confidence -- official Google docs)
- [What forces layout/reflow -- comprehensive list](https://gist.github.com/paulirish/5d52fb081b3570c81e3a) (HIGH confidence -- Chrome team member)

---

### Pitfall 8: iOS PWA Standalone Mode Animation Performance Degradation

**What goes wrong:**
Animations that run perfectly at 60fps in Safari run at 30-40fps when the app is launched from the home screen (PWA standalone mode). Page transitions feel sluggish, list animations stutter.

**Why it happens:**
iOS runs PWAs in standalone mode using a separate WebKit process that has different performance characteristics than Safari. Multiple reports from iOS 16+ confirm that standalone mode PWAs consistently show worse rendering performance than the same content in Safari. The standalone WebKit process appears to have lower priority for GPU scheduling and different compositing behavior.

This is compounded by the app's existing performance characteristics: Convex subscriptions keep the JavaScript thread busy, reducing time available for animation frame calculation.

**Consequences:**
- Animations feel premium in Safari testing but cheap in production PWA usage
- Users who install the PWA (your most engaged users) get the worst experience
- No API or workaround to fix WebKit's standalone performance

**Prevention:**

1. **ALWAYS test animations in PWA standalone mode**, not just Safari:
```bash
# On physical iOS device:
# 1. Open app in Safari
# 2. Share > Add to Home Screen
# 3. Launch from home screen
# 4. Test all animations in this mode
```

2. **Budget 40fps, not 60fps** for animation frame targets on iOS PWA. Design animations that look good at lower frame rates:
   - Prefer opacity fades (tolerant of dropped frames) over position slides (jank obvious)
   - Use shorter durations (200-250ms) so fewer total frames need to render
   - Avoid spring animations (require many frames to look smooth)

3. **Use CSS animations/transitions over JS-driven animations** where possible. CSS animations are handled by the compositor thread, which is less affected by the standalone mode performance penalty:
```css
/* Prefer this (compositor thread) */
.card-enter {
  animation: fadeSlideIn 200ms ease-out;
}

@keyframes fadeSlideIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
```

4. **Reduce animation concurrency.** Animate 3-4 cards at a time, not all visible cards simultaneously.

**Warning signs:**
- Animations look smooth in Safari DevTools but feel slow when launched from home screen
- Users report "app feels slow" but your Safari testing shows 60fps
- Performance profiling only done in Safari, never in standalone mode

**Detection:**
- Connect Safari Web Inspector to standalone PWA via USB debugging
- Compare frame rates in Safari vs standalone for same animation

**Phase mapping:**
- **All phases:** Test in standalone PWA mode from day one, not as a final check

**Sources:**
- [Standalone PWA slow performance on iOS 16 -- Apple Developer Forums](https://developer.apple.com/forums/thread/714477) (HIGH confidence -- official Apple forums)
- [PWA on iOS - Current Status & Limitations](https://brainhub.eu/library/pwa-on-ios) (MEDIUM confidence)
- [PWAs on iOS 2025: Real Capabilities vs Hard Limitations](https://ravi6997.medium.com/pwas-on-ios-in-2025-why-your-web-app-might-beat-native-0b1c35acf845) (MEDIUM confidence)

---

### Pitfall 9: prefers-reduced-motion Ignored, Causing Accessibility Violations

**What goes wrong:**
Users with vestibular disorders, epilepsy, ADHD, or motion sensitivities experience nausea, dizziness, or migraine headaches from page transitions and list animations. They have `prefers-reduced-motion: reduce` enabled in their OS settings, but the app ignores it.

**Why it happens:**
Developers treat accessibility as an afterthought, planning to "add it later." But animation code written without reduced-motion support from the start is much harder to retrofit. Every `motion.div`, every `AnimatePresence`, every CSS transition needs conditional behavior.

This is not an edge case: approximately 35% of adults over 40 experience some form of vestibular dysfunction. On iOS, `Reduce Motion` is in Settings > Accessibility > Motion, and a meaningful percentage of users have it enabled.

**Consequences:**
- Users with vestibular disorders cannot use the app (nausea, dizziness)
- WCAG 2.1 AA compliance failure (Guideline 2.3.3)
- Potential legal liability under ADA / Section 508
- Users with motion sensitivity uninstall the app

**Prevention:**

1. **Use Motion's built-in `reducedMotion` support** at the provider level:
```typescript
import { MotionConfig } from "motion/react";

function AppLayout({ children }) {
  return (
    <MotionConfig reducedMotion="user">
      {/* All motion components automatically respect OS preference */}
      {/* transform/layout animations disabled, opacity preserved */}
      {children}
    </MotionConfig>
  );
}
```

2. **For CSS animations, use the media query**:
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

3. **For custom JS animations, check the preference**:
```typescript
const prefersReducedMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)"
).matches;

// Instant state change instead of animation
const duration = prefersReducedMotion ? 0 : 0.3;
```

4. **Adopt a "no-motion-first" approach:** Write components without animation, then add motion as an enhancement:
```typescript
// Good: motion is progressive enhancement
const variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

// This component works fine without animation
// Motion is layered on top
```

5. **Specific animations to watch:**
   - Page transitions with slide/scale: reduce to simple crossfade or instant
   - List reordering with position shifts: reduce to instant reorder
   - Tab slides: reduce to instant switch
   - DO keep subtle opacity fades -- these rarely trigger vestibular responses

**Warning signs:**
- No `prefers-reduced-motion` queries in codebase
- No `MotionConfig` wrapper with `reducedMotion` prop
- Animations tested only with motion enabled

**Detection:**
- macOS: System Settings > Accessibility > Display > Reduce Motion
- iOS: Settings > Accessibility > Motion > Reduce Motion
- Chrome DevTools: Rendering > Emulate CSS media feature `prefers-reduced-motion`

**Phase mapping:**
- **Phase 0 (Setup):** Add `MotionConfig reducedMotion="user"` wrapper BEFORE writing any animations
- **Every phase:** Test with reduced motion enabled

**Sources:**
- [Accessible Animations in React with prefers-reduced-motion -- Josh Comeau](https://www.joshwcomeau.com/react/prefers-reduced-motion/) (HIGH confidence)
- [prefers-reduced-motion: no-motion-first approach -- Tatiana Mac](https://www.tatianamac.com/posts/prefers-reduced-motion) (HIGH confidence)
- [Create accessible animations in React -- Motion docs](https://motion.dev/docs/react-accessibility) (HIGH confidence -- official docs)
- [prefers-reduced-motion -- MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion) (HIGH confidence)

---

### Pitfall 10: iOS Safari CSS `calc()` + Transition Crash

**What goes wrong:**
Certain combinations of CSS `transition` and `calc()` values cause iOS Safari to crash. The browser tab closes or the PWA restarts, with no error message.

**Why it happens:**
WebKit has a long-standing bug where transitioning properties that use `calc()` expressions can trigger a crash in the layout engine. This is especially common with height transitions using `calc(100vh - Xpx)` or `calc(100dvh - Xpx)`.

The current Transcripts app uses `minHeight: "100dvh"` extensively. Adding transitions to elements that derive dimensions from viewport units via `calc()` is a crash risk.

**Consequences:**
- App crashes on iOS with no error or stack trace
- Impossible to debug without knowing this specific WebKit bug
- Users on iOS experience random crashes during navigation

**Prevention:**
1. **Never transition `height` or `width` calculated with `calc()`.** Use `transform: scaleY()` instead.
2. **Avoid transitioning any property that uses viewport units** (`vh`, `dvh`, `svh`, `lvh`)
3. **Test every animation on a physical iOS device** -- the simulator does not reproduce this crash
4. **Use `transform` for all size-related animations:**
```css
/* CRASH RISK on iOS Safari */
.panel {
  height: calc(100dvh - 80px);
  transition: height 0.3s;
}

/* SAFE alternative */
.panel {
  height: calc(100dvh - 80px);
  transform-origin: top;
  transition: transform 0.3s;
}
```

**Warning signs:**
- CSS transitions applied to properties using `calc()` with viewport units
- iOS Safari crashes during navigation but Chrome/Android works fine
- Crashes only happen during animation, not at rest

**Phase mapping:**
- **All phases:** Never transition `calc()`-based properties; always use `transform`

**Sources:**
- [Mobile Safari Crashes with CSS Transition and Calc()](https://www.elfboy.com/blog/mobile_safari_crashes_with_css_transition_and_calc) (MEDIUM confidence)
- [iOS Safari crashes with CSS animations](https://discussions.apple.com/thread/253902820) (MEDIUM confidence -- Apple forums)

---

## Minor Pitfalls

Mistakes that cause visual glitches or subtle UX issues.

---

### Pitfall 11: Tab Slide Animation Conflicts with Convex Data Loading

**What goes wrong:**
Switching between "Transcript" and "AI Summary" tabs on the detail page shows a slide animation, but the content area briefly shows a loading skeleton during the animation, then pops to final content. The animation draws attention to the loading state instead of hiding it.

**Why it happens:**
Each tab content component (`TranscriptView`, `AiSummary`) calls `useQuery` for its data. When switching tabs, the new component mounts, its queries start loading (returning `undefined`), and the loading skeleton renders. The slide animation is competing with the loading state for the user's attention.

**Prevention:**
1. **Prefetch both tabs' data in the parent component** (already partially done -- `words` is queried in parent). Move all tab data queries to the parent so data is ready before tab switch animation plays.

2. **Delay the tab switch animation until data is available:**
```typescript
const [pendingTab, setPendingTab] = useState<string | null>(null);

function switchTab(tab: string) {
  setPendingTab(tab);
  // Wait for data to be ready before animating
}

useEffect(() => {
  if (pendingTab && dataForTab(pendingTab) !== undefined) {
    setActiveTab(pendingTab);
    setPendingTab(null);
  }
}, [pendingTab, transcriptData, summaryData]);
```

3. **Use `AnimatePresence mode="wait"`** so exit animation completes before enter animation starts (hides loading state during exit):
```typescript
<AnimatePresence mode="wait">
  <motion.div key={activeTab} initial={{...}} animate={{...}} exit={{...}}>
    {activeTab === "transcript" ? <TranscriptView /> : <AiSummary />}
  </motion.div>
</AnimatePresence>
```

**Phase mapping:**
- **Phase 3 (Tab Animations):** Must solve data loading before animating tabs

---

### Pitfall 12: Staggered List Animations Cause Cumulative Layout Shift (CLS)

**What goes wrong:**
Transcript cards animate in one by one with a stagger delay. Each card appearing pushes subsequent cards down, causing visible "content shifting" that feels jarring and harms Core Web Vitals CLS score.

**Why it happens:**
If cards start with `height: 0` or `display: none` and animate to full size, they push other content during animation. Even with `opacity` + `translateY` entrance animations, if the cards' space is not pre-reserved, layout shifts occur.

**Prevention:**
1. **Reserve space for all cards immediately**, then animate within that space:
```typescript
// Good: space is reserved, only opacity/transform animates
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ delay: index * 0.05 }}
  // Card has its full height from the start
  // Only visual properties (opacity, transform) animate
>
  <TranscriptCard />
</motion.div>
```

2. **Never animate `height`, `width`, or `margin`** for entrance animations. Only animate `opacity` and `transform`.

3. **Use short stagger delays** (30-50ms per item, 5-8 items max). Long staggers (100ms+) with many items feel slow and increase total CLS duration.

**Phase mapping:**
- **Phase 2 (List Animations):** Set up correct entrance pattern from the start

---

### Pitfall 13: Spring Animations Feel Wrong on Mobile Touch Interfaces

**What goes wrong:**
You use Motion's default spring physics for page transitions and list animations. On desktop they feel playful and responsive. On mobile they feel slow, bouncy, and imprecise -- like the app is lagging.

**Why it happens:**
Desktop interactions have a different mental model than touch interactions. Touch users expect immediate, precise response (mimicking physical manipulation). Spring physics with bounce overshoots feel like lag because the finger has already lifted but the element is still moving. iOS native animations use critically-damped springs (no bounce) or ease curves.

**Consequences:**
- App feels sluggish on mobile despite technically smooth 60fps
- Users perceive animations as "slow" even though they're the same duration
- Disconnect between touch input timing and visual feedback

**Prevention:**
1. **Use short, critically-damped springs or ease curves for mobile:**
```typescript
// Too bouncy for mobile
transition={{ type: "spring", stiffness: 300, damping: 20 }}

// Better: critically damped (no overshoot)
transition={{ type: "spring", stiffness: 400, damping: 40 }}

// Or use tween with ease curve (iOS-like feel)
transition={{ type: "tween", duration: 0.25, ease: [0.25, 0.1, 0.25, 1.0] }}

// iOS default ease curve (ease-in-out-cubic)
transition={{ type: "tween", duration: 0.3, ease: "easeInOut" }}
```

2. **Keep durations short:** 150-300ms for micro interactions, 200-350ms for page transitions. Native iOS transitions are 350ms.

3. **Test animations by recording slow-motion video on actual device** -- screen recordings at 240fps reveal perceived lag that 60fps monitoring misses.

**Phase mapping:**
- **Phase 1 (Page Transitions):** Establish animation timing constants early
- **Phase 2 (List Animations):** Use consistent timing across all card animations

---

### Pitfall 14: View Transitions API Not Supported in iOS Safari (As of Feb 2026)

**What goes wrong:**
You build page transitions using the CSS View Transitions API, test in Chrome, everything works. Then you test on iOS Safari and nothing animates -- pages just pop.

**Why it happens:**
The View Transitions API (for same-document transitions) has partial support across browsers. Safari support has been improving but may not cover all use cases. The experimental `viewTransition` flag in Next.js 15.2+ relies on React's `<ViewTransition>` component which itself is experimental and may not work consistently across all browsers.

**Consequences:**
- No page transitions for iOS/Safari users (majority of PWA users)
- Need a fallback animation system, doubling the code
- Experimental API may change behavior between Next.js versions

**Prevention:**
1. **Check current browser support** before committing to View Transitions API
2. **If using View Transitions, always provide a CSS fallback:**
```css
/* Fallback for browsers without View Transitions */
@supports not (view-transition-name: any) {
  .page-enter {
    animation: fadeIn 0.25s ease;
  }
}
```

3. **Consider Motion/AnimatePresence as primary, View Transitions as progressive enhancement.** Motion works in all browsers; View Transitions are additive.

4. **Since this is a mobile-first PWA where iOS is likely 40-60% of users**, do NOT build the primary animation system on an API that does not work on iOS.

**Warning signs:**
- Testing only in Chrome
- No `@supports` queries for View Transitions API
- Using `experimental.viewTransition` as the only animation method

**Phase mapping:**
- **Phase 0 (Architecture):** Choose primary animation library (Motion), not experimental API

**Sources:**
- [Next.js viewTransition config](https://nextjs.org/docs/app/api-reference/config/next-config-js/viewTransition) (HIGH confidence -- "highly experimental and may change")
- [View Transitions and React](https://react.dev/blog/2025/04/23/react-labs-view-transitions-activity-and-more) (HIGH confidence -- official React blog, marked experimental)

---

## Phase-Specific Warnings

| Phase | Likely Pitfall | Mitigation | Severity |
|-------|---------------|------------|----------|
| Setup (Phase 0) | Wrong package installed (`framer-motion` instead of `motion`) | Install `motion`, import from `"motion/react"` | Critical |
| Setup (Phase 0) | Missing accessibility foundation | Add `MotionConfig reducedMotion="user"` wrapper first | Critical |
| Page Transitions (Phase 1) | Exit animations don't work in App Router | Use FrozenRouter pattern or View Transitions API | Critical |
| Page Transitions (Phase 1) | FrozenRouter breaks on Next.js update | Pin Next.js version, add import test | Critical |
| Page Transitions (Phase 1) | Spring animations feel laggy on mobile | Use short tween/ease curves, not bouncy springs | Moderate |
| Search Fix (Phase 1) | Flash bug amplified by animations | Fix search flash BEFORE adding list animations | Critical |
| List Animations (Phase 2) | Convex subscriptions interrupt animations | useStableQuery + React.memo isolation | Critical |
| List Animations (Phase 2) | GPU memory exhaustion from too many layers | Limit will-change, animate only visible cards | Moderate |
| List Animations (Phase 2) | Layout thrashing during filter changes | Use Motion `layout` prop, batch DOM reads | Moderate |
| List Animations (Phase 2) | CLS from staggered card entrance | Reserve space, animate only opacity + transform | Minor |
| Tab Animations (Phase 3) | Loading skeleton visible during slide | Prefetch data or delay animation until loaded | Moderate |
| All Phases | iOS PWA standalone mode runs 30-40fps | Test in standalone mode, budget for lower fps | Moderate |
| All Phases | iOS Safari crashes with calc() transitions | Never transition calc()-based properties | Moderate |
| All Phases | View Transitions API unsupported on iOS Safari | Use Motion as primary, not experimental API | Moderate |

---

## Testing Checklist

Before each phase is complete, verify:

**Performance (Every Phase)**
- [ ] Animation runs at 50+ fps on iPhone in PWA standalone mode
- [ ] No forced reflows during animation (Chrome DevTools Performance)
- [ ] Safari Layers tab shows fewer than 15 compositor layers on transcript list
- [ ] No memory leak from animation (Safari Memory timeline)
- [ ] Animations complete in under 350ms

**Accessibility (Every Phase)**
- [ ] `MotionConfig reducedMotion="user"` is the root animation wrapper
- [ ] Enable "Reduce Motion" in OS settings -- all motion stops or reduces to opacity fades
- [ ] No WCAG 2.1 AA motion violations
- [ ] Chrome DevTools > Rendering > Emulate prefers-reduced-motion tested

**Compatibility (Every Phase)**
- [ ] Test on physical iOS device in PWA standalone mode (not just Safari)
- [ ] Test on physical Android device
- [ ] No crashes on iOS Safari (especially around calc() values)
- [ ] Exit animations play correctly in App Router navigation
- [ ] Animations work with Convex real-time updates active

**Search (Before List Animations)**
- [ ] Search flash bug is FIXED (no unfiltered state visible)
- [ ] useStableQuery prevents undefined flashes during query reload
- [ ] List does not jump/flash when typing in search

---

## Confidence Assessment

| Area | Confidence | Reasoning |
|------|------------|-----------|
| App Router exit animation failure | HIGH | Verified via official Next.js GitHub issues (#49279, #42658), Motion issue #2411, multiple blog posts with code |
| Motion v12 / React 19 compatibility | HIGH | Verified via official changelog (v12.0.0 released 2025-01-20), npm package, upgrade guide |
| Convex subscription interrupting animations | MEDIUM-HIGH | Official Convex blog documents useStableQuery pattern; animation conflict is inferred from React rendering behavior |
| iOS PWA standalone performance | HIGH | Official Apple Developer Forums thread, multiple independent reports |
| GPU memory / compositor layer limits | MEDIUM | Multiple web.dev and MDN sources; specific iOS thresholds need device testing |
| Search flash root cause | HIGH | Directly verified by reading the current codebase (`useDebounce` + `useQuery` returning undefined) |
| prefers-reduced-motion requirements | HIGH | MDN, WCAG 2.1 spec, official Motion docs all aligned |
| iOS Safari calc() crash | MEDIUM | Multiple reports but not from official Apple/WebKit sources; needs device verification |
| View Transitions API browser support | MEDIUM | Official Next.js docs say "highly experimental"; React docs say experimental; Safari support status needs live testing |
| Spring animation feel on mobile | MEDIUM | UX research + iOS Human Interface Guidelines support this, but subjective |

**Overall Confidence: MEDIUM-HIGH**

Critical pitfalls (1-5, 9) are well-documented with official sources. Performance pitfalls (6-8) are verified patterns but specific thresholds require device testing. Minor pitfalls (11-14) are well-understood patterns with straightforward prevention.

---

## Sources

### Critical Sources (Official Documentation)
- [Next.js viewTransition config](https://nextjs.org/docs/app/api-reference/config/next-config-js/viewTransition)
- [Motion for React documentation](https://motion.dev/docs/react)
- [Motion upgrade guide](https://motion.dev/docs/react-upgrade-guide)
- [Motion accessibility docs](https://motion.dev/docs/react-accessibility)
- [AnimatePresence docs](https://motion.dev/docs/react-animate-presence)
- [useDeferredValue -- React](https://react.dev/reference/react/useDeferredValue)
- [prefers-reduced-motion -- MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion)
- [React Labs: View Transitions, Activity, and more](https://react.dev/blog/2025/04/23/react-labs-view-transitions-activity-and-more)

### Convex-Specific Sources
- [Help, my app is overreacting! -- Convex Blog](https://stack.convex.dev/help-my-app-is-overreacting)
- [Convex React client docs](https://docs.convex.dev/client/react)

### Next.js App Router + Animation Issues
- [GitHub Discussion #42658: Route transitions in app directory](https://github.com/vercel/next.js/discussions/42658)
- [GitHub Issue #49279: Framer Motion shared layout animations](https://github.com/vercel/next.js/issues/49279)
- [GitHub Discussion #72228: framer-motion for Next.js 15](https://github.com/vercel/next.js/discussions/72228)
- [Motion Issue #2411: exit not working in App Router](https://github.com/framer/motion/issues/2411)

### Performance Sources
- [Forced reflow -- Chrome DevTools](https://developer.chrome.com/docs/performance/insights/forced-reflow)
- [Avoid layout thrashing -- web.dev](https://web.dev/articles/avoid-large-complex-layouts-and-layout-thrashing)
- [What forces layout/reflow -- Paul Irish](https://gist.github.com/paulirish/5d52fb081b3570c81e3a)
- [Web Animation Performance Tier List -- Motion](https://motion.dev/blog/web-animation-performance-tier-list)
- [CSS performance optimization -- MDN](https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Performance/CSS)

### iOS / PWA Sources
- [Standalone PWA slow performance on iOS 16 -- Apple Forums](https://developer.apple.com/forums/thread/714477)
- [PWA on iOS - Current Status & Limitations](https://brainhub.eu/library/pwa-on-ios)
- [Mobile Safari CSS crash with calc()](https://www.elfboy.com/blog/mobile_safari_crashes_with_css_transition_and_calc)

### Accessibility Sources
- [Accessible Animations in React -- Josh Comeau](https://www.joshwcomeau.com/react/prefers-reduced-motion/)
- [No-motion-first approach -- Tatiana Mac](https://www.tatianamac.com/posts/prefers-reduced-motion)
- [Accessible animation and movement -- Pope Tech](https://blog.pope.tech/2025/12/08/design-accessible-animation-and-movement/)

### Solving the Search Flash Bug
- [Say no to "flickering" UI](https://www.developerway.com/posts/no-more-flickering-ui)
- [Solving Framer Motion Page Transitions in App Router](https://www.imcorfitz.com/posts/adding-framer-motion-page-transitions-to-next-js-app-router)
