---
phase: 03-library-organization
plan: 03
subsystem: transcript-detail-features
tags: [export, pdf, jspdf, tags, tag-picker, web-share-api]

dependency-graph:
  requires: [03-01]
  provides: [pdf-export, txt-export, tag-management-ui, export-menu]
  affects: [04-01]

tech-stack:
  added: [jspdf]
  patterns: [lazy-import, web-share-api-fallback, bottom-sheet-modal, segment-grouping]

file-tracking:
  key-files:
    created:
      - app/components/export/transcript-exporter.ts
      - app/components/export/export-menu.tsx
      - app/components/library/tag-chips.tsx
      - app/components/library/tag-picker-modal.tsx
    modified:
      - app/(app)/transcripts/[id]/page.tsx
      - package.json

decisions:
  - id: "03-03-01"
    decision: "Lazy-load jsPDF via dynamic import()"
    rationale: "PDF export is infrequent; avoid adding ~200KB to initial bundle"
    impact: "First PDF export has slight delay while jspdf loads; subsequent exports instant"
  - id: "03-03-02"
    decision: "Web Share API first, anchor download fallback"
    rationale: "iOS Safari lacks proper file download; Web Share API triggers native share sheet"
    impact: "Mobile users get native share experience, desktop users get direct download"
  - id: "03-03-03"
    decision: "Group consecutive words by speaker into export segments"
    rationale: "Words table stores individual words; export needs paragraph-level segments"
    impact: "useMemo builds segments from words + speakerLabels for both PDF and TXT export"

metrics:
  duration: "2 min"
  completed: "2026-02-10"
---

# Phase 3 Plan 3: Transcript Detail Export & Tags Summary

Added PDF/TXT export via 3-dot overflow menu and tag management (picker modal + chips) to the transcript detail page.

## One-Liner

jsPDF-based styled PDF export, plain TXT export via overflow menu, tag picker bottom-sheet modal with create/toggle, tag chips with remove on detail page

## What Was Done

### Task 1: Export Functions and Export Menu
- Installed jsPDF 4.1.0 for client-side PDF generation
- Created `transcript-exporter.ts` with three pure functions:
  - `exportTranscriptAsPDF`: Lazy-loads jsPDF, generates A4 document with bold title (18pt), gray metadata, warm-palette divider, bold speaker names with gray timestamps, wrapped text, automatic page breaks
  - `exportTranscriptAsTXT`: Generates clean plain text with title underlined by `=`, metadata block, `---` divider, `[timestamp] Speaker:` format per segment
  - `downloadFile`: Tries Web Share API first (canShare check), falls back to anchor element download, handles AbortError for cancelled shares
- Created `export-menu.tsx`: 3-dot vertical dots button, absolute-positioned dropdown with PDF/TXT options, click-outside-close via mousedown listener, loading state during export, warm styling with hover effects
- File naming follows `YYYY-MM-DD Title.ext` pattern with sanitized title

### Task 2: Tag Picker Modal, Tag Chips, and Detail Page Integration
- Created `tag-chips.tsx`: Horizontal flex-wrap chip display, `#F5EDE4` background with `#8B7E74` text, optional X remove button per chip, "+N more" overflow chip, returns null if no tags
- Created `tag-picker-modal.tsx`: Bottom-sheet modal (fixed bottom, rounded-t-2xl, max 60vh), overlay with click-to-close, header with close button, text input for creating new tags (Enter to submit, duplicate check), scrollable list of all user tags with checkmark toggle (active = on transcript), wired to `addTagToTranscript` and `removeTagFromTranscript` mutations
- Modified `app/(app)/transcripts/[id]/page.tsx`:
  - Added queries: `getTranscriptTags`, `getSpeakerLabels`, `getWords` inside TranscriptDetailContent
  - Built export segments via `useMemo`: groups consecutive words by speaker, formats timestamps as MM:SS, uses speaker labels with fallback
  - Placed ExportMenu in header row next to Back button
  - Added tag section below metadata: TagChips with remove + "Add Tag" pill button
  - TagPickerModal rendered conditionally on showTagPicker state

## Deviations from Plan

None - plan executed exactly as written.

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| Lazy-load jsPDF via dynamic import() | Avoid ~200KB bundle impact for infrequent export action |
| Web Share API first, anchor download fallback | iOS Safari lacks proper file download; share sheet is native UX |
| Group words by speaker into segments with useMemo | Export needs paragraph-level data; words table is per-word |

## Verification

- `npm run build` passes with no TypeScript errors
- jsPDF 4.1.0 confirmed in package.json dependencies
- Export menu renders 3-dot button in detail page header
- PDF export generates styled A4 document with proper formatting
- TXT export generates clean plain text with metadata and segments
- Tag chips display below metadata with remove functionality
- Tag picker modal opens from "Add Tag" button
- All components properly wired to Convex queries and mutations

## Commits

| Hash | Type | Description |
|------|------|-------------|
| 11a1c7b | feat | Create export functions and export menu component |
| 86295d4 | feat | Add tag picker modal, tag chips, wire export + tags into detail page |

## Next Phase Readiness

Phase 3 is now complete. All three plans (schema, library page, detail page features) are done. Phase 4 (AI Intelligence & Settings) can proceed. The transcript detail page now has the full feature set needed:
- Audio playback with speed controls and skip navigation
- Transcript view with speaker labels
- Export via PDF/TXT
- Tag management via picker modal
- All data backed by Convex queries and mutations from 03-01
