import { v } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";

export const transcribeChunk = action({
  args: {
    transcriptId: v.id("transcripts"),
    audioData: v.bytes(),
    mimeType: v.string(),
    wordOffset: v.number(),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.DEEPGRAM_API_KEY;
    if (!apiKey) {
      throw new Error("DEEPGRAM_API_KEY not configured");
    }

    // Convert to Uint8Array for reliable fetch body handling
    const audioBytes = new Uint8Array(args.audioData);
    console.log(`Deepgram request: ${audioBytes.length} bytes, mime: ${args.mimeType}, offset: ${args.wordOffset}`);

    if (audioBytes.length < 100) {
      console.error("Audio data too small:", audioBytes.length, "bytes");
      return { totalWords: args.wordOffset };
    }

    // Strip codec suffix (e.g., "audio/webm;codecs=opus" -> "audio/webm")
    // Deepgram auto-detects format but may reject full MIME with codec params
    const contentType = args.mimeType.split(";")[0].trim();

    const response = await fetch(
      "https://api.deepgram.com/v1/listen?model=nova-2&diarize=true&punctuate=true&smart_format=true",
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
      return { totalWords: args.wordOffset };
    }

    const result = await response.json();
    const words = result.results?.channels?.[0]?.alternatives?.[0]?.words || [];

    // Only append words past the offset (new words not yet stored)
    const newWords = words.slice(args.wordOffset);

    if (newWords.length > 0) {
      await ctx.runMutation(internal.transcripts.appendWords, {
        transcriptId: args.transcriptId,
        words: newWords.map((w: any) => ({
          text: w.word,
          speaker: w.speaker ?? 0,
          startTime: w.start,
          endTime: w.end,
          isFinal: true,
        })),
      });
    }

    return { totalWords: words.length };
  },
});
