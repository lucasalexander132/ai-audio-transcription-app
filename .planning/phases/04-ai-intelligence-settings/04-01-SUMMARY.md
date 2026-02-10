---
phase: 04-ai-intelligence-settings
plan: 01
subsystem: api
tags: [claude, anthropic, ai-summary, convex-actions, user-settings]

# Dependency graph
requires:
  - phase: 03-library-organization
    provides: "Schema with transcripts, words, speakerLabels tables; fullText denormalization"
provides:
  - "aiSummaries table for storing generated AI summaries"
  - "userSettings table for persisting language and punctuation preferences"
  - "generateSummary action calling Claude haiku API with speaker-annotated text"
  - "getSummary query returning existing summary or null"
  - "getUserSettings query with sensible defaults"
  - "upsertSettings mutation for settings persistence"
affects:
  - "04-02 (AI Summary UI component wiring)"
  - "04-03 (Settings page wiring and Deepgram URL integration)"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Claude Messages API via fetch from Convex action (matches Deepgram pattern)"
    - "Speaker-annotated text construction from words + speakerLabels"
    - "Prompt-based JSON output from Claude (no structured outputs SDK)"
    - "Settings query with nullish coalescing defaults"

key-files:
  created:
    - "convex/ai.ts"
    - "convex/userSettings.ts"
  modified:
    - "convex/schema.ts"

key-decisions:
  - "Prompt-based JSON output instead of output_config.format structured outputs"
  - "Speaker-annotated text built from words + speakerLabels (not fullText)"
  - "claude-haiku-4-5 model for cost-effective summarization"

patterns-established:
  - "AI action pattern: auth check, load data via runQuery, call external API, store via runMutation"
  - "Settings defaults pattern: query returns defaults when no document exists"
  - "Upsert pattern: check existing, patch or insert"

# Metrics
duration: 2min
completed: 2026-02-10
---

# Phase 4 Plan 1: Schema + AI Summary Action + Settings CRUD Summary

**Claude haiku AI summary generation with speaker-annotated text, aiSummaries/userSettings schema, and settings CRUD functions**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-10T14:20:43Z
- **Completed:** 2026-02-10T14:22:33Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Two new Convex tables (aiSummaries, userSettings) with proper indexes
- AI summary action that builds speaker-annotated text from words + speaker labels and calls Claude haiku API
- Double-generation prevention (throws error if summary already exists for transcript)
- User settings query with sensible defaults (English, auto-punctuation on) and upsert mutation

## Task Commits

Each task was committed atomically:

1. **Task 1: Schema extensions + user settings functions** - `1367a22` (feat)
2. **Task 2: AI summary generation action + query** - `a51c188` (feat)

## Files Created/Modified
- `convex/schema.ts` - Added aiSummaries and userSettings table definitions with indexes
- `convex/ai.ts` - generateSummary action, storeSummary internalMutation, getSummary query
- `convex/userSettings.ts` - getUserSettings query with defaults, upsertSettings mutation

## Decisions Made
- Used prompt-based JSON output from Claude instead of output_config.format structured outputs, per plan directive (simpler, haiku follows instructions well)
- Built speaker-annotated text from words + speakerLabels queries rather than fullText, enabling proper speaker attribution in summaries
- Used claude-haiku-4-5 for cost-effective summarization ($1/$5 per M tokens)
- Accessed transcript data in action via ctx.runQuery with public API queries (api.transcripts.getWords, api.transcripts.getSpeakerLabels) matching existing codebase patterns

## Deviations from Plan

None - plan executed exactly as written.

## User Setup Required

**External services require manual configuration:**
- **ANTHROPIC_API_KEY** must be set via: `npx convex env set ANTHROPIC_API_KEY <key>`
- Get key from: https://console.anthropic.com/settings/keys

## Next Phase Readiness
- Backend AI functions ready for UI wiring in 04-02 (AI Summary component)
- Settings functions ready for settings page in 04-03
- No blockers for subsequent plans

---
*Phase: 04-ai-intelligence-settings*
*Completed: 2026-02-10*
