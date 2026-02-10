import { v } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";

export const transcribeChunk = action({
  args: {
    transcriptId: v.id("transcripts"),
    audioData: v.bytes(),
    mimeType: v.string(),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.DEEPGRAM_API_KEY;
    if (!apiKey) {
      throw new Error("DEEPGRAM_API_KEY not configured");
    }

    const response = await fetch(
      "https://api.deepgram.com/v1/listen?model=nova-2&diarize=true&punctuate=true&smart_format=true",
      {
        method: "POST",
        headers: {
          "Authorization": `Token ${apiKey}`,
          "Content-Type": args.mimeType,
        },
        body: args.audioData,
      }
    );

    if (!response.ok) {
      console.error("Deepgram API error:", response.status, await response.text());
      return;
    }

    const result = await response.json();
    const words = result.results?.channels?.[0]?.alternatives?.[0]?.words || [];

    if (words.length > 0) {
      await ctx.runMutation(internal.transcripts.appendWords, {
        transcriptId: args.transcriptId,
        words: words.map((w: any) => ({
          text: w.word,
          speaker: w.speaker ?? 0,
          startTime: w.start,
          endTime: w.end,
          isFinal: true,
        })),
      });
    }
  },
});
