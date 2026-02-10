# Phase 3: Library & Organization - Context

**Gathered:** 2026-02-10
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can find, organize, and export transcripts. This includes browsable transcript list with previews, search by title/content, filter tabs (All, Recent, Starred, Meetings), starring/bookmarking, custom tags, and PDF/TXT export. AI summaries and settings belong to Phase 4.

</domain>

<decisions>
## Implementation Decisions

### Search & filtering
- "Recent" tab shows transcripts created in the last 7 days
- "Meetings" category requires manual tagging by the user (not auto-detected)
- Search results highlight matches in transcript title only (no content snippets)
- Search is independent of filter tabs — always searches all transcripts regardless of active tab

### Starring & tagging
- Star/bookmark toggle lives on the transcript card in the library list
- Tags are applied via a tag picker modal with existing tags + option to create new
- Tags are plain text chips, no color coding
- Soft limit of 5-10 tags per transcript, truncate display if too many

### Export format & flow
- Export includes full transcript + metadata (title, date, duration, speakers, tags, transcript text)
- Export triggered via overflow/3-dot menu option on transcript detail page
- PDF export is styled with headers — title as header, speaker names bolded, timestamps in gray, clean layout
- File naming: date + title (e.g., "2026-02-10 Team Standup.pdf")

### Claude's Discretion
- Library list card layout and information density
- Search debounce timing and UX details
- Exact tag limit number (within 5-10 range)
- TXT export formatting
- Empty state designs for each tab

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

*Phase: 03-library-organization*
*Context gathered: 2026-02-10*
