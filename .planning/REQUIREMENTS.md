# Requirements: Transcripts

**Defined:** 2026-02-09
**Core Value:** Real-time audio transcription with intelligent AI summaries — record anything, get a searchable, actionable transcript instantly.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Recording

- [ ] **REC-01**: User can record audio via device microphone with live waveform visualization
- [ ] **REC-02**: User can upload pre-recorded audio files (MP3, WAV, M4A, WebM) for transcription
- [ ] **REC-03**: User can pause and resume recording during a session
- [ ] **REC-04**: User sees a timer showing elapsed recording duration

### Transcription

- [ ] **TRX-01**: Real-time speech-to-text transcription appears as user speaks (Deepgram streaming)
- [ ] **TRX-02**: Speakers are automatically detected and labeled (Speaker 1, Speaker 2, etc.)
- [ ] **TRX-03**: User can rename speaker labels (Speaker 1 → Sarah Chen)
- [ ] **TRX-04**: User can play back recorded audio with seek bar and speed controls (1x, 1.5x, 2x)
- [ ] **TRX-05**: Timestamps are shown alongside speaker text in transcript view

### AI Features

- [ ] **AI-01**: User can generate an AI summary with overview paragraph (Claude API)
- [ ] **AI-02**: AI extracts key discussion points as bullet list
- [ ] **AI-03**: AI extracts action items with assigned speakers

### Library

- [ ] **LIB-01**: User can browse all transcripts in a scrollable list
- [ ] **LIB-02**: User can search transcripts by title and content
- [ ] **LIB-03**: User can filter transcripts via tabs (All, Recent, Starred, Meetings)
- [ ] **LIB-04**: User can star/bookmark transcripts for quick access
- [ ] **LIB-05**: User can add custom tags to transcripts (Sprint Review, Podcast, etc.)

### Settings & Auth

- [ ] **AUTH-01**: User can create account and log in via Convex Auth
- [ ] **AUTH-02**: User session persists across browser refresh
- [ ] **SET-01**: User can select transcription language
- [ ] **SET-02**: User can toggle auto-punctuation on/off
- [ ] **SET-03**: User can export transcript as PDF or TXT

### Navigation & PWA

- [ ] **NAV-01**: FAB navigation menu with Transcripts, Record, and Settings options
- [ ] **NAV-02**: App is installable as PWA with manifest, icons, and mobile-first design

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Recording Enhancements

- **REC-05**: User can select recording quality level (low/medium/high)
- **REC-06**: Speaker detection toggle in settings

### Advanced Features

- **ADV-01**: Offline recording with sync-when-online
- **ADV-02**: Auto-save to cloud with sync status indicator
- **ADV-03**: Custom vocabulary/jargon support for specialized domains
- **ADV-04**: Auto-chapters/sections for long transcripts
- **ADV-05**: Bookmark moments during recording
- **ADV-06**: Video file transcription support
- **ADV-07**: Export as SRT/VTT subtitle formats

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Meeting bot integration (Zoom/Meet) | Privacy concerns, complexity; mic + file upload sufficient |
| Real-time collaborative editing | Requires CRDT/OT infrastructure; personal tool first |
| Text-based audio editing (Descript-style) | Very high complexity; not core to transcription value |
| Sentiment analysis | Nice-to-have; not core to transcription use case |
| Translation (post-transcription) | Separate feature; adds language complexity |
| Team/workspace features | Personal tool that others use independently |
| Payment/subscription system | Free personal tool for now |
| Desktop-optimized layouts | Mobile-first PWA only for v1 |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| REC-01 | TBD | Pending |
| REC-02 | TBD | Pending |
| REC-03 | TBD | Pending |
| REC-04 | TBD | Pending |
| TRX-01 | TBD | Pending |
| TRX-02 | TBD | Pending |
| TRX-03 | TBD | Pending |
| TRX-04 | TBD | Pending |
| TRX-05 | TBD | Pending |
| AI-01 | TBD | Pending |
| AI-02 | TBD | Pending |
| AI-03 | TBD | Pending |
| LIB-01 | TBD | Pending |
| LIB-02 | TBD | Pending |
| LIB-03 | TBD | Pending |
| LIB-04 | TBD | Pending |
| LIB-05 | TBD | Pending |
| AUTH-01 | TBD | Pending |
| AUTH-02 | TBD | Pending |
| SET-01 | TBD | Pending |
| SET-02 | TBD | Pending |
| SET-03 | TBD | Pending |
| NAV-01 | TBD | Pending |
| NAV-02 | TBD | Pending |

**Coverage:**
- v1 requirements: 24 total
- Mapped to phases: 0
- Unmapped: 24 ⚠️

---
*Requirements defined: 2026-02-09*
*Last updated: 2026-02-09 after initial definition*
