---
phase: 01-foundation-real-time-transcription
plan: 02
subsystem: ui, api, realtime
tags: [mediarecorder, deepgram, zustand, web-audio-api, canvas, convex-actions, file-storage]

# Dependency graph
requires:
  - phase: 01-01
    provides: Convex Auth scaffold, database schema with transcripts/words tables, basic app structure
provides:
  - Complete recording interface with live audio capture
  - Real-time Deepgram transcription via server-side proxy
  - Waveform visualization using Web Audio API
  - Recording controls with pause/resume/stop functionality
  - Live transcript display with speaker attribution and timestamps
  - Audio file storage in Convex
affects: [01-03, transcript-view, audio-playback, speaker-labeling]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Zustand for shared recording state between components"
    - "MediaRecorder with MIME type fallback chain for cross-browser compatibility"
    - "Convex actions as server-side proxy for API keys"
    - "Web Audio API with AnalyserNode for waveform visualization"
    - "Upload flow: generateUploadUrl -> fetch POST -> saveRecording mutation"

key-files:
  created:
    - app/lib/stores/recording-store.ts
    - app/lib/hooks/use-audio-recorder.ts
    - app/lib/hooks/use-recording-timer.ts
    - convex/deepgram.ts
    - convex/recordings.ts
    - app/components/audio/waveform-visualizer.tsx
    - app/components/audio/recording-controls.tsx
    - app/components/audio/live-transcript.tsx
  modified:
    - app/(app)/record/page.tsx
    - convex/transcripts.ts
    - tailwind.config.ts

key-decisions:
  - "Use Deepgram REST prerecorded API instead of WebSocket for chunk transcription"
  - "Modified appendWords to internal mutation for Convex action access"
  - "Implement audio format fallback chain: webm/opus -> webm -> ogg/opus -> mp4"
  - "Auto-pause recording on page visibility change to prevent background issues"
  - "Upload via Convex storage: generateUploadUrl -> POST -> saveRecording pattern"

patterns-established:
  - "Zustand pattern: Minimal shared state store with focused actions"
  - "Hook composition: Separate concerns (recorder, timer) into individual hooks"
  - "Component composition: Waveform, controls, transcript as independent components"
  - "Mobile-first controls: 56px minimum touch targets, large central record button"

# Metrics
duration: 5min
completed: 2026-02-09
---

# Phase 01 Plan 02: Real-Time Recording & Transcription Summary

**Live audio recording with real-time Deepgram transcription, waveform visualization, and mobile-optimized recording controls**

## Performance

- **Duration:** 5 min
- **Started:** 2026-02-10T02:22:51Z
- **Completed:** 2026-02-10T02:28:46Z
- **Tasks:** 2
- **Files modified:** 11

## Accomplishments
- Complete recording flow: start -> pause -> resume -> stop with live transcription
- Real-time waveform visualization using Web Audio API and canvas
- Speaker-attributed transcript display with automatic grouping and timestamps
- Server-side Deepgram proxy via Convex actions (API key never exposed to browser)
- Audio file upload to Convex storage with proper MIME type handling
- Mobile-first UI with large touch-friendly controls

## Task Commits

Each task was committed atomically:

1. **Task 1: Audio recording hooks, Deepgram proxy, and audio storage** - `912f223` (feat)
2. **Task 2: Recording page UI with waveform, controls, and live transcript** - `c1c65e4` (feat)

## Files Created/Modified
- `app/lib/stores/recording-store.ts` - Zustand store for shared recording state (status, transcriptId, timer, errors)
- `app/lib/hooks/use-audio-recorder.ts` - MediaRecorder hook with format fallback, pause/resume, and Deepgram integration
- `app/lib/hooks/use-recording-timer.ts` - Timer hook with MM:SS formatting, pauses with recording
- `convex/deepgram.ts` - Server-side Deepgram transcription action using REST prerecorded API
- `convex/recordings.ts` - Audio file storage mutations (generateUploadUrl, saveRecording, getRecordingUrl)
- `convex/transcripts.ts` - Modified appendWords to internal mutation for action access
- `app/components/audio/waveform-visualizer.tsx` - Canvas-based waveform with Web Audio API AnalyserNode
- `app/components/audio/recording-controls.tsx` - Mobile-optimized record/pause/resume/stop buttons with timer
- `app/components/audio/live-transcript.tsx` - Real-time transcript with speaker grouping and timestamps
- `app/(app)/record/page.tsx` - Composed recording page with all components
- `tailwind.config.ts` - Added cream (#FFF9F0) and burnt sienna (#D2691E) colors

## Decisions Made

**1. Deepgram REST API instead of WebSocket**
- Used REST prerecorded API for chunk transcription instead of WebSocket streaming
- Rationale: Simpler implementation, no need for KeepAlive management during silence
- Trade-off: Slightly higher latency (~2 seconds per chunk) but more reliable

**2. Internal mutation for appendWords**
- Changed appendWords from regular mutation to internalMutation
- Rationale: Convex actions can only call internal mutations, not public ones
- Impact: appendWords now only accessible via internal.transcripts.appendWords

**3. Audio format fallback chain**
- Implemented MIME type detection with fallback: webm/opus -> webm -> ogg/opus -> mp4
- Rationale: iOS Safari doesn't support all formats, need automatic detection
- Verification: MediaRecorder.isTypeSupported() checks each format

**4. Auto-pause on visibility change**
- Recording auto-pauses when page hidden (user switches tabs/apps)
- Rationale: iOS PWA behavior and MediaRecorder reliability
- User feedback: Error message shown when auto-paused

**5. Upload pattern via Convex storage**
- Three-step upload: generateUploadUrl mutation -> fetch POST -> saveRecording mutation
- Rationale: Convex storage requires this pattern for client uploads
- Benefits: Proper authentication, storage ID returned from upload response

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed TypeScript type error in waveform visualizer**
- **Found during:** Task 2 (Waveform visualizer implementation)
- **Issue:** Uint8Array type mismatch with AnalyserNode.getByteFrequencyData()
- **Fix:** Added type assertion (as any) to satisfy strict TypeScript checking
- **Files modified:** app/components/audio/waveform-visualizer.tsx
- **Verification:** npm run build succeeds without type errors
- **Committed in:** c1c65e4 (Task 2 commit)

**2. [Rule 1 - Bug] Fixed ArrayBuffer type for Deepgram audio data**
- **Found during:** Task 1 (Audio recorder hook implementation)
- **Issue:** Convex v.bytes() expects ArrayBuffer, not Uint8Array
- **Fix:** Changed audioData parameter from new Uint8Array(arrayBuffer) to arrayBuffer
- **Files modified:** app/lib/hooks/use-audio-recorder.ts
- **Verification:** Build succeeds, Convex type validation passes
- **Committed in:** 912f223 (Task 1 commit)

**3. [Rule 2 - Missing Critical] Added cream and burnt sienna to Tailwind config**
- **Found during:** Task 2 (Record page implementation)
- **Issue:** bg-cream class used in record page but color not defined in Tailwind config
- **Fix:** Added cream: "#FFF9F0" and burnt-sienna: "#D2691E" to Tailwind theme colors
- **Files modified:** tailwind.config.ts
- **Verification:** Build succeeds, colors available in all components
- **Committed in:** c1c65e4 (Task 2 commit)

---

**Total deviations:** 3 auto-fixed (2 bugs, 1 missing critical)
**Impact on plan:** All auto-fixes necessary for correct TypeScript compilation and color system. No scope creep.

## Issues Encountered
None - all tasks completed as planned with only minor type fixes.

## User Setup Required

**External services require manual configuration.**

### Deepgram API Key

**Required for:** Real-time audio transcription

**Setup steps:**
1. Create account at https://console.deepgram.com
2. Navigate to Settings -> API Keys
3. Create new API key with "Member" permissions
4. Set in Convex environment:
   ```bash
   npx convex env set DEEPGRAM_API_KEY <your-key-here>
   ```

**Verification:**
1. Start recording on /record page
2. Speak into microphone
3. Transcript should appear in real-time below waveform

**Note:** Without this key, recording will work but transcription will fail silently (errors logged to Convex dashboard).

## Next Phase Readiness

**Ready for:**
- Phase 01-03: Transcript viewing and playback
- Speaker label editing
- Transcript search and filtering
- Audio playback with word highlighting

**Blockers:** None

**Concerns:**
- iOS PWA testing needed on physical device (audio recording has known bugs in simulator)
- iOS 44-byte audio blob bug validation needed (currently checking blob.size > 44)
- Format fallback needs real-device testing across iOS Safari versions
- Deepgram API key must be set before testing transcription

---
*Phase: 01-foundation-real-time-transcription*
*Completed: 2026-02-09*
