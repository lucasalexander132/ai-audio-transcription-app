import { v } from "convex/values";
import { action, query, internalMutation } from "./_generated/server";
import { internal, api } from "./_generated/api";
import { auth } from "./auth";

const SUMMARY_SYSTEM_PROMPT = `You are an expert meeting and conversation summarizer. Given a transcript with speaker labels, produce a structured summary.

Guidelines:
- overview: Write 4-6 sentences covering the main topics discussed, key decisions made, and outcomes reached. Be specific and reference actual content.
- key_points: Extract the most important discussion points. Scale the number based on content length (3-5 for short transcripts under 5 minutes, 5-8 for medium 5-30 minutes, 8-12 for long 30+ minutes). Each point should be a complete, standalone sentence.
- action_items: Identify any tasks, commitments, or follow-ups mentioned. Assign to the speaker who committed to or was assigned the task. Use "Unassigned" when no specific person is responsible. Include ALL action items even if no assignee is clear. If no action items are found, return an empty array.

Important:
- Be factual - only include information explicitly stated in the transcript.
- Use speaker names as they appear in the transcript (e.g., "Speaker 1", "Sarah Chen").
- If the transcript is very short or contains minimal content, provide appropriately brief output.

Respond ONLY with valid JSON matching this exact structure (no markdown fences, no extra text):
{
  "overview": "string",
  "key_points": ["string", ...],
  "action_items": [{"text": "string", "assignee": "string"}, ...]
}`;

export const generateSummary = action({
  args: { transcriptId: v.id("transcripts") },
  handler: async (ctx, args) => {
    // Auth check
    const userId = await auth.getUserId(ctx);
    if (userId === null) {
      throw new Error("Not authenticated");
    }

    // Verify transcript belongs to user
    const transcript = await ctx.runQuery(api.transcripts.get, {
      id: args.transcriptId,
    });
    if (transcript === null) {
      throw new Error("Transcript not found or unauthorized");
    }

    // Check if summary already exists
    const existingSummary = await ctx.runQuery(api.ai.getSummary, {
      transcriptId: args.transcriptId,
    });
    if (existingSummary !== null) {
      throw new Error("Summary already generated for this transcript");
    }

    // Load words sorted by startTime
    const words = await ctx.runQuery(api.transcripts.getWords, {
      transcriptId: args.transcriptId,
    });

    if (words.length === 0) {
      throw new Error("No transcript text available to summarize");
    }

    // Load speaker labels for this transcript
    const speakerLabels = await ctx.runQuery(api.transcripts.getSpeakerLabels, {
      transcriptId: args.transcriptId,
    });

    // Build speaker label lookup map
    const labelMap = new Map<number, string>();
    for (const label of speakerLabels) {
      labelMap.set(label.speakerNumber, label.label);
    }

    // Build speaker-annotated text: group consecutive words by speaker
    let annotatedText = "";
    let currentSpeaker: number | null = null;

    for (const word of words) {
      const speaker = word.speaker ?? 0;
      if (speaker !== currentSpeaker) {
        // New speaker segment
        if (annotatedText.length > 0) {
          annotatedText += "\n";
        }
        const speakerName =
          labelMap.get(speaker) ?? `Speaker ${speaker + 1}`;
        annotatedText += `${speakerName}: ${word.text}`;
        currentSpeaker = speaker;
      } else {
        annotatedText += ` ${word.text}`;
      }
    }

    // Call Claude API
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY not configured. Set it via: npx convex env set ANTHROPIC_API_KEY <key>");
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "content-type": "application/json",
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5",
        max_tokens: 4096,
        system: SUMMARY_SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: `Summarize this transcript:\n\n${annotatedText}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Claude API error: ${response.status} ${errorText}`);
    }

    const result = await response.json();
    const responseText = result.content?.[0]?.text;

    if (!responseText) {
      throw new Error("Claude API returned empty response");
    }

    // Parse JSON response
    let summary: {
      overview: string;
      key_points: string[];
      action_items: Array<{ text: string; assignee: string }>;
    };

    try {
      summary = JSON.parse(responseText);
    } catch {
      throw new Error(
        `Failed to parse Claude response as JSON: ${responseText.substring(0, 200)}`
      );
    }

    // Validate required fields
    if (
      typeof summary.overview !== "string" ||
      !Array.isArray(summary.key_points) ||
      !Array.isArray(summary.action_items)
    ) {
      throw new Error("Claude response missing required fields (overview, key_points, action_items)");
    }

    // Store result via internal mutation
    await ctx.runMutation(internal.ai.storeSummary, {
      transcriptId: args.transcriptId,
      userId,
      overview: summary.overview,
      keyPoints: summary.key_points,
      actionItems: summary.action_items.map((item) => ({
        text: item.text,
        assignee: item.assignee || "Unassigned",
      })),
      generatedAt: Date.now(),
      model: "claude-haiku-4-5",
    });

    return {
      overview: summary.overview,
      keyPoints: summary.key_points,
      actionItems: summary.action_items,
    };
  },
});

export const storeSummary = internalMutation({
  args: {
    transcriptId: v.id("transcripts"),
    userId: v.id("users"),
    overview: v.string(),
    keyPoints: v.array(v.string()),
    actionItems: v.array(
      v.object({
        text: v.string(),
        assignee: v.string(),
      })
    ),
    generatedAt: v.number(),
    model: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("aiSummaries", args);
  },
});

export const getSummary = query({
  args: { transcriptId: v.id("transcripts") },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (userId === null) {
      return null;
    }

    // Verify transcript belongs to user
    const transcript = await ctx.db.get(args.transcriptId);
    if (transcript === null || transcript.userId !== userId) {
      return null;
    }

    const summary = await ctx.db
      .query("aiSummaries")
      .withIndex("by_transcript", (q) =>
        q.eq("transcriptId", args.transcriptId)
      )
      .first();

    return summary;
  },
});
