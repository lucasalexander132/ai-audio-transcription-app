import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { auth } from "./auth";

export const listUserTags = query({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (userId === null) {
      return [];
    }

    return await ctx.db
      .query("tags")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();
  },
});

export const getAllTranscriptTags = query({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (userId === null) {
      return [];
    }

    // Get all user's tags
    const userTags = await ctx.db
      .query("tags")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    const tagMap = new Map(userTags.map((t) => [t._id, t.name]));

    // Get all transcript-tag links for user's tags
    const links: { transcriptId: string; tagName: string }[] = [];
    for (const tag of userTags) {
      const tagLinks = await ctx.db
        .query("transcriptTags")
        .withIndex("by_tag", (q) => q.eq("tagId", tag._id))
        .collect();
      for (const link of tagLinks) {
        links.push({
          transcriptId: link.transcriptId,
          tagName: tagMap.get(link.tagId) || "",
        });
      }
    }
    return links;
  },
});

export const getTranscriptTags = query({
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

    const links = await ctx.db
      .query("transcriptTags")
      .withIndex("by_transcript", (q) => q.eq("transcriptId", args.transcriptId))
      .collect();

    const tags: { tagId: string; tagName: string }[] = [];
    for (const link of links) {
      const tag = await ctx.db.get(link.tagId);
      if (tag) {
        tags.push({ tagId: tag._id, tagName: tag.name });
      }
    }
    return tags;
  },
});

export const addTagToTranscript = mutation({
  args: {
    transcriptId: v.id("transcripts"),
    tagName: v.string(),
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

    // Find or create tag by name + userId
    let tag = await ctx.db
      .query("tags")
      .withIndex("by_userId_name", (q) =>
        q.eq("userId", userId).eq("name", args.tagName)
      )
      .first();

    if (!tag) {
      const tagId = await ctx.db.insert("tags", {
        userId,
        name: args.tagName,
      });
      tag = await ctx.db.get(tagId);
    }

    if (!tag) {
      throw new Error("Failed to create tag");
    }

    // Enforce limit: max 8 tags per transcript
    const existingLinks = await ctx.db
      .query("transcriptTags")
      .withIndex("by_transcript", (q) => q.eq("transcriptId", args.transcriptId))
      .collect();

    if (existingLinks.length >= 8) {
      throw new Error("Maximum of 8 tags per transcript");
    }

    // Check if already linked
    const alreadyLinked = existingLinks.some((link) => link.tagId === tag!._id);
    if (!alreadyLinked) {
      await ctx.db.insert("transcriptTags", {
        transcriptId: args.transcriptId,
        tagId: tag._id,
      });
    }
  },
});

export const removeTagFromTranscript = mutation({
  args: {
    transcriptId: v.id("transcripts"),
    tagId: v.id("tags"),
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

    // Find and delete the link
    const link = await ctx.db
      .query("transcriptTags")
      .withIndex("by_transcript", (q) => q.eq("transcriptId", args.transcriptId))
      .filter((q) => q.eq(q.field("tagId"), args.tagId))
      .first();

    if (link) {
      await ctx.db.delete(link._id);
    }
  },
});
