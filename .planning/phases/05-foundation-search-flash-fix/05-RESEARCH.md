# Phase 05: Foundation + Search Flash Fix - Research

**Researched:** 2026-02-10
**Domain:** React search UX bug fix, Motion animation library setup, accessibility
**Confidence:** HIGH

## Summary

This phase has two distinct concerns: (1) fixing a search flash bug where the full unfiltered transcript list briefly appears when typing in the search bar, and (2) establishing the animation foundation for subsequent phases by installing the `motion` library with LazyMotion for code-splitting and MotionConfig for reduced-motion accessibility.

The search flash bug has a clear root cause in the current code. The `TranscriptsPage` component uses a 300ms debounced search value to drive a Convex `useQuery` call. When the debounced value changes, the new Convex query returns `undefined` while loading. The `isSearchActive` check requires `searchResults !== undefined`, so during the loading gap, the component falls back to the full `filteredTranscripts` list -- this is the flash. The fix requires a `useStableQuery` hook (documented pattern from Convex) that holds the previous query results in a `useRef` during loading transitions, combined with comparing `searchInput` against `debouncedSearch` to determine if the user is actively typing.

The animation foundation uses `motion` v12 (the rebranded `framer-motion`), which has native React 19 support via peer dependencies `^18.0.0 || ^19.0.0`. LazyMotion with `domAnimation` features reduces the initial bundle from ~34kb to ~6kb. MotionConfig with `reducedMotion="user"` respects the OS-level `prefers-reduced-motion` setting, disabling transform and layout animations while preserving opacity and color transitions.

**Primary recommendation:** Fix the search flash first with a `useStableQuery` hook + input-awareness check, then install `motion` and wire up LazyMotion + MotionConfig at the app layout level.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `motion` | ^12.34.0 | Animation library for React | Rebranded framer-motion; native React 19 + Next.js 15 support; peer deps `react ^18.0.0 \|\| ^19.0.0` |
| React `useDeferredValue` | built-in (React 19) | Defer rendering of slow updates | Native React concurrent feature; no library needed; device-adaptive unlike fixed debounce |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `motion/react` | (part of motion) | React-specific imports | All React component animations |
| `motion/react-m` | (part of motion) | Tree-shakable `m` components for LazyMotion | When using LazyMotion (all animation components in this project) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `useStableQuery` custom hook | `useDeferredValue` alone | `useDeferredValue` handles render deferral but doesn't address Convex `undefined` loading state; need both patterns |
| `motion` (framer-motion rebrand) | CSS animations only | CSS can't do layout animations, AnimatePresence exit animations, or gesture-driven animations needed in Phases 06-08 |
| `domMax` features | `domAnimation` features | `domMax` adds drag/pan gestures and layout animations (+25kb vs +15kb); start with `domAnimation`, upgrade to `domMax` only in Phase 06 if layout animations are needed |

**Installation:**
```bash
npm install motion
```

## Architecture Patterns

### Recommended Project Structure
```
app/
├── lib/
│   ├── hooks/
│   │   ├── use-debounce.ts           # Existing (keep)
│   │   ├── use-stable-query.ts       # NEW: prevents flash on query arg changes
│   │   └── ...
│   └── motion/
│       └── features.ts               # NEW: async feature loader for LazyMotion
├── components/
│   └── providers/
│       └── motion-provider.tsx        # NEW: LazyMotion + MotionConfig wrapper
└── (app)/
    └── layout.tsx                     # Wrap children with MotionProvider
```

### Pattern 1: useStableQuery Hook (Convex-specific)
**What:** A wrapper around Convex's `useQuery` that holds previous results during loading transitions instead of returning `undefined`.
**When to use:** Any Convex query whose arguments change dynamically (search, filters, pagination).
**Example:**
```typescript
// Source: https://stack.convex.dev/help-my-app-is-overreacting
import { useRef } from "react";
import { useQuery } from "convex/react";

export const useStableQuery = ((name, ...args) => {
  const result = useQuery(name, ...args);
  const stored = useRef(result);

  if (result !== undefined) {
    stored.current = result;
  }

  return stored.current;
}) as typeof useQuery;
```

### Pattern 2: Input-Aware Search State
**What:** Track whether the user is actively typing (searchInput differs from debouncedSearch) to prevent fallback to unfiltered list during the debounce gap.
**When to use:** Any search UI with debounced queries.
**Example:**
```typescript
// Derived state that prevents flash
const isUserTyping = searchInput !== debouncedSearch;
const isSearchActive = debouncedSearch.length >= 2 && searchResults !== undefined;
const isSearchPending = searchInput.length >= 2 && (isUserTyping || searchResults === undefined);

// Display logic: hold previous results during transitions
const displayTranscripts = useMemo(() => {
  if (isSearchActive) return /* merged search results */;
  if (isSearchPending) return /* previous displayTranscripts via ref */;
  return filteredTranscripts;
}, [/* deps */]);
```

### Pattern 3: LazyMotion Provider at App Level
**What:** A single LazyMotion + MotionConfig wrapper high in the component tree that provides animation features to all descendants.
**When to use:** Once, at the app layout level. All child components use `m.*` instead of `motion.*`.
**Example:**
```typescript
// app/components/providers/motion-provider.tsx
"use client";

import { LazyMotion, MotionConfig } from "motion/react";

const loadFeatures = () =>
  import("@/app/lib/motion/features").then((mod) => mod.default);

export function MotionProvider({ children }: { children: React.ReactNode }) {
  return (
    <LazyMotion features={loadFeatures} strict>
      <MotionConfig reducedMotion="user">
        {children}
      </MotionConfig>
    </LazyMotion>
  );
}
```

```typescript
// app/lib/motion/features.ts
"use client";

import { domAnimation } from "motion/react";
export default domAnimation;
```

### Pattern 4: Async Feature Loading Verification
**What:** Verify LazyMotion is loading features asynchronously by checking the Network tab in dev tools for a separate chunk.
**When to use:** During development, to confirm the animation code is not in the main bundle.
**How:** Open browser dev tools Network tab, reload page, look for a separate JS chunk containing motion animation code (will appear after initial hydration).

### Anti-Patterns to Avoid
- **Importing `motion` components directly when using LazyMotion:** Always use `m` from `motion/react-m`, never `motion` from `motion/react`. Using both defeats the purpose of LazyMotion.
- **Placing LazyMotion inside individual components:** This creates multiple feature-loading boundaries. Place it once at the app level.
- **Using `domMax` when `domAnimation` suffices:** `domMax` adds ~10kb for drag/layout features not needed until Phase 06.
- **Wrapping non-client components with motion providers:** LazyMotion and MotionConfig are client-only. The provider must be a `"use client"` component.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Flash prevention during Convex query loading | Manual loading state tracking with multiple booleans | `useStableQuery` hook (useRef pattern) | Edge cases with rapid argument changes, race conditions between queries |
| Reduced motion detection | `window.matchMedia("(prefers-reduced-motion: reduce)")` listener | `MotionConfig reducedMotion="user"` | Handles SSR, updates reactively, integrates with all motion components automatically |
| Animation code splitting | Manual dynamic import of animation components | `LazyMotion` with async `features` prop | Handles loading state, deduplication, strict mode validation |
| Debounce | Custom setTimeout logic | Existing `useDebounce` hook (already in codebase) | Already battle-tested in this codebase |

**Key insight:** The search flash bug looks like it needs complex state management, but the fix is two simple patterns composed together: `useStableQuery` (hold previous data during loading) + input-awareness (detect typing gap). No new libraries needed for the bug fix itself.

## Common Pitfalls

### Pitfall 1: The Double-Flash Problem
**What goes wrong:** Fixing only the Convex loading flash but not the debounce gap (or vice versa) still produces a flash, just shorter.
**Why it happens:** There are TWO separate moments where the full list can flash: (1) during the 300ms debounce delay when `debouncedSearch` hasn't caught up to `searchInput`, and (2) when `debouncedSearch` updates and the new Convex query returns `undefined`.
**How to avoid:** Fix both simultaneously. Use `searchInput.length >= 2` as the "search mode" indicator (not `debouncedSearch`), and use `useStableQuery` for the Convex loading gap.
**Warning signs:** Type quickly in search and watch for any frame showing the full list.

### Pitfall 2: useStableQuery Returning Stale Results After Clearing Search
**What goes wrong:** After clearing the search input, the stable query still holds the last search results because the query args change to `"skip"` (which returns `undefined` forever).
**Why it happens:** `useStableQuery` holds previous results when current result is `undefined`. When query is skipped, it stays `undefined`.
**How to avoid:** Reset the stable ref when the search is explicitly cleared (searchInput becomes empty). Or: only use `useStableQuery` for the search query, and use regular conditional logic for the "search cleared" transition.
**Warning signs:** Clear the search and see old search results instead of the full list.

### Pitfall 3: LazyMotion `motion/react-m` Import Issue (v12.4.3-12.4.7)
**What goes wrong:** A reported bug where LazyMotion didn't work with `import * as m from "motion/react-m"` in certain versions.
**Why it happens:** Module mismatching in the final bundle (GitHub issue #3091).
**How to avoid:** Use motion v12.34.0 (current latest). The issue was reported in early versions (12.4.x) and the current version is far past that. Verify LazyMotion works during development by checking that animations render correctly.
**Warning signs:** Animations don't play when using `m.*` components but work with `motion.*` components.

### Pitfall 4: MotionConfig Not Wrapping All Animated Content
**What goes wrong:** Some components animate even when user has reduce-motion enabled.
**Why it happens:** MotionConfig only affects descendant `m`/`motion` components. CSS animations and transitions are NOT affected.
**How to avoid:** Add a CSS media query for `prefers-reduced-motion: reduce` in `globals.css` to disable CSS transitions/animations too. MotionConfig handles the Motion library; CSS needs its own handling.
**Warning signs:** Reduce motion is enabled in OS but CSS transitions (like the search button background-color transition) still animate.

### Pitfall 5: Server Component Boundary with Motion
**What goes wrong:** Importing motion components in server components causes build errors.
**Why it happens:** Motion requires client-side APIs (DOM, window).
**How to avoid:** The MotionProvider must be `"use client"`. Place it inside the `(app)/layout.tsx` which is already `"use client"`. Never import motion in server components.
**Warning signs:** Build error: "motion/react" is a client-only module.

## Code Examples

### Complete useStableQuery Hook
```typescript
// app/lib/hooks/use-stable-query.ts
// Source: https://stack.convex.dev/help-my-app-is-overreacting
"use client";

import { useRef } from "react";
import { useQuery } from "convex/react";
import type { FunctionReference, FunctionArgs, FunctionReturnType } from "convex/server";

/**
 * A variant of useQuery that keeps returning the last non-undefined result
 * while a new query is loading. Prevents flash of loading state when
 * query arguments change (e.g., during search).
 */
export function useStableQuery<Query extends FunctionReference<"query">>(
  query: Query,
  args: FunctionArgs<Query> | "skip"
): FunctionReturnType<Query> | undefined {
  const result = useQuery(query, args);
  const stored = useRef(result);

  if (result !== undefined) {
    stored.current = result;
  }

  return stored.current;
}
```

### Search Flash Fix Pattern (TranscriptsPage)
```typescript
// Key changes in app/(app)/transcripts/page.tsx

// 1. Use useStableQuery for search results
const searchResults = useStableQuery(
  api.transcripts.search,
  debouncedSearch.length >= 2 ? { searchTerm: debouncedSearch } : "skip"
);

// 2. Track whether user is mid-typing
const isUserSearching = searchInput.length >= 2;
const isSearchActive = debouncedSearch.length >= 2 && searchResults !== undefined;

// 3. Display logic that never flashes
const displayTranscripts = useMemo(() => {
  // Active search with results
  if (isSearchActive) {
    const backendResults = searchResults ?? [];
    // ... existing merge logic with tag matches
    return [...backendResults, ...tagMatches];
  }
  // User is typing but debounce/query hasn't caught up -- hold previous results
  if (isUserSearching) {
    return previousDisplayRef.current ?? filteredTranscripts;
  }
  // No search active
  return filteredTranscripts;
}, [isSearchActive, isUserSearching, searchResults, debouncedSearch, filteredTranscripts, allTranscripts, tagsByTranscript]);

// 4. Also use isUserSearching (not just isSearchActive) for UI decisions
// Hide filter tabs when user is typing, not just when results arrive
{!isUserSearching && !isSearchActive && (
  <FilterTabs ... />
)}
```

### MotionProvider Setup
```typescript
// app/components/providers/motion-provider.tsx
"use client";

import { LazyMotion, MotionConfig } from "motion/react";

// Async feature loading -- creates a separate chunk
const loadFeatures = () =>
  import("@/app/lib/motion/features").then((mod) => mod.default);

export function MotionProvider({ children }: { children: React.ReactNode }) {
  return (
    <LazyMotion features={loadFeatures} strict>
      <MotionConfig reducedMotion="user">
        {children}
      </MotionConfig>
    </LazyMotion>
  );
}
```

```typescript
// app/lib/motion/features.ts
"use client";

import { domAnimation } from "motion/react";
export default domAnimation;
```

### CSS Reduced Motion Baseline
```css
/* Add to globals.css */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

### Integration in App Layout
```typescript
// app/(app)/layout.tsx -- add MotionProvider wrapper
import { MotionProvider } from "../components/providers/motion-provider";

export default function AppLayout({ children }: { children: ReactNode }) {
  // ... existing auth logic ...

  return (
    <MotionProvider>
      <div className="min-h-screen bg-background">
        {children}
        <FABMenu />
      </div>
    </MotionProvider>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `framer-motion` package | `motion` package | 2024 (v12) | Import from `motion/react` instead of `framer-motion`; same API, React 19 support |
| Custom debounce for search | `useDeferredValue` + debounce | React 18+ | Built-in concurrent rendering; device-adaptive timing; interruptible |
| Manual `matchMedia` for reduced motion | `MotionConfig reducedMotion="user"` | motion v12 | Automatic; SSR-safe; respects OS setting; `useAnimate` respects it too (Jan 2026 update) |
| Synchronous animation bundle | `LazyMotion` async features | framer-motion v6+ | Bundle drops from ~34kb to ~6kb initial; features load after hydration |

**Deprecated/outdated:**
- `framer-motion` package name: Still works but `motion` is the official package going forward. Import path changed from `"framer-motion"` to `"motion/react"`.
- `AnimateSharedLayout`: Removed. Use `LayoutGroup` instead.
- `useReducedMotion()` hook alone: Still available but `MotionConfig reducedMotion="user"` is the recommended approach as it handles all descendant components automatically.

## Open Questions

1. **domAnimation vs domMax for Phase 06**
   - What we know: Phase 06 needs layout animations for card repositioning. `domAnimation` includes exit animations but `domMax` includes layout animations.
   - What's unclear: Whether `domAnimation` includes enough layout animation support or if `domMax` is required.
   - Recommendation: Start with `domAnimation` in Phase 05. If Phase 06 needs layout animations, upgrade the features file to export `domMax` -- it's a one-line change.

2. **useStableQuery typing precision**
   - What we know: The Convex blog shows a simplified typing (`as typeof useQuery`). A more precise generic typing would be better for TypeScript strictness.
   - What's unclear: Whether the simplified typing causes any TS errors with the current Convex version (1.31.7).
   - Recommendation: Implement the more precisely typed version shown in the Code Examples section. If TS issues arise, fall back to the `as typeof useQuery` cast.

3. **Existing CSS transitions and prefers-reduced-motion**
   - What we know: The codebase has inline `transition` properties (e.g., `transition: "background-color 0.15s"` on filter tabs and search button). These are NOT affected by MotionConfig.
   - What's unclear: Whether these tiny CSS transitions need to be removed for reduced-motion compliance or if they're considered acceptable micro-interactions.
   - Recommendation: Add the CSS `prefers-reduced-motion: reduce` media query to `globals.css` to catch all CSS transitions. This is the standard accessibility approach.

## Sources

### Primary (HIGH confidence)
- [Convex `useStableQuery` pattern](https://stack.convex.dev/help-my-app-is-overreacting) - Full hook implementation, problem explanation
- [React `useDeferredValue` official docs](https://react.dev/reference/react/useDeferredValue) - API reference, search filtering pattern, comparison to debounce
- npm registry `motion` v12.34.0 - Verified: peer deps `react ^18.0.0 || ^19.0.0`, current version via `npm info motion`
- Codebase analysis of `app/(app)/transcripts/page.tsx` - Direct inspection of the flash bug root cause

### Secondary (MEDIUM confidence)
- [Motion LazyMotion docs](https://motion.dev/docs/react-lazy-motion) - API via WebSearch summaries (site content not directly fetchable due to JS rendering)
- [Motion MotionConfig docs](https://motion.dev/docs/react-motion-config) - reducedMotion prop values: "user", "always", "never"
- [LogRocket Motion article](https://blog.logrocket.com/creating-react-animations-with-motion/) - Confirmed LazyMotion + MotionConfig code patterns, bundle size numbers (34kb full, ~6kb lazy)
- [GitHub motiondivision/motion](https://github.com/motiondivision/motion) - Import path `motion/react`, `motion/react-m`
- [GitHub discussion #3184](https://github.com/motiondivision/motion/discussions/3184) - Next.js App Router patterns, "use client" boundary guidance

### Tertiary (LOW confidence)
- [GitHub issue #3091](https://github.com/motiondivision/motion/issues/3091) - LazyMotion bug in v12.4.x; status unclear but current v12.34.0 is far past affected versions

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - `motion` v12.34.0 verified via npm; React 19 peer dep confirmed; Convex patterns from official blog
- Architecture: HIGH - LazyMotion/MotionConfig patterns from multiple official sources; useStableQuery from Convex official blog
- Search flash bug fix: HIGH - Root cause identified through direct code inspection; fix pattern from official Convex documentation
- Pitfalls: MEDIUM - LazyMotion v12.4.x bug status unverified for current version; CSS reduced-motion interaction is standard web practice but untested in this codebase

**Research date:** 2026-02-10
**Valid until:** 2026-03-10 (30 days; motion library is stable, search fix is codebase-specific)
