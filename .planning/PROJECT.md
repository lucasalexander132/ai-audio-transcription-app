# Transcripts

## What This Is

A mobile-first PWA for real-time audio transcription with AI-powered summaries. Users record audio via microphone or upload files, get live speaker-attributed transcripts via Deepgram, and generate AI summaries (overview, key points, action items) via Claude. Built as a personal tool that others can use independently.

## Core Value

Real-time audio transcription with intelligent AI summaries — record anything, get a searchable, actionable transcript instantly.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] User can record audio via device microphone with live waveform visualization
- [ ] User can upload pre-recorded audio files for transcription
- [ ] Real-time speech-to-text transcription via Deepgram streaming API
- [ ] Automatic speaker detection (diarization) with ability to rename speakers
- [ ] Live transcript display during recording with speaker attribution
- [ ] Full transcript view with audio playback, seek, and speed controls
- [ ] AI-generated summaries with overview, key points, and action items (Claude API)
- [ ] Transcript library with search, filter tabs (All, Recent, Starred, Meetings), and tags
- [ ] Star/bookmark transcripts
- [ ] Tag transcripts with custom labels
- [ ] FAB navigation menu (Transcripts, Record, Settings)
- [ ] User authentication via Convex Auth
- [ ] Settings: language, speaker detection toggle, auto-punctuation, recording quality, export format
- [ ] Auto-save to cloud option
- [ ] Mobile-first responsive PWA (installable)

### Out of Scope

- Desktop-optimized layouts — mobile-first only for v1
- Team/workspace features (shared transcripts, permissions) — personal tool first
- Real-time meeting joining (Zoom/Meet integration) — mic and file upload only
- Offline transcription — requires network for Deepgram and Claude APIs
- Payment/subscription system — free personal tool for now

## Context

- Mockups exist in `pencil-new.pen` covering all 7 screens: Home/Library, Recording, Transcript View, AI Summary, FAB Nav (collapsed/expanded), Settings
- Design uses warm color palette with orange/burnt sienna accents on cream background
- Google Meet-style transcription is the UX reference point — transcription appears in real-time as audio plays
- Deepgram provides real-time streaming transcription with built-in speaker diarization
- Convex provides real-time reactive backend with built-in auth, eliminating need for separate auth provider
- Claude API handles post-recording summarization (overview, key points, action items with assignees)

## Constraints

- **Tech Stack**: Next.js + Convex + Deepgram + Claude API — chosen by user, non-negotiable
- **Platform**: Mobile-first PWA — must work well on mobile browsers and be installable
- **Auth**: Convex Auth — no external auth providers
- **Transcription**: Deepgram streaming API — must support real-time and speaker diarization
- **AI**: Claude API (Anthropic) — for transcript summarization

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Next.js + Convex stack | User preference, Convex provides real-time reactivity and built-in auth | — Pending |
| Deepgram for transcription | Real-time streaming, good diarization, generous free tier | — Pending |
| Claude for AI summaries | User preference for Anthropic's models | — Pending |
| Mobile-first PWA | Mockups are mobile-sized, PWA enables installability | — Pending |
| Full mockup scope for v1 | User wants all mockup features in initial release | — Pending |

---
*Last updated: 2026-02-09 after initialization*
