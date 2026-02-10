import { defineSchema, defineTable } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { v } from "convex/values";

export default defineSchema({
  ...authTables,
  transcripts: defineTable({
    userId: v.id("users"),
    title: v.string(),
    status: v.union(
      v.literal("recording"),
      v.literal("completed"),
      v.literal("error")
    ),
    duration: v.optional(v.number()),
    createdAt: v.number(),
    completedAt: v.optional(v.number()),
  }).index("by_userId", ["userId"]),

  words: defineTable({
    transcriptId: v.id("transcripts"),
    text: v.string(),
    speaker: v.optional(v.number()),
    startTime: v.number(),
    endTime: v.number(),
    isFinal: v.boolean(),
  }).index("by_transcript", ["transcriptId"]),

  speakerLabels: defineTable({
    transcriptId: v.id("transcripts"),
    speakerNumber: v.number(),
    label: v.string(),
  }).index("by_transcript", ["transcriptId"]),

  recordings: defineTable({
    transcriptId: v.id("transcripts"),
    storageId: v.id("_storage"),
    format: v.string(),
    size: v.number(),
  }).index("by_transcript", ["transcriptId"]),
});
