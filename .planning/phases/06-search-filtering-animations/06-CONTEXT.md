# Phase 6: Search Filtering Animations - Context

**Gathered:** 2026-02-10
**Status:** Ready for planning

<domain>
## Phase Boundary

Animate transcript cards in and out as search results change. Cards fade/scale on enter/exit, reposition smoothly to close gaps, and stagger in on initial page load. The search filtering logic itself is already built (Phase 05). This phase adds visual motion only.

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion
User wants "standard premium feel" across all animation areas. Claude has full flexibility on:

- **Animation timing and easing** — duration, easing curves, spring vs tween
- **Exit choreography** — simultaneous vs staggered exits, timing relative to layout reposition
- **Enter choreography** — fade/scale behavior for returning cards, stagger delays
- **Staggered entrance on load** — cascade direction, per-card delay, cap on how many cards animate
- **Empty/few results transitions** — how empty state appears when results narrow to zero
- **Overall feel** — snappy, smooth, or springy; the goal is premium and polished

</decisions>

<specifics>
## Specific Ideas

- "Standard premium feel" — user wants animations that feel polished and expected, not experimental or attention-grabbing
- Should feel like a well-built native app, not a demo of animation capabilities

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 06-search-filtering-animations*
*Context gathered: 2026-02-10*
