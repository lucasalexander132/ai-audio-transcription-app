# Feature Landscape: Micro Interactions & Animations

**Domain:** Mobile-first PWA micro interactions and animation patterns
**Researched:** 2026-02-10
**Confidence:** HIGH (verified against NNGroup, Material Design guidelines, Motion library docs, and current codebase analysis)

## Executive Summary

Premium mobile-first apps feel premium because of the _absence_ of jarring state changes, not because of flashy effects. The difference between "app feels cheap" and "app feels polished" comes down to four things: (1) elements never pop in or out abruptly, (2) spatial relationships are maintained through motion (e.g., a page slides in from the right because the user tapped something on the right), (3) touch interactions have immediate visual feedback, and (4) loading states feel active rather than passive.

The existing Transcripts app already has the right structural bones -- skeleton loaders on detail pages, CSS transitions on filter tabs and search toggle, smooth waveform visualization. What's missing is the connective tissue: transitions _between_ pages, animation _between_ tab content, and smooth list item changes when filtering. These are the gaps that separate "functional" from "feels native."

This research covers what to build, what timing values to use, and critically, what NOT to build to avoid the common trap of over-animating.

---

## Table Stakes

Features users expect in any premium mobile-first app. Missing these = the app feels static, cheap, or broken.

| Feature | Why Expected | Complexity | Current Status | Notes |
|---------|--------------|------------|----------------|-------|
| **Touch feedback on interactive elements** | Every native app provides immediate visual response to taps; absence makes the app feel unresponsive | Low | Partial -- filter tabs have `transition: 0.15s` on bg/color, but no active state scale/press feedback | Material ripple is the gold standard; for this app, a subtle scale-down + opacity change on `:active` is sufficient |
| **Smooth tab content transitions** | Content that just appears/disappears when switching tabs feels like a broken webpage, not an app | Medium | Missing -- tab content swaps instantly with conditional rendering (`activeTab === "transcript" ? ... : ...`) | Slide or crossfade between tab panels; the direction should follow the tab position (left tab = slide left) |
| **Loading skeleton animations** | Static gray boxes feel frozen; animated shimmer communicates "content is loading" | Low | Present -- `animate-pulse` on skeleton divs in detail and library pages | Already implemented well; keep as-is |
| **Button press states** | Buttons that don't visually respond to touch feel dead | Low | Partial -- some hover states via group-hover; no consistent `:active` treatment | Add `transform: scale(0.97)` and slight opacity reduction on `:active` for all tappable elements |
| **Search bar expand/collapse animation** | Search bar that pops in/out of existence looks glitchy | Low | Missing -- search bar uses `{showSearch && <SearchBar />}` which hard-cuts | Animate height + opacity; slide down when opening, slide up when closing |
| **Content fade-in on page load** | Content that pops into existence all at once feels abrupt | Low | Missing -- pages render instantly when data arrives | Subtle opacity 0->1 + translateY(8px)->0 on initial content render, 200-300ms |
| **List item animations during filtering** | Cards that pop in/out when search results change feels jarring and disorienting | Medium | Missing -- the displayTranscripts list re-renders instantly on filter/search change | Cards should fade/slide in when appearing, fade out when disappearing; new results should stagger in |
| **prefers-reduced-motion respect** | ~35% of users have this enabled; ignoring it is an accessibility violation (WCAG 2.3.3) | Low | Missing -- no `prefers-reduced-motion` media queries anywhere in the codebase | Wrap ALL animations in `@media (prefers-reduced-motion: no-preference)` or use Motion's built-in support |

## Differentiators

Features that separate good from great. Users don't consciously miss these, but they _feel_ the difference.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Animated page transitions** | Pages that slide/crossfade between routes feel like a native iOS/Android app, not a website | Medium-High | This is the single biggest "premium feel" upgrade; the transition between `/transcripts` and `/transcripts/[id]` should feel like pushing/popping a navigation stack |
| **Directional tab swiping with gesture** | Swiping left/right between Transcript and AI Summary tabs mirrors native iOS tab behavior | High | Touch gesture handling adds significant complexity; recommend starting with animated transitions on tap, add swipe gesture in v2 if desired |
| **Staggered list item entrance** | When transcript cards load, each card appearing with a slight delay (30-50ms stagger) creates a cascading "waterfall" effect that feels premium | Low | Stagger delay must be small (30-50ms per item, capped at ~300ms total); too long feels slow |
| **Active tab indicator animation** | Instead of the underline just appearing on the selected tab, it should slide smoothly from one tab to the other (like a moving highlight bar) | Medium | Requires layout-aware animation -- the indicator needs to know the position and width of each tab; Motion's `layoutId` makes this straightforward |
| **Shared element transitions** | When tapping a transcript card in the list, the card "expands" into the detail page, maintaining visual continuity | Very High | This is the iOS "hero transition" pattern; technically possible with View Transitions API or Motion's `layoutId`, but extremely complex to get right with Next.js App Router -- defer |
| **Pull-to-refresh animation** | Custom pull-to-refresh with a branded animation instead of the browser default | High | Nice but not worth the complexity for v1.1; browser default is acceptable |
| **FAB menu spring animation** | FAB button that opens with a spring-based expand animation, items popping out with staggered delay | Medium | The FAB menu already exists; adding spring-based open/close animation would make it feel alive |
| **Haptic feedback on key actions** | Vibration on record start/stop, star toggle, delete confirmation | Low | Uses the Vibration API (`navigator.vibrate()`); not supported on iOS Safari, so must be treated as progressive enhancement only |
| **Scroll-linked header compression** | Header that shrinks/fades as user scrolls down the transcript list, giving more room for content | Medium | Common in native apps; adds polish but requires intersection observer or scroll listener |

## Anti-Features

Animations that HURT UX. Common mistakes teams make when adding "polish."

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Page transitions longer than 350ms** | NNGroup research shows animations >400ms feel like "a real drag"; 500ms+ actively frustrates users trying to navigate quickly | Keep page transitions at 250-350ms max; elements appearing should be slightly longer than elements disappearing (appearing: 300ms, disappearing: 200-250ms) |
| **Bounce/elastic easing on navigation** | Bouncy spring animations feel playful on marketing sites but feel unprofessional and slow in productivity tools; users navigating between transcripts want speed, not personality | Use `ease-out` (deceleration) for elements entering; `ease-in` for elements leaving; save spring physics for micro-moments like toggle switches or star buttons |
| **Animating layout-triggering CSS properties** | Animating `width`, `height`, `top`, `left`, `margin`, `padding` causes browser reflows and drops below 60fps on mobile; this causes visible jank | ONLY animate `transform` and `opacity` -- these are GPU-composited and run at 60fps even on low-end devices; use `transform: translateX/Y/scale` instead of position/size changes |
| **Blocking animations that prevent interaction** | Animations that must complete before the user can interact with the new content make the app feel slower than having no animation at all | All transition animations should be interruptible; if the user taps "back" during a forward transition, it should immediately reverse |
| **Stagger delays that are too long** | Staggering 20 list items at 100ms each = 2 seconds before the last item appears; the user is waiting to see content that already loaded | Cap total stagger time at 300ms regardless of item count; if 10 items, use 30ms stagger; if 20 items, use 15ms stagger; if >20, don't stagger |
| **Animating every single element** | When everything moves, nothing stands out; the eye has no focal point and the UI feels "swimmy" | Animate only state changes the user initiated; background elements should be static while the changing element animates |
| **Parallax scrolling on transcript content** | Parallax creates motion sickness triggers (vestibular disorders) and adds zero value to a productivity tool | Keep transcript content in normal scroll flow; no parallax, no scroll-linked transforms on content |
| **Animated route transitions that break browser back** | Custom transitions that interfere with browser back/forward navigation or break the browser history feel like a broken website | Ensure page transitions work WITH the browser navigation, not against it; the back button should trigger a reverse transition |
| **Auto-playing decorative animations** | Continuously animated elements (pulsing borders, floating icons, rotating elements) are distracting in a tool used for reading transcripts | The only continuous animation should be the recording indicator (pulsing red dot) and loading skeletons; everything else should be triggered by user action |

---

## Timing & Easing Specifications

These values come from NNGroup research and Material Design 3 guidelines. Use these as the system defaults.

### Duration Reference

| Animation Type | Duration | Rationale |
|----------------|----------|-----------|
| Micro-interactions (toggles, checkboxes, button press) | 100-150ms | Must feel instantaneous; user expects immediate response |
| Tab content transitions | 200-250ms | Fast enough to not slow navigation, long enough to see the motion |
| Search bar expand/collapse | 200ms | Quick utility animation; should not impede workflow |
| List item fade in/out | 150-200ms | Individual items should feel snappy; stagger creates the cascade effect |
| Page transitions | 250-350ms | The "sweet spot" -- perceivable motion without feeling slow |
| Modal/overlay appear | 250-300ms | Slightly slower to establish spatial relationship (coming from behind/below) |
| Modal/overlay dismiss | 200ms | Dismissals should be faster than appearances (NNGroup finding) |
| Stagger delay per item | 30-50ms | Cap total at 300ms; formula: `min(50, 300/itemCount)` |

### Easing Reference

| Context | CSS Value | Motion Library Value | When |
|---------|-----------|---------------------|------|
| Element entering (appearing) | `cubic-bezier(0, 0, 0.2, 1)` (ease-out / decelerate) | `{ ease: "easeOut" }` | Default for all enter animations -- starts fast, lands softly |
| Element leaving (disappearing) | `cubic-bezier(0.4, 0, 1, 1)` (ease-in / accelerate) | `{ ease: "easeIn" }` | Exit animations -- starts slow, accelerates away |
| Emphasis / attention | `cubic-bezier(0.4, 0, 0.2, 1)` (ease-in-out / standard) | `{ ease: "easeInOut" }` | Tab indicator slide, toggle switches |
| Spring / playful | N/A (use JS) | `{ type: "spring", stiffness: 300, damping: 30 }` | Star toggle, FAB button, recording pulse -- sparingly |

### Performance Rules

| Rule | Why | How |
|------|-----|-----|
| ONLY animate `transform` and `opacity` | These are the only CSS properties that can be GPU-composited; everything else triggers reflow | Use `translateX/Y` instead of `left/top`; use `scale` instead of `width/height`; use `opacity` instead of `visibility` |
| Use `will-change` sparingly | Pre-promoting too many elements wastes GPU memory | Only add `will-change: transform` to elements about to animate, remove after |
| Prefer CSS animations for simple effects | CSS animations run on compositor thread, immune to main-thread jank | Use CSS for simple fades, slides; use JS only for complex orchestration |
| Test on real mobile devices | Animations that are smooth on MacBook can jank on mid-range Android phones | Target 60fps on a 3-year-old Android phone as the baseline |

---

## Feature-Specific Implementation Patterns

### 1. Page Transitions (Library <-> Detail)

**Pattern:** Slide-and-fade. Forward navigation slides new page in from right, back navigation slides out to the right. Both use opacity crossfade.

**Why this pattern:** Maintains spatial mental model (detail is "deeper" / to the right of the list). This matches iOS navigation stack and Android shared axis pattern.

**Implementation approach for Next.js 15 App Router:**
- Use `template.tsx` instead of `layout.tsx` for the animated wrapper (template remounts on navigation, layout persists)
- Wrap page content in a Motion component with enter/exit animations
- Track navigation direction (forward vs back) to determine slide direction
- AnimatePresence in the template handles mounting/unmounting

**Key constraint:** Next.js App Router does not natively support exit animations because the old page is unmounted before the new page mounts. This requires either: (a) AnimatePresence wrapping route content in a template, or (b) next-transition-router library, or (c) the experimental viewTransition config (Next.js 16+ only, NOT available in Next.js 15).

**Recommendation:** Use Motion (Framer Motion) with `AnimatePresence` in a `template.tsx` file. This is the most battle-tested approach for Next.js 15 App Router.

### 2. Tab Content Transitions (Transcript Detail)

**Pattern:** Directional slide with crossfade. When switching from "Transcript" (left tab) to "AI Summary" (right tab), content slides left and fades; new content slides in from right and fades in. Reverse when going back.

**Current code:** `{activeTab === "transcript" ? <TranscriptView /> : <AiSummary />}` -- instant swap, no animation.

**Implementation approach:**
- Wrap tab content in AnimatePresence with `mode="wait"` (or `mode="popLayout"` for overlap)
- Track the direction of tab change (left-to-right or right-to-left)
- Apply `translateX` + `opacity` animation with 200ms duration
- The tab underline indicator should independently animate between positions using `layoutId`

### 3. Search/Filter List Animations (Library)

**Pattern:** Fade + vertical slide. Items leaving the list fade out and collapse vertically. Items entering fade in and expand from zero height. Items that remain in both states should smoothly reorder (layout animation).

**Current code:** `displayTranscripts.map((transcript) => <TranscriptCard />)` -- instant re-render, causes the "flash" bug where unfiltered state briefly shows.

**The search flash bug:** This happens because `searchInput` updates immediately on keystroke, but `debouncedSearch` lags by 300ms. During that 300ms window, `isSearchActive` is false (debounced value hasn't caught up), so it shows the unfiltered `filteredTranscripts` list instead of search results. Fix: track whether search is "pending" (input exists but debounced hasn't fired) and either keep showing previous results or show a skeleton.

**Implementation approach:**
- Wrap the transcript list in AnimatePresence
- Each TranscriptCard gets `initial`, `animate`, and `exit` props
- Use `layout` prop on cards for smooth reordering
- Stagger entrance with `transition: { delay: index * 0.03 }` (capped)
- Fix the flash bug first (logic fix), then add animations on top

### 4. Content Loading Transitions

**Pattern:** Skeleton-to-content crossfade. When data arrives, skeleton pulses should smoothly crossfade into actual content rather than hard-cutting.

**Current code:** Loading skeletons use `animate-pulse` (good), but the transition from skeleton to content is instant (`isLoading ? skeleton : content`).

**Implementation approach:**
- Wrap skeleton and content in AnimatePresence with `mode="wait"`
- Skeleton exits with opacity fade (150ms)
- Content enters with opacity fade + subtle translateY (200ms)
- This prevents the "pop" feeling when data loads

### 5. Search Bar Expand/Collapse

**Pattern:** Height animation with opacity. Search bar slides down from behind the header when opened, slides back up when closed.

**Current code:** `{showSearch && <SearchBar />}` -- hard cut.

**Implementation approach:**
- Wrap in AnimatePresence
- Animate `height: 0 -> auto` (using Motion's height animation support) + opacity
- Duration: 200ms ease-out for open, 150ms ease-in for close
- Auto-focus input after animation completes (use `onAnimationComplete`)

### 6. Active Tab Indicator (Detail Page)

**Pattern:** Sliding underline. The active tab underline smoothly moves from one tab to another.

**Current code:** Each tab button has a conditional `borderBottom` -- no animation between states.

**Implementation approach:**
- Use a separate `<motion.div>` with `layoutId="activeTabIndicator"` positioned absolutely under the active tab
- Motion's layout animation automatically slides it between positions
- Duration: 200ms ease-in-out

---

## Feature Dependencies

```
Foundation (do first):
  Install Motion library
  Set up animation constants (durations, easings)
  Add prefers-reduced-motion wrapper/utility
    |
    v
Bug Fix (do second):
  Fix search flash bug (logic, not animation)
    |
    v
Quick Wins (low complexity, high impact):
  Button/touch press states (CSS only)
  Search bar expand/collapse animation
  Content fade-in on page load
  Active tab indicator slide (detail page)
    |
    v
Core Animations (the main deliverables):
  Tab content transitions (detail page)
  List item animations during search/filter
  Page transitions (library <-> detail)
    |
    v
Polish (if time permits):
  FAB menu spring animation
  Staggered list entrance on initial load
  Skeleton-to-content crossfade
```

**Key dependency:** Page transitions are the most complex feature and depend on understanding Next.js App Router's template.tsx pattern. They should NOT be attempted first -- build confidence with simpler animations before tackling route transitions.

---

## MVP Recommendation

For the v1.1 milestone, prioritize these in order:

### Must Ship (Table Stakes)

1. **Fix search flash bug** -- This is a logic bug, not an animation; fix it first
2. **prefers-reduced-motion support** -- Foundation for all other animation work; add once, respect everywhere
3. **Touch press states** -- CSS-only, takes 30 minutes, makes every button feel alive
4. **Tab content transitions** -- Medium complexity, high perceived value; the detail page will feel immediately more polished
5. **Search/filter list animations** -- Cards fading/moving as results change eliminates the jarring re-render

### Should Ship (Differentiators)

6. **Page transitions** -- The single biggest "premium feel" upgrade but also the most complex; save for after the simpler animations are working
7. **Active tab indicator animation** -- Small touch that adds polish to the detail page tab switcher
8. **Search bar expand/collapse** -- Quick win that eliminates a hard-cut

### Defer to Post-v1.1

- **Gesture-based tab swiping** -- High complexity, low incremental value over tap transitions
- **Shared element / hero transitions** -- Very high complexity, requires View Transitions API (experimental in Next.js 15)
- **Pull-to-refresh animation** -- Browser default is acceptable
- **Haptic feedback** -- Not supported on iOS Safari; limited value
- **Scroll-linked header** -- Nice but not core to the animation milestone

---

## Technology Decision: Motion (Framer Motion)

**Recommendation:** Use **Motion** (formerly Framer Motion) v11+.

**Why Motion over alternatives:**

| Library | Verdict | Reason |
|---------|---------|--------|
| **Motion (Framer Motion)** | **USE THIS** | Purpose-built for React; AnimatePresence solves the exit animation problem that CSS alone cannot; layout animations handle list reordering; 30KB gzipped is acceptable; production-proven at scale |
| CSS transitions/animations only | Not sufficient | Cannot animate elements being removed from DOM (exit animations); cannot handle list reordering; cannot orchestrate staggered sequences easily |
| React Spring | Skip | Physics-based model is harder to reason about for UI transitions; better for data visualization; less ergonomic API for the use cases here |
| GSAP | Skip | Imperative API doesn't fit React's declarative model well; licensing concerns for commercial use; heavier than needed |
| View Transitions API (native) | Not yet | React's `<ViewTransition>` is canary-only; Next.js viewTransition config requires Next.js 16+; the project is on Next.js 15; revisit when stable |
| React Transition Group | Skip | Low-level primitive; Motion is built on top of similar concepts but with far better DX |

**Installation:**
```bash
npm install motion
```

**Note on naming:** Framer Motion was rebranded to "Motion" in 2024. The npm package is `motion` (previously `framer-motion`). Import paths changed from `framer-motion` to `motion/react`. The package `framer-motion` still works but is the legacy name.

---

## Mobile-Specific Considerations

| Consideration | Detail | Action |
|---------------|--------|--------|
| **Touch delay** | Mobile browsers have a ~100ms delay before `:active` styles apply on tap; use `touch-action: manipulation` to eliminate | Add `touch-action: manipulation` to all interactive elements |
| **60fps on mid-range devices** | Desktop-smooth animations can jank on a 3-year-old Android phone | ONLY animate `transform` + `opacity`; avoid `filter`, `box-shadow`, `clip-path` during transitions |
| **Overscroll behavior** | iOS Safari has elastic overscroll that can interfere with pull-to-refresh and swipe gestures | Don't fight the browser's native scroll behavior; work with it |
| **Safe area insets** | The app already handles `env(safe-area-inset-bottom)` for the audio player; animation containers must respect this | Ensure animated page containers account for safe areas |
| **Battery impact** | Continuous animations drain battery faster; users notice on mobile | No decorative continuous animations except recording indicator |
| **Orientation** | The app is mobile-first portrait; landscape widths can make slide animations feel disproportionately far | Use percentage-based translateX values (e.g., `translateX(30%)`) rather than fixed pixel values for page slides |

---

## Reduced Motion Strategy

**Approach:** "No-motion-first" -- animations are additive, not default.

```css
/* Base: no motion */
.element { opacity: 1; transform: none; }

/* Enhanced: add motion only when allowed */
@media (prefers-reduced-motion: no-preference) {
  .element {
    transition: opacity 200ms ease-out, transform 200ms ease-out;
  }
}
```

**Motion library integration:** Motion respects `prefers-reduced-motion` when using the `useReducedMotion()` hook or by setting `transition: { duration: 0 }` conditionally. The recommended approach:

```typescript
import { useReducedMotion } from "motion/react";

function AnimatedComponent() {
  const shouldReduceMotion = useReducedMotion();
  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.25 }}
    />
  );
}
```

**When reduced motion is active, replace:**
- Slide transitions with instant cuts (or very fast opacity fades)
- Staggered lists with simultaneous appearance
- Page transitions with simple crossfades (opacity only, no movement)
- Spring animations with instant state changes

**Never remove:** Loading indicators, progress feedback, recording status. These communicate essential information, not decoration.

---

## Reference: Premium App Animation Patterns

These patterns are drawn from premium mobile apps and serve as the target quality bar.

| App | Pattern | What They Do | Relevant To |
|-----|---------|-------------|-------------|
| **Apple Notes** | Navigation stack push/pop | Detail slides in from right with slight parallax on the list behind | Page transitions |
| **Apple Music** | Tab bar content transitions | Content crossfades with a slight scale when switching tabs | Tab transitions |
| **Notion** | List filtering | Items smoothly reorder and fade; new items slide in from top | Search/filter list |
| **Linear** | Loading states | Skeleton shimmer with smooth crossfade to content | Loading transitions |
| **Things 3** | Checkbox completion | Checkbox fills with a satisfying spring, item slides out of list | Micro-interactions |
| **Spotify** | Search results | Results stream in with staggered fade as user types | Search animations |
| **iOS Settings** | Navigation hierarchy | Push/pop with layered depth -- new page slides over old page which slightly scales down | Page transitions |

---

## Confidence Assessment

| Area | Level | Reason |
|------|-------|--------|
| Timing/easing values | HIGH | Sourced from NNGroup research and Material Design 3 official guidelines |
| Animation library choice (Motion) | HIGH | Industry standard for React; verified via official docs and npm stats |
| Next.js App Router constraints | HIGH | Verified via Next.js official docs and community discussions; View Transitions confirmed experimental/Next.js 16+ only |
| List animation patterns | MEDIUM | AnimatePresence + layout animation is well-documented; performance at scale (50+ items) should be tested |
| Search flash bug diagnosis | HIGH | Directly read the codebase; root cause identified from the debounce/isSearchActive timing gap |
| prefers-reduced-motion stats (35%) | MEDIUM | Cited by multiple sources but original study not verified; the principle stands regardless of exact percentage |

---

## Sources

- [NNGroup: Executing UX Animations -- Duration and Motion](https://www.nngroup.com/articles/animation-duration/) -- Duration best practices, HIGH confidence
- [Material Design 3: Easing and Duration](https://m3.material.io/styles/motion/easing-and-duration) -- Official easing curves, HIGH confidence
- [Motion (Framer Motion) Official Docs](https://motion.dev) -- Animation library API, HIGH confidence
- [Motion Animation Performance Guide](https://motion.dev/docs/performance) -- Performance tier list, HIGH confidence
- [AnimatePresence Documentation](https://motion.dev/docs/react-animate-presence) -- Exit animation patterns, HIGH confidence
- [Motion Easing Functions](https://motion.dev/docs/easing-functions) -- Easing reference, HIGH confidence
- [React Labs: View Transitions, Activity, and more](https://react.dev/blog/2025/04/23/react-labs-view-transitions-activity-and-more) -- React ViewTransition status, HIGH confidence
- [React ViewTransition Reference](https://react.dev/reference/react/ViewTransition) -- API reference (canary only), HIGH confidence
- [Next.js viewTransition Config](https://nextjs.org/docs/app/api-reference/config/next-config-js/viewTransition) -- Experimental, Next.js 16+, HIGH confidence
- [Next.js App Router Page Transitions Discussion](https://github.com/vercel/next.js/discussions/42658) -- Community approaches, MEDIUM confidence
- [PWA Builder: Mimic Native Transitions in PWA](https://blog.pwabuilder.com/posts/mimic-native-transitions-in-your-progressive-web-app/) -- PWA transition patterns, MEDIUM confidence
- [Pope Tech: Design Accessible Animation and Movement](https://blog.pope.tech/2025/12/08/design-accessible-animation-and-movement/) -- Accessibility, HIGH confidence
- [MDN: prefers-reduced-motion](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-motion) -- Media query reference, HIGH confidence
- [NNGroup: Skeleton Screens 101](https://www.nngroup.com/articles/skeleton-screens/) -- Loading pattern research, HIGH confidence
- [Chrome Developers: View Transitions 2025 Update](https://developer.chrome.com/blog/view-transitions-in-2025) -- Browser API status, HIGH confidence
- [Interaction Design Foundation: Micro-interactions in UX](https://www.interaction-design.org/literature/article/micro-interactions-ux) -- UX principles, MEDIUM confidence
- [Web Animation Performance Tier List (Motion Magazine)](https://motion.dev/blog/web-animation-performance-tier-list) -- CSS property performance rankings, HIGH confidence
