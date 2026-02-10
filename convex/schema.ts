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
      v.literal("processing"),
      v.literal("completed"),
      v.literal("error")
    ),
    source: v.optional(v.union(v.literal("recording"), v.literal("upload"))),
    errorMessage: v.optional(v.string()),
    duration: v.optional(v.number()),
    createdAt: v.number(),
    completedAt: v.optional(v.number()),
    isStarred: v.optional(v.boolean()),
    fullText: v.optional(v.string()),
  })
    .index("by_userId", ["userId"])
    .searchIndex("search_title", {
      searchField: "title",
      filterFields: ["userId"],
    })
    .searchIndex("search_content", {
      searchField: "fullText",
      filterFields: ["userId"],
    }),

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

  tags: defineTable({
    userId: v.id("users"),
    name: v.string(),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_name", ["userId", "name"]),

  transcriptTags: defineTable({
    transcriptId: v.id("transcripts"),
    tagId: v.id("tags"),
  })
    .index("by_transcript", ["transcriptId"])
    .index("by_tag", ["tagId"]),

  aiSummaries: defineTable({
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
  }).index("by_transcript", ["transcriptId"]),

  userSettings: defineTable({
    userId: v.id("users"),
    transcriptionLanguage: v.optional(v.string()),
    autoPunctuation: v.optional(v.boolean()),
  }).index("by_userId", ["userId"]),
});
