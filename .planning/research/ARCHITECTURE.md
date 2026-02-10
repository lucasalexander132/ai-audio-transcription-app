# Architecture Patterns: Real-Time Audio Transcription PWA

**Domain:** Real-time audio transcription web application
**Stack:** Next.js (App Router) + Convex + Deepgram + Claude API
**Researched:** 2026-02-09
**Overall confidence:** HIGH

## Executive Summary

A Next.js + Convex real-time audio transcription app follows a **client-orchestrated, server-processed** architecture where the browser manages WebSocket connections to external services while Convex handles state management, persistence, and AI processing. The key architectural insight: **audio streaming happens client-to-Deepgram directly** (with temporary tokens), while **all AI logic and database operations live in Convex**.

This architecture achieves sub-300ms transcription latency through direct browser-to-Deepgram WebSocket streaming while maintaining security through temporary token authentication and backend-controlled summarization.

## Recommended Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Browser (PWA)                             │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Next.js Client Components ("use client")                │   │
│  │                                                           │   │
│  │  ┌─────────────────┐     ┌──────────────────┐           │   │
│  │  │ AudioRecorder   │────▶│ DeepgramClient   │           │   │
│  │  │ Component       │     │ (WebSocket)      │           │   │
│  │  └─────────────────┘     └──────────────────┘           │   │
│  │         │                         │                      │   │
│  │         │ MediaRecorder           │ WSS direct           │   │
│  │         │ chunks (250ms)          │ connection           │   │
│  │         ▼                         │                      │   │
│  │  ┌─────────────────┐              │                      │   │
│  │  │ TranscriptView  │              │                      │   │
│  │  │ (Real-time UI)  │              │                      │   │
│  │  └─────────────────┘              │                      │   │
│  │         │                         │                      │   │
│  │         │ useQuery()              │                      │   │
│  │         │ subscription            │                      │   │
│  └─────────┼─────────────────────────┼──────────────────────┘   │
│            │                         │                          │
│            │ WebSocket               │                          │
│            │ (Convex)                │                          │
└────────────┼─────────────────────────┼──────────────────────────┘
             │                         │
             ▼                         ▼
    ┌────────────────────┐    ┌────────────────────┐
    │   Convex Backend   │    │  Deepgram API      │
    │                    │    │  (wss://api.       │
    │  ┌──────────────┐  │    │   deepgram.com)    │
    │  │  Mutations   │  │    │                    │
    │  │  - saveWord  │  │    │  Streaming STT     │
    │  │  - saveFile  │  │    │  - Real-time       │
    │  └──────────────┘  │    │  - Pre-recorded    │
    │                    │    └────────────────────┘
    │  ┌──────────────┐  │
    │  │  Queries     │  │    ┌────────────────────┐
    │  │  - getWords  │  │    │  Claude API        │
    │  │  - getList   │  │    │  (api.anthropic.   │
    │  └──────────────┘  │    │   com)             │
    │         ▲          │    │                    │
    │         │          │    │  Summarization     │
    │         │ runQuery│    │  - Overview        │
    │  ┌──────────────┐  │    │  - Key Points      │
    │  │  Actions     │  │    │  - Action Items    │
    │  │  - summarize │──┼───▶│                    │
    │  │  - transc... │  │    └────────────────────┘
    │  └──────────────┘  │
    │         │          │
    │  ┌──────────────┐  │
    │  │  Database    │  │
    │  │  - sessions  │  │
    │  │  - words     │  │
    │  │  - summaries │  │
    │  └──────────────┘  │
    │                    │
    │  ┌──────────────┐  │
    │  │  Storage     │  │
    │  │  - audioFiles│  │
    │  └──────────────┘  │
    └────────────────────┘
```

## Component Boundaries

### 1. Browser Layer (Next.js Client Components)

| Component | Responsibility | State Management |
|-----------|---------------|------------------|
| **AudioRecorder** | Capture mic input via MediaRecorder, chunk into 250ms segments, stream to Deepgram WebSocket | Local state: recording status, MediaStream, WebSocket connection |
| **FileUploader** | Accept audio file uploads, generate Convex upload URL, POST file to Convex storage | Local state: upload progress, file metadata |
| **TranscriptView** | Display real-time transcript words as they arrive, show confidence scores, handle final vs partial | Convex useQuery subscription to `words` table |
| **SummaryPanel** | Trigger AI summary generation, display results (overview, key points, actions) | Convex useQuery subscription to `summaries` table |
| **LibraryBrowser** | List all sessions, filter/search, navigate to detail view | Convex useQuery with filters |
| **DeepgramClient** | Manage WebSocket lifecycle, handle token refresh, emit transcript events | Local state: connection status, token expiry |

**Key Pattern:** Client components are "thin" - they handle UI state and orchestrate flows but delegate all persistence and AI processing to Convex.

### 2. Convex Backend Layer

| Function Type | Responsibility | External Calls |
|---------------|---------------|----------------|
| **Mutations** | Transactional database writes - save words, sessions, summaries, associate files with sessions | None (pure DB operations) |
| **Queries** | Read data for UI - fetch transcripts, list sessions, search, filter | None (pure DB reads) |
| **Actions** | External API calls - Claude summarization, Deepgram pre-recorded transcription, token generation | Claude API, Deepgram API |
| **HTTP Actions** | REST endpoints for file uploads, webhooks, health checks | May call mutations/queries |

**Key Pattern:** Strict separation - mutations/queries are pure database operations (auto-retryable), actions handle external APIs (not retryable).

### 3. External Services Layer

| Service | Connection Type | Initiated By | Purpose |
|---------|----------------|--------------|---------|
| **Deepgram Streaming** | WebSocket (WSS) | Browser client | Real-time speech-to-text as user speaks |
| **Deepgram Pre-recorded** | HTTP POST | Convex action | Batch transcription of uploaded audio files |
| **Claude API** | HTTP POST (streaming) | Convex action | Generate AI summaries from transcripts |
| **Convex Storage** | HTTP POST/GET | Browser + Convex | Store and retrieve audio files |

## Data Flow Patterns

### Flow 1: Real-Time Recording → Transcript

**Confidence: HIGH** (verified with Deepgram official docs)

```
1. User clicks "Record"
   → AudioRecorder component

2. Request mic permissions
   → navigator.mediaDevices.getUserMedia({ audio: true })

3. Fetch temporary Deepgram token
   → Call Convex action: generateDeepgramToken()
   → Convex calls Deepgram token API with main API key
   → Returns 30-second temporary token to browser

4. Establish WebSocket connection
   → Browser creates: new WebSocket('wss://api.deepgram.com/v1/listen', ['token', temp_token])
   → Connection opens

5. Start MediaRecorder with 250ms chunks
   → mediaRecorder.start(250)
   → dataavailable event fires every 250ms

6. Stream audio chunks to Deepgram
   → mediaRecorder.addEventListener('dataavailable', e => socket.send(e.data))
   → Audio sent as binary WebSocket messages

7. Receive transcript words in real-time
   → socket.onmessage receives JSON with transcript
   → Parse: { channel: { alternatives: [{ transcript, confidence }] }, is_final }

8. Save words to Convex
   → Call mutation: saveTranscriptWord({ sessionId, word, confidence, timestamp, is_final })
   → Mutation writes to `words` table

9. UI updates automatically
   → TranscriptView useQuery subscription receives new word
   → React re-renders with updated transcript
```

**Latency profile:**
- Mic → Deepgram: 250ms (chunk interval)
- Deepgram processing: <300ms (sub-second)
- Deepgram → Browser: <50ms (WebSocket)
- Browser → Convex mutation: ~50-100ms
- Convex → Browser query update: <50ms (WebSocket)
- **Total: ~400-700ms from speech to UI display**

### Flow 2: File Upload → Batch Transcription

**Confidence: HIGH** (verified with Convex and Deepgram docs)

```
1. User selects audio file
   → FileUploader component

2. Generate upload URL
   → Call Convex mutation: generateUploadUrl()
   → Returns signed URL valid for 1 hour

3. Upload file to Convex storage
   → Browser POST file to upload URL
   → Convex returns storageId

4. Save file metadata
   → Call mutation: saveAudioFile({ sessionId, storageId, filename, size })
   → Mutation writes to `audioFiles` table

5. Trigger transcription
   → Call Convex action: transcribeAudioFile({ sessionId, storageId })

6. Action retrieves file and sends to Deepgram
   → ctx.storage.getUrl(storageId) - get download URL
   → POST to Deepgram pre-recorded API with file URL or binary
   → Deepgram processes (up to 10 min timeout for Nova models)

7. Parse Deepgram response
   → Extract words with timestamps and confidence
   → Batch save via ctx.runMutation(saveTranscriptBatch, { sessionId, words })

8. UI updates automatically
   → TranscriptView subscription receives all words
   → React renders full transcript
```

**Alternative pattern for large files (>20MB):**
- Use Convex storage.getUrl() to generate public URL
- Send URL to Deepgram pre-recorded API (remote file method)
- Avoids 20MB HTTP action limit

### Flow 3: Transcript → AI Summary

**Confidence: MEDIUM** (Claude API streaming patterns extrapolated)

```
1. User clicks "Summarize"
   → SummaryPanel component

2. Fetch full transcript
   → Call Convex action: generateSummary({ sessionId })

3. Action queries transcript words
   → ctx.runQuery(getTranscriptText, { sessionId })
   → Returns array of words joined into text

4. Call Claude API with streaming
   → POST to api.anthropic.com/v1/messages
   → System prompt: "Generate overview, key points, action items"
   → User message: transcript text
   → Enable streaming: stream=true

5. Process streaming response
   → Parse SSE (Server-Sent Events) chunks
   → Accumulate text as it arrives

6. Save summary when complete
   → ctx.runMutation(saveSummary, {
       sessionId,
       overview,
       keyPoints: [],
       actionItems: []
     })

7. UI updates automatically
   → SummaryPanel useQuery subscription receives summary
   → React renders formatted summary
```

**Note:** Claude streaming means partial results could be saved incrementally for better UX (show summary as it generates), but adds complexity. MVP recommendation: wait for full response.

### Flow 4: Browse Transcript Library

**Confidence: HIGH** (standard Convex query pattern)

```
1. User opens library view
   → LibraryBrowser component

2. Subscribe to sessions list
   → useQuery(api.queries.listSessions, { filter, searchTerm })
   → Convex runs query, returns results

3. User types search query
   → Component state updates, useQuery automatically re-runs with new params
   → Convex query filters sessions by title/transcript text match

4. Background: Another user creates session
   → Mutation runs: createSession()
   → Convex detects query dependency
   → Pushes update to ALL subscribed clients

5. UI updates automatically
   → LibraryBrowser receives new session in results
   → React re-renders list with new item
```

**Real-time guarantee:** All clients see the same database snapshot simultaneously. No eventual consistency issues.

## Authentication Architecture: Deepgram Token Security

**Problem:** Exposing Deepgram API keys in browser code is a security risk.

**Solution:** Temporary token pattern (verified with Deepgram official docs)

**Confidence: HIGH**

### Pattern: Backend Token Proxy

```typescript
// Convex action (backend)
export const generateDeepgramToken = action({
  handler: async (ctx) => {
    // Main API key stored in Convex environment variables
    const apiKey = process.env.DEEPGRAM_API_KEY;

    // Call Deepgram token API
    const response = await fetch(
      'https://api.deepgram.com/v1/auth/token',
      {
        method: 'POST',
        headers: {
          'Authorization': `Token ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ttl_seconds: 30, // 30 second TTL (minimum recommended)
          scopes: ['usage:write'], // Only streaming permissions
        }),
      }
    );

    const { token } = await response.json();
    return token; // Temporary token, safe to send to browser
  },
});

// Browser client
const tempToken = await convex.action(api.actions.generateDeepgramToken);
const socket = new WebSocket(
  'wss://api.deepgram.com/v1/listen',
  ['token', tempToken]
);
```

**Security properties:**
- Main API key never leaves Convex backend
- Temporary tokens expire in 30 seconds (configurable up to 1 hour)
- Scopes limit token to specific operations
- Token refresh handled automatically by client when recording >30s

**Alternative (NOT recommended for browser):** Proxy WebSocket through backend server. More complex, adds latency, but provides full control over audio stream.

## Convex Schema Design

**Confidence: HIGH** (follows Convex best practices)

### Core Tables

```typescript
// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Recording sessions (one per recording or file upload)
  sessions: defineTable({
    title: v.string(), // User-editable title
    type: v.union(v.literal("realtime"), v.literal("upload")),
    status: v.union(
      v.literal("recording"),
      v.literal("processing"),
      v.literal("complete"),
      v.literal("error")
    ),
    userId: v.string(), // Convex Auth user ID
    createdAt: v.number(), // timestamp
    duration: v.optional(v.number()), // seconds
    wordCount: v.optional(v.number()),
  })
    .index("by_user", ["userId", "createdAt"])
    .searchIndex("by_title", {
      searchField: "title",
      filterFields: ["userId"],
    }),

  // Individual transcript words (many per session)
  words: defineTable({
    sessionId: v.id("sessions"),
    word: v.string(),
    confidence: v.number(), // 0.0 - 1.0
    start: v.number(), // timestamp in seconds
    end: v.number(),
    isFinal: v.boolean(), // Deepgram's is_final flag
    speaker: v.optional(v.number()), // if diarization enabled
  })
    .index("by_session", ["sessionId", "start"])
    .searchIndex("by_content", {
      searchField: "word",
      filterFields: ["sessionId"],
    }),

  // AI-generated summaries (one per session)
  summaries: defineTable({
    sessionId: v.id("sessions"),
    overview: v.string(), // 2-3 sentence overview
    keyPoints: v.array(v.string()), // Bullet points
    actionItems: v.array(v.string()), // Extracted action items
    generatedAt: v.number(),
    model: v.string(), // "claude-3-5-sonnet-20241022"
  }).index("by_session", ["sessionId"]),

  // Audio files (for uploaded recordings)
  audioFiles: defineTable({
    sessionId: v.id("sessions"),
    storageId: v.string(), // Convex storage ID
    filename: v.string(),
    mimeType: v.string(),
    size: v.number(), // bytes
    uploadedAt: v.number(),
  }).index("by_session", ["sessionId"]),
});
```

### Design Rationale

**Words table separate from sessions:**
- Real-time streaming requires frequent writes (many per second)
- Convex mutations are transactional; writing individual words is more efficient than updating a large array
- Queries can efficiently fetch words by session via index
- Search across transcript content enabled via searchIndex

**Status field for sessions:**
- Tracks progression: recording → processing → complete
- Enables UI to show loading states
- Error handling for failed transcriptions

**Indexes strategy:**
- `by_user + createdAt`: Fast library listing sorted by recency
- `by_session + start`: Fast transcript reconstruction in chronological order
- Search indexes: Full-text search on titles and transcript content

**File size considerations:**
- Audio files stored in Convex Storage (separate from database)
- Only metadata (storageId, size) in database
- 20MB limit for HTTP actions; use upload URLs for larger files

## Offline Support (PWA Considerations)

**Confidence: MEDIUM** (PWA patterns researched, not Convex-specific)

### Offline Recording Strategy

PWAs can record audio offline and sync when online:

```
1. User records while offline
   → MediaRecorder captures audio
   → Audio chunks buffered in IndexedDB

2. User regains connectivity
   → Service worker detects online event
   → Background sync triggers upload

3. Upload buffered audio
   → Retrieve chunks from IndexedDB
   → Combine into single file
   → Upload to Convex storage
   → Trigger Deepgram pre-recorded transcription
```

**Implementation pattern:**
- Use IndexedDB to store audio blobs during offline recording
- Service Worker handles background sync
- Upload uses same file upload flow as manual uploads
- Requires careful chunk management (memory limits)

**Caveat:** Real-time Deepgram streaming requires connectivity. Offline mode only supports "record now, transcribe later" use case.

### Offline Browsing

Convex's real-time subscriptions work offline with cached data:

- Convex client SDK caches query results in browser
- UI renders from cache when offline
- Read-only mode (no mutations possible offline)
- Automatic sync when connection restored

**Note:** Convex doesn't currently have built-in optimistic updates for offline-first mutations. For full offline editing, would need custom implementation with conflict resolution.

## Build Order Recommendations

**Phase 1: Core Real-Time Flow**
1. Convex schema (sessions, words tables)
2. Basic mutations (createSession, saveTranscriptWord)
3. Deepgram token generation action
4. Browser AudioRecorder component
5. WebSocket streaming to Deepgram
6. Real-time TranscriptView with useQuery subscription

**Why this order:** Establishes core value proposition (real-time transcription) with minimal dependencies. Tests Convex reactivity and Deepgram streaming together.

**Phase 2: File Upload & Batch Transcription**
1. audioFiles table schema
2. File upload mutation (generateUploadUrl, saveAudioFile)
3. Deepgram pre-recorded transcription action
4. FileUploader component
5. Progress indicators and error handling

**Why this order:** Builds on real-time foundation. Reuses transcript display UI. Tests Convex storage and Actions with external API calls.

**Phase 3: AI Summarization**
1. summaries table schema
2. Claude API integration action
3. Summary generation with streaming (optional)
4. SummaryPanel component
5. Summary display UI

**Why this order:** Requires complete transcripts (depends on Phase 1/2). Isolated feature, doesn't block other work.

**Phase 4: Library & Search**
1. Search indexes on schema
2. Query functions with filters
3. LibraryBrowser component
4. Search/filter UI

**Why this order:** Requires existing sessions/transcripts to be useful. Benefits from all previous phases being complete.

**Phase 5: PWA Offline Support** (optional)
1. Service worker setup
2. IndexedDB audio buffering
3. Background sync
4. Offline UI indicators

**Why this order:** Polish feature after core functionality works. Complex, can be deprioritized for MVP.

## Patterns to Follow

### Pattern 1: Client-Side WebSocket, Server-Side Processing

**What:** Browser manages WebSocket connections to external services, Convex handles all processing and persistence.

**When:** Real-time external services (Deepgram streaming) where latency matters.

**Why:** Minimizes hops (browser ↔ Deepgram direct is faster than browser ↔ backend ↔ Deepgram). Security maintained via temporary tokens.

**Example:**
```typescript
// Browser component
const socket = new WebSocket(deepgramUrl, ['token', tempToken]);

socket.onmessage = (event) => {
  const { transcript, is_final } = JSON.parse(event.data);

  // Immediately save to Convex
  convex.mutation(api.mutations.saveWord, {
    sessionId,
    word: transcript,
    isFinal: is_final,
  });
};
```

### Pattern 2: Action → RunMutation for External API Results

**What:** Actions fetch from external APIs, then call mutations to save results.

**When:** Any external API integration (Claude, Deepgram pre-recorded).

**Why:** Mutations are transactional and auto-retryable. Actions are not. Separating concerns ensures database writes are reliable even if action partially fails.

**Example:**
```typescript
// Convex action
export const generateSummary = action({
  handler: async (ctx, { sessionId }) => {
    // External API call (not retryable)
    const transcript = await ctx.runQuery(api.queries.getTranscript, { sessionId });
    const summary = await callClaudeAPI(transcript);

    // Database write (transactional, retryable)
    await ctx.runMutation(api.mutations.saveSummary, {
      sessionId,
      ...summary,
    });
  },
});
```

### Pattern 3: Granular Mutations for Real-Time Updates

**What:** Save individual words as separate mutation calls instead of batching.

**When:** Real-time streaming where UI updates incrementally.

**Why:** Convex's reactivity shines with granular updates. Each word appears in UI immediately via subscription. Batching would delay updates.

**Example:**
```typescript
// Good: Granular (UI updates per word)
socket.onmessage = (event) => {
  convex.mutation(api.mutations.saveWord, { ...event.data });
};

// Bad: Batching (UI updates only after buffer full)
const buffer = [];
socket.onmessage = (event) => {
  buffer.push(event.data);
  if (buffer.length >= 10) {
    convex.mutation(api.mutations.saveWords, { words: buffer });
    buffer = [];
  }
};
```

**Caveat:** Granular mutations generate more database transactions. For high-throughput scenarios (>100 words/sec), consider hybrid approach with small batches.

### Pattern 4: Temporary Token Refresh

**What:** Refresh Deepgram temporary tokens before expiry during long recordings.

**When:** Recording sessions longer than token TTL (30 seconds default).

**Why:** Prevents WebSocket disconnection mid-recording.

**Example:**
```typescript
const TOKEN_TTL = 30000; // 30 seconds
let tokenExpiresAt = Date.now() + TOKEN_TTL;

const refreshToken = async () => {
  const newToken = await convex.action(api.actions.generateDeepgramToken);
  // Close old socket, open new one with fresh token
  socket.close();
  socket = new WebSocket(deepgramUrl, ['token', newToken]);
  tokenExpiresAt = Date.now() + TOKEN_TTL;
};

setInterval(() => {
  if (Date.now() > tokenExpiresAt - 5000) { // Refresh 5s before expiry
    refreshToken();
  }
}, 1000);
```

## Anti-Patterns to Avoid

### Anti-Pattern 1: Storing Audio in Database

**What:** Saving raw audio files as bytes in Convex database tables.

**Why bad:** Database tables are optimized for structured data. Large blobs degrade performance, waste database storage, and hit size limits.

**Instead:** Use Convex Storage for audio files, store only storageId in database.

```typescript
// Bad
audioFiles: defineTable({
  sessionId: v.id("sessions"),
  audioData: v.bytes(), // DON'T DO THIS
})

// Good
audioFiles: defineTable({
  sessionId: v.id("sessions"),
  storageId: v.string(), // Reference to Convex Storage
})
```

### Anti-Pattern 2: Proxying WebSocket Through Backend Unnecessarily

**What:** Browser → Next.js API route → Deepgram instead of Browser → Deepgram directly.

**Why bad:** Adds latency (extra hop), increases backend complexity, uses backend resources for streaming, no security benefit if using temporary tokens.

**Instead:** Use temporary tokens and direct browser-to-Deepgram connection.

**Exception:** If you need to process/transform audio before sending to Deepgram (e.g., noise reduction), backend proxy is justified.

### Anti-Pattern 3: Polling for Real-Time Updates

**What:** Using setInterval to re-fetch transcript data from Convex.

**Why bad:** Wastes bandwidth, increases latency, misses Convex's real-time superpowers.

**Instead:** Use useQuery subscriptions - Convex pushes updates automatically.

```typescript
// Bad
useEffect(() => {
  const interval = setInterval(async () => {
    const words = await convex.query(api.queries.getWords, { sessionId });
    setWords(words);
  }, 1000);
  return () => clearInterval(interval);
}, []);

// Good
const words = useQuery(api.queries.getWords, { sessionId });
// words automatically updates when database changes
```

### Anti-Pattern 4: Synchronous Action Chains

**What:** Actions calling other actions sequentially when they could run in parallel.

**Why bad:** Actions have 10-minute timeout. Sequential calls add latency. Failure of one blocks others.

**Instead:** Use Promise.all for independent operations.

```typescript
// Bad: Sequential (slow)
export const processSession = action({
  handler: async (ctx, { sessionId }) => {
    await ctx.runAction(api.actions.transcribeAudio, { sessionId });
    await ctx.runAction(api.actions.generateSummary, { sessionId });
    await ctx.runAction(api.actions.extractKeywords, { sessionId });
  },
});

// Good: Parallel (fast)
export const processSession = action({
  handler: async (ctx, { sessionId }) => {
    await Promise.all([
      ctx.runAction(api.actions.transcribeAudio, { sessionId }),
      ctx.runAction(api.actions.generateSummary, { sessionId }),
      ctx.runAction(api.actions.extractKeywords, { sessionId }),
    ]);
  },
});
```

**Caveat:** Some operations have dependencies (e.g., summarization requires transcript). Only parallelize truly independent work.

### Anti-Pattern 5: Embedding API Keys in Browser Code

**What:** Hardcoding Deepgram or Claude API keys in Next.js client components.

**Why bad:** Keys exposed in browser bundle, visible in DevTools, anyone can steal and abuse.

**Instead:**
- Deepgram: Use temporary token pattern (Convex action generates token)
- Claude: Always call from Convex actions (server-side only)

```typescript
// Bad: API key in browser
const DEEPGRAM_API_KEY = "your-key-here"; // DON'T DO THIS
const socket = new WebSocket(url, ['token', DEEPGRAM_API_KEY]);

// Good: Temporary token from backend
const tempToken = await convex.action(api.actions.generateDeepgramToken);
const socket = new WebSocket(url, ['token', tempToken]);
```

## Scalability Considerations

| Concern | At 100 users | At 10K users | At 1M users |
|---------|--------------|--------------|-------------|
| **Deepgram concurrent connections** | 5-10 concurrent streams | 100+ concurrent (upgrade plan) | Custom enterprise plan required |
| **Convex database** | Default limits sufficient | Monitor table sizes, optimize indexes | Partition by user, archive old sessions |
| **Convex storage** | Unlimited files, pay per GB | Consider CDN for frequently accessed audio | Implement lifecycle policies, delete old files |
| **Claude API rate limits** | Tier 1 (50 req/min) sufficient | Tier 2+ (1000 req/min) | Queue summarization requests |
| **WebSocket connections (Convex)** | No limit, real-time updates work | No limit, Convex handles auto-scaling | No changes needed |
| **Browser memory (MediaRecorder)** | 1-hour recordings fit in memory | Same (per-user concern, not aggregate) | Implement chunked upload for >1hr recordings |

**Key insight:** Convex scales automatically (serverless). External APIs (Deepgram, Claude) require plan upgrades as usage grows.

**Optimization strategy:**
1. **Start:** Default plans for all services
2. **10K users:** Monitor Deepgram concurrency, add indexes to Convex
3. **100K+ users:** Batch summarization, CDN for audio playback, archive old transcripts
4. **1M+ users:** Enterprise plans, sharding strategies, data retention policies

## Technology-Specific Patterns

### Next.js App Router + Convex Integration

**ConvexClientProvider wrapper:**
```typescript
// app/providers.tsx
"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export function Providers({ children }: { children: React.ReactNode }) {
  return <ConvexProvider client={convex}>{children}</ConvexProvider>;
}

// app/layout.tsx
import { Providers } from "./providers";

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

**Client vs Server Components:**
- Server Components: Static pages, SEO content, initial data loading
- Client Components: Real-time UI (`useQuery`), WebSocket management, interactive controls

**Rule:** Any component using Convex hooks (`useQuery`, `useMutation`, `useAction`) must be a Client Component (`"use client"`).

### Deepgram SDK vs Raw WebSocket

**Options:**
1. **Deepgram JavaScript SDK** (@deepgram/sdk)
2. **Raw WebSocket** (native browser API)

**Recommendation:** Raw WebSocket for browser clients

**Rationale:**
- SDK is optimized for Node.js backend use
- Browser only needs WebSocket connection (simple)
- Avoiding SDK reduces bundle size
- Direct control over connection lifecycle

**SDK usage for Convex actions:**
```typescript
import { createClient } from "@deepgram/sdk";

export const transcribeFile = action({
  handler: async (ctx, { storageId }) => {
    const deepgram = createClient(process.env.DEEPGRAM_API_KEY!);
    const audioUrl = await ctx.storage.getUrl(storageId);

    const { result } = await deepgram.listen.prerecorded.transcribeUrl({
      url: audioUrl,
    }, {
      model: "nova-3",
      smart_format: true,
    });

    // Process result...
  },
});
```

## Common Integration Gotchas

### Gotcha 1: Deepgram WebSocket Keepalive

**Problem:** Deepgram closes connection after ~10 seconds of silence.

**Solution:** Send keepalive messages during recording pauses.

```typescript
const KEEPALIVE_INTERVAL = 5000; // 5 seconds

const keepalive = setInterval(() => {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ type: "KeepAlive" }));
  }
}, KEEPALIVE_INTERVAL);

// Clean up on close
socket.onclose = () => clearInterval(keepalive);
```

### Gotcha 2: Convex Action Timeout (10 minutes)

**Problem:** Long audio files (>10 min) cause Deepgram transcription action to timeout.

**Solution:** Use Deepgram's callback URL feature for async processing.

```typescript
// Instead of waiting for result
const { result } = await deepgram.listen.prerecorded.transcribeUrl({
  url: audioUrl,
}, {
  callback: "https://your-app.convex.site/deepgram-callback",
});

// Set up HTTP action to receive callback
export const deepgramCallback = httpAction(async (ctx, request) => {
  const result = await request.json();
  const { sessionId } = parseCallbackData(result);

  await ctx.runMutation(api.mutations.saveTranscriptBatch, {
    sessionId,
    words: result.results.channels[0].alternatives[0].words,
  });

  return new Response("OK", { status: 200 });
});
```

### Gotcha 3: MediaRecorder Format Compatibility

**Problem:** Deepgram may not support all browser-native audio formats.

**Solution:** Specify compatible MIME type when creating MediaRecorder.

```typescript
const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
  ? 'audio/webm;codecs=opus'
  : 'audio/webm';

const mediaRecorder = new MediaRecorder(stream, { mimeType });
```

**Verified compatible formats:**
- `audio/webm;codecs=opus` (Chrome, Edge)
- `audio/mp4` (Safari)
- `audio/wav` (universal, but larger file size)

### Gotcha 4: Convex Upload URL Expiry

**Problem:** Upload URLs expire in 1 hour. User delay causes upload failure.

**Solution:** Generate URL immediately before upload, not during component mount.

```typescript
// Bad: Generate on mount (user might delay upload)
useEffect(() => {
  const url = await convex.mutation(api.mutations.generateUploadUrl);
  setUploadUrl(url);
}, []);

// Good: Generate when user selects file
const handleFileSelect = async (file: File) => {
  const url = await convex.mutation(api.mutations.generateUploadUrl);
  await uploadFile(url, file);
};
```

## Sources

### Deepgram Documentation
- [Real-Time TTS with WebSockets](https://developers.deepgram.com/docs/tts-websocket-streaming)
- [Using Lower-Level Websockets with the Streaming API](https://developers.deepgram.com/docs/lower-level-websockets)
- [Get Live Speech Transcriptions In Your Browser](https://deepgram.com/learn/live-transcription-mic-browser)
- [Build a Real-Time Transcription App with React and Deepgram](https://deepgram.com/learn/build-a-real-time-transcription-app-with-react-and-deepgram)
- [Getting Started with Pre-Recorded Audio](https://developers.deepgram.com/docs/pre-recorded-audio)
- [Token-Based Auth](https://developers.deepgram.com/guides/fundamentals/token-based-authentication)
- [Browser Live Transcription - Protecting Your API Key](https://deepgram.com/learn/protecting-api-key)

### Convex Documentation
- [Convex Overview](https://docs.convex.dev/understanding/)
- [Actions](https://docs.convex.dev/functions/actions)
- [Realtime](https://docs.convex.dev/realtime)
- [File Storage](https://docs.convex.dev/file-storage)
- [Uploading and Storing Files](https://docs.convex.dev/file-storage/upload-files)
- [HTTP Actions](https://docs.convex.dev/functions/http-actions)

### Next.js & PWA
- [Next.js Architecture in 2026 — Server-First, Client-Islands, and Scalable App Router Patterns](https://www.yogijs.tech/blog/nextjs-project-architecture-app-router)
- [How to Handle WebSocket in Next.js](https://oneuptime.com/blog/post/2026-01-24-nextjs-websocket-handling/view)
- [PWA with offline streaming](https://web.dev/articles/pwa-with-offline-streaming)
- [Audio Recording PWA Demo](https://progressier.com/pwa-capabilities/audio-recording)

### Architecture Patterns
- [Top APIs and models for real-time speech recognition and transcription in 2026](https://www.assemblyai.com/blog/best-api-models-for-real-time-speech-recognition-and-transcription)
- [The Ultimate 2026 Guide to Speech-to-Text (STT) APIs](https://aimlapi.com/blog/introduction-to-speech-to-text-technology)
