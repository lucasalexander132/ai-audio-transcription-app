# Project Research Summary

**Project:** AI Audio Transcription PWA
**Domain:** Real-time audio transcription and meeting notes
**Researched:** 2026-02-09
**Confidence:** HIGH

## Executive Summary

This is a real-time audio transcription PWA built with Next.js 16, Convex, Deepgram, and Claude API. The 2026 stack emphasizes mobile-first PWA capabilities, real-time streaming performance, and modern developer experience. The recommended approach uses a **client-orchestrated, server-processed** architecture where browsers manage direct WebSocket connections to Deepgram (via temporary tokens for security) while Convex handles all state management, persistence, and AI summarization.

The market has matured significantly with clear feature tiers. Table stakes features are well-established (real-time transcription, speaker diarization, AI summaries, action items), and competitive differentiation happens through specialized use cases, mobile-first design, and post-processing capabilities. Your mockups hit all table stakes features and include key differentiators: mobile-first PWA design, file upload flexibility, and clean organization features.

**Critical risks center on iOS Safari compatibility issues** (audio format incompatibility, PWA recording bugs, IndexedDB eviction), WebSocket reliability (timeout/reconnection handling), and real-world accuracy degradation (background noise, multiple speakers). These are mitigable through careful testing on physical iOS devices, robust reconnection logic with audio buffering, and setting realistic user expectations about optimal recording conditions.

## Key Findings

### Recommended Stack

The 2026 stack leverages Next.js 16's production-ready Turbopack and React Compiler, Convex's automatic real-time subscriptions, Deepgram's streaming transcription API, and Claude for AI-powered summaries. This combination eliminates the need for separate API layers, manual WebSocket management, and complex state synchronization.

**Core technologies:**

- **Next.js 16.1.6+**: React framework with App Router — latest stable with Turbopack by default, streaming-first architecture ideal for real-time transcription UI
- **React 19.2**: UI library — ships with Next.js 16, includes React Compiler optimizations for performance
- **Convex 1.31.7+**: Real-time backend + database — automatic WebSocket subscriptions, built-in file storage, native real-time reactivity eliminates polling overhead
- **Deepgram SDK 4.11.3+**: Streaming speech-to-text — industry-leading accuracy (<300ms latency), native WebSocket streaming, built-in speaker diarization
- **@anthropic-ai/sdk**: Claude API integration — generate summaries/key points/action items from transcripts with streaming response support
- **Zustand 5.0.11+**: Client state management — lightweight (3KB), minimal boilerplate for transient UI state (recording status, audio levels)
- **Tailwind CSS 4.x + shadcn/ui**: Styling — mobile-first responsive design, accessible components, copy-paste model (no dependency bloat)
- **@serwist/next 9.2.3+**: PWA service worker — modern next-pwa successor, Next.js 16 compatible (optional for MVP; Next.js has built-in manifest support)
- **MediaRecorder API**: Native browser audio recording — zero dependencies, widely supported, produces formats Deepgram accepts directly

**Key architectural decision:** Use native MediaRecorder API instead of AudioWorklet. Deepgram accepts WebM/Opus directly, so AudioWorklet adds complexity with no benefit for this use case.

### Expected Features

**Must have (table stakes):**

- Real-time transcription — 90%+ accuracy expected, core value proposition
- Speaker diarization — multi-speaker scenarios are the norm, expect "Speaker 1", "Speaker 2" labeling
- Audio playback with transcript sync — users need to verify/correct, expect tap-to-seek
- Basic AI summary — manual summarization is outdated, users expect auto-generated overview
- Action item extraction — meetings without follow-up tasks are rare, automatic detection saves time
- File upload/import — not all content is recorded live, need to transcribe existing audio
- Basic search — users need to find past transcripts, baseline expectation
- Export transcript — users need to share/save transcripts outside the app
- Multiple languages — global user base expects native language support
- Mobile recording — in-person meetings happen away from desks, PWA is critical
- Accuracy 90%+ — below 90% requires too much manual correction to be useful

**Should have (competitive differentiators):**

- **PWA/Mobile-first** — no app store friction, works across devices, offline capable (your competitive advantage)
- **Live waveform visualization** — visual feedback during recording, modern UX expectation
- **Starred/favorites** — quick access to important transcripts (present in mockups)
- **Tags/categorization** — organize transcripts beyond chronological (present in mockups)
- **File upload + live recording** — flexibility other tools lack (your advantage)
- Speaker name editing — relabel "Speaker 1" to actual names (missing in mockups)
- Playback speed control — review long recordings faster (likely present)
- Cloud sync — access transcripts across devices (using Convex)

**Defer (v2+):**

- Offline transcription — requires on-device ML models, very high complexity, privacy benefit but not MVP
- Real-time collaborative editing — needs CRDT/OT for multi-user editing, high complexity
- Text-based audio editing — requires audio manipulation like Descript, very high complexity
- Semantic search — needs vector embeddings, different from full-text search
- Video transcription — adds file size/storage complexity
- Sentiment analysis — nice-to-have, not core to transcription use case
- Translation — separate feature from transcription, adds language complexity
- Auto-chapters — improves long transcript UX, add after validating usage patterns

### Architecture Approach

The architecture follows a **client-orchestrated, server-processed** pattern where browsers manage direct WebSocket connections to external services while Convex handles state management, persistence, and AI processing. This achieves sub-300ms transcription latency through direct browser-to-Deepgram streaming while maintaining security through temporary token authentication.

**Major components:**

1. **AudioRecorder (Browser)** — captures mic input via MediaRecorder, chunks into 250ms segments, streams directly to Deepgram WebSocket using temporary tokens from Convex
2. **DeepgramClient (Browser)** — manages WebSocket lifecycle, handles token refresh, implements KeepAlive messages to prevent timeout, emits transcript events
3. **Convex Mutations** — transactional database writes for saving words, sessions, summaries, associating files with sessions (append-only pattern prevents transaction conflicts)
4. **Convex Queries** — real-time subscriptions for transcript display, session lists, search/filter (automatic updates when database changes)
5. **Convex Actions** — external API calls for Claude summarization, Deepgram pre-recorded transcription (for file uploads), temporary token generation
6. **Convex Storage** — stores uploaded audio files, generates upload URLs, serves audio for playback

**Key pattern:** Browser → Deepgram (direct WebSocket) for minimal latency, with security via temporary tokens (30-second TTL). All processing and persistence happens in Convex. Mutations use append-only pattern (create new word documents instead of updating transcript document) to avoid transaction conflicts during high-frequency streaming.

**Data flow for real-time recording:**
```
User speaks → MediaRecorder (250ms chunks) → Deepgram WebSocket
→ Transcript JSON → Convex mutation (saveWord) → Database
→ useQuery subscription → UI updates (400-700ms total latency)
```

### Critical Pitfalls

Based on comprehensive research, these are the top pitfalls that will cause rewrites or major issues:

1. **iOS Safari Audio Format Incompatibility** — MediaRecorder outputs different formats on iOS Safari vs. Chrome/Android. Deepgram accepts WebM/Opus, but must test format compatibility with `MediaRecorder.isTypeSupported()` and handle iOS's limited codec support. Test on physical iOS devices, not just simulators. **Prevention:** Detect supported formats in order of preference, verify entire pipeline accepts chosen format.

2. **Deepgram WebSocket Timeout (NET-0001 Error)** — Deepgram closes connections after 10 seconds of silence. Must implement KeepAlive messages every 5 seconds as text WebSocket frames to prevent disconnection during natural conversation pauses. **Prevention:** Send `{ type: 'KeepAlive' }` every 5 seconds while connection is open.

3. **iOS PWA Audio Recording 44-Byte Bug** — In PWA standalone mode on iOS, audio recording silently fails, saving only a 44-byte empty WAV header. This is a critical WebKit bug. **Prevention:** Validate recorded blob size >1KB before uploading, consider browser-only mode for iOS if unfixable, test extensively on physical devices.

4. **WebSocket Reconnection Audio Loss** — When connections drop (common on mobile), 2-5 seconds of audio is lost during reconnect window. **Prevention:** Buffer last 5 seconds of audio, replay on reconnect with exponential backoff (1s, 2s, 4s, 8s, 20s max).

5. **iOS Safari IndexedDB Data Eviction** — IndexedDB storage is silently deleted after 7 days if PWA isn't used. **Prevention:** Use Convex as source of truth (not IndexedDB), sync immediately not "eventually", show sync status UI ("Synced to cloud ✓").

6. **Real-Time Transcript DOM Thrashing** — Rendering each word/token as it arrives (10-50 DOM updates/sec) freezes UI. **Prevention:** Batch updates (buffer 100-250ms of tokens), use virtual scrolling for long transcripts, memoize components with React.memo().

7. **Speaker Diarization Accuracy Collapse** — Works great with 2 speakers (96-98% accuracy) but degrades with 3+ speakers or background noise (85-90%). **Prevention:** Set user expectations, provide manual speaker label editing in UI.

8. **Mobile Browser Background Tab Suspension** — Audio capture stops when user switches tabs or locks phone. **Prevention:** Detect visibility change and warn user, consider Wake Lock API (limited support), provide clear UI indicator.

## Implications for Roadmap

Based on research dependencies, feature complexity, and pitfall mitigation strategies, here's the recommended phase structure:

### Phase 1: Core Real-Time Recording & Transcription (Foundation)

**Rationale:** Establishes core value proposition with minimal dependencies. Tests Convex reactivity and Deepgram streaming together. Must validate iOS compatibility and WebSocket reliability before building on top.

**Delivers:**
- Working real-time transcription from microphone
- Live transcript display with speaker diarization
- Session management (create, store, list)
- Basic audio playback

**Addresses (table stakes features):**
- Real-time transcription (MediaRecorder → Deepgram)
- Speaker diarization (Deepgram built-in)
- Cloud storage (Convex for transcripts)
- Mobile recording (PWA setup)
- Audio playback (HTML5 audio)

**Avoids (critical pitfalls):**
- iOS Safari format incompatibility (test MediaRecorder.isTypeSupported())
- Deepgram WebSocket timeout (implement KeepAlive from day 1)
- getUserMedia permission UX (never call on load, provide contextual explanation)

**Stack elements used:**
- Next.js 16 (App Router, client components)
- Convex (schema: sessions, words tables; mutations: createSession, saveTranscriptWord)
- Deepgram streaming API (WebSocket connection via temporary tokens)
- MediaRecorder API (native browser recording)
- Zustand (recording state: isRecording, duration)

**Architecture components:**
- AudioRecorder (browser component)
- DeepgramClient (WebSocket management)
- TranscriptView (real-time UI with useQuery subscription)

### Phase 2: File Upload & Batch Transcription

**Rationale:** Builds on Phase 1 foundation. Reuses transcript display UI. Tests Convex storage and Actions with external API calls. Critical for users who can't record live or have existing audio files.

**Delivers:**
- File upload with progress indicators
- Batch transcription of uploaded files
- Support for multiple audio formats
- Error handling for large files

**Addresses (table stakes features):**
- File upload/import
- Multiple audio formats handling

**Avoids (moderate pitfalls):**
- Audio file upload size limits (validate early, show clear limits: max 50MB)
- Convex upload URL expiry (generate immediately before upload)
- Mobile browser memory exhaustion (stream chunks, don't buffer entire file)

**Stack elements used:**
- Convex Storage (file storage, upload URLs)
- Convex Actions (Deepgram pre-recorded API for batch transcription)
- @deepgram/sdk (server-side transcription for uploaded files)

**Architecture components:**
- FileUploader component
- Convex action: transcribeAudioFile
- Convex mutation: saveAudioFile

### Phase 3: Organization & Discovery (Library Features)

**Rationale:** Requires existing sessions/transcripts to be useful. Enhances usability once core transcription works. Adds search, filters, tags for managing multiple transcripts.

**Delivers:**
- Transcript library with search
- Filters (Recent, Starred, tags)
- Full-text search across all transcripts
- Export transcripts (TXT format minimum)

**Addresses (table stakes features):**
- Basic search
- Export transcript

**Addresses (differentiators):**
- Starred/favorites
- Tags/categorization

**Stack elements used:**
- Convex search indexes (full-text search on titles and transcript content)
- Convex queries with filters

**Architecture components:**
- LibraryBrowser component
- Search/filter UI
- Export functionality

### Phase 4: AI Summarization & Intelligence

**Rationale:** Requires complete transcripts (depends on Phase 1/2). Isolated feature that doesn't block other work. Adds high-value differentiation through AI-powered insights.

**Delivers:**
- AI-generated summaries (overview, key points)
- Action item extraction with assignees
- Summary display UI

**Addresses (table stakes features):**
- Basic AI summary
- Action item extraction

**Stack elements used:**
- @anthropic-ai/sdk (Claude API integration)
- Convex Actions (server-side Claude calls for security)

**Architecture components:**
- Convex action: generateSummary
- SummaryPanel component
- Streaming summary display (optional for MVP)

### Phase 5: Reliability & Polish

**Rationale:** After core features work, focus on production-readiness. Address real-world scenarios discovered in testing. Improve UX based on actual usage patterns.

**Delivers:**
- Robust WebSocket reconnection with audio buffering
- DOM performance optimization (batching, virtual scrolling)
- Speaker name editing UI
- Real-world accuracy testing (noisy environments)
- Background tab detection and warnings
- Recording quality indicators

**Avoids (moderate/minor pitfalls):**
- WebSocket reconnection audio loss (buffer + replay)
- DOM thrashing (batch updates, virtual scrolling)
- Speaker diarization accuracy issues (manual editing, set expectations)
- Noisy environment accuracy collapse (quality indicator, test with real audio)
- Mobile browser background tab suspension (visibility detection)
- Convex transaction conflicts (append-only pattern, precise queries)

**Optional (defer to post-MVP):**
- PWA offline support (service worker, IndexedDB buffering, background sync)
- Advanced export formats (SRT, VTT for captions)
- Video transcription

### Phase Ordering Rationale

1. **Phase 1 first** because real-time transcription is the core value proposition and validates the entire stack integration. Must work before building features on top.

2. **Phase 2 before AI summarization** because file upload provides an alternative recording method (critical for users who can't record live) and generates more transcripts for testing summarization.

3. **Phase 3 before Phase 5** because organization features increase user engagement, which helps validate which polish features matter most through actual usage patterns.

4. **Phase 4 (AI) is isolatable** and can run in parallel with Phase 3 if desired. It requires complete transcripts but doesn't block other features.

5. **Phase 5 last** because reliability/polish improvements should be based on real-world testing and user feedback, not premature optimization.

**Dependency chain:**
```
Phase 1 (Foundation) → Phase 2 (File Upload) → Phase 3 (Organization)
                    ↘                        ↗
                      Phase 4 (AI Summary)
                                ↓
                         Phase 5 (Polish)
```

### Research Flags

**Phases with standard patterns (skip /gsd:research-phase):**

- **Phase 1:** Real-time transcription patterns are well-documented in Deepgram and Convex docs. MediaRecorder API is standard. No additional research needed beyond initial stack research.
- **Phase 2:** File upload patterns are standard in Convex docs. Deepgram pre-recorded API is well-documented.
- **Phase 3:** Search/filter patterns are standard Convex query operations. Export to TXT is straightforward.
- **Phase 4:** Claude API integration is well-documented. Summarization prompts are straightforward.

**All phases can proceed with existing research.** No phase requires deep additional research during planning.

**Testing focus areas by phase:**
- **Phase 1:** Critical iOS Safari testing on physical devices (format compatibility, PWA recording bug)
- **Phase 2:** Large file handling, format conversion testing
- **Phase 3:** Search performance with large transcript databases
- **Phase 4:** Prompt engineering for optimal summary quality
- **Phase 5:** Real-world mobile network testing, noisy environment testing

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All versions verified as of Feb 2026, official docs consulted, proven integrations |
| Features | HIGH | Comprehensive competitive analysis of 15+ transcription tools, clear market expectations |
| Architecture | HIGH | Verified patterns from Deepgram and Convex official docs, latency estimates are realistic |
| Pitfalls | MEDIUM | iOS-specific issues verified from multiple sources, but require physical device testing; real-world accuracy depends on use cases |

**Overall confidence:** HIGH

### Gaps to Address

**During Phase 1 planning:**
- **iOS device testing strategy**: Need access to physical iPhone devices (not simulators) for format compatibility and PWA recording bug validation. Recommend testing on iPhone 12+, iOS 16+.
- **Deepgram pricing/limits**: Verify concurrent connection limits and upgrade path for scaling. Free tier may limit concurrent streams.

**During Phase 2 planning:**
- **Audio format conversion**: If iOS Safari produces incompatible formats, may need server-side FFmpeg transcoding. Research FFmpeg integration with Convex Actions (may hit 10-minute timeout for large files).

**During Phase 4 planning:**
- **Claude prompt optimization**: Initial prompts for summary/action items may need iteration based on transcript quality. Budget time for prompt engineering.

**During Phase 5 planning:**
- **Background sync implementation**: If implementing offline support, IndexedDB patterns need careful design to avoid iOS eviction issues. Consider using Convex's client SDK cache instead.

**Overall:** Most gaps are implementation details rather than architectural unknowns. The stack choices are validated and well-documented. Primary unknowns are iOS-specific behavior that requires physical device testing.

## Sources

### Primary Sources (HIGH confidence)

**Stack & Technology:**
- [Next.js 16 Release Notes](https://nextjs.org/blog/next-16) — verified versions and features
- [Next.js PWA Guide](https://nextjs.org/docs/app/guides/progressive-web-apps) — built-in manifest support
- [Convex Documentation](https://docs.convex.dev/) — real-time patterns, file storage, actions
- [Deepgram Streaming API](https://developers.deepgram.com/reference/speech-to-text/listen-streaming) — WebSocket streaming, token auth
- [Deepgram JavaScript SDK](https://developers.deepgram.com/docs/js-sdk) — v4 API reference
- [Anthropic API Documentation](https://platform.claude.com/docs) — Claude integration patterns
- [MDN MediaRecorder API](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder) — browser audio recording
- [Zustand Documentation](https://zustand.docs.pmnd.rs/) — state management patterns
- [shadcn/ui Tailwind v4 Guide](https://ui.shadcn.com/docs/tailwind-v4) — component library setup

**Architecture:**
- [Convex Actions](https://docs.convex.dev/functions/actions) — external API integration patterns
- [Convex Realtime](https://docs.convex.dev/realtime) — subscription patterns
- [Convex File Storage](https://docs.convex.dev/file-storage) — upload/download patterns
- [Deepgram Token Auth](https://developers.deepgram.com/guides/fundamentals/token-based-authentication) — temporary token security
- [Deepgram Browser Live Transcription](https://deepgram.com/learn/live-transcription-mic-browser) — WebSocket setup
- [Optimize Transaction Throughput with Convex](https://stack.convex.dev/high-throughput-mutations-via-precise-queries) — append-only pattern

**Features & Competitive Analysis:**
- [Otter.ai Features 2026](https://otter.ai/features) — market leader feature set
- [Best Speech-to-Text APIs 2026](https://deepgram.com/learn/best-speech-to-text-apis-2026) — comparison
- [14 Best Voice to Text Apps 2026](https://voicetonotes.ai/blog/best-voice-to-text-app-android-iphone/) — mobile focus
- [Transcription App Competitive Features](https://www.taption.com/blog/en/ai-transcribing-tool-review-en) — feature comparison
- [AI Meeting Summary Tools 2026](https://fellow.ai/blog/ai-meeting-summary-tools/) — summary features

### Secondary Sources (MEDIUM confidence)

**Pitfalls & Best Practices:**
- [How to Implement MediaRecorder with iPhone Safari Support](https://www.buildwithmatija.com/blog/iphone-safari-mediarecorder-audio-recording-transcription) — iOS format issues
- [Deepgram Audio Keep Alive](https://developers.deepgram.com/docs/audio-keep-alive) — KeepAlive implementation
- [PWA iOS Limitations and Safari Support](https://www.magicbell.com/blog/pwa-ios-limitations-safari-support-complete-guide) — iOS PWA issues
- [WebSocket Reconnection Logic](https://oneuptime.com/blog/post/2026-01-24-websocket-reconnection-logic/view) — reconnection patterns
- [PWA Offline Data](https://web.dev/learn/pwa/offline-data) — IndexedDB eviction
- [Best Speaker Diarization Models 2026](https://brasstranscripts.com/blog/speaker-diarization-models-comparison) — accuracy benchmarks
- [Real-time Transcription Guide 2026](https://picovoice.ai/blog/complete-guide-to-streaming-speech-to-text/) — latency optimization
- [Virtual Scrolling in React](https://blog.logrocket.com/virtual-scrolling-core-principles-and-basic-implementation-in-react/) — performance optimization

**Quality & Accuracy:**
- [How Accurate Is AI Transcription in 2026?](https://gotranscript.com/en/blog/ai-transcription-accuracy-benchmarks-2026) — accuracy benchmarks
- [What is Speaker Diarization?](https://www.assemblyai.com/blog/what-is-speaker-diarization-and-how-does-it-work) — technical overview

---

*Research completed: 2026-02-09*
*Ready for roadmap: Yes*
