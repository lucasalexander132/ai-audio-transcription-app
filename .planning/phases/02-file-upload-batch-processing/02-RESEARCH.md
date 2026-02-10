# Phase 2: File Upload & Batch Processing - Research

**Researched:** 2026-02-10
**Domain:** Audio file upload, client-side validation, Convex file storage, Deepgram pre-recorded transcription API
**Confidence:** HIGH

## Summary

Phase 2 adds file upload capability to the existing transcription app, allowing users to upload pre-recorded audio files (MP3, WAV, M4A, WebM) and receive transcriptions identical in quality to live recordings. The architecture leverages the **existing Convex file storage infrastructure** (already used for saving live recordings in Phase 1) and the **existing Deepgram REST API proxy pattern** (the `transcribeChunk` action in `convex/deepgram.ts`). The core new work is: (1) a file picker UI with client-side validation, (2) upload progress tracking, and (3) a new Convex action that reads uploaded files from storage and sends them to Deepgram's pre-recorded transcription endpoint.

The key architectural insight is that the existing `deepgram.transcribeChunk` action already sends binary audio to Deepgram's `/v1/listen` REST endpoint with `diarize=true`, `punctuate=true`, and `smart_format=true` -- the **exact same endpoint** used for pre-recorded transcription. The only difference is that file uploads send the complete file at once rather than accumulated recording chunks. The existing `recordings.generateUploadUrl`, `recordings.saveRecording`, and `transcripts.appendWords` mutations can all be reused directly.

Critical constraints discovered:
1. **Convex action argument size**: Function arguments are limited to 16MB (5MB for Node.js runtime). Audio files must be uploaded to Convex storage first, then read via `ctx.storage.get()` inside the action -- NOT passed as action arguments.
2. **Deepgram file size limit**: 2GB maximum, with 10-minute processing timeout for Nova models.
3. **Upload progress**: The `fetch()` API does not support upload progress events. For progress tracking with Convex's `generateUploadUrl`, use `XMLHttpRequest` or estimate progress from file size.

**Primary recommendation:** Upload files to Convex storage (reuse existing `generateUploadUrl`), then create a new `transcribeFile` Convex action that reads the file via `ctx.storage.get()`, converts to ArrayBuffer, and POSTs to Deepgram REST API. Add a "processing" status to the transcript schema. Reuse the existing transcript detail view unchanged.

## Standard Stack

### Core (Already Installed - No New Dependencies)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Convex | ^1.31.7 | File storage + actions + mutations | Already handles upload URLs, blob storage, and server-side actions |
| Deepgram REST API | v1/listen | Pre-recorded transcription | Same endpoint already used for live recording chunks |
| Next.js | ^15.1.4 | React framework | Already installed |
| Zustand | ^5.0.11 | Upload state management | Already installed for recording state |

### Supporting (No New Dependencies Needed)
| Library | Purpose | Why Not Needed |
|---------|---------|----------------|
| axios | Upload progress | XMLHttpRequest works fine; no new dependency needed |
| music-metadata | Audio metadata extraction | HTML5 Audio element provides duration natively via `loadedmetadata` event |
| react-dropzone | Drag-and-drop upload | `<input type="file">` with accept attribute is sufficient for mobile-first PWA |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Convex storage upload | Direct-to-Deepgram from browser | Exposes API key; no file saved for playback |
| XMLHttpRequest for progress | fetch() API | fetch() lacks upload progress events; XHR is the standard |
| Client-side audio validation | Server-side only | Client-side catches errors early, better UX |
| Single-file upload | Batch upload queue | Single file simpler; batch can be added later if needed |
| HTML5 Audio for duration | music-metadata npm | HTML5 Audio is native, zero-dependency, works for all target formats |

**Installation:**
```bash
# No new packages needed - everything is already installed from Phase 1
```

## Architecture Patterns

### Recommended File Structure (New/Modified Files Only)
```
app/
├── components/
│   └── audio/
│       └── file-upload.tsx          # NEW: File picker + upload UI
├── lib/
│   ├── hooks/
│   │   └── use-file-upload.ts       # NEW: Upload state + logic hook
│   └── stores/
│       └── recording-store.ts       # MODIFY: Add upload-related state
├── (app)/
│   └── record/
│       └── page.tsx                 # MODIFY: Wire up "Upload File" tab

convex/
├── schema.ts                        # MODIFY: Add "processing" status, source field
├── deepgram.ts                      # ADD: transcribeFile action
├── transcripts.ts                   # MODIFY: Add createFromUpload mutation
└── recordings.ts                    # REUSE: generateUploadUrl, saveRecording as-is
```

### Pattern 1: Upload-Then-Process via Convex Storage
**What:** Upload file to Convex storage first, then trigger server-side transcription action that reads the file from storage.

**When to use:** Always for file uploads (avoids action argument size limits, keeps file for playback).

**Why this pattern:**
- Convex action arguments are limited to 16MB (5MB for Node runtime). Audio files can be much larger.
- `ctx.storage.get(storageId)` returns a Blob in actions -- no size limit beyond storage capacity.
- The uploaded file is automatically saved for later playback (reuses existing audio player).
- If transcription fails, the file is still stored and can be retried.

**Example:**
```typescript
// convex/deepgram.ts - NEW transcribeFile action
import { v } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";

export const transcribeFile = action({
  args: {
    transcriptId: v.id("transcripts"),
    storageId: v.id("_storage"),
    mimeType: v.string(),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.DEEPGRAM_API_KEY;
    if (!apiKey) throw new Error("DEEPGRAM_API_KEY not configured");

    // Read uploaded file from Convex storage
    const blob = await ctx.storage.get(args.storageId);
    if (!blob) throw new Error("File not found in storage");

    // Convert Blob to ArrayBuffer for fetch body
    const audioBytes = new Uint8Array(await blob.arrayBuffer());

    // Strip codec params from MIME type
    const contentType = args.mimeType.split(";")[0].trim();

    // Send to Deepgram pre-recorded endpoint (same as live, but full file)
    const response = await fetch(
      "https://api.deepgram.com/v1/listen?" +
      "model=nova-2&diarize=true&punctuate=true&smart_format=true",
      {
        method: "POST",
        headers: {
          "Authorization": `Token ${apiKey}`,
          "Content-Type": contentType,
        },
        body: audioBytes,
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Deepgram API error:", response.status, errorText);
      // Mark transcript as error
      await ctx.runMutation(internal.transcripts.markError, {
        transcriptId: args.transcriptId,
        error: `Transcription failed: ${response.status}`,
      });
      return;
    }

    const result = await response.json();
    const words = result.results?.channels?.[0]?.alternatives?.[0]?.words || [];
    const duration = result.metadata?.duration || 0;

    // Store all words
    if (words.length > 0) {
      await ctx.runMutation(internal.transcripts.appendWords, {
        transcriptId: args.transcriptId,
        words: words.map((w: any) => ({
          text: w.punctuated_word || w.word,
          speaker: w.speaker ?? 0,
          startTime: w.start,
          endTime: w.end,
          isFinal: true,
        })),
      });
    }

    // Mark transcript as completed with duration from Deepgram metadata
    await ctx.runMutation(internal.transcripts.completeFromUpload, {
      transcriptId: args.transcriptId,
      duration: duration,
    });
  },
});
```

### Pattern 2: Client-Side File Validation Before Upload
**What:** Validate file type, size, and extract duration before uploading to reduce wasted bandwidth and API calls.

**When to use:** Always, before uploading.

**Example:**
```typescript
// app/lib/hooks/use-file-upload.ts

const ACCEPTED_TYPES: Record<string, string> = {
  "audio/mpeg": ".mp3",
  "audio/wav": ".wav",
  "audio/x-wav": ".wav",
  "audio/wave": ".wav",
  "audio/x-m4a": ".m4a",
  "audio/mp4": ".m4a",
  "audio/webm": ".webm",
  "audio/ogg": ".ogg",
};

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB practical limit

function validateFile(file: File): string | null {
  // Check MIME type
  if (!ACCEPTED_TYPES[file.type]) {
    // Fallback: check extension
    const ext = file.name.split(".").pop()?.toLowerCase();
    const validExts = [".mp3", ".wav", ".m4a", ".webm", ".ogg"];
    if (!ext || !validExts.includes(`.${ext}`)) {
      return `Unsupported format. Please upload MP3, WAV, M4A, or WebM files.`;
    }
  }

  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    const sizeMB = Math.round(file.size / (1024 * 1024));
    return `File too large (${sizeMB}MB). Maximum size is 100MB.`;
  }

  if (file.size < 1024) {
    return `File appears to be empty or corrupted.`;
  }

  return null; // Valid
}

// Get audio duration using HTML5 Audio element
function getAudioDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const audio = new Audio();
    const url = URL.createObjectURL(file);

    audio.addEventListener("loadedmetadata", () => {
      URL.revokeObjectURL(url);
      resolve(audio.duration);
    });

    audio.addEventListener("error", () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read audio file"));
    });

    audio.preload = "metadata";
    audio.src = url;
  });
}
```

### Pattern 3: Upload Progress Tracking with XMLHttpRequest
**What:** Use XMLHttpRequest instead of fetch() to track upload progress to Convex storage URL.

**When to use:** File uploads where progress feedback is needed (files > ~1MB).

**Example:**
```typescript
// Upload with progress tracking
function uploadWithProgress(
  url: string,
  file: File,
  onProgress: (percent: number) => void
): Promise<{ storageId: string }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) {
        const percent = Math.round((event.loaded / event.total) * 100);
        onProgress(percent);
      }
    });

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText));
      } else {
        reject(new Error(`Upload failed: ${xhr.status}`));
      }
    });

    xhr.addEventListener("error", () => {
      reject(new Error("Upload failed: network error"));
    });

    xhr.open("POST", url);
    xhr.setRequestHeader("Content-Type", file.type);
    xhr.send(file);
  });
}
```

### Pattern 4: Schema Extension for Upload Source Tracking
**What:** Add a `source` field and `"processing"` status to distinguish uploaded files from live recordings and track transcription progress.

**When to use:** Schema migration for Phase 2.

**Example:**
```typescript
// convex/schema.ts - Updated transcripts table
transcripts: defineTable({
  userId: v.id("users"),
  title: v.string(),
  status: v.union(
    v.literal("recording"),
    v.literal("processing"),  // NEW: file uploaded, transcription in progress
    v.literal("completed"),
    v.literal("error")
  ),
  source: v.optional(v.union(     // NEW: track how transcript was created
    v.literal("recording"),
    v.literal("upload")
  )),
  duration: v.optional(v.number()),
  createdAt: v.number(),
  completedAt: v.optional(v.number()),
  errorMessage: v.optional(v.string()),  // NEW: store error details
}).index("by_userId", ["userId"]),
```

### Anti-Patterns to Avoid
- **Passing audio file bytes as action arguments:** Convex action args are limited to 16MB (5MB Node). Always upload to storage first, read with `ctx.storage.get()`.
- **Sending file directly from browser to Deepgram:** Exposes API key. Always proxy through Convex action.
- **Blocking UI during transcription:** File transcription can take 10-60 seconds. Show processing state and let user navigate away.
- **Not validating files client-side:** Server-side errors waste upload bandwidth. Validate type/size before upload.
- **Creating a separate transcript list for uploads:** Uploads should appear in the same list as recordings. Use the existing transcript list with source indicator.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| File upload to storage | Custom upload server | Convex `generateUploadUrl` + POST | Already implemented in Phase 1 `recordings.ts`; handles auth, storage, cleanup |
| Audio format validation | Custom MIME parser | `file.type` + extension fallback | Browser provides MIME type; extension check covers edge cases |
| Audio duration extraction | FFprobe/WASM decoder | HTML5 `Audio` element + `loadedmetadata` | Native browser API, works for all target formats, zero dependencies |
| Upload progress | Custom chunked upload | `XMLHttpRequest.upload.onprogress` | Browser-native, widely supported, works with Convex upload URLs |
| Speaker diarization | Custom algorithm | Deepgram `diarize=true` parameter | Same as Phase 1; pre-recorded diarization is actually MORE accurate than streaming |
| Transcription queueing | Custom job queue | Convex action + status polling | Actions run up to 10 min; `"processing"` status + Convex subscription handles state |

**Key insight:** Phase 2 reuses almost everything from Phase 1. The upload infrastructure (`generateUploadUrl`, `saveRecording`), the transcription proxy (`deepgram.ts` pattern), the database schema (transcripts + words + recordings), and the entire transcript detail view are all reusable. The only genuinely new code is the file picker UI and a new `transcribeFile` action.

## Common Pitfalls

### Pitfall 1: MIME Type Inconsistency Across Devices
**What goes wrong:** Mobile devices (especially Android) may report different MIME types for the same file format. An M4A file might be reported as `audio/mp4`, `audio/x-m4a`, `audio/aac`, or even `application/octet-stream`.

**Why it happens:** Android file pickers use the file's registered MIME type from the system, which varies by manufacturer and OS version. iOS is more consistent but still has edge cases.

**How to avoid:**
- Accept multiple MIME types per format: `audio/mpeg`, `audio/mp3` for MP3; `audio/mp4`, `audio/x-m4a`, `audio/m4a` for M4A
- Fall back to file extension check when MIME type is unrecognized
- Use the `accept` attribute on `<input type="file">` with both MIME types and extensions: `accept="audio/mpeg,.mp3,audio/wav,.wav,audio/mp4,.m4a,audio/webm,.webm"`
- Don't rely solely on MIME type for Deepgram `Content-Type` header -- map from validated extension if MIME is ambiguous

**Warning signs:** Upload rejection on specific Android devices; "unsupported format" errors for files that play fine locally.

### Pitfall 2: Large File Upload Timeout
**What goes wrong:** Upload of large audio files (50MB+) times out on slow mobile connections, wasting user time with no feedback.

**Why it happens:** Convex upload URLs have a 2-minute POST timeout. On 3G/slow WiFi, a 100MB file may not complete in time.

**How to avoid:**
- Set practical file size limit (100MB recommended, covers ~3 hours of MP3 at 128kbps)
- Show upload progress so users know it's working
- Show estimated time remaining based on upload speed
- Consider showing file size in human-readable format before upload starts

**Warning signs:** Upload errors that only occur on mobile; inconsistent failure rates.

### Pitfall 3: Forgetting to Handle "Processing" State in UI
**What goes wrong:** After upload, the transcript appears in the list but shows no content -- user thinks it's broken because there's no indication transcription is happening server-side.

**Why it happens:** Live recordings show real-time transcript updates. File uploads have a delay between upload and transcription results.

**How to avoid:**
- Add `"processing"` status to schema
- Show clear processing indicator: spinner, progress message, or "Transcribing your file..."
- Convex subscriptions automatically update the UI when status changes to `"completed"`
- Consider navigating to transcript detail page with processing indicator immediately after upload

**Warning signs:** User confusion, "nothing happened" reports, premature page refreshes.

### Pitfall 4: Deepgram Action Timeout for Long Files
**What goes wrong:** Convex actions timeout after 10 minutes. A very long audio file (2+ hours) might cause Deepgram to take longer than the action's execution limit.

**Why it happens:** Deepgram's pre-recorded API processes audio faster than real-time (typically 10-30x), but very long files or high-feature requests (diarization + smart_format) can approach the limit.

**How to avoid:**
- Practical file size/duration limit (100MB / 3 hours) keeps processing well under 10 minutes
- Deepgram processes at ~10-30x real-time: a 1-hour file takes ~2-6 minutes
- Monitor action duration in Convex dashboard
- If timeout is a concern, use Deepgram's callback URL feature (sends results to a webhook)

**Warning signs:** Action timeout errors in Convex dashboard; very long files failing silently.

### Pitfall 5: File Picker Not Opening on iOS PWA
**What goes wrong:** `<input type="file">` may behave differently in iOS Safari standalone (PWA) mode vs. regular Safari. The file picker might not show audio files or might crash.

**Why it happens:** iOS PWA mode has historically had bugs with file inputs. Behavior has improved but edge cases remain.

**How to avoid:**
- Test on physical iOS device in both Safari and PWA mode
- Use explicit `accept` attribute with extensions, not just MIME types
- Provide fallback instructions if file picker fails
- Consider adding a "Browse" button (not just the styled file input) for better tap targets on mobile

**Warning signs:** "Can't select files" reports from iOS users; file picker opens but shows no files.

### Pitfall 6: Not Using `punctuated_word` from Deepgram Response
**What goes wrong:** Transcript shows lowercase, unpunctuated text even though `punctuate=true` and `smart_format=true` are enabled.

**Why it happens:** Deepgram returns both `word` (raw) and `punctuated_word` (formatted) fields. If you read `word` instead of `punctuated_word`, you lose all formatting.

**How to avoid:**
- Use `w.punctuated_word || w.word` when extracting text from Deepgram response
- Note: the existing `transcribeChunk` action uses `w.word` -- this should be updated for both live and upload flows

**Warning signs:** Transcript text is all lowercase with no punctuation despite API parameters.

## Code Examples

### Complete File Upload Flow (Client Side)
```typescript
// Source: Convex file upload docs + project patterns
// app/lib/hooks/use-file-upload.ts

import { useState, useCallback } from "react";
import { useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

type UploadStatus = "idle" | "validating" | "uploading" | "processing" | "complete" | "error";

export function useFileUpload() {
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const createTranscript = useMutation(api.transcripts.create);
  const generateUploadUrl = useMutation(api.recordings.generateUploadUrl);
  const saveRecording = useMutation(api.recordings.saveRecording);
  const transcribeFile = useAction(api.deepgram.transcribeFile);

  const uploadFile = useCallback(async (file: File) => {
    try {
      setError(null);
      setStatus("validating");

      // 1. Validate file
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        setStatus("error");
        return null;
      }

      // 2. Create transcript record
      const transcriptId = await createTranscript({
        title: file.name.replace(/\.[^.]+$/, ""), // Strip extension
      });

      // 3. Upload file to Convex storage
      setStatus("uploading");
      const uploadUrl = await generateUploadUrl();

      const { storageId } = await uploadWithProgress(
        uploadUrl,
        file,
        (percent) => setProgress(percent)
      );

      // 4. Save recording metadata
      await saveRecording({
        transcriptId,
        storageId: storageId as Id<"_storage">,
        format: file.type || "audio/mpeg",
        size: file.size,
      });

      // 5. Trigger server-side transcription (non-blocking)
      setStatus("processing");
      // Fire and forget -- Convex subscription will update UI
      transcribeFile({
        transcriptId,
        storageId: storageId as Id<"_storage">,
        mimeType: file.type || "audio/mpeg",
      }).catch((err) => {
        console.error("Transcription failed:", err);
      });

      return transcriptId;
    } catch (err: any) {
      console.error("Upload error:", err);
      setError(err.message || "Upload failed");
      setStatus("error");
      return null;
    }
  }, [createTranscript, generateUploadUrl, saveRecording, transcribeFile]);

  const reset = useCallback(() => {
    setStatus("idle");
    setProgress(0);
    setError(null);
  }, []);

  return { status, progress, error, uploadFile, reset };
}
```

### File Input Component
```typescript
// Source: MDN file input + mobile best practices
// app/components/audio/file-upload.tsx

"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useFileUpload } from "@/app/lib/hooks/use-file-upload";

// Accept attribute: both MIME types and extensions for cross-device compat
const ACCEPT = [
  "audio/mpeg", ".mp3",
  "audio/wav", "audio/x-wav", "audio/wave", ".wav",
  "audio/mp4", "audio/x-m4a", ".m4a",
  "audio/webm", ".webm",
].join(",");

export function FileUpload() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { status, progress, error, uploadFile, reset } = useFileUpload();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const transcriptId = await uploadFile(file);
    if (transcriptId) {
      router.push(`/transcripts/${transcriptId}`);
    }

    // Reset file input so same file can be re-selected
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPT}
        onChange={handleFileSelect}
        className="hidden"
      />

      {status === "idle" && (
        <button onClick={() => fileInputRef.current?.click()}>
          Select Audio File
        </button>
      )}

      {status === "uploading" && (
        <div>
          <p>Uploading... {progress}%</p>
          <div style={{ width: `${progress}%`, height: 4, backgroundColor: "#D4622B" }} />
        </div>
      )}

      {status === "processing" && (
        <p>Transcribing your file...</p>
      )}

      {error && (
        <div>
          <p>{error}</p>
          <button onClick={reset}>Try Again</button>
        </div>
      )}
    </div>
  );
}
```

### Convex Action: Transcribe Uploaded File
```typescript
// Source: Existing deepgram.ts pattern + Convex storage.get docs
// convex/deepgram.ts - Add to existing file

export const transcribeFile = action({
  args: {
    transcriptId: v.id("transcripts"),
    storageId: v.id("_storage"),
    mimeType: v.string(),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.DEEPGRAM_API_KEY;
    if (!apiKey) throw new Error("DEEPGRAM_API_KEY not configured");

    // Mark transcript as processing
    await ctx.runMutation(internal.transcripts.setStatus, {
      transcriptId: args.transcriptId,
      status: "processing",
    });

    try {
      // Read file from Convex storage (returns Blob)
      const blob = await ctx.storage.get(args.storageId);
      if (!blob) throw new Error("File not found in storage");

      const audioBytes = new Uint8Array(await blob.arrayBuffer());
      const contentType = args.mimeType.split(";")[0].trim();

      // POST to Deepgram (same endpoint as live, full file)
      const response = await fetch(
        "https://api.deepgram.com/v1/listen?" +
        "model=nova-2&diarize=true&punctuate=true&smart_format=true",
        {
          method: "POST",
          headers: {
            "Authorization": `Token ${apiKey}`,
            "Content-Type": contentType,
          },
          body: audioBytes,
        }
      );

      if (!response.ok) {
        throw new Error(`Deepgram error: ${response.status}`);
      }

      const result = await response.json();
      const words = result.results?.channels?.[0]?.alternatives?.[0]?.words || [];
      const duration = result.metadata?.duration || 0;

      if (words.length > 0) {
        await ctx.runMutation(internal.transcripts.appendWords, {
          transcriptId: args.transcriptId,
          words: words.map((w: any) => ({
            text: w.punctuated_word || w.word,
            speaker: w.speaker ?? 0,
            startTime: w.start,
            endTime: w.end,
            isFinal: true,
          })),
        });
      }

      // Complete with duration from Deepgram metadata
      await ctx.runMutation(internal.transcripts.completeTranscript, {
        transcriptId: args.transcriptId,
        duration: Math.round(duration),
      });

    } catch (error: any) {
      console.error("transcribeFile error:", error);
      await ctx.runMutation(internal.transcripts.markError, {
        transcriptId: args.transcriptId,
        error: error.message || "Transcription failed",
      });
    }
  },
});
```

### Processing Status Indicator in Transcript Detail
```typescript
// Source: Existing transcript detail page pattern
// Add to transcript detail view when status === "processing"

{transcript.status === "processing" && (
  <div className="flex flex-col items-center" style={{ padding: "32px 16px", gap: 12 }}>
    <div className="animate-spin" style={{
      width: 32, height: 32, border: "3px solid #EDE6DD",
      borderTopColor: "#D4622B", borderRadius: "50%"
    }} />
    <span style={{ fontSize: 14, fontWeight: 500, color: "#8B7E74" }}>
      Transcribing your file...
    </span>
    <span style={{ fontSize: 12, color: "#B5A99A" }}>
      This usually takes a few seconds
    </span>
  </div>
)}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Deepgram Nova-2 for pre-recorded | Nova-3 available (47% better WER) | 2025 | Nova-3 has 5.26% WER vs Nova-2's 8.4%, but costs more. Start with Nova-2 (already configured), upgrade later |
| fetch() upload with no progress | XMLHttpRequest.upload.onprogress | Always been available | fetch() still lacks upload progress events; XHR remains the standard |
| Custom chunked upload | Convex generateUploadUrl | Convex feature (stable) | Single POST with pre-signed URL; no chunking needed for files under 2GB |
| Client-side Deepgram call | Convex action proxy | Phase 1 decision (security) | Same pattern extends to file uploads; API key stays server-side |

**Deprecated/outdated:**
- Direct browser-to-Deepgram file upload: Security risk (exposes API key)
- Deepgram Nova-1/Base models: Nova-2 is the minimum recommended for quality
- Manual file chunking for upload: Convex upload URLs handle large files natively

## Open Questions

1. **Nova-2 vs Nova-3 for File Uploads**
   - What we know: Nova-3 has significantly better accuracy (5.26% vs 8.4% WER) for pre-recorded audio. Nova-2 is cheaper.
   - What's unclear: Whether the accuracy difference justifies the cost increase for this app's use case.
   - Recommendation: Start with Nova-2 (already configured, matches live recording quality). Nova-3 upgrade is a simple parameter change (`model=nova-3`) that can be added later or made a user setting.

2. **Maximum Practical File Size**
   - What we know: Deepgram accepts up to 2GB. Convex upload URL has 2-minute POST timeout. Action execution is 10 minutes.
   - What's unclear: Exact upload speed on typical mobile connections; whether a 200MB file reliably uploads within 2 minutes on 4G.
   - Recommendation: Set 100MB client-side limit (conservative). This covers ~3 hours of MP3 at 128kbps or ~1 hour of WAV. Can increase later with user feedback.

3. **Batch Upload (Multiple Files at Once)**
   - What we know: Success criteria only requires single-file upload. Multiple file upload adds complexity.
   - What's unclear: Whether users will expect multi-file support.
   - Recommendation: Implement single-file upload for Phase 2. The architecture supports easy extension to multi-file (loop over files, create multiple transcripts).

4. **Existing `transcribeChunk` Using `w.word` Instead of `w.punctuated_word`**
   - What we know: The existing Phase 1 `transcribeChunk` action uses `w.word` for text extraction. With `punctuate=true` and `smart_format=true`, Deepgram returns `punctuated_word` with proper casing and punctuation.
   - What's unclear: Whether changing this for live recordings would cause issues with the incremental transcription approach.
   - Recommendation: Use `w.punctuated_word || w.word` in the new `transcribeFile` action. Consider updating `transcribeChunk` as well (separate improvement).

## Sources

### Primary (HIGH confidence)
- [Deepgram Pre-Recorded Audio API Reference](https://developers.deepgram.com/reference/speech-to-text/listen-pre-recorded) - Endpoint, parameters, response schema
- [Deepgram Diarization Docs](https://developers.deepgram.com/docs/diarization) - Speaker diarization for pre-recorded audio
- [Deepgram Supported Audio Formats](https://developers.deepgram.com/docs/supported-audio-formats) - 100+ formats including MP3, WAV, M4A, WebM
- [Convex File Storage Upload Docs](https://docs.convex.dev/file-storage/upload-files) - generateUploadUrl, upload workflow
- [Convex File Storage Serve Docs](https://docs.convex.dev/file-storage/serve-files) - ctx.storage.get() returns Blob in actions
- [Convex StorageActionWriter API](https://docs.convex.dev/api/interfaces/server.StorageActionWriter) - get(), store(), getUrl() methods
- [Convex Limits](https://docs.convex.dev/production/state/limits) - Action timeout (10min), arg size (16MB/5MB), storage limits
- [Convex Actions Docs](https://docs.convex.dev/functions/actions) - ctx.storage access, ctx.runMutation, fetch support
- Existing codebase: `convex/deepgram.ts`, `convex/recordings.ts`, `convex/transcripts.ts`, `convex/schema.ts` - Verified reuse patterns

### Secondary (MEDIUM confidence)
- [Deepgram Nova-3 vs Nova-2 Comparison](https://deepgram.com/learn/model-comparison-when-to-use-nova-2-vs-nova-3-for-devs) - Model accuracy and cost tradeoffs
- [MDN: HTMLAudioElement](https://developer.mozilla.org/en-US/docs/Web/API/HTMLAudioElement) - Audio duration via loadedmetadata event
- [Convex Community: Storage limits](https://discord-questions.convex.dev/m/1072053527112859658) - Upload URL timeout behavior

### Tertiary (LOW confidence)
- WebSearch results for "Next.js file upload progress tracking" - XHR vs fetch for progress events
- WebSearch results for "iOS PWA file input behavior" - Mobile file picker edge cases

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - No new dependencies; all existing libraries verified in Phase 1
- Architecture patterns: HIGH - Upload-then-process pattern verified via Convex docs (storage.get in actions, generateUploadUrl workflow)
- Deepgram pre-recorded API: HIGH - Same REST endpoint already used in Phase 1, response structure verified from official API reference
- Pitfalls: MEDIUM - MIME type and iOS edge cases based on community reports, need physical device testing
- Code examples: HIGH - Based on existing codebase patterns and official documentation

**Research date:** 2026-02-10
**Valid until:** ~30 days (stable stack, all dependencies from Phase 1)

**Phase 2 Requirements Coverage:**
- REC-02 (Upload audio files MP3, WAV, M4A, WebM): Covered - file input with accept attribute, Convex storage upload, Deepgram transcription
- SC-1 (Upload from device storage): Covered - `<input type="file">` with accept attribute
- SC-2 (Upload progress + error messages): Covered - XHR upload progress, client-side validation
- SC-3 (Same transcription quality): Covered - Same Deepgram endpoint/parameters, diarization + timestamps
- SC-4 (View in same interface): Covered - Reuse existing transcript detail view, add source indicator

**Critical for Phase 2 Success:**
1. Upload file to Convex storage FIRST, then read in action via `ctx.storage.get()` (avoids arg size limits)
2. Add `"processing"` status to schema so UI shows transcription-in-progress state
3. Validate file type/size client-side before upload (save bandwidth, better UX)
4. Use `punctuated_word` from Deepgram response (not `word`) for properly formatted text
5. Test file picker on physical iOS device in both Safari and PWA mode
