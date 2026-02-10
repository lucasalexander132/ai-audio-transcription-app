---
phase: 03-library-organization
plan: 01
subsystem: backend-data
tags: [convex, schema, search, tags, starring, fulltext]

dependency-graph:
  requires: [01-01, 02-01]
  provides: [search-indexes, star-toggle, tag-crud, fulltext-denormalization]
  affects: [03-02, 03-03]

tech-stack:
  added: []
  patterns: [search-index, junction-table, denormalized-field]

file-tracking:
  key-files:
    created:
      - convex/tags.ts
    modified:
      - convex/schema.ts
      - convex/transcripts.ts

decisions:
  - id: "03-01-01"
    decision: "Denormalize fullText at completion time"
    rationale: "Convex search indexes work on document fields, not across tables. Concatenating words into fullText on transcripts enables single search index."
    impact: "Both completeTranscript (internal) and complete (public) mutations now build fullText"
  - id: "03-01-02"
    decision: "Max 8 tags per transcript"
    rationale: "Middle of 5-10 range from CONTEXT.md. Enough for categorization without UI clutter."
    impact: "addTagToTranscript enforces limit server-side"
  - id: "03-01-03"
    decision: "Junction table for tags (many-to-many)"
    rationale: "Enables tag reuse across transcripts, easy rename, query by tag. Standard relational pattern."
    impact: "tags + transcriptTags tables with by_userId, by_userId_name, by_transcript, by_tag indexes"

metrics:
  duration: "2 min"
  completed: "2026-02-10"
---

# Phase 3 Plan 1: Schema Extensions & Backend Queries Summary

Extended the Convex backend with starring, full-text search, and tagging support via schema additions, search indexes, and new query/mutation functions.

## One-Liner

Convex schema extended with isStarred, fullText search indexes (title + content), tags junction table, and CRUD mutations for star/search/tags

## What Was Done

### Task 1: Schema Extensions
- Added `isStarred: v.optional(v.boolean())` to transcripts table
- Added `fullText: v.optional(v.string())` to transcripts table for denormalized search
- Added `searchIndex("search_title")` on title field filtered by userId
- Added `searchIndex("search_content")` on fullText field filtered by userId
- Created `tags` table with `by_userId` and `by_userId_name` indexes
- Created `transcriptTags` junction table with `by_transcript` and `by_tag` indexes

### Task 2: Mutations, Queries, and Denormalization
- **toggleStar** mutation: flips `isStarred` with auth + ownership check
- **search** query: searches both title and content indexes, merges with dedup (title matches first)
- **complete** mutation: now fetches all words, sorts by startTime, concatenates into fullText
- **completeTranscript** internal mutation: same fullText denormalization for file uploads
- **deleteTranscript** mutation: now also cleans up transcriptTags links
- Created `convex/tags.ts` with:
  - `listUserTags` query: all tags for current user
  - `getAllTranscriptTags` query: batch fetch all transcript-tag mappings for efficient client-side lookup
  - `getTranscriptTags` query: tags for a specific transcript
  - `addTagToTranscript` mutation: find-or-create tag, link to transcript, enforce 8-tag limit
  - `removeTagFromTranscript` mutation: delete junction table link

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added transcriptTags cleanup to deleteTranscript**
- **Found during:** Task 2
- **Issue:** Deleting a transcript would leave orphaned transcriptTags rows in the junction table
- **Fix:** Added transcriptTags deletion loop to deleteTranscript mutation before deleting the transcript itself
- **Files modified:** convex/transcripts.ts
- **Commit:** 61a6135

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| Denormalize fullText at completion time | Convex search indexes require document-level fields; concatenating words enables native search |
| Max 8 tags per transcript | Middle of 5-10 range from CONTEXT.md, balances flexibility and UI clarity |
| Junction table for tags | Standard many-to-many pattern, enables tag reuse and querying by tag |
| Batch getAllTranscriptTags query | Single query for all user's transcript-tag mappings avoids N+1 per-card loading |

## Verification

- `npx convex dev --once` deployed successfully with all new indexes and functions
- Schema shows 6 new indexes: tags.by_userId, tags.by_userId_name, transcriptTags.by_tag, transcriptTags.by_transcript, transcripts.search_content, transcripts.search_title
- All existing functions (create, get, list, appendWords, complete, completeTranscript, etc.) continue to work
- New functions deployed: transcripts.toggleStar, transcripts.search, tags.listUserTags, tags.getAllTranscriptTags, tags.getTranscriptTags, tags.addTagToTranscript, tags.removeTagFromTranscript

## Commits

| Hash | Type | Description |
|------|------|-------------|
| 2a6799f | feat | Schema extensions: isStarred, fullText, search indexes, tags + transcriptTags tables |
| 61a6135 | feat | Star toggle, search, tag CRUD, fullText denormalization, transcriptTags cleanup |

## Next Phase Readiness

Plans 03-02 (library UI) and 03-03 (export + tag picker) can now proceed. All backend data support is in place:
- Search queries ready for debounced client-side usage (skip empty search term)
- toggleStar ready for star icon on transcript cards
- Tag CRUD ready for tag picker modal
- getAllTranscriptTags ready for efficient library list rendering
- fullText denormalization will be applied to newly completed transcripts (existing transcripts will need fullText backfilled if search of existing content is desired)
