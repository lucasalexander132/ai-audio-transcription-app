# Technology Stack: Micro Interactions & Animations

**Project:** Transcripts App (ai-audio-transcription-app)
**Researched:** 2026-02-10
**Scope:** Animation/micro-interaction capabilities for existing Next.js 15 + Tailwind CSS v3 PWA
**Overall Confidence:** HIGH

---

## Executive Recommendation

Use a **two-tier animation strategy**:

1. **Tailwind CSS transitions + `tailwindcss-animate`** for simple micro-interactions (hover states, button feedback, fade-ins, skeleton loading). Zero additional JS. Already integrated with existing stack.
2. **Motion (formerly Framer Motion) with LazyMotion** for complex orchestrated animations (page transitions, AnimatePresence list filtering, layout animations). Use `domAnimation` feature bundle to keep added JS at ~20kb instead of ~34kb.

This approach keeps the simple stuff CSS-only (zero JS overhead, guaranteed 60fps) and brings in Motion only where CSS cannot deliver (exit animations, layout animations, gesture-driven interactions, orchestrated sequences).

---

## Current Project Stack (Context -- DO NOT CHANGE)

| Technology | Version | Role |
|------------|---------|------|
| Next.js | ^15.1.4 | Framework (App Router) |
| React | ^19.0.0 | UI library |
| Tailwind CSS | ^3.4.1 | Styling |
| Zustand | ^5.0.11 | State management |
| Convex | ^1.31.7 | Real-time backend |

**Important:** The project uses Tailwind v3.4.1, NOT v4. All recommendations are v3-compatible.

---

## Tier 1: CSS-Only Animations (Simple Micro-Interactions)

### Recommended: Tailwind CSS Built-in + `tailwindcss-animate` Plugin

| Package | Version | Size | Purpose |
|---------|---------|------|---------|
| tailwindcss (already installed) | ^3.4.1 | 0kb added | `transition-*`, `duration-*`, `ease-*`, `animate-spin/pulse/bounce` |
| `tailwindcss-animate` | ^1.0.7 | ~3kb CSS | `animate-in`, `animate-out`, `fade-in`, `slide-in-from-*`, `zoom-in` |

**Why `tailwindcss-animate` (not `tw-animate-css`):** The project uses Tailwind v3.4.1. `tw-animate-css` is a Tailwind v4-only replacement. `tailwindcss-animate` is the correct v3-compatible plugin. It is the community standard (used by shadcn/ui) and provides enter/exit CSS animation utilities.

**What this covers:**
- Button hover/active/focus feedback (`transition-colors duration-150`)
- Card hover elevations (`transition-shadow duration-200`)
- Skeleton loading pulses (`animate-pulse`)
- Toast/notification fade-ins (`animate-in fade-in duration-300`)
- Tab underline slides (`transition-all duration-200`)
- Input focus ring transitions (`transition-shadow duration-150`)
- Opacity fades for content loading (`transition-opacity duration-300`)
- Simple enter animations for elements appearing in the DOM

**What this CANNOT cover:**
- Exit animations when React unmounts a component (CSS has no way to delay unmounting)
- Layout animations (elements smoothly moving to new positions after siblings are added/removed)
- Orchestrated multi-element sequences with stagger
- Page transition choreography (enter/exit between routes)

**Performance:** CSS animations run on the compositor thread. They are GPU-accelerated for `transform` and `opacity` properties. Zero JavaScript execution cost. Guaranteed 60fps on mobile Safari when using only `transform` and `opacity`.

**Installation:**
```bash
npm install -D tailwindcss-animate
```

**Configuration (add to existing tailwind.config.ts):**
```typescript
import type { Config } from "tailwindcss";

const config: Config = {
  // ... existing config
  plugins: [require("tailwindcss-animate")],
};
export default config;
```

**Usage examples:**
```html
<!-- Enter animation -->
<div class="animate-in fade-in slide-in-from-bottom-4 duration-300">
  Content fades and slides up on mount
</div>

<!-- Hover transition -->
<button class="transition-colors duration-150 hover:bg-primary/90">
  Click me
</button>

<!-- Tab indicator slide -->
<div class="transition-all duration-200 ease-out" style="transform: translateX(...)">
  Tab indicator
</div>
```

**Confidence:** HIGH -- Verified via official GitHub repo, widely adopted (shadcn/ui standard), compatible with Tailwind v3.

---

## Tier 2: JavaScript Animation Library (Complex Interactions)

### Recommended: Motion (v12.x) with LazyMotion + domAnimation

| Package | Version | Size (with LazyMotion) | Purpose |
|---------|---------|------------------------|---------|
| `motion` | ^12.34.0 | ~4.6kb initial + 15kb async (domAnimation) | AnimatePresence, layout animations, page transitions |

**About Motion:** Formerly "Framer Motion." The library was spun off as independent in late 2024 by creator Matt Perry. The `motion` npm package is a drop-in replacement for `framer-motion`. Import from `"motion/react"` instead of `"framer-motion"`. Same API, same features, independent governance.

**Why Motion over alternatives:**

| Criterion | Motion | React Spring | GSAP | CSS-only |
|-----------|--------|--------------|------|----------|
| Exit animations (unmount) | AnimatePresence built-in | useTransition (complex API) | Manual DOM management | Not possible |
| Layout animations | `layout` prop, one line | Not supported | Flip plugin (extra bundle) | Not possible |
| List filter animations | AnimatePresence + layout | useTransition | Manual | Not possible |
| Page transitions | Pairs with next-transition-router | Manual | Pairs with next-transition-router | View Transitions API (experimental) |
| Bundle size (optimized) | ~20kb (LazyMotion + domAnimation) | ~45kb | ~78kb | 0kb |
| React integration | First-class (`<motion.div>`) | Hooks-based | Imperative refs | Class-based |
| DX for UI interactions | Excellent (declarative) | Good (hooks) | Fair (imperative) | Good (utilities) |
| Mobile Safari 60fps | Yes (transform/opacity) | Yes | Yes | Yes |
| Next.js App Router | Full support with "use client" | Full support | Full support | Native |
| Weekly npm downloads | ~3.6M | ~788K | ~1.47M | N/A |

**Why NOT React Spring:** Larger bundle (45kb), no built-in layout animations, more complex API for the use cases we need (list filtering, exit animations). React Spring excels at physics-based natural motion, which is not a primary need for this project's UI micro-interactions.

**Why NOT GSAP:** Largest bundle (78kb), imperative API that fights React's declarative model, licensing considerations for commercial use (requires special license for SaaS). Overkill for UI micro-interactions -- GSAP shines for complex timeline-based storytelling animations, which is not this project's domain.

**Why NOT CSS View Transitions API (native):** Next.js's `experimental.viewTransition` config is still **experimental** (documented as "not recommended for production" as of Next.js 16.1.6). The React `<ViewTransition>` component requires React Canary channel. While the browser API itself has 89.5% global support (including iOS Safari 18+), the Next.js/React integration is not production-ready. This is a strong "revisit later" option -- likely becomes the preferred answer in 6-12 months when Next.js stabilizes the integration.

### Motion Bundle Size Strategy

The full `motion` component ships at ~34kb with all features. Using `LazyMotion` + the `m` component reduces this:

| Strategy | Initial Load | Async Load | Total | Features |
|----------|-------------|------------|-------|----------|
| Full `motion` component | 34kb | 0 | 34kb | Everything |
| LazyMotion + `domAnimation` | 4.6kb | 15kb | ~20kb | Animations, variants, exit, tap/hover/focus |
| LazyMotion + `domMax` | 4.6kb | 25kb | ~30kb | All above + pan/drag + layout animations |

**Recommendation:** Start with `domAnimation` (~20kb). This covers AnimatePresence for exit animations, variants for staggered list entry, and basic gesture support. If list-filter layout animations need smooth repositioning of remaining items (not just fade in/out of filtered items), upgrade to `domMax` (~30kb). Both are acceptable for a mobile PWA.

**Installation:**
```bash
npm install motion
```

### Next.js App Router Integration Pattern

Motion components require browser APIs, so they must live in Client Components. Best practice: push the `"use client"` boundary as far down the tree as possible to keep the rest of the app server-rendered.

```typescript
// components/motion.tsx
"use client";
import { LazyMotion, domAnimation } from "motion/react";

export function MotionProvider({ children }: { children: React.ReactNode }) {
  return <LazyMotion features={domAnimation}>{children}</LazyMotion>;
}

// Re-export m and AnimatePresence for use in other client components
export { m, AnimatePresence } from "motion/react";
```

```typescript
// In layout.tsx (can remain a server component if MotionProvider is "use client")
import { MotionProvider } from "@/components/motion";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>
        <MotionProvider>{children}</MotionProvider>
      </body>
    </html>
  );
}
```

```typescript
// components/animated-list.tsx
"use client";
import { m, AnimatePresence } from "@/components/motion";

export function AnimatedList({ items }: { items: Item[] }) {
  return (
    <AnimatePresence mode="popLayout">
      {items.map((item) => (
        <m.div
          key={item.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
        >
          <ItemCard item={item} />
        </m.div>
      ))}
    </AnimatePresence>
  );
}
```

**Confidence:** HIGH -- Motion v12.34.0 verified on npm (published within 24 hours of research). LazyMotion bundle sizes verified via official documentation. Next.js App Router compatibility confirmed via multiple sources including Motion's own installation docs.

---

## Page Transitions: Specific Approach

### Recommended: `next-transition-router` + Motion

| Package | Version | Size | Purpose |
|---------|---------|------|---------|
| `next-transition-router` | latest (beta) | <8kb | Hooks into App Router navigation lifecycle for enter/exit callbacks |

**Why this approach:**

The core challenge with page transitions in Next.js App Router is that the router unmounts pages immediately on navigation. There is no built-in "wait for exit animation" mechanism. `next-transition-router` solves this by:

1. Intercepting navigation events
2. Providing async `leave` and `enter` callbacks
3. Delaying the actual route change until the exit animation completes
4. Working with any animation library (we pair it with Motion for consistent API)

**Alternative considered: `next-view-transitions`** (by Shu Ding, Next.js core team) -- uses the native View Transitions API. Version 0.3.5. More lightweight than next-transition-router, but limited to what the View Transitions API can do (cross-fade style transitions). Less control over choreography. Good fallback option if simpler transitions are acceptable.

**Alternative considered: Next.js `experimental.viewTransition`** -- rejected because it requires React Canary and is explicitly "not recommended for production" in the Next.js docs.

**Installation:**
```bash
npm install next-transition-router
```

**Confidence:** MEDIUM -- Library is in beta, 317 GitHub stars, actively maintained (91 commits). The pattern is sound (async navigation lifecycle hooks), but beta status means API may change. Acceptable risk for a polish milestone. If stability concerns arise, page transitions can be implemented with a custom hook that uses the View Transitions API directly (supported in iOS Safari 18+, Chrome 111+, Firefox 144+).

---

## What NOT to Add

| Technology | Why Not |
|------------|---------|
| GSAP (GreenSock) | 78kb, imperative API, SaaS licensing complexity, overkill for micro-interactions |
| React Spring | 45kb, no layout animations, more complex API, physics model unnecessary here |
| `@formkit/auto-animate` | Automatic animations are convenient but offer little control over timing/easing; not suitable for polished, branded micro-interactions |
| Lottie / Rive | Heavy runtimes for illustration-based animations -- this project needs UI transitions, not animated illustrations |
| `react-transition-group` | Legacy library, minimal features, essentially just mount/unmount class toggling. tailwindcss-animate + Motion covers this better |
| `tw-animate-css` | Tailwind v4 only; project is on Tailwind v3.4.1 |
| Anime.js | Imperative API, not React-optimized, smaller community than Motion |
| View Transitions API (native via Next.js) | Next.js integration still experimental, React ViewTransition requires Canary channel. Revisit in 6-12 months |
| `framer-motion` (old package name) | Use `motion` instead -- same library, renamed. `framer-motion` still works but `motion` is the canonical package going forward |

---

## Bundle Size Impact Summary

| Addition | Gzipped Size | Load Strategy |
|----------|-------------|---------------|
| `tailwindcss-animate` | ~3kb CSS | Included in CSS bundle, tree-shaken by Tailwind |
| Motion (LazyMotion + domAnimation) | ~4.6kb initial + ~15kb async | Code-split, async loaded after first paint |
| `next-transition-router` | <8kb | Loaded with layout |
| **Total added JS** | **~28kb** | Async/code-split where possible |

For context: the existing `react-voice-visualizer` dependency is ~15kb. This animation stack adds roughly 2x that, spread across initial and async loads. Acceptable for a PWA focused on polish.

---

## Mobile Performance Guidelines

**Properties safe to animate (GPU-accelerated, compositor thread):**
- `transform` (translate, scale, rotate)
- `opacity`
- `filter` (with caution on older devices)

**Properties to AVOID animating (trigger layout reflow, main thread, break 60fps):**
- `width`, `height`
- `top`, `left`, `right`, `bottom`
- `margin`, `padding`
- `border-width`

**Tailwind-specific performance rules:**
- Use `transition-colors` instead of `transition-all` (avoids animating layout properties accidentally)
- Use `will-change-transform` on elements that will animate frequently
- Use `motion-safe:` / `motion-reduce:` variants to respect `prefers-reduced-motion`

**Motion-specific performance rules:**
- Use `layout` prop sparingly -- layout animations measure DOM, which can be expensive with many elements
- Prefer `layout="position"` over `layout={true}` when only position changes (avoids size measurements)
- Use `AnimatePresence mode="popLayout"` for list filtering -- it removes items from flow immediately, preventing layout thrashing while the exit animation plays
- Keep transition durations short for micro-interactions (150-300ms). Longer durations (300-500ms) only for page transitions
- Avoid animating more than ~20 elements simultaneously on mobile

**Target: 60fps on Mobile Safari.** All animations must complete within the 16ms frame budget. All recommendations above use `transform` and `opacity` as primary animated properties to stay on the compositor thread.

---

## Use Case to Technology Mapping

This is the key decision guide. For each animation need, use the simplest tool that works.

| Use Case | Technology | Why This Tool |
|----------|-----------|---------------|
| Button hover/press feedback | Tailwind `transition-colors duration-150` | Pure CSS, zero JS, 60fps guaranteed |
| Card hover elevation | Tailwind `transition-shadow duration-200` | Pure CSS |
| Skeleton loading | Tailwind `animate-pulse` | Built-in utility |
| Toast/notification appear | `tailwindcss-animate` `animate-in fade-in slide-in-from-top` | CSS-only enter animation |
| Tab underline indicator slide | Tailwind `transition-all duration-200` | CSS transition on transform |
| Search input focus ring | Tailwind `transition-shadow duration-150` | Pure CSS |
| Spinner/loading indicator | Tailwind `animate-spin` | Built-in utility |
| **List items animate in (stagger)** | Motion `m.div` with `transition.delay` | Stagger requires JS orchestration |
| **List items animate out on removal** | Motion `AnimatePresence` with `exit` prop | CSS cannot delay React unmount |
| **Search filter: items fade out, remaining reposition** | Motion `AnimatePresence mode="popLayout"` + `layout` | Items need to exit AND remaining items smoothly reposition |
| **Page route transitions** | `next-transition-router` + Motion | Need async navigation lifecycle + enter/exit animations |
| **Tab content slide left/right** | Motion `AnimatePresence mode="wait"` with direction-aware variants | Content must exit before new content enters, direction matters |
| **Accordion/collapsible height animation** | Motion `m.div` with `animate={{ height: "auto" }}` | CSS cannot animate to `height: auto` |

---

## Installation Summary

```bash
# Tier 1: CSS animations (add to devDependencies)
npm install -D tailwindcss-animate

# Tier 2: JS animations (add to dependencies)
npm install motion

# Page transitions (add to dependencies)
npm install next-transition-router
```

**Total new dependencies: 3** (1 dev, 2 production)

---

## Future Considerations

**View Transitions API (revisit in 6-12 months):**
The browser-native View Transitions API has excellent support (89.5% global, iOS Safari 18+). Once Next.js stabilizes its `viewTransition` integration (moves from experimental to stable), it could replace `next-transition-router` entirely for page transitions, and potentially simplify list animations. Monitor Next.js release notes.

**Tailwind v4 migration:**
If/when the project upgrades to Tailwind v4, replace `tailwindcss-animate` with `tw-animate-css` (the v4-compatible successor). The animation class names are the same, so the migration is a config-only change.

**Motion `domMax` upgrade:**
If list filtering animations need smooth repositioning of remaining items (FLIP-style layout animation), upgrade the LazyMotion features from `domAnimation` to `domMax`. This adds ~10kb but enables the `layout` prop on `m` components.

---

## Sources

### Official Documentation (HIGH confidence)
- [Next.js viewTransition config](https://nextjs.org/docs/app/api-reference/config/next-config-js/viewTransition) -- experimental status confirmed, documented as "not recommended for production"
- [Motion installation docs](https://motion.dev/docs/react-installation) -- import paths, setup
- [Motion LazyMotion docs](https://motion.dev/docs/react-lazy-motion) -- bundle size optimization (4.6kb initial, domAnimation +15kb, domMax +25kb)
- [Motion bundle size reduction guide](https://motion.dev/docs/react-reduce-bundle-size) -- m component, feature packages
- [Motion AnimatePresence docs](https://motion.dev/docs/react-animate-presence) -- exit animation patterns, modes
- [Motion performance guide](https://motion.dev/docs/performance) -- GPU-accelerated properties
- [Tailwind CSS animation utilities](https://tailwindcss.com/docs/animation) -- built-in animate-* classes
- [Tailwind CSS transition utilities](https://tailwindcss.com/docs/transition-property)
- [tailwindcss-animate GitHub](https://github.com/jamiebuilds/tailwindcss-animate) -- enter/exit CSS animation utilities for Tailwind v3
- [Can I Use: View Transitions API](https://caniuse.com/view-transitions) -- 89.49% global support, iOS Safari 18+

### Ecosystem Research (MEDIUM confidence)
- [LogRocket: Best React animation libraries 2026](https://blog.logrocket.com/best-react-animation-libraries/) -- comparison table, bundle sizes, use case recommendations
- [Syncfusion: Top 7 React animation libraries 2026](https://www.syncfusion.com/blogs/post/top-react-animation-libraries) -- ecosystem overview
- [Motion blog: Framer Motion independence announcement](https://motion.dev/blog/framer-motion-is-now-independent-introducing-motion) -- rename from framer-motion to motion
- [Motion blog: Should I use Framer Motion or Motion One?](https://motion.dev/blog/should-i-use-framer-motion-or-motion-one) -- bundle size tradeoffs
- [next-transition-router GitHub](https://github.com/ismamz/next-transition-router) -- page transition solution, <8kb, beta, 317 stars
- [next-view-transitions GitHub](https://github.com/shuding/next-view-transitions) -- alternative using View Transitions API, v0.3.5
- [Next.js route transitions discussion #42658](https://github.com/vercel/next.js/discussions/42658) -- community approaches to App Router page transitions
- [Motion + Next.js SSR discussion](https://github.com/motiondivision/motion/discussions/3184) -- "use client" boundary patterns

### npm Registry (HIGH confidence)
- [motion on npm](https://www.npmjs.com/package/motion) -- v12.34.0, 3.6M weekly downloads, published 2026-02-09
- [framer-motion on npm](https://www.npmjs.com/package/framer-motion) -- still available, motion is drop-in replacement
- [tailwindcss-animate on npm](https://www.npmjs.com/package/tailwindcss-animate) -- Tailwind v3 compatible
- [tw-animate-css on npm](https://www.npmjs.com/package/tw-animate-css) -- Tailwind v4 only (NOT for this project)
