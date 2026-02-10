"use client";

import { useEffect, useRef } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useRecordingStore } from "@/app/lib/stores/recording-store";

const SPEAKER_COLORS = [
  "#D4622B",
  "#2D8B5F",
  "#6B5CE7",
  "#E5783E",
  "#3B82F6",
  "#EC4899",
];

interface LiveTranscriptProps {
  transcriptId: Id<"transcripts"> | null;
}

interface WordBlock {
  speaker: number;
  startTime: number;
  text: string;
}

export function LiveTranscript({ transcriptId }: LiveTranscriptProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { status } = useRecordingStore();
  const words = useQuery(
    api.transcripts.getWords,
    transcriptId ? { transcriptId } : "skip"
  );

  // Auto-scroll to bottom when new words arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [words]);

  const isActive = status === "recording" || status === "paused";

  // Group words by speaker
  const blocks: WordBlock[] = [];
  if (words && words.length > 0) {
    let currentBlock: WordBlock | null = null;
    for (const word of words) {
      const speaker = word.speaker ?? 0;
      if (!currentBlock || currentBlock.speaker !== speaker) {
        if (currentBlock) blocks.push(currentBlock);
        currentBlock = { speaker, startTime: word.startTime, text: word.text };
      } else {
        currentBlock.text += " " + word.text;
      }
    }
    if (currentBlock) blocks.push(currentBlock);
  }

  const formatTimestamp = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div
      className="flex flex-1 flex-col overflow-hidden"
      style={{
        backgroundColor: "#FFFFFF",
        borderRadius: "24px 24px 0 0",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-5 pb-4">
        <span
          className="font-serif text-base font-semibold"
          style={{ color: "#1A1A1A" }}
        >
          Live Transcript
        </span>
        {isActive && (
          <div
            className="flex items-center gap-1"
            style={{
              padding: "4px 10px",
              borderRadius: 12,
              backgroundColor: "#FFF0E6",
            }}
          >
            <div
              className="rounded-full animate-pulse"
              style={{
                width: 6,
                height: 6,
                backgroundColor: "#D4622B",
              }}
            />
            <span style={{ fontSize: 11, fontWeight: 600, color: "#D4622B" }}>
              Live
            </span>
          </div>
        )}
      </div>

      {/* Divider */}
      <div style={{ height: 1, backgroundColor: "#EDE6DD" }} />

      {/* Transcript content */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-6 py-4"
        style={{ paddingBottom: 96 }}
      >
        {blocks.length === 0 ? (
          <p
            className="text-center py-8"
            style={{ fontSize: 14, color: "#B5A99A" }}
          >
            {isActive
              ? "Listening for audio..."
              : "Start recording to see transcription"}
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            {blocks.map((block, index) => {
              const color =
                SPEAKER_COLORS[block.speaker % SPEAKER_COLORS.length];
              return (
                <div key={index} className="flex flex-col" style={{ gap: 4 }}>
                  <div className="flex items-center" style={{ gap: 8 }}>
                    <div
                      className="rounded-full"
                      style={{
                        width: 8,
                        height: 8,
                        backgroundColor: color,
                      }}
                    />
                    <span style={{ fontSize: 12, fontWeight: 600, color }}>
                      Speaker {block.speaker + 1}
                    </span>
                    <span style={{ fontSize: 11, color: "#B5A99A" }}>
                      {formatTimestamp(block.startTime)}
                    </span>
                  </div>
                  <p
                    style={{
                      fontSize: 14,
                      lineHeight: 1.5,
                      color: "#1A1A1A",
                      margin: 0,
                    }}
                  >
                    {block.text}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
