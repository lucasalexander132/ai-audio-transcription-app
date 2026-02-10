import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { auth } from "./auth";

export const create = mutation({
  args: { title: v.string() },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (userId === null) {
      throw new Error("Not authenticated");
    }

    const transcriptId = await ctx.db.insert("transcripts", {
      userId,
      title: args.title,
      status: "recording",
      source: "recording",
      createdAt: Date.now(),
    });

    return transcriptId;
  },
});

export const createFromUpload = mutation({
  args: { title: v.string() },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (userId === null) {
      throw new Error("Not authenticated");
    }

    const transcriptId = await ctx.db.insert("transcripts", {
      userId,
      title: args.title,
      status: "processing",
      source: "upload",
      createdAt: Date.now(),
    });

    return transcriptId;
  },
});

export const get = query({
  args: { id: v.id("transcripts") },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (userId === null) {
      return null;
    }

    const transcript = await ctx.db.get(args.id);
    if (transcript === null || transcript.userId !== userId) {
      return null;
    }

    return transcript;
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (userId === null) {
      return [];
    }

    const transcripts = await ctx.db
      .query("transcripts")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();

    return transcripts;
  },
});

export const appendWords = internalMutation({
  args: {
    transcriptId: v.id("transcripts"),
    words: v.array(
      v.object({
        text: v.string(),
        speaker: v.optional(v.number()),
        startTime: v.number(),
        endTime: v.number(),
        isFinal: v.boolean(),
      })
    ),
  },
  handler: async (ctx, args) => {
    // Internal mutation - auth check happens in the action that calls this
    const transcript = await ctx.db.get(args.transcriptId);
    if (transcript === null) {
      throw new Error("Transcript not found");
    }

    for (const word of args.words) {
      await ctx.db.insert("words", {
        transcriptId: args.transcriptId,
        ...word,
      });
    }
  },
});

export const updateSpeakerLabel = mutation({
  args: {
    transcriptId: v.id("transcripts"),
    speakerNumber: v.number(),
    label: v.string(),
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

    const existing = await ctx.db
      .query("speakerLabels")
      .withIndex("by_transcript", (q) => q.eq("transcriptId", args.transcriptId))
      .filter((q) => q.eq(q.field("speakerNumber"), args.speakerNumber))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { label: args.label });
    } else {
      await ctx.db.insert("speakerLabels", {
        transcriptId: args.transcriptId,
        speakerNumber: args.speakerNumber,
        label: args.label,
      });
    }
  },
});

export const deleteTranscript = mutation({
  args: { id: v.id("transcripts") },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (userId === null) {
      throw new Error("Not authenticated");
    }

    const transcript = await ctx.db.get(args.id);
    if (transcript === null || transcript.userId !== userId) {
      throw new Error("Transcript not found or unauthorized");
    }

    // Delete associated words
    const words = await ctx.db
      .query("words")
      .withIndex("by_transcript", (q) => q.eq("transcriptId", args.id))
      .collect();
    for (const word of words) {
      await ctx.db.delete(word._id);
    }

    // Delete associated speaker labels
    const labels = await ctx.db
      .query("speakerLabels")
      .withIndex("by_transcript", (q) => q.eq("transcriptId", args.id))
      .collect();
    for (const label of labels) {
      await ctx.db.delete(label._id);
    }

    // Delete associated recordings
    const recordings = await ctx.db
      .query("recordings")
      .withIndex("by_transcript", (q) => q.eq("transcriptId", args.id))
      .collect();
    for (const recording of recordings) {
      await ctx.db.delete(recording._id);
    }

    // Delete the transcript itself
    await ctx.db.delete(args.id);
  },
});

export const complete = mutation({
  args: {
    transcriptId: v.id("transcripts"),
    duration: v.number(),
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

    await ctx.db.patch(args.transcriptId, {
      status: "completed",
      completedAt: Date.now(),
      duration: args.duration,
    });
  },
});

export const getWords = query({
  args: { transcriptId: v.id("transcripts") },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (userId === null) {
      return [];
    }

    const transcript = await ctx.db.get(args.transcriptId);
    if (transcript === null || transcript.userId !== userId) {
      return [];
    }

    const words = await ctx.db
      .query("words")
      .withIndex("by_transcript", (q) => q.eq("transcriptId", args.transcriptId))
      .collect();

    return words.sort((a, b) => a.startTime - b.startTime);
  },
});

export const getSpeakerLabels = query({
  args: { transcriptId: v.id("transcripts") },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (userId === null) {
      return [];
    }

    const transcript = await ctx.db.get(args.transcriptId);
    if (transcript === null || transcript.userId !== userId) {
      return [];
    }

    const labels = await ctx.db
      .query("speakerLabels")
      .withIndex("by_transcript", (q) => q.eq("transcriptId", args.transcriptId))
      .collect();

    return labels;
  },
});

export const setStatus = internalMutation({
  args: {
    transcriptId: v.id("transcripts"),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    const transcript = await ctx.db.get(args.transcriptId);
    if (transcript === null) {
      throw new Error("Transcript not found");
    }

    await ctx.db.patch(args.transcriptId, {
      status: args.status as "recording" | "processing" | "completed" | "error",
    });
  },
});

export const completeTranscript = internalMutation({
  args: {
    transcriptId: v.id("transcripts"),
    duration: v.number(),
  },
  handler: async (ctx, args) => {
    const transcript = await ctx.db.get(args.transcriptId);
    if (transcript === null) {
      throw new Error("Transcript not found");
    }

    await ctx.db.patch(args.transcriptId, {
      status: "completed",
      completedAt: Date.now(),
      duration: args.duration,
    });
  },
});

export const markError = internalMutation({
  args: {
    transcriptId: v.id("transcripts"),
    error: v.string(),
  },
  handler: async (ctx, args) => {
    const transcript = await ctx.db.get(args.transcriptId);
    if (transcript === null) {
      throw new Error("Transcript not found");
    }

    await ctx.db.patch(args.transcriptId, {
      status: "error",
      errorMessage: args.error,
    });
  },
});
