---
phase: 04-ai-intelligence-settings
plan: 03
subsystem: ui-backend
tags: [settings, language-picker, deepgram, user-preferences, convex-queries]

# Dependency graph
requires:
  - phase: 04-ai-intelligence-settings
    plan: 01
    provides: "userSettings table with getUserSettings query and upsertSettings mutation"
provides:
  - "Interactive settings page with searchable language picker and persisted auto-punctuation toggle"
  - "getSettingsForUser internalQuery for Deepgram action use"
  - "getTranscriptOwner internalQuery for transcript userId lookup"
  - "Dynamic Deepgram URL construction from user settings"
affects:
  - "All future transcription recordings and file uploads use user-selected language"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Bottom sheet modal pattern for language selection"
    - "Convex reactive queries for settings (useQuery/useMutation)"
    - "internalQuery pattern for cross-module data access in Convex actions"
    - "Dynamic API URL construction from persisted user settings"

key-files:
  created: []
  modified:
    - "app/(app)/settings/page.tsx"
    - "convex/deepgram.ts"
    - "convex/userSettings.ts"
    - "convex/transcripts.ts"

key-decisions:
  - "Language picker as bottom sheet modal with search filtering"
  - "buildDeepgramUrl helper function for consistent URL construction"
  - "getTranscriptOwner internalQuery to look up userId from transcriptId in actions"

patterns-established:
  - "Settings wiring: useQuery for reads, useMutation for writes, defaults while loading"
  - "Action settings lookup: transcriptId -> userId -> settings -> dynamic URL"

# Metrics
duration: 3min
completed: 2026-02-10
---

# Phase 4 Plan 3: Interactive Settings + Deepgram URL Wiring Summary

**Searchable language picker modal and persisted auto-punctuation toggle wired to dynamic Deepgram API URL construction**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-10T14:26:27Z
- **Completed:** 2026-02-10T14:29:46Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Settings page now reads/writes language and auto-punctuation to Convex (persists across refresh)
- Searchable bottom sheet language picker with 30 Deepgram Nova-2 supported languages
- Deepgram API URLs in both transcribeChunk and transcribeFile dynamically built from user settings
- When auto-punctuation is off, punctuate and smart_format params are omitted from Deepgram requests
- Default behavior (English, punctuation on) produces identical URL to previous hardcoded version

## Task Commits

Each task was committed atomically:

1. **Task 1: Interactive settings page with persisted state** - `cbf8dce` (feat)
2. **Task 2: Wire user settings into Deepgram API URL** - `15d6afc` (feat)

## Files Created/Modified

- `app/(app)/settings/page.tsx` - Added Convex useQuery/useMutation for settings, LanguagePickerModal component with search, clickable language row, persisted auto-punctuation toggle
- `convex/deepgram.ts` - Replaced hardcoded URLs with buildDeepgramUrl() using user settings, added userId/settings lookup via internalQueries
- `convex/userSettings.ts` - Added getSettingsForUser internalQuery for action use (takes userId, returns settings with defaults)
- `convex/transcripts.ts` - Added getTranscriptOwner internalQuery (takes transcriptId, returns userId)

## Decisions Made

- Language picker implemented as bottom sheet modal with search input, matching the app's mobile-first design pattern
- Created buildDeepgramUrl helper to centralize URL construction logic (avoids duplication between transcribeChunk and transcribeFile)
- Used getTranscriptOwner internalQuery to derive userId from transcriptId, avoiding changes to action args or client code

## Deviations from Plan

None - plan executed exactly as written.

## Next Phase Readiness

This completes Phase 4 (AI Intelligence & Settings). All success criteria are met:
- AI summary generation with overview, key points, and action items (04-01, 04-02)
- Searchable language selection in settings (04-03)
- Auto-punctuation toggle with persistence (04-03)
- Settings wired into Deepgram API calls (04-03)

**Project is feature-complete per the roadmap.**

---
*Phase: 04-ai-intelligence-settings*
*Completed: 2026-02-10*
