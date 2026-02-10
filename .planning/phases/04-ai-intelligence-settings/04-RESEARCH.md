# Phase 4: AI Intelligence & Settings - Research

**Researched:** 2026-02-10
**Domain:** Claude API integration, Deepgram language/punctuation settings, Convex action patterns
**Confidence:** HIGH

## Summary

This phase adds two distinct features: (1) AI-generated summaries via the Anthropic Claude API for completed transcripts, and (2) transcription settings (language selection, auto-punctuation toggle) persisted per-user and applied to Deepgram API calls.

The AI summary feature requires a new Convex action that calls the Claude Messages API with the transcript's `fullText`, receives structured JSON output (overview, key points, action items), stores the result in a new `aiSummaries` table, and surfaces it through the existing `AiSummary` component which already has the tab UI, empty state, and `AiSummaryContent` display component scaffolded. The settings feature requires a new `userSettings` table in Convex, a query/mutation pair to read/write settings, and wiring those settings into the Deepgram API call URL.

**Primary recommendation:** Use direct `fetch` to the Claude Messages API (no SDK needed) from a Convex Node.js action, with the `output_config.format` structured outputs feature to guarantee valid JSON responses. Use `claude-haiku-4-5` for cost-effective summarization. Store AI summaries in a dedicated table with a one-to-one relationship to transcripts.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Anthropic Messages API | v1 (2023-06-01) | AI summary generation | Decision: Claude API. Direct fetch avoids SDK dependency in Convex |
| Convex actions (Node.js runtime) | 1.31+ | Backend orchestration | Already used for Deepgram calls in `deepgram.ts` |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `claude-haiku-4-5` model | Current | Summary generation | Cost-effective ($1/$5 per M tokens) yet high quality for summarization |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Direct fetch | `@anthropic-ai/sdk` | SDK adds dependency; Convex actions already use raw fetch for Deepgram; keep consistent |
| `claude-haiku-4-5` | `claude-sonnet-4-5` | 3x cost ($3/$15), marginal quality gain for summarization; haiku is plenty for this task |
| `output_config.format` structured outputs | Prompt-only JSON | Structured outputs guarantees valid JSON with no parse errors; no extra cost |

### No Installation Required

No new npm packages needed. The Claude API is called via `fetch` from Convex Node.js actions, matching the existing Deepgram pattern.

## Architecture Patterns

### Recommended Schema Additions

```typescript
// Add to convex/schema.ts

aiSummaries: defineTable({
  transcriptId: v.id("transcripts"),
  userId: v.id("users"),
  overview: v.string(),
  keyPoints: v.array(v.string()),
  actionItems: v.array(v.object({
    text: v.string(),
    assignee: v.string(), // Speaker name or "Unassigned"
  })),
  generatedAt: v.number(),
  model: v.string(), // Track which model was used
}).index("by_transcript", ["transcriptId"]),

userSettings: defineTable({
  userId: v.id("users"),
  transcriptionLanguage: v.optional(v.string()),  // BCP-47 code, default "en"
  autoPunctuation: v.optional(v.boolean()),        // default true
}).index("by_userId", ["userId"]),
```

### Pattern 1: AI Summary Generation (Convex Action)

**What:** A Convex action that fetches transcript text, calls Claude API, and stores the result.
**When to use:** When user taps "Generate Summary" on the AI tab.

```typescript
// convex/ai.ts
import { v } from "convex/values";
import { action, internalMutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { auth } from "./auth";

// Action: calls Claude API (runs in Node.js runtime)
export const generateSummary = action({
  args: { transcriptId: v.id("transcripts") },
  handler: async (ctx, args) => {
    // 1. Get transcript data
    const transcript = await ctx.runQuery(internal.ai.getTranscriptForSummary, {
      transcriptId: args.transcriptId,
    });
    if (!transcript) throw new Error("Transcript not found");

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured");

    // 2. Call Claude API with structured output
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "content-type": "application/json",
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5",
        max_tokens: 2048,
        system: SUMMARY_SYSTEM_PROMPT,
        messages: [{ role: "user", content: transcript.fullText }],
        output_config: {
          format: {
            type: "json_schema",
            schema: SUMMARY_SCHEMA,
          },
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Claude API error: ${response.status} ${error}`);
    }

    const result = await response.json();
    const summary = JSON.parse(result.content[0].text);

    // 3. Store result via mutation
    await ctx.runMutation(internal.ai.storeSummary, {
      transcriptId: args.transcriptId,
      userId: transcript.userId,
      overview: summary.overview,
      keyPoints: summary.key_points,
      actionItems: summary.action_items,
      model: "claude-haiku-4-5",
    });
  },
});
```

### Pattern 2: Structured Output Schema for Summaries

**What:** JSON schema passed to Claude's `output_config.format` to guarantee valid response structure.

```typescript
const SUMMARY_SCHEMA = {
  type: "object",
  properties: {
    overview: {
      type: "string",
      description: "A 4-6 sentence summary covering the main topics discussed, key decisions made, and outcomes reached."
    },
    key_points: {
      type: "array",
      items: { type: "string" },
      description: "Key discussion points extracted from the transcript. Scale with content length: 3-5 for short, 5-8 for medium, 8-12 for long transcripts."
    },
    action_items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          text: { type: "string", description: "The action item description" },
          assignee: { type: "string", description: "The speaker/person responsible, or 'Unassigned' if unclear" }
        },
        required: ["text", "assignee"],
        additionalProperties: false
      },
      description: "Action items identified in the transcript, with assigned speakers when mentioned."
    }
  },
  required: ["overview", "key_points", "action_items"],
  additionalProperties: false
};
```

### Pattern 3: User Settings (Read with Defaults)

**What:** A settings query that returns defaults when no settings document exists yet.

```typescript
// convex/settings.ts
export const getUserSettings = query({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (userId === null) return null;

    const settings = await ctx.db
      .query("userSettings")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    // Return with defaults applied
    return {
      transcriptionLanguage: settings?.transcriptionLanguage ?? "en",
      autoPunctuation: settings?.autoPunctuation ?? true,
    };
  },
});

export const updateSettings = mutation({
  args: {
    transcriptionLanguage: v.optional(v.string()),
    autoPunctuation: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (userId === null) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("userSettings")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, args);
    } else {
      await ctx.db.insert("userSettings", { userId, ...args });
    }
  },
});
```

### Pattern 4: Wiring Settings into Deepgram URL

**What:** Pass user settings to the Deepgram API call URL dynamically.

```typescript
// In deepgram.ts - modify the URL construction
const params = new URLSearchParams({
  model: "nova-2",
  diarize: "true",
  smart_format: "true",
});

// Apply user settings
if (language && language !== "en") {
  params.set("language", language);
}
if (autoPunctuation) {
  params.set("punctuate", "true");
} else {
  // When auto-punctuation is off, don't pass punctuate
  // Note: smart_format implies punctuate=true, so remove it too
  params.delete("smart_format");
}

const url = `https://api.deepgram.com/v1/listen?${params.toString()}`;
```

### Anti-Patterns to Avoid
- **Calling Claude from a mutation:** Mutations have a 1-second execution limit. Always use actions for external API calls.
- **Storing fullText in the summary:** Don't duplicate the transcript text in the summary table. Query it separately.
- **Re-generating summaries:** The decision is one-time generation. Don't add a regenerate button. Check if summary exists before showing the generate button.
- **Using the Anthropic SDK in Convex:** The SDK adds unnecessary dependency. Direct fetch matches the existing Deepgram pattern and works perfectly in Convex Node.js actions.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JSON validation from AI | Manual JSON.parse + try/catch + retry | Claude `output_config.format` structured outputs | Guarantees valid JSON matching schema, zero parse errors |
| Prompt engineering for structured output | Custom parsing of freeform text | Structured outputs with JSON schema | Claude constrains its output at the decoding level |
| Language code list | Hardcoded array of codes | Static list from Deepgram docs | 36+ languages for Nova-2; reference list is stable |
| Settings defaults | Complex conditional logic | Convex query with nullish coalescing | `settings?.field ?? defaultValue` pattern is clean |

**Key insight:** The Claude structured outputs feature eliminates the entire category of "AI returned malformed JSON" bugs. Use it instead of prompt-engineering JSON format or building retry logic.

## Common Pitfalls

### Pitfall 1: Calling external APIs from mutations
**What goes wrong:** Mutation times out after 1 second when waiting for Claude API response.
**Why it happens:** Mutations are designed for fast database operations only.
**How to avoid:** Always use `action` for external API calls. The existing `deepgram.ts` already follows this pattern.
**Warning signs:** "Function execution timed out" errors in Convex logs.

### Pitfall 2: Missing authentication check in AI action
**What goes wrong:** Any user can generate summaries for any transcript.
**Why it happens:** Actions don't automatically scope by user.
**How to avoid:** Always verify `userId` matches `transcript.userId` before generating. Use an internal query helper.
**Warning signs:** Users seeing other users' transcripts.

### Pitfall 3: Smart format overriding punctuation setting
**What goes wrong:** Auto-punctuation toggle has no effect because `smart_format=true` implies `punctuate=true`.
**Why it happens:** Deepgram's `smart_format` feature automatically enables punctuation.
**How to avoid:** When `autoPunctuation` is false, also remove `smart_format` from the Deepgram URL.
**Warning signs:** Punctuation appearing despite the toggle being off.

### Pitfall 4: Large transcripts exceeding Claude context window
**What goes wrong:** Claude API returns 400 error for very long transcripts.
**Why it happens:** `claude-haiku-4-5` has a 200k token context window, but extremely long transcripts could approach this.
**How to avoid:** For most use cases (1-2 hour meetings), fullText will be well within limits. If needed, truncate to ~150k characters (roughly 50k tokens) with a note.
**Warning signs:** Transcripts over 2 hours with dense multi-speaker dialogue.

### Pitfall 5: Convex action timeout for very slow Claude responses
**What goes wrong:** Convex action times out after 10 minutes.
**Why it happens:** Claude API can be slow for very large inputs.
**How to avoid:** `claude-haiku-4-5` is fast (typically <5 seconds). With `max_tokens: 2048`, output is bounded. This is unlikely to be an issue.
**Warning signs:** Consistent timeout errors for long transcripts.

### Pitfall 6: Race condition on double-tap "Generate Summary"
**What goes wrong:** Two summaries created for the same transcript.
**Why it happens:** User taps button twice while first request is in-flight.
**How to avoid:** Disable the button after first tap (optimistic UI). Also add a check in the mutation: if summary already exists for this transcriptId, skip insertion.
**Warning signs:** Duplicate entries in `aiSummaries` table.

## Code Examples

### Claude API Call with Structured Outputs (Direct Fetch)

```typescript
// Source: https://platform.claude.com/docs/en/build-with-claude/structured-outputs
// Verified: This is the GA (non-beta) approach using output_config.format

const response = await fetch("https://api.anthropic.com/v1/messages", {
  method: "POST",
  headers: {
    "x-api-key": process.env.ANTHROPIC_API_KEY!,
    "content-type": "application/json",
    "anthropic-version": "2023-06-01",
  },
  body: JSON.stringify({
    model: "claude-haiku-4-5",
    max_tokens: 2048,
    temperature: 0.3, // Lower temperature for consistent, factual summaries
    system: "You are a meeting summarizer. Given a transcript, extract a structured summary.",
    messages: [
      {
        role: "user",
        content: `Summarize this transcript:\n\n${fullText}`,
      },
    ],
    output_config: {
      format: {
        type: "json_schema",
        schema: {
          type: "object",
          properties: {
            overview: { type: "string" },
            key_points: { type: "array", items: { type: "string" } },
            action_items: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  text: { type: "string" },
                  assignee: { type: "string" },
                },
                required: ["text", "assignee"],
                additionalProperties: false,
              },
            },
          },
          required: ["overview", "key_points", "action_items"],
          additionalProperties: false,
        },
      },
    },
  }),
});

const result = await response.json();
// result.content[0].text is guaranteed valid JSON matching the schema
const summary = JSON.parse(result.content[0].text);
```

### System Prompt for Summary Quality

```typescript
const SUMMARY_SYSTEM_PROMPT = `You are an expert meeting and conversation summarizer. Given a transcript, produce a structured summary.

Guidelines:
- Overview: Write 4-6 sentences covering the main topics discussed, key decisions made, and outcomes reached. Be specific and reference actual content.
- Key Points: Extract the most important discussion points. Scale the number based on content length (3-5 for short transcripts under 5 minutes, 5-8 for medium 5-30 minutes, 8-12 for long 30+ minutes). Each point should be a complete, standalone sentence.
- Action Items: Identify any tasks, commitments, or follow-ups mentioned. Assign to the speaker who committed to or was assigned the task. Use "Unassigned" when no specific person is responsible. Include ALL action items even if no assignee is clear.

Important:
- Be factual - only include information explicitly stated in the transcript.
- Use speaker labels (e.g., "Speaker 1", "Speaker 2") as they appear in the transcript.
- If the transcript is very short or contains minimal content, provide appropriately brief output.
- If no action items are found, return an empty action_items array.`;
```

### Deepgram URL with Settings Parameters

```typescript
// Source: https://developers.deepgram.com/docs/language
// Source: https://developers.deepgram.com/docs/punctuation

// Current hardcoded URL in deepgram.ts:
// "https://api.deepgram.com/v1/listen?model=nova-2&diarize=true&punctuate=true&smart_format=true"

// New dynamic URL construction:
function buildDeepgramUrl(settings: { language: string; autoPunctuation: boolean }): string {
  const params = new URLSearchParams();
  params.set("model", "nova-2");
  params.set("diarize", "true");

  // Language: pass as-is (BCP-47 code)
  if (settings.language && settings.language !== "en") {
    params.set("language", settings.language);
  }

  // Punctuation: smart_format implies punctuate, so control both together
  if (settings.autoPunctuation) {
    params.set("punctuate", "true");
    params.set("smart_format", "true");
  }
  // When autoPunctuation is false, omit both punctuate and smart_format

  return `https://api.deepgram.com/v1/listen?${params.toString()}`;
}
```

### Skeleton Loading Animation (CSS + Tailwind)

```tsx
// Skeleton placeholder for AI summary generation in progress
function SummarySkeleton() {
  return (
    <div className="flex flex-col" style={{ gap: 20 }}>
      {/* Overview skeleton */}
      <div
        style={{
          backgroundColor: "#FFFFFF",
          borderRadius: 16,
          border: "1px solid #EDE6DD",
          padding: 16,
        }}
      >
        <div className="animate-pulse flex flex-col" style={{ gap: 10 }}>
          <div className="rounded" style={{ width: 100, height: 12, backgroundColor: "#EDE6DD" }} />
          <div className="rounded" style={{ width: "100%", height: 12, backgroundColor: "#F5EDE4" }} />
          <div className="rounded" style={{ width: "90%", height: 12, backgroundColor: "#F5EDE4" }} />
          <div className="rounded" style={{ width: "95%", height: 12, backgroundColor: "#F5EDE4" }} />
          <div className="rounded" style={{ width: "60%", height: 12, backgroundColor: "#F5EDE4" }} />
        </div>
      </div>

      {/* Key points skeleton */}
      <div
        style={{
          backgroundColor: "#FFFFFF",
          borderRadius: 16,
          border: "1px solid #EDE6DD",
          padding: 16,
        }}
      >
        <div className="animate-pulse flex flex-col" style={{ gap: 10 }}>
          <div className="rounded" style={{ width: 90, height: 12, backgroundColor: "#EDE6DD" }} />
          <div className="rounded" style={{ width: "85%", height: 12, backgroundColor: "#F5EDE4" }} />
          <div className="rounded" style={{ width: "75%", height: 12, backgroundColor: "#F5EDE4" }} />
          <div className="rounded" style={{ width: "80%", height: 12, backgroundColor: "#F5EDE4" }} />
        </div>
      </div>

      {/* Action items skeleton */}
      <div
        style={{
          backgroundColor: "#FFFFFF",
          borderRadius: 16,
          border: "1px solid #EDE6DD",
          padding: 16,
        }}
      >
        <div className="animate-pulse flex flex-col" style={{ gap: 10 }}>
          <div className="rounded" style={{ width: 110, height: 12, backgroundColor: "#EDE6DD" }} />
          <div className="rounded" style={{ width: "70%", height: 12, backgroundColor: "#F5EDE4" }} />
          <div className="rounded" style={{ width: "65%", height: 12, backgroundColor: "#F5EDE4" }} />
        </div>
      </div>
    </div>
  );
}
```

### Searchable Language Dropdown

```tsx
// Deepgram Nova-2 supported languages for the settings dropdown
const SUPPORTED_LANGUAGES = [
  { code: "en", name: "English" },
  { code: "en-US", name: "English (US)" },
  { code: "en-GB", name: "English (UK)" },
  { code: "en-AU", name: "English (Australia)" },
  { code: "en-IN", name: "English (India)" },
  { code: "zh", name: "Chinese (Mandarin, Simplified)" },
  { code: "zh-TW", name: "Chinese (Mandarin, Traditional)" },
  { code: "nl", name: "Dutch" },
  { code: "fr", name: "French" },
  { code: "fr-CA", name: "French (Canada)" },
  { code: "de", name: "German" },
  { code: "hi", name: "Hindi" },
  { code: "id", name: "Indonesian" },
  { code: "it", name: "Italian" },
  { code: "ja", name: "Japanese" },
  { code: "ko", name: "Korean" },
  { code: "ms", name: "Malay" },
  { code: "no", name: "Norwegian" },
  { code: "pl", name: "Polish" },
  { code: "pt", name: "Portuguese" },
  { code: "pt-BR", name: "Portuguese (Brazil)" },
  { code: "ru", name: "Russian" },
  { code: "es", name: "Spanish" },
  { code: "es-419", name: "Spanish (Latin America)" },
  { code: "sv", name: "Swedish" },
  { code: "th", name: "Thai" },
  { code: "tr", name: "Turkish" },
  { code: "uk", name: "Ukrainian" },
  { code: "vi", name: "Vietnamese" },
  { code: "da", name: "Danish" },
  { code: "fi", name: "Finnish" },
  { code: "el", name: "Greek" },
  { code: "hu", name: "Hungarian" },
  { code: "ro", name: "Romanian" },
  { code: "cs", name: "Czech" },
  { code: "bg", name: "Bulgarian" },
  { code: "sk", name: "Slovak" },
  { code: "multi", name: "Multilingual (auto-detect)" },
] as const;
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `output_format` parameter | `output_config.format` parameter | Late 2025 | `output_format` still works but deprecated; use `output_config.format` |
| Beta header required for structured outputs | GA, no beta header needed | Late 2025 | Simplifies request; just add `output_config.format` to body |
| Prompt-engineer JSON format | Structured outputs with JSON schema | 2025 | Guarantees valid JSON; no parse errors; no retry needed |

**Deprecated/outdated:**
- `anthropic-beta: structured-outputs-2025-11-13` header: No longer required. The feature is GA.
- `output_format` parameter: Replaced by `output_config.format`. Still works temporarily.

## Existing Code Inventory

Key files that already exist and need modification or integration:

| File | What Exists | What Phase 4 Does |
|------|-------------|-------------------|
| `app/components/audio/ai-summary.tsx` | Empty state with "Generate Summary" button, `AiSummaryContent` component with overview/key points/action items/topics display | Wire to real backend; add loading skeleton; add query for existing summary |
| `app/(app)/transcripts/[id]/page.tsx` | Tab switcher ("Transcript" / "AI Summary"), renders `<AiSummary>` | No changes needed - already wired |
| `app/(app)/settings/page.tsx` | Transcription section with Language row (static "English"), Auto-Punctuation toggle (local state) | Make Language interactive (searchable dropdown); persist settings to Convex |
| `convex/deepgram.ts` | Hardcoded Deepgram URL with `punctuate=true&smart_format=true` | Read user settings and build URL dynamically |
| `convex/schema.ts` | Current schema without AI or settings tables | Add `aiSummaries` and `userSettings` tables |

## Open Questions

1. **Speaker names in action items vs speaker numbers**
   - What we know: The transcript stores `speaker` as a number (0, 1, 2...). Speaker labels can be customized via `speakerLabels` table. The AI prompt receives `fullText` which is just concatenated words without speaker markers.
   - What's unclear: To get speaker-aware summaries, we need to include speaker information in the text sent to Claude. The `fullText` field doesn't include speaker labels.
   - Recommendation: Build the text sent to Claude from words + speaker labels (not from `fullText`), formatting it as "Speaker 1: ...\nSpeaker 2: ..." to enable proper action item attribution. Create an internal query that constructs speaker-annotated text.

2. **Topics section in AiSummaryContent**
   - What we know: The existing `AiSummaryContent` component includes a "Topics Detected" section with `TopicChip` components. The CONTEXT.md decisions don't mention topics.
   - What's unclear: Whether to include topic extraction in the AI summary or remove the topics section.
   - Recommendation: Omit topics from the JSON schema and hide the topics section. The decisions specify overview + key points + action items. Topics can be added later.

## Sources

### Primary (HIGH confidence)
- [Anthropic Messages API Reference](https://platform.claude.com/docs/en/api/messages) - Request/response format, model names, parameters
- [Anthropic Structured Outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs) - `output_config.format` GA syntax, JSON schema, examples
- [Deepgram Language Support](https://developers.deepgram.com/docs/language) - `language` query parameter
- [Deepgram Models & Languages Overview](https://developers.deepgram.com/docs/models-languages-overview) - Nova-2 supported language codes
- [Convex Actions Tutorial](https://docs.convex.dev/tutorial/actions) - Action patterns for external API calls
- [Convex Limits](https://docs.convex.dev/production/state/limits) - Action timeout (10 min), mutation limits (1s)

### Secondary (MEDIUM confidence)
- [Deepgram Punctuation](https://developers.deepgram.com/docs/punctuation) - `punctuate` parameter behavior
- [Anthropic API Pricing](https://platform.claude.com/docs/en/about-claude/pricing) - Model costs ($1/$5 for Haiku 4.5)
- [Convex Environment Variables](https://docs.convex.dev/production/environment-variables) - `npx convex env set` for API keys

### Tertiary (LOW confidence)
- None - all findings verified with primary or secondary sources

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Direct fetch to Claude API matches existing Deepgram pattern; structured outputs are GA and well-documented
- Architecture: HIGH - Schema design follows Convex conventions; patterns verified against Convex docs and existing codebase
- Pitfalls: HIGH - Mutation timeout, smart_format/punctuate interaction, race conditions are well-known issues with documented solutions
- AI prompt engineering: MEDIUM - Prompt quality is subjective; the structure is solid but may need tuning based on real transcript data

**Research date:** 2026-02-10
**Valid until:** 2026-03-10 (30 days - stable APIs, no breaking changes expected)
