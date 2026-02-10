"use client";

import { useEffect, useRef } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

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

  if (!transcriptId) {
    return (
      <div className="flex-1 overflow-y-auto px-4 py-8">
        <p className="text-center text-gray-400">
          Start recording to see transcription...
        </p>
      </div>
    );
  }

  if (!words || words.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto px-4 py-8">
        <p className="text-center text-gray-400">
          Listening for audio...
        </p>
      </div>
    );
  }

  // Group words by speaker
  const blocks: WordBlock[] = [];
  let currentBlock: WordBlock | null = null;

  for (const word of words) {
    const speaker = word.speaker ?? 0;

    if (!currentBlock || currentBlock.speaker !== speaker) {
      if (currentBlock) {
        blocks.push(currentBlock);
      }
      currentBlock = {
        speaker,
        startTime: word.startTime,
        text: word.text,
      };
    } else {
      currentBlock.text += " " + word.text;
    }
  }

  if (currentBlock) {
    blocks.push(currentBlock);
  }

  const formatTimestamp = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
      {blocks.map((block, index) => (
        <div key={index} className="rounded-lg bg-white p-4 shadow-sm">
          <div className="mb-2 flex items-center gap-2 text-sm">
            <span className="font-semibold text-gray-700">
              Speaker {block.speaker + 1}
            </span>
            <span className="text-gray-400">
              {formatTimestamp(block.startTime)}
            </span>
          </div>
          <p className="text-gray-900">{block.text}</p>
        </div>
      ))}
    </div>
  );
}
