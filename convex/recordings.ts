import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { auth } from "./auth";

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (userId === null) {
      throw new Error("Not authenticated");
    }

    return await ctx.storage.generateUploadUrl();
  },
});

export const saveRecording = mutation({
  args: {
    transcriptId: v.id("transcripts"),
    storageId: v.id("_storage"),
    format: v.string(),
    size: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (userId === null) {
      throw new Error("Not authenticated");
    }

    const transcript = await ctx.db.get(args.transcriptId);
    if (transcript === null || transcript.userId !== userId) {
      throw new Error("Transcript not found or unauthorized");
    }

    await ctx.db.insert("recordings", {
      transcriptId: args.transcriptId,
      storageId: args.storageId,
      format: args.format,
      size: args.size,
    });
  },
});

export const getRecordingUrl = query({
  args: { transcriptId: v.id("transcripts") },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (userId === null) {
      return null;
    }

    const transcript = await ctx.db.get(args.transcriptId);
    if (transcript === null || transcript.userId !== userId) {
      return null;
    }

    const recording = await ctx.db
      .query("recordings")
      .withIndex("by_transcript", (q) => q.eq("transcriptId", args.transcriptId))
      .first();

    if (recording === null) {
      return null;
    }

    return await ctx.storage.getUrl(recording.storageId);
  },
});
