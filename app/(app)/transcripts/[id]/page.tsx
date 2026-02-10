"use client";

import { use, useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { AudioPlayer } from "@/app/components/audio/audio-player";
import { TranscriptView } from "@/app/components/audio/transcript-view";
import { AiSummary } from "@/app/components/audio/ai-summary";
import { ExportMenu } from "@/app/components/export/export-menu";
import { TagChips } from "@/app/components/library/tag-chips";
import { TagPickerModal } from "@/app/components/library/tag-picker-modal";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function TranscriptDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const transcriptId = id as Id<"transcripts">;
  const router = useRouter();

  const transcript = useQuery(api.transcripts.get, { id: transcriptId });
  const audioUrl = useQuery(api.recordings.getRecordingUrl, { transcriptId });
  const words = useQuery(api.transcripts.getWords, { transcriptId });
  const deleteTranscript = useMutation(api.transcripts.deleteTranscript);

  // Loading state
  if (transcript === undefined) {
    return (
      <div
        className="flex flex-col"
        style={{ backgroundColor: "#FBF5EE", minHeight: "100dvh" }}
      >
        <div style={{ paddingTop: 16, paddingRight: 20, paddingBottom: 120, paddingLeft: 20 }}>
          <div className="mx-auto max-w-3xl">
            {/* Skeleton loader */}
            <div className="animate-pulse flex flex-col" style={{ gap: 16 }}>
              <div className="rounded" style={{ width: 120, height: 20, backgroundColor: "#EDE6DD" }} />
              <div className="rounded" style={{ width: 200, height: 28, backgroundColor: "#EDE6DD" }} />
              <div className="flex" style={{ gap: 12 }}>
                <div className="rounded" style={{ width: 80, height: 16, backgroundColor: "#EDE6DD" }} />
                <div className="rounded" style={{ width: 60, height: 16, backgroundColor: "#EDE6DD" }} />
              </div>
              <div className="rounded-2xl" style={{ height: 68, backgroundColor: "#FFFFFF" }} />
              <div className="rounded-2xl" style={{ height: 100, backgroundColor: "#FFFFFF" }} />
              <div className="rounded-2xl" style={{ height: 100, backgroundColor: "#FFFFFF" }} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Not found
  if (transcript === null) {
    return (
      <div
        className="flex flex-col"
        style={{ backgroundColor: "#FBF5EE", minHeight: "100dvh" }}
      >
        <div style={{ padding: "16px 20px" }}>
          <div className="mx-auto max-w-3xl">
            <Link
              href="/transcripts"
              className="inline-flex items-center"
              style={{ gap: 6, color: "#D2691E", fontSize: 14, fontWeight: 500, marginBottom: 24 }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                style={{ width: 18, height: 18 }}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.75 19.5L8.25 12l7.5-7.5"
                />
              </svg>
              Back to Transcripts
            </Link>
            <div
              className="rounded-2xl text-center"
              style={{ backgroundColor: "#FFFFFF", border: "1px solid #EDE6DD", padding: "40px 24px" }}
            >
              <h1
                className="font-serif"
                style={{ fontSize: 20, fontWeight: 600, color: "#1A1A1A", marginBottom: 8 }}
              >
                Transcript Not Found
              </h1>
              <p style={{ fontSize: 14, color: "#8B7E74" }}>
                This transcript does not exist or you don&apos;t have access to it.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Still recording - show in-progress message
  if (transcript.status === "recording") {
    return (
      <div
        className="flex flex-col"
        style={{ backgroundColor: "#FBF5EE", minHeight: "100dvh" }}
      >
        <div style={{ padding: "16px 20px" }}>
          <div className="mx-auto max-w-3xl">
            <Link
              href="/transcripts"
              className="inline-flex items-center"
              style={{ gap: 6, color: "#D2691E", fontSize: 14, fontWeight: 500, marginBottom: 24 }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                style={{ width: 18, height: 18 }}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.75 19.5L8.25 12l7.5-7.5"
                />
              </svg>
              Back to Transcripts
            </Link>
            <div
              className="rounded-2xl text-center"
              style={{ backgroundColor: "#FFFFFF", border: "1px solid #EDE6DD", padding: "40px 24px" }}
            >
              <div className="flex justify-center" style={{ marginBottom: 16 }}>
                <div
                  className="flex items-center justify-center"
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 24,
                    backgroundColor: "#FFF0E6",
                  }}
                >
                  <div
                    className="rounded-full animate-pulse"
                    style={{ width: 12, height: 12, backgroundColor: "#E53E3E" }}
                  />
                </div>
              </div>
              <h1
                className="font-serif"
                style={{ fontSize: 20, fontWeight: 600, color: "#1A1A1A", marginBottom: 8 }}
              >
                Recording in Progress
              </h1>
              <p style={{ fontSize: 14, color: "#8B7E74", lineHeight: 1.5, marginBottom: 16 }}>
                This transcript is still being recorded. If the recording was
                interrupted, you can discard it.
              </p>
              <button
                onClick={async () => {
                  await deleteTranscript({ id: transcriptId });
                  router.push("/transcripts");
                }}
                style={{
                  padding: "10px 24px",
                  borderRadius: 12,
                  backgroundColor: "#FFF0E6",
                  color: "#D2691E",
                  fontSize: 14,
                  fontWeight: 600,
                  border: "1px solid #F0D4BC",
                  cursor: "pointer",
                }}
              >
                Discard Recording
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Processing state - show spinner (Convex reactivity auto-updates when status changes)
  if (transcript.status === "processing") {
    return (
      <div
        className="flex flex-col"
        style={{ backgroundColor: "#FBF5EE", minHeight: "100dvh" }}
      >
        <div style={{ padding: "16px 20px" }}>
          <div className="mx-auto max-w-3xl">
            <Link
              href="/transcripts"
              className="inline-flex items-center"
              style={{ gap: 6, color: "#D2691E", fontSize: 14, fontWeight: 500, marginBottom: 24 }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                style={{ width: 18, height: 18 }}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.75 19.5L8.25 12l7.5-7.5"
                />
              </svg>
              Back to Transcripts
            </Link>
            <h1
              className="font-serif"
              style={{ fontSize: 24, fontWeight: 600, color: "#1A1A1A", marginBottom: 16 }}
            >
              {transcript.title || "Uploaded File"}
            </h1>
            <div
              className="rounded-2xl text-center"
              style={{ backgroundColor: "#FFFFFF", border: "1px solid #EDE6DD", padding: "48px 24px" }}
            >
              <div className="flex justify-center" style={{ marginBottom: 20 }}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    border: "3px solid #EDE6DD",
                    borderTopColor: "#D4622B",
                    animation: "spin 1s linear infinite",
                  }}
                />
              </div>
              <p style={{ fontSize: 14, fontWeight: 500, color: "#8B7E74", marginBottom: 6 }}>
                Transcribing your file...
              </p>
              <p style={{ fontSize: 12, color: "#B5A99A" }}>
                This usually takes a few seconds
              </p>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state - show error message with delete option
  if (transcript.status === "error") {
    return (
      <div
        className="flex flex-col"
        style={{ backgroundColor: "#FBF5EE", minHeight: "100dvh" }}
      >
        <div style={{ padding: "16px 20px" }}>
          <div className="mx-auto max-w-3xl">
            <Link
              href="/transcripts"
              className="inline-flex items-center"
              style={{ gap: 6, color: "#D2691E", fontSize: 14, fontWeight: 500, marginBottom: 24 }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                style={{ width: 18, height: 18 }}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.75 19.5L8.25 12l7.5-7.5"
                />
              </svg>
              Back to Transcripts
            </Link>
            <div
              className="rounded-2xl text-center"
              style={{ backgroundColor: "#FFFFFF", border: "1px solid #EDE6DD", padding: "40px 24px" }}
            >
              <div className="flex justify-center" style={{ marginBottom: 16 }}>
                <div
                  className="flex items-center justify-center"
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 24,
                    backgroundColor: "#FFF0E6",
                  }}
                >
                  <svg
                    width="24"
                    height="24"
                    fill="none"
                    stroke="#E53E3E"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <line x1="15" y1="9" x2="9" y2="15" strokeLinecap="round" />
                    <line x1="9" y1="9" x2="15" y2="15" strokeLinecap="round" />
                  </svg>
                </div>
              </div>
              <h1
                className="font-serif"
                style={{ fontSize: 20, fontWeight: 600, color: "#1A1A1A", marginBottom: 8 }}
              >
                Transcription Failed
              </h1>
              <p style={{ fontSize: 14, color: "#8B7E74", lineHeight: 1.5, marginBottom: 20 }}>
                {transcript.errorMessage || "Something went wrong while transcribing your file."}
              </p>
              <button
                onClick={async () => {
                  await deleteTranscript({ id: transcriptId });
                  router.push("/transcripts");
                }}
                style={{
                  padding: "10px 24px",
                  borderRadius: 12,
                  backgroundColor: "#FFF0E6",
                  color: "#E53E3E",
                  fontSize: 14,
                  fontWeight: 600,
                  border: "1px solid #F0D4BC",
                  cursor: "pointer",
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Format date
  const createdDate = new Date(transcript.createdAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  // Count unique speakers from words
  const speakerCount = words
    ? new Set(words.map((w) => w.speaker ?? 0)).size
    : undefined;

  // Determine title: use transcript title, or fallback to "Recording - {date}"
  const displayTitle = transcript.title || `Recording - ${createdDate}`;

  return (
    <TranscriptDetailContent
      displayTitle={displayTitle}
      createdDate={createdDate}
      duration={transcript.duration}
      speakerCount={speakerCount}
      audioUrl={audioUrl}
      transcriptId={transcriptId}
    />
  );
}

function TranscriptDetailContent({
  displayTitle,
  createdDate,
  duration,
  speakerCount,
  audioUrl,
  transcriptId,
}: {
  displayTitle: string;
  createdDate: string;
  duration?: number;
  speakerCount?: number;
  audioUrl: string | null | undefined;
  transcriptId: Id<"transcripts">;
}) {
  const [activeTab, setActiveTab] = useState<"transcript" | "summary">("transcript");
  const [showTagPicker, setShowTagPicker] = useState(false);
  const router = useRouter();
  const adjacentIds = useQuery(api.transcripts.getAdjacentIds, { id: transcriptId });

  // Data for export and tags
  const transcriptTags = useQuery(api.tags.getTranscriptTags, { transcriptId });
  const speakerLabels = useQuery(api.transcripts.getSpeakerLabels, { transcriptId });
  const words = useQuery(api.transcripts.getWords, { transcriptId });
  const removeTag = useMutation(api.tags.removeTagFromTranscript);

  // Format duration as MM:SS
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Build segments from words + speaker labels for export
  const exportData = useMemo(() => {
    if (!words || words.length === 0) {
      return { segments: [], speakers: [], tags: [] };
    }

    // Build speaker label map
    const labelMap = new Map<number, string>();
    if (speakerLabels) {
      for (const sl of speakerLabels) {
        labelMap.set(sl.speakerNumber, sl.label);
      }
    }

    // Group consecutive words by speaker into segments
    const segments: { speaker: string; timestamp: string; text: string }[] = [];
    let currentSpeaker: number | undefined;
    let currentText: string[] = [];
    let currentStartTime = 0;

    for (const word of words) {
      const speaker = word.speaker ?? 0;
      if (speaker !== currentSpeaker) {
        if (currentText.length > 0) {
          const mins = Math.floor(currentStartTime / 60);
          const secs = Math.floor(currentStartTime % 60);
          const timestamp = `${mins}:${secs.toString().padStart(2, "0")}`;
          const speakerName = labelMap.get(currentSpeaker!) || `Speaker ${(currentSpeaker ?? 0) + 1}`;
          segments.push({ speaker: speakerName, timestamp, text: currentText.join(" ") });
        }
        currentSpeaker = speaker;
        currentText = [word.text];
        currentStartTime = word.startTime;
      } else {
        currentText.push(word.text);
      }
    }
    // Push last segment
    if (currentText.length > 0) {
      const mins = Math.floor(currentStartTime / 60);
      const secs = Math.floor(currentStartTime % 60);
      const timestamp = `${mins}:${secs.toString().padStart(2, "0")}`;
      const speakerName = labelMap.get(currentSpeaker!) || `Speaker ${(currentSpeaker ?? 0) + 1}`;
      segments.push({ speaker: speakerName, timestamp, text: currentText.join(" ") });
    }

    // Unique speakers
    const speakers = Array.from(new Set(segments.map((s) => s.speaker)));

    // Tag names
    const tags = (transcriptTags ?? []).map((t) => t.tagName);

    return { segments, speakers, tags };
  }, [words, speakerLabels, transcriptTags]);

  // Format date for export filename (YYYY-MM-DD)
  const exportDate = useMemo(() => {
    // createdDate is like "Feb 10, 2026" - parse to YYYY-MM-DD
    const d = new Date(createdDate);
    if (isNaN(d.getTime())) return new Date().toISOString().split("T")[0];
    return d.toISOString().split("T")[0];
  }, [createdDate]);

  return (
    <div
      className="flex flex-col"
      style={{ backgroundColor: "#FBF5EE", minHeight: "100dvh" }}
    >
      <div
        style={{
          paddingTop: 16,
          paddingRight: 20,
          paddingBottom: 180,
          paddingLeft: 20,
        }}
      >
        <div className="mx-auto max-w-3xl flex flex-col" style={{ gap: 16 }}>
          {/* Header row: Back button + Export menu */}
          <div className="flex items-center justify-between">
            <Link
              href="/transcripts"
              className="inline-flex items-center"
              style={{ gap: 6, color: "#1A1A1A", fontSize: 16, fontWeight: 500 }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                style={{ width: 22, height: 22 }}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.75 19.5L8.25 12l7.5-7.5"
                />
              </svg>
              Back
            </Link>
            <ExportMenu
              title={displayTitle}
              date={exportDate}
              duration={duration !== undefined ? formatDuration(duration) : "0:00"}
              speakers={exportData.speakers}
              tags={exportData.tags}
              segments={exportData.segments}
            />
          </div>

          {/* Title */}
          <h1
            className="font-serif"
            style={{
              fontSize: 24,
              fontWeight: 600,
              color: "#1A1A1A",
              letterSpacing: -0.3,
              margin: 0,
            }}
          >
            {displayTitle}
          </h1>

          {/* Metadata row: date · duration · speakers */}
          <div className="flex flex-wrap items-center" style={{ gap: 12, marginTop: -4 }}>
            <span style={{ fontSize: 13, color: "#8B7E74" }}>{createdDate}</span>
            {duration !== undefined && (
              <>
                <span
                  style={{
                    width: 4,
                    height: 4,
                    borderRadius: 2,
                    backgroundColor: "#B5A99A",
                    display: "inline-block",
                  }}
                />
                <span style={{ fontSize: 13, color: "#8B7E74" }}>
                  {formatDuration(duration)}
                </span>
              </>
            )}
            {speakerCount !== undefined && speakerCount > 0 && (
              <>
                <span
                  style={{
                    width: 4,
                    height: 4,
                    borderRadius: 2,
                    backgroundColor: "#B5A99A",
                    display: "inline-block",
                  }}
                />
                <span style={{ fontSize: 13, color: "#8B7E74" }}>
                  {speakerCount} {speakerCount === 1 ? "speaker" : "speakers"}
                </span>
              </>
            )}
          </div>

          {/* Tags section */}
          <div className="flex flex-wrap items-center" style={{ gap: 8, marginTop: -4 }}>
            <TagChips
              tags={transcriptTags ?? []}
              onRemove={(tagId) => removeTag({ transcriptId, tagId: tagId as Id<"tags"> })}
            />
            <button
              onClick={() => setShowTagPicker(true)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                backgroundColor: "#F5EDE4",
                color: "#8B7E74",
                border: "none",
                borderRadius: 9999,
                padding: "4px 10px",
                fontSize: 11,
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              <svg
                width="10"
                height="10"
                viewBox="0 0 10 10"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              >
                <line x1="5" y1="1" x2="5" y2="9" />
                <line x1="1" y1="5" x2="9" y2="5" />
              </svg>
              Add Tag
            </button>
          </div>

          {/* Tab Switcher */}
          <div className="flex" style={{ marginTop: 4 }}>
            <button
              onClick={() => setActiveTab("transcript")}
              style={{
                flex: 1,
                padding: "12px 0",
                backgroundColor: "transparent",
                border: "none",
                borderBottom: activeTab === "transcript"
                  ? "2px solid #D4622B"
                  : "1px solid #EDE6DD",
                cursor: "pointer",
                fontFamily: "Inter, sans-serif",
                fontSize: 14,
                fontWeight: activeTab === "transcript" ? 600 : 500,
                color: activeTab === "transcript" ? "#D4622B" : "#B5A99A",
              }}
            >
              Transcript
            </button>
            <button
              onClick={() => setActiveTab("summary")}
              style={{
                flex: 1,
                padding: "12px 0",
                backgroundColor: "transparent",
                border: "none",
                borderBottom: activeTab === "summary"
                  ? "2px solid #D4622B"
                  : "1px solid #EDE6DD",
                cursor: "pointer",
                fontFamily: "Inter, sans-serif",
                fontSize: 14,
                fontWeight: activeTab === "summary" ? 600 : 500,
                color: activeTab === "summary" ? "#D4622B" : "#B5A99A",
              }}
            >
              AI Summary
            </button>
          </div>

          {/* Tab Content */}
          {activeTab === "transcript" ? (
            <TranscriptView transcriptId={transcriptId} />
          ) : (
            <AiSummary transcriptId={transcriptId} />
          )}
        </div>
      </div>

      {/* Tag Picker Modal */}
      <TagPickerModal
        transcriptId={transcriptId}
        currentTags={transcriptTags ?? []}
        isOpen={showTagPicker}
        onClose={() => setShowTagPicker(false)}
      />

      {/* Fixed bottom audio player */}
      {audioUrl !== undefined && (
        <div
          style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: "#FFFFFF",
            borderTop: "1px solid #EDE6DD",
            padding: "16px 24px calc(20px + env(safe-area-inset-bottom))",
            zIndex: 40,
          }}
        >
          <div className="mx-auto max-w-3xl">
            <AudioPlayer
              audioUrl={audioUrl}
              fallbackDuration={duration}
              onSkipBack={adjacentIds?.prevId ? () => router.push(`/transcripts/${adjacentIds.prevId}`) : undefined}
              onSkipForward={adjacentIds?.nextId ? () => router.push(`/transcripts/${adjacentIds.nextId}`) : undefined}
            />
          </div>
        </div>
      )}
    </div>
  );
}
