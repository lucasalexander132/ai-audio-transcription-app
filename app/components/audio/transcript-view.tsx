"use client";

import { useMemo, memo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { SpeakerLabelEditor } from "./speaker-label-editor";

interface TranscriptViewProps {
  transcriptId: Id<"transcripts">;
}

interface Segment {
  speakerNumber: number;
  startTime: number;
  text: string;
}

// Consistent speaker colors
const SPEAKER_COLORS = [
  "#D2691E", // Burnt sienna (primary)
  "#4A90E2", // Blue
  "#50C878", // Emerald green
  "#9B59B6", // Purple
  "#E67E22", // Orange
  "#E74C3C", // Red
  "#1ABC9C", // Turquoise
  "#F39C12", // Yellow-orange
];

const TranscriptSegment = memo(
  ({
    segment,
    speakerLabel,
    transcriptId,
  }: {
    segment: Segment;
    speakerLabel: string;
    transcriptId: Id<"transcripts">;
  }) => {
    const color = SPEAKER_COLORS[segment.speakerNumber % SPEAKER_COLORS.length];

    return (
      <div className="rounded-lg bg-white p-4 shadow-sm">
        <div className="mb-2 flex items-center gap-3 text-sm">
          <SpeakerLabelEditor
            transcriptId={transcriptId}
            speakerNumber={segment.speakerNumber}
            currentLabel={speakerLabel}
            color={color}
          />
          <span className="text-gray-400">{formatTimestamp(segment.startTime)}</span>
        </div>
        <p className="text-gray-900 leading-relaxed">{segment.text}</p>
      </div>
    );
  }
);

TranscriptSegment.displayName = "TranscriptSegment";

function formatTimestamp(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

export function TranscriptView({ transcriptId }: TranscriptViewProps) {
  const words = useQuery(api.transcripts.getWords, { transcriptId });
  const speakerLabels = useQuery(api.transcripts.getSpeakerLabels, { transcriptId });

  // Create speaker label lookup map
  const labelMap = useMemo(() => {
    if (!speakerLabels) return new Map<number, string>();
    const map = new Map<number, string>();
    for (const label of speakerLabels) {
      map.set(label.speakerNumber, label.label);
    }
    return map;
  }, [speakerLabels]);

  // Group words into speaker segments
  const segments = useMemo(() => {
    if (!words || words.length === 0) return [];

    const result: Segment[] = [];
    let currentSegment: Segment | null = null;

    for (const word of words) {
      const speakerNumber = word.speaker ?? 0;

      if (!currentSegment || currentSegment.speakerNumber !== speakerNumber) {
        // Save previous segment
        if (currentSegment) {
          result.push(currentSegment);
        }
        // Start new segment
        currentSegment = {
          speakerNumber,
          startTime: word.startTime,
          text: word.text,
        };
      } else {
        // Append to current segment
        currentSegment.text += " " + word.text;
      }
    }

    // Push final segment
    if (currentSegment) {
      result.push(currentSegment);
    }

    return result;
  }, [words]);

  // Loading state
  if (words === undefined || speakerLabels === undefined) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-lg bg-white p-4 shadow-sm animate-pulse"
          >
            <div className="mb-2 flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-gray-200" />
              <div className="h-4 w-24 bg-gray-200 rounded" />
              <div className="h-4 w-12 bg-gray-200 rounded" />
            </div>
            <div className="space-y-2">
              <div className="h-4 w-full bg-gray-200 rounded" />
              <div className="h-4 w-5/6 bg-gray-200 rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Empty state
  if (segments.length === 0) {
    return (
      <div className="rounded-lg bg-white p-8 shadow-sm text-center">
        <p className="text-gray-400">No transcript available yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {segments.map((segment, index) => {
        const label =
          labelMap.get(segment.speakerNumber) || `Speaker ${segment.speakerNumber + 1}`;
        return (
          <TranscriptSegment
            key={index}
            segment={segment}
            speakerLabel={label}
            transcriptId={transcriptId}
          />
        );
      })}
    </div>
  );
}
