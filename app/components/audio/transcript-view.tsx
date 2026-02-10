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

// Consistent speaker colors - warm palette first, then varied
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
      <div
        className="rounded-2xl"
        style={{ backgroundColor: "#FFFFFF", border: "1px solid #EDE6DD", padding: "14px 16px" }}
      >
        <div className="mb-2 flex items-center" style={{ gap: 10 }}>
          <SpeakerLabelEditor
            transcriptId={transcriptId}
            speakerNumber={segment.speakerNumber}
            currentLabel={speakerLabel}
            color={color}
          />
          <span style={{ fontSize: 12, color: "#B5A99A" }}>
            {formatTimestamp(segment.startTime)}
          </span>
        </div>
        <p
          className="leading-relaxed"
          style={{ fontSize: 15, color: "#1A1A1A", margin: 0, lineHeight: 1.6 }}
        >
          {segment.text}
        </p>
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

  // Group words into speaker segments: consecutive words with same speaker form a segment
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

  // Loading state - skeleton shimmer lines
  if (words === undefined || speakerLabels === undefined) {
    return (
      <div className="flex flex-col" style={{ gap: 12 }}>
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-2xl animate-pulse"
            style={{ backgroundColor: "#FFFFFF", border: "1px solid #EDE6DD", padding: "14px 16px" }}
          >
            <div className="mb-2 flex items-center" style={{ gap: 8 }}>
              <div
                className="rounded-full"
                style={{ width: 12, height: 12, backgroundColor: "#EDE6DD" }}
              />
              <div
                className="rounded"
                style={{ width: 80, height: 14, backgroundColor: "#EDE6DD" }}
              />
              <div
                className="rounded"
                style={{ width: 40, height: 14, backgroundColor: "#EDE6DD" }}
              />
            </div>
            <div className="flex flex-col" style={{ gap: 6 }}>
              <div
                className="rounded"
                style={{ width: "100%", height: 14, backgroundColor: "#EDE6DD" }}
              />
              <div
                className="rounded"
                style={{ width: "85%", height: 14, backgroundColor: "#EDE6DD" }}
              />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Empty state
  if (segments.length === 0) {
    return (
      <div
        className="rounded-2xl text-center"
        style={{ backgroundColor: "#FFFFFF", border: "1px solid #EDE6DD", padding: "32px 16px" }}
      >
        <p style={{ fontSize: 14, color: "#B5A99A" }}>No transcript available yet</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col" style={{ gap: 12 }}>
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
