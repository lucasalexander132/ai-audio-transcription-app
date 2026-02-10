# Phase 4: AI Intelligence & Settings - Context

**Gathered:** 2026-02-10
**Status:** Ready for planning

<domain>
## Phase Boundary

AI-generated summaries, key discussion points, and action items for completed transcripts. Plus transcription settings: language selection and auto-punctuation toggle. This phase adds intelligence on top of existing transcripts — it does not modify recording, upload, or library features.

</domain>

<decisions>
## Implementation Decisions

### Summary & key points presentation
- Separate tab on transcript detail page ("Transcript | AI Summary") — not inline
- Single scrollable page on the AI tab: overview paragraph, then key points list, then action items
- Overview summary is medium depth (4-6 sentences covering main topics, decisions, outcomes)
- "No action items found" message when none exist (don't hide the section)

### Action items format
- Read-only list — not an interactive checklist/task manager
- Include action items without a clear assignee, labeled as "Unassigned"
- Speaker assignment display: Claude's discretion on inline vs badge approach

### AI generation trigger
- On-demand only — user taps "Generate Summary" button on the AI tab
- One-time generation, no regenerate option
- Skeleton placeholders while AI is generating (animated lines that fill in)
- AI provider: Claude (Anthropic API)

### Settings
- Add language and auto-punctuation settings to existing settings page structure
- Searchable dropdown for transcription language (type-to-filter)
- Auto-punctuation on by default for new users
- Settings changes apply to future recordings only — no reprocessing of existing transcripts

### Claude's Discretion
- Number of key discussion points to extract (scale appropriately with content)
- How to display speaker assignment on action items (inline bold name vs colored badge)
- Skeleton placeholder design during AI generation
- Exact placement of new settings within existing settings page
- AI prompt engineering for summary quality

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 04-ai-intelligence-settings*
*Context gathered: 2026-02-10*
