# Transcripts

## What This Is

A mobile-first PWA for real-time audio transcription with AI-powered summaries. Users record audio via microphone or upload files, get live speaker-attributed transcripts via Deepgram, and generate AI summaries (overview, key points, action items) via Claude. Built as a personal tool that others can use independently.

## Core Value

Real-time audio transcription with intelligent AI summaries — record anything, get a searchable, actionable transcript instantly.

## Requirements

### Validated

- Record audio via microphone with live waveform — v1.0
- Upload audio files (MP3, WAV, M4A, WebM) for transcription — v1.0
- Real-time speech-to-text via Deepgram with speaker diarization — v1.0
- Rename speaker labels inline — v1.0
- Audio playback with seek and speed controls (1x, 1.5x, 2x) — v1.0
- AI summaries with overview, key points, action items via Claude — v1.0
- Transcript library with search, filter tabs, starring, tags — v1.0
- Export transcripts as PDF or TXT — v1.0
- Convex Auth with persistent sessions — v1.0
- Language selection and auto-punctuation settings — v1.0
- Installable PWA with FAB navigation — v1.0

### Active

(None — v1.0 complete. Define new requirements with `/gsd:new-milestone`)

### Out of Scope

- Desktop-optimized layouts — mobile-first only for v1
- Team/workspace features (shared transcripts, permissions) — personal tool first
- Real-time meeting joining (Zoom/Meet integration) — mic and file upload only
- Offline transcription — requires network for Deepgram and Claude APIs
- Payment/subscription system — free personal tool for now

## Context

Shipped v1.0 with 8,586 LOC TypeScript across 84 files.

**Tech stack:** Next.js 15, Convex (auth + real-time backend), Deepgram Nova-2 (transcription), Claude haiku-4-5 (AI summaries), Zustand (state), Tailwind CSS, jsPDF (export)

**Design:** Warm cream (#FFF9F0) background with burnt sienna (#D2691E) accents. Mobile-first with FAB navigation. Mockups in `pencil-new.pen`.

**External services requiring API keys:**
- Deepgram: `npx convex env set DEEPGRAM_API_KEY <key>`
- Anthropic: `npx convex env set ANTHROPIC_API_KEY <key>`

**Known considerations:**
- Physical iOS device testing still recommended (simulators insufficient for audio)
- Existing transcripts before Phase 3 lack fullText (search only finds newer transcripts)

## Constraints

- **Tech Stack**: Next.js + Convex + Deepgram + Claude API — chosen by user, non-negotiable
- **Platform**: Mobile-first PWA — must work well on mobile browsers and be installable
- **Auth**: Convex Auth — no external auth providers
- **Transcription**: Deepgram streaming API — must support real-time and speaker diarization
- **AI**: Claude API (Anthropic) — for transcript summarization

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Next.js + Convex stack | User preference, Convex provides real-time reactivity and built-in auth | Good |
| Deepgram for transcription | Real-time streaming, good diarization, generous free tier | Good |
| Claude haiku-4-5 for AI summaries | Cost-effective, fast, sufficient quality for summarization | Good |
| Mobile-first PWA | Mockups are mobile-sized, PWA enables installability | Good |
| Deepgram REST API (not WebSocket) | Simpler chunk-based approach, no KeepAlive needed | Good — slightly higher latency (~2s) but more reliable |
| Convex actions as API proxy | Keep Deepgram/Anthropic API keys server-side | Good — keys never exposed to browser |
| Zustand for recording state | Lightweight shared state across components | Good |
| MediaRecorder MIME fallback chain | iOS Safari limited format support | Good — automatic cross-browser compatibility |
| HTML5 Audio for playback | No third-party player needed, full control | Good |
| Junction table for tags | Many-to-many enables tag reuse, rename, query | Good |
| Lazy-load jsPDF | Avoid ~200KB bundle for infrequent export | Good |
| Web Share API first, download fallback | iOS Safari lacks file download | Good |
| Prompt-based JSON from Claude | Simpler than structured outputs SDK | Good — strip markdown fences as safety net |
| buildDeepgramUrl helper | Centralized URL construction from user settings | Good |

---
*Last updated: 2026-02-10 after v1.0 milestone*
