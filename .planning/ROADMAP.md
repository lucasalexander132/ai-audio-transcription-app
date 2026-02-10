# Roadmap: Transcripts

## Overview

This roadmap delivers a mobile-first PWA for real-time audio transcription with AI-powered summaries. We start by establishing the foundation (auth, recording, live transcription), add file upload flexibility, build organization features (search, tags, filters), and finish with AI intelligence (summaries, action items). Each phase delivers verifiable user value and unblocks the next.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation & Real-Time Transcription** - Auth, recording, live transcription, playback, PWA
- [x] **Phase 2: File Upload & Batch Processing** - Upload audio files for transcription
- [x] **Phase 3: Library & Organization** - Search, filters, tags, export, starred transcripts
- [x] **Phase 4: AI Intelligence & Settings** - Summaries, action items, settings

## Phase Details

### Phase 1: Foundation & Real-Time Transcription
**Goal**: Users can record audio via microphone and get live speaker-attributed transcripts
**Depends on**: Nothing (first phase)
**Requirements**: AUTH-01, AUTH-02, NAV-01, NAV-02, REC-01, REC-03, REC-04, TRX-01, TRX-02, TRX-03, TRX-04, TRX-05
**Success Criteria** (what must be TRUE):
  1. User can create account and log in, staying logged in across browser sessions
  2. User can start recording via microphone with visual waveform feedback
  3. User sees real-time transcription text appear as they speak
  4. User sees speakers automatically labeled (Speaker 1, Speaker 2, etc.) with timestamps
  5. User can rename speaker labels (Speaker 1 -> Sarah Chen)
  6. User can pause/resume recording during a session and see elapsed time
  7. User can play back recorded audio with seek bar and speed controls (1x, 1.5x, 2x)
  8. App is installable as PWA on mobile devices
  9. User can navigate to Transcripts, Record, and Settings via FAB menu
**Plans**: 3 plans

Plans:
- [x] 01-01-PLAN.md -- Project scaffold, Convex Auth, PWA manifest, FAB navigation, database schema
- [x] 01-02-PLAN.md -- Audio recording, Deepgram proxy, live waveform, real-time transcription
- [x] 01-03-PLAN.md -- Transcript view, audio playback with speed controls, speaker rename

### Phase 2: File Upload & Batch Processing
**Goal**: Users can upload pre-recorded audio files and get transcriptions
**Depends on**: Phase 1
**Requirements**: REC-02
**Success Criteria** (what must be TRUE):
  1. User can upload audio files (MP3, WAV, M4A, WebM) from device storage
  2. User sees upload progress and clear error messages if file is too large or wrong format
  3. Uploaded files are transcribed with same quality as live recordings (speaker diarization, timestamps)
  4. User can view uploaded file transcripts in the same interface as live recordings
**Plans**: 2 plans

Plans:
- [x] 02-01-PLAN.md -- Schema extension (processing status, source, errorMessage) + transcribeFile Convex action
- [x] 02-02-PLAN.md -- File upload UI component, upload hook, record page tabs, processing state in transcript detail

### Phase 3: Library & Organization
**Goal**: Users can find, organize, and export transcripts
**Depends on**: Phase 2
**Requirements**: LIB-01, LIB-02, LIB-03, LIB-04, LIB-05, SET-03
**Success Criteria** (what must be TRUE):
  1. User can browse all transcripts in scrollable list with previews
  2. User can search transcripts by title and content with real-time results
  3. User can filter transcripts via tabs (All, Recent, Starred, Meetings)
  4. User can star/bookmark transcripts and quickly access them via Starred tab
  5. User can add custom tags to transcripts (Sprint Review, Podcast, etc.)
  6. User can export individual transcripts as PDF or TXT files
**Plans**: 3 plans

Plans:
- [x] 03-01-PLAN.md -- Schema extensions (isStarred, fullText, search indexes, tags/transcriptTags tables) + backend queries/mutations
- [x] 03-02-PLAN.md -- Library page overhaul: search bar, filter tabs, star toggle, enhanced transcript cards, empty states
- [x] 03-03-PLAN.md -- Transcript detail: export menu (PDF/TXT), tag picker modal, tag chips

### Phase 4: AI Intelligence & Settings
**Goal**: Users get AI-generated summaries and can customize transcription settings
**Depends on**: Phase 3
**Requirements**: AI-01, AI-02, AI-03, SET-01, SET-02
**Success Criteria** (what must be TRUE):
  1. User can generate AI summary with overview paragraph for any transcript
  2. AI extracts key discussion points as bulleted list
  3. AI extracts action items with assigned speakers/participants
  4. User can select transcription language from settings
  5. User can toggle auto-punctuation on/off and see it apply to new recordings
**Plans**: 3 plans

Plans:
- [x] 04-01-PLAN.md -- Schema (aiSummaries + userSettings tables), Claude API action, settings CRUD
- [x] 04-02-PLAN.md -- Wire AI Summary component to backend with generate flow and skeleton loading
- [x] 04-03-PLAN.md -- Interactive settings page (language picker, punctuation toggle) + Deepgram URL wiring

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation & Real-Time Transcription | 3/3 | Complete | 2026-02-10 |
| 2. File Upload & Batch Processing | 2/2 | Complete | 2026-02-10 |
| 3. Library & Organization | 3/3 | Complete | 2026-02-10 |
| 4. AI Intelligence & Settings | 3/3 | Complete | 2026-02-10 |
