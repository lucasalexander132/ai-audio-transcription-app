import { v } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";

function buildDeepgramUrl(settings: { transcriptionLanguage?: string; autoPunctuation?: boolean }): string {
  const lang = settings.transcriptionLanguage || "en";
  const params = [`model=nova-2`, `diarize=true`, `language=${lang}`];
  if (settings.autoPunctuation !== false) {
    params.push("punctuate=true", "smart_format=true");
  }
  return `https://api.deepgram.com/v1/listen?${params.join("&")}`;
}

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

    // Look up user settings for dynamic Deepgram URL construction
    const userId = await ctx.runQuery(internal.transcripts.getTranscriptOwner, { transcriptId: args.transcriptId });
    const settings = userId
      ? await ctx.runQuery(internal.userSettings.getSettingsForUser, { userId })
      : { transcriptionLanguage: "en", autoPunctuation: true };
    const url = buildDeepgramUrl(settings);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Token ${apiKey}`,
        "Content-Type": contentType,
      },
      body: audioBytes,
    });

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

export const transcribeFile = action({
  args: {
    transcriptId: v.id("transcripts"),
    storageId: v.id("_storage"),
    mimeType: v.string(),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.DEEPGRAM_API_KEY;
    if (!apiKey) {
      throw new Error("DEEPGRAM_API_KEY not configured");
    }

    try {
      // Read uploaded file from Convex storage
      const blob = await ctx.storage.get(args.storageId);
      if (blob === null) {
        throw new Error("File not found in storage");
      }

      // Convert to Uint8Array for fetch body
      const audioBytes = new Uint8Array(await blob.arrayBuffer());
      console.log(`transcribeFile: ${audioBytes.length} bytes, mime: ${args.mimeType}`);

      // Strip codec params from MIME type
      const contentType = args.mimeType.split(";")[0].trim();

      // Look up user settings for dynamic Deepgram URL construction
      const userId = await ctx.runQuery(internal.transcripts.getTranscriptOwner, { transcriptId: args.transcriptId });
      const settings = userId
        ? await ctx.runQuery(internal.userSettings.getSettingsForUser, { userId })
        : { transcriptionLanguage: "en", autoPunctuation: true };
      const url = buildDeepgramUrl(settings);

      // POST to Deepgram REST API
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Authorization": `Token ${apiKey}`,
          "Content-Type": contentType,
        },
        body: audioBytes,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Deepgram API error:", response.status, errorText);
        await ctx.runMutation(internal.transcripts.markError, {
          transcriptId: args.transcriptId,
          error: `Transcription failed: ${response.status}`,
        });
        return;
      }

      const result = await response.json();
      const words = result.results?.channels?.[0]?.alternatives?.[0]?.words || [];
      const duration = result.metadata?.duration ?? 0;

      // Append words using punctuated_word for properly formatted text
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

      // Mark transcript as completed with duration
      await ctx.runMutation(internal.transcripts.completeTranscript, {
        transcriptId: args.transcriptId,
        duration: Math.round(duration),
      });
    } catch (error: any) {
      console.error("transcribeFile error:", error);
      await ctx.runMutation(internal.transcripts.markError, {
        transcriptId: args.transcriptId,
        error: error.message || "Unknown transcription error",
      });
    }
  },
});
