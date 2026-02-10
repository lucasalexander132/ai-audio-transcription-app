# Technology Stack

**Project:** AI Audio Transcription PWA
**Researched:** February 9, 2026
**Overall Confidence:** HIGH

## Executive Summary

The 2025/2026 stack for a real-time audio transcription PWA leverages Next.js 16 (latest stable with Turbopack), Convex for real-time backend, Deepgram for streaming transcription, and Claude API for AI summaries. This stack prioritizes mobile-first PWA capabilities, real-time streaming performance, and modern developer experience.

---

## Core Framework

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Next.js | 16.1.6+ | React framework with App Router | Latest stable (Feb 2026) with Turbopack by default, React Compiler stable, superior PWA support via App Router, streaming-first architecture ideal for real-time transcription UI | HIGH |
| React | 19.2 | UI library | Ships with Next.js 16, includes React Compiler optimizations | HIGH |
| TypeScript | 5.9.3 | Type safety | Latest stable with ECMAScript deferred module evaluation, ~20% faster compilation | HIGH |

**Rationale:**
- Next.js 16 was released in late 2025 with production-ready Turbopack and React Compiler support
- App Router's streaming capabilities align perfectly with real-time transcription UX
- Turbopack provides significantly faster dev/build times compared to Webpack
- React 19.2 includes performance improvements critical for handling live audio streams

**Installation:**
```bash
npx create-next-app@latest --typescript
npm install next@latest react@latest react-dom@latest
```

---

## Backend & Real-Time Data

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Convex | 1.31.7+ | Real-time backend + database | Automatic WebSocket subscriptions, built-in real-time reactivity, native file storage for audio, integrated auth via Convex Auth, eliminates need for separate API layer | HIGH |
| Convex Auth | beta | Authentication | Native integration with Convex, supports OAuth + magic links, server-side auth in Next.js App Router | MEDIUM |

**Rationale:**
- Convex's automatic dependency tracking means transcription updates propagate to all connected clients instantly
- File storage built-in with unlimited file size support via upload URLs (critical for audio files)
- WebSocket-based real-time subscriptions eliminate polling overhead
- Query functions automatically rerun when dependencies change, perfect for updating transcription state
- Convex Auth beta has stable Next.js server-side integration patterns

**Key Patterns for Real-Time Transcription:**
1. Store transcription segments in Convex database as they arrive
2. Client subscriptions automatically update UI when new segments added
3. File storage handles both recorded audio and uploaded files
4. Server-side mutations coordinate Deepgram WebSocket lifecycle

**Installation:**
```bash
npm install convex
npx convex dev
```

**Sources:**
- [Convex Real-Time Documentation](https://docs.convex.dev/realtime)
- [Convex File Storage](https://docs.convex.dev/file-storage)
- [Convex Auth for Next.js](https://labs.convex.dev/auth/authz/nextjs)

---

## Audio Transcription

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| @deepgram/sdk | 4.11.3+ | Streaming speech-to-text | Industry-leading accuracy, native WebSocket streaming API, speaker diarization built-in, live transcription with <300ms latency | HIGH |

**Rationale:**
- Deepgram's streaming API uses WebSockets for full-duplex communication (send audio while receiving transcripts)
- JavaScript SDK v3+ has modern async/await API with automatic connection management
- Speaker diarization differentiates speakers without training
- Handles keep-alive automatically via SDK (eliminates manual ping/pong)
- Browser-to-Deepgram direct connection possible, but server-side proxy via Convex recommended for API key security

**Implementation Pattern:**
```typescript
// Server-side Convex action (recommended)
import { Deepgram } from '@deepgram/sdk';

// Proxy WebSocket connection through Convex
// Send audio chunks from client → Convex action → Deepgram
// Receive transcripts Deepgram → Convex mutation → Client subscription
```

**Key Features to Use:**
- `model: "nova-2"` (latest, best accuracy)
- `diarize: true` (speaker attribution)
- `punctuate: true` (readable transcripts)
- `interim_results: true` (show partial results while speaking)

**Installation:**
```bash
npm install @deepgram/sdk
```

**Sources:**
- [Deepgram Streaming API Documentation](https://developers.deepgram.com/reference/speech-to-text/listen-streaming)
- [Deepgram JavaScript SDK](https://developers.deepgram.com/docs/js-sdk)
- [Deepgram WebSocket Implementation Guide](https://developers.deepgram.com/docs/lower-level-websockets)

---

## AI Summarization

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| @anthropic-ai/sdk | latest | Claude API integration | Generate summaries/key points/action items from transcripts, official TypeScript SDK, streaming response support | HIGH |

**Rationale:**
- Claude API excels at structured text analysis (summaries, key points, action items)
- Official SDK handles streaming responses (show summary as it generates)
- TypeScript-first with excellent type definitions
- Can call from Convex actions (server-side) to keep API key secure

**Implementation Pattern:**
```typescript
// Convex action for AI summary generation
export const generateSummary = action({
  args: { transcriptId: v.id('transcripts') },
  handler: async (ctx, args) => {
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    // Stream summary back to client via Convex mutation updates
    const stream = await anthropic.messages.stream({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 1024,
      messages: [{ role: 'user', content: transcript }],
    });

    // Store summary chunks as they arrive
  },
});
```

**Installation:**
```bash
npm install @anthropic-ai/sdk
```

**Sources:**
- [Anthropic API Documentation](https://platform.claude.com/docs)
- [Anthropic SDK TypeScript](https://github.com/anthropics/anthropic-sdk-typescript)

---

## PWA Infrastructure

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| @serwist/next | 9.2.3+ | Service worker generation | Modern next-pwa successor, Next.js 16 compatible, zero-config PWA setup, active maintenance (last update Jan 2026) | HIGH |
| next/pwa (built-in) | - | Manifest generation | Next.js 16 has built-in manifest.ts/manifest.json support via App Router | HIGH |

**Rationale:**
- Original `next-pwa` package is deprecated (3+ years unmaintained)
- Serwist is the actively maintained fork, designed for Next.js 14-16
- Next.js 16 App Router provides native manifest file generation
- For advanced offline caching, Serwist adds service worker capabilities
- For basic PWA (installability + manifest), use Next.js built-in features

**Two Approaches:**

### Approach A: Minimal (Recommended for MVP)
Use Next.js built-in PWA support without additional packages:

```typescript
// app/manifest.ts
import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'AI Transcription',
    short_name: 'Transcribe',
    description: 'Real-time audio transcription with AI summaries',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#000000',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  };
}
```

Add to `app/layout.tsx`:
```typescript
export const metadata = {
  manifest: '/manifest.webmanifest',
  themeColor: '#000000',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'AI Transcription',
  },
};
```

### Approach B: Advanced (With Offline Support)
Add Serwist for service worker and offline caching:

```bash
npm install @serwist/next
```

Configure in `next.config.mjs`:
```javascript
import withSerwistInit from '@serwist/next';

const withSerwist = withSerwistInit({
  swSrc: 'app/sw.ts',
  swDest: 'public/sw.js',
});

export default withSerwist({
  // Next.js config
});
```

**Recommendation:** Start with Approach A (built-in). Add Serwist later only if offline audio playback needed.

**Mobile Install Prompts:**
- Android: Automatic prompt when PWA criteria met (HTTPS + manifest + service worker)
- iOS: No automatic prompt - must educate users to use "Add to Home Screen" from Safari share menu
- Consider library like `react-pwa-install-prompt` for custom iOS instructions

**Sources:**
- [Next.js PWA Guide](https://nextjs.org/docs/app/guides/progressive-web-apps)
- [Serwist Next.js Integration](https://serwist.pages.dev/docs/next/getting-started)
- [PWA Installation Best Practices](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable)

---

## Audio Recording & Processing

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| MediaRecorder API | Native | Browser audio recording | Native Web API, zero dependencies, widely supported, produces opus/webm that Deepgram accepts | HIGH |
| Web Audio API (AudioWorklet) | Native | Advanced audio processing | Use ONLY if need PCM conversion or audio preprocessing. MediaRecorder sufficient for most cases | MEDIUM |
| react-media-recorder | 1.7.2 | Optional React wrapper | Convenience hooks for MediaRecorder, NOT required but simplifies state management | MEDIUM |

**Rationale:**
- **MediaRecorder API is sufficient for this use case** - No need for lower-level AudioWorklet
- Deepgram accepts WebM/Opus audio directly (most common MediaRecorder output format)
- MediaRecorder is simpler, more reliable, and has less overhead than AudioWorklet
- AudioWorklet is only needed if you require raw PCM audio or real-time audio processing/visualization
- react-media-recorder adds convenience but is optional (can build custom hook easily)

**MediaRecorder Implementation (Recommended):**

```typescript
// Custom hook without dependencies
export function useAudioRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1, // Mono
        sampleRate: 16000, // Deepgram optimal
        echoCancellation: true,
        noiseSuppression: true,
      }
    });

    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'audio/webm;codecs=opus', // Deepgram compatible
    });

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunksRef.current.push(event.data);
        // Send chunk to Convex → Deepgram
      }
    };

    mediaRecorder.start(1000); // Emit chunks every 1 second
    mediaRecorderRef.current = mediaRecorder;
    setIsRecording(true);
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  return { isRecording, startRecording, stopRecording };
}
```

**MIME Type Priority (check support):**
1. `audio/webm;codecs=opus` (best compression, Deepgram native support)
2. `audio/webm` (fallback)
3. `audio/ogg;codecs=opus` (Firefox)
4. `audio/mp4` (Safari fallback)

Always use `MediaRecorder.isTypeSupported()` before selecting MIME type.

**When to Use AudioWorklet:**
- Need to visualize waveforms in real-time (frequency analysis)
- Require PCM audio for non-Deepgram processing
- Need sample-level audio manipulation

**For this project: MediaRecorder is sufficient. Avoid AudioWorklet complexity.**

**Installation (optional wrapper):**
```bash
npm install react-media-recorder  # OPTIONAL
```

**Sources:**
- [MDN MediaRecorder API](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder)
- [MDN MediaRecorder Guide](https://developer.mozilla.org/en-US/docs/Web/API/MediaStream_Recording_API/Using_the_MediaStream_Recording_API)
- [MediaRecorder vs AudioWorklet Comparison](https://medium.com/@tihomir.manushev/how-browsers-handle-audio-streams-mediarecorder-vs-web-audio-api-72553933a3a2)

---

## State Management

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Zustand | 5.0.11+ | Client state management | Lightweight (3KB), minimal boilerplate, perfect for audio recorder state, works seamlessly with Convex subscriptions | HIGH |
| React Context | Native | Auth state, theme | Sufficient for global config, avoid for frequently changing state | HIGH |

**Rationale:**
- Convex handles server state (transcripts, summaries, files)
- Zustand handles transient client state (recording status, audio levels, UI toggles)
- Tiny bundle size (3KB) critical for mobile PWA
- No provider boilerplate, just create store and use
- Fine-grained reactivity prevents unnecessary rerenders

**Use Cases by Tool:**

| State Type | Tool | Example |
|------------|------|---------|
| Transcription data | Convex subscriptions | `useQuery(api.transcripts.get)` |
| Recording status | Zustand | `isRecording`, `audioLevel`, `duration` |
| User auth state | Convex Auth + Context | `useAuth()` |
| UI preferences | Zustand | `theme`, `fontSize`, `showTimestamps` |

**Zustand Example:**

```typescript
import { create } from 'zustand';

interface RecorderState {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  startRecording: () => void;
  stopRecording: () => void;
  pauseRecording: () => void;
}

export const useRecorderStore = create<RecorderState>((set) => ({
  isRecording: false,
  isPaused: false,
  duration: 0,
  startRecording: () => set({ isRecording: true }),
  stopRecording: () => set({ isRecording: false, duration: 0 }),
  pauseRecording: () => set({ isPaused: true }),
}));
```

**Why NOT Jotai:**
- Jotai's atom-based approach is overkill for simple recording state
- Zustand's global store model is more intuitive for this use case
- Zustand has better TypeScript DX with less boilerplate

**Why NOT Redux:**
- Redux is excessive for small-to-medium PWA
- Convex already handles complex state synchronization
- Zustand provides 90% of Redux benefits with 10% of the code

**Installation:**
```bash
npm install zustand
```

**Sources:**
- [Zustand Documentation](https://zustand.docs.pmnd.rs/)
- [State Management in 2025 Comparison](https://dev.to/hijazi313/state-management-in-2025-when-to-use-context-redux-zustand-or-jotai-2d2k)

---

## UI & Styling

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Tailwind CSS | 4.x | Utility-first styling | Latest major version (CSS-first config), mobile-first responsive design, excellent Next.js integration | HIGH |
| shadcn/ui | latest | Component library | Updated for Tailwind v4 + React 19, accessible components, copy-paste (not dependency), used by Netflix/OpenAI | HIGH |
| tw-animate-css | latest | Animations | Replaces deprecated tailwindcss-animate, required by shadcn/ui for Tailwind v4 | HIGH |

**Rationale:**
- Tailwind v4 moved to CSS-first configuration (no more `tailwind.config.js`)
- shadcn/ui provides production-ready components without dependency bloat
- All components are accessible (WCAG compliant) out of the box
- Copy-paste model means you control the code
- Mobile-first utility classes ideal for PWA development

**Tailwind v4 Setup:**

```css
/* app/globals.css */
@import 'tailwindcss';

@theme {
  --color-primary: #000000;
  --color-secondary: #666666;
  /* Custom theme variables */
}
```

**shadcn/ui Installation:**

```bash
npx shadcn@latest init
```

The CLI now supports Tailwind v4 initialization and will configure `tw-animate-css` automatically.

**Key Components for Audio App:**
- Button, Card, Dialog (core UI)
- Progress (recording duration)
- Slider (audio playback controls)
- Toast (notifications)
- Skeleton (loading states for transcripts)
- Tabs (switch between recordings, summaries)

**Mobile Considerations:**
- All shadcn/ui components are touch-friendly
- Use `touch-action` utilities for custom gestures
- Tailwind's responsive prefixes (`sm:`, `md:`) for breakpoints

**Installation:**
```bash
npm install -D tailwindcss@next postcss autoprefixer
npx tailwindcss init -p
npx shadcn@latest init
npx shadcn@latest add button card dialog progress slider toast skeleton tabs
```

**Sources:**
- [shadcn/ui Tailwind v4 Guide](https://ui.shadcn.com/docs/tailwind-v4)
- [Tailwind CSS v4 Documentation](https://tailwindcss.com/)
- [shadcn/ui Component Library](https://ui.shadcn.com/)

---

## Development Tools

| Tool | Version | Purpose | Why | Confidence |
|------|---------|---------|-----|------------|
| ESLint | 9.x | Linting | Next.js 16 ships with ESLint v9, App Router-aware rules | HIGH |
| Prettier | latest | Code formatting | Standard formatter, Tailwind plugin for class sorting | HIGH |
| Playwright | latest | E2E testing | Better PWA testing than Cypress, can test audio APIs | MEDIUM |

**Installation:**
```bash
npm install -D prettier prettier-plugin-tailwindcss
npm install -D @playwright/test
```

---

## Environment & Deployment

| Technology | Purpose | Why | Confidence |
|-----------|---------|-----|------------|
| Vercel | Hosting | Built by Next.js creators, zero-config Next.js 16 deployment, global edge network | HIGH |
| Convex | Backend hosting | Hosted by Convex (included in Convex plan) | HIGH |

**Environment Variables (`.env.local`):**
```bash
# Convex
CONVEX_DEPLOYMENT=

# Deepgram
DEEPGRAM_API_KEY=

# Anthropic
ANTHROPIC_API_KEY=

# Convex Auth (if using)
AUTH_PRIVATE_KEY=
```

**Vercel Deployment:**
```bash
npm install -g vercel
vercel
```

Next.js 16's Turbopack ensures fast builds on Vercel. No additional config needed.

---

## Alternative Stacks Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Framework | Next.js 16 | Remix, Astro | Remix lacks PWA tooling maturity; Astro is static-first, not ideal for real-time apps |
| Backend | Convex | Supabase, Firebase | Supabase requires manual WebSocket setup; Firebase real-time DB has worse TypeScript DX |
| PWA Tooling | @serwist/next | @ducanh2912/next-pwa | Serwist is the actively maintained successor |
| Audio Recording | MediaRecorder API | AudioWorklet | AudioWorklet is complex overkill unless need raw PCM processing |
| State Management | Zustand | Jotai, Redux | Jotai is over-engineered for this use case; Redux is verbose |
| Transcription | Deepgram | AssemblyAI, Whisper | AssemblyAI lacks WebSocket streaming; Whisper requires self-hosting GPU infra |
| Styling | Tailwind v4 | CSS Modules, Emotion | CSS Modules lack utility-first DX; Emotion adds runtime overhead to PWA |

---

## Installation Summary

**Core Dependencies:**
```bash
# Create Next.js 16 app
npx create-next-app@latest my-transcription-app --typescript

# Backend & real-time
npm install convex

# Audio transcription
npm install @deepgram/sdk

# AI summaries
npm install @anthropic-ai/sdk

# State management
npm install zustand

# UI & styling (already included in create-next-app with Tailwind option)
npx shadcn@latest init
npx shadcn@latest add button card dialog progress slider toast skeleton tabs

# PWA (optional, for offline support)
npm install @serwist/next
```

**Dev Dependencies:**
```bash
npm install -D prettier prettier-plugin-tailwindcss
npm install -D @playwright/test
```

---

## Key Architectural Decisions

### 1. MediaRecorder over AudioWorklet
**Decision:** Use native MediaRecorder API, not AudioWorklet
**Rationale:** Deepgram accepts WebM/Opus directly. AudioWorklet adds complexity (separate worker thread, manual PCM processing) with no benefit for this use case.

### 2. Server-Side Audio Proxying
**Decision:** Proxy Deepgram WebSocket through Convex actions
**Rationale:** Keep Deepgram API key server-side. Convex actions can maintain WebSocket connection and forward chunks bidirectionally.

### 3. Built-in PWA over Serwist (MVP)
**Decision:** Use Next.js 16 built-in manifest.ts for MVP
**Rationale:** Serwist adds service worker complexity. For installability alone, Next.js built-in is sufficient. Add Serwist later if offline playback required.

### 4. Zustand over Context for Recording State
**Decision:** Zustand for transient UI state (recording status, timers)
**Rationale:** React Context causes full subtree rerenders. Zustand provides granular subscriptions, critical for real-time audio level updates.

### 5. shadcn/ui over Headless UI Libraries
**Decision:** shadcn/ui copy-paste components
**Rationale:** No dependency lock-in. Components are yours to modify. Accessible by default. Tailwind v4 compatible.

---

## Version Verification

All versions verified as of February 9, 2026:

- Next.js: 16.1.6 (latest stable)
- React: 19.2 (ships with Next.js 16)
- TypeScript: 5.9.3 (latest)
- Convex: 1.31.7 (published Feb 2026)
- @deepgram/sdk: 4.11.3 (published Dec 2025)
- @anthropic-ai/sdk: latest (active development)
- @serwist/next: 9.2.3 (published Jan 2026)
- Zustand: 5.0.11 (published Feb 2026)
- Tailwind CSS: 4.x (latest major)
- shadcn/ui: Updated for Tailwind v4 (Jan 2026)

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Framework (Next.js 16) | HIGH | Official stable release, widely adopted, excellent docs |
| Backend (Convex) | HIGH | Production-ready, excellent Next.js integration, proven real-time capabilities |
| Audio APIs (MediaRecorder) | HIGH | Native browser API, well-documented, widely supported (95%+ browsers) |
| Transcription (Deepgram) | HIGH | Industry standard, official SDK, comprehensive documentation |
| PWA Tooling | HIGH | Next.js built-in support stable; Serwist actively maintained |
| State Management | HIGH | Zustand is mature and widely adopted in production apps |
| UI Library | HIGH | shadcn/ui production-proven, Tailwind v4 stable |
| Convex Auth | MEDIUM | Beta status but Next.js patterns are stable and documented |

---

## Sources

**Official Documentation:**
- [Next.js 16 Release Notes](https://nextjs.org/blog/next-16)
- [Next.js PWA Guide](https://nextjs.org/docs/app/guides/progressive-web-apps)
- [Convex Documentation](https://docs.convex.dev/)
- [Deepgram API Reference](https://developers.deepgram.com/)
- [Anthropic API Documentation](https://platform.claude.com/docs)
- [MDN MediaRecorder API](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder)
- [Zustand Documentation](https://zustand.docs.pmnd.rs/)
- [shadcn/ui Documentation](https://ui.shadcn.com/)
- [Tailwind CSS v4 Documentation](https://tailwindcss.com/)

**Key Articles & Guides:**
- [Next.js App Router Streaming Patterns 2026](https://medium.com/@beenakumawat002/next-js-app-router-advanced-patterns-for-2026-server-actions-ppr-streaming-edge-first-b76b1b3dcac7)
- [Deepgram JavaScript SDK v3 Migration](https://developers.deepgram.com/docs/js-sdk-v2-to-v3-migration-guide)
- [Serwist Next.js Integration](https://serwist.pages.dev/docs/next/getting-started)
- [MediaRecorder vs Web Audio API](https://medium.com/@tihomir.manushev/how-browsers-handle-audio-streams-mediarecorder-vs-web-audio-api-72553933a3a2)
- [State Management in 2025 Comparison](https://dev.to/hijazi313/state-management-in-2025-when-to-use-context-redux-zustand-or-jotai-2d2k)
- [shadcn/ui Tailwind v4 Support](https://ui.shadcn.com/docs/tailwind-v4)

**Package Registries:**
- [next on npm](https://www.npmjs.com/package/next)
- [convex on npm](https://www.npmjs.com/package/convex)
- [@deepgram/sdk on npm](https://www.npmjs.com/package/@deepgram/sdk)
- [@anthropic-ai/sdk on npm](https://www.npmjs.com/package/@anthropic-ai/sdk)
- [@serwist/next on npm](https://www.npmjs.com/package/@serwist/next)
- [zustand on npm](https://www.npmjs.com/package/zustand)
