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

    // Delete associated transcript tags
    const transcriptTags = await ctx.db
      .query("transcriptTags")
      .withIndex("by_transcript", (q) => q.eq("transcriptId", args.id))
      .collect();
    for (const tt of transcriptTags) {
      await ctx.db.delete(tt._id);
    }

    // Delete the transcript itself
    await ctx.db.delete(args.id);
  },
});

export const toggleStar = mutation({
  args: { transcriptId: v.id("transcripts") },
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
      isStarred: !transcript.isStarred,
    });
  },
});

export const search = query({
  args: { searchTerm: v.string() },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (userId === null) {
      return [];
    }

    // Search by title
    const titleMatches = await ctx.db
      .query("transcripts")
      .withSearchIndex("search_title", (q) =>
        q.search("title", args.searchTerm).eq("userId", userId)
      )
      .take(25);

    // Search by content
    const contentMatches = await ctx.db
      .query("transcripts")
      .withSearchIndex("search_content", (q) =>
        q.search("fullText", args.searchTerm).eq("userId", userId)
      )
      .take(25);

    // Merge and deduplicate (title matches first for higher relevance)
    const seen = new Set(titleMatches.map((t) => t._id));
    const merged = [...titleMatches];
    for (const t of contentMatches) {
      if (!seen.has(t._id)) {
        merged.push(t);
        seen.add(t._id);
      }
    }
    return merged;
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

    // Denormalize fullText from words for search
    const words = await ctx.db
      .query("words")
      .withIndex("by_transcript", (q) => q.eq("transcriptId", args.transcriptId))
      .collect();
    const sortedWords = words.sort((a, b) => a.startTime - b.startTime);
    const fullText = sortedWords.map((w) => w.text).join(" ");

    await ctx.db.patch(args.transcriptId, {
      status: "completed",
      completedAt: Date.now(),
      duration: args.duration,
      fullText: fullText || undefined,
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

export const getAdjacentIds = query({
  args: { id: v.id("transcripts") },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (userId === null) {
      return { prevId: null, nextId: null };
    }

    const transcripts = await ctx.db
      .query("transcripts")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();

    const completed = transcripts.filter((t) => t.status === "completed");
    const idx = completed.findIndex((t) => t._id === args.id);
    if (idx === -1) {
      return { prevId: null, nextId: null };
    }

    return {
      prevId: idx > 0 ? completed[idx - 1]._id : null,
      nextId: idx < completed.length - 1 ? completed[idx + 1]._id : null,
    };
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

    // Denormalize fullText from words for search
    const words = await ctx.db
      .query("words")
      .withIndex("by_transcript", (q) => q.eq("transcriptId", args.transcriptId))
      .collect();
    const sortedWords = words.sort((a, b) => a.startTime - b.startTime);
    const fullText = sortedWords.map((w) => w.text).join(" ");

    await ctx.db.patch(args.transcriptId, {
      status: "completed",
      completedAt: Date.now(),
      duration: args.duration,
      fullText: fullText || undefined,
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
