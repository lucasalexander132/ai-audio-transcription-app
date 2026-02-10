"use client";

import { use } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { AudioPlayer } from "@/app/components/audio/audio-player";
import { TranscriptView } from "@/app/components/audio/transcript-view";
import Link from "next/link";

export default function TranscriptDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const transcriptId = id as Id<"transcripts">;

  const transcript = useQuery(api.transcripts.get, { id: transcriptId });
  const audioUrl = useQuery(api.recordings.getRecordingUrl, { transcriptId });
  const words = useQuery(api.transcripts.getWords, { transcriptId });

  // Loading state
  if (transcript === undefined) {
    return (
      <div
        className="flex flex-col"
        style={{ backgroundColor: "#FBF5EE", minHeight: "100dvh" }}
      >
        <div style={{ padding: "16px 20px", paddingBottom: 120 }}>
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
              <p style={{ fontSize: 14, color: "#8B7E74", lineHeight: 1.5 }}>
                This transcript is still being recorded. Complete the recording to
                view the full transcript and audio.
              </p>
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

  // Format duration as MM:SS
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Count unique speakers from words
  const speakerCount = words
    ? new Set(words.map((w) => w.speaker ?? 0)).size
    : undefined;

  // Determine title: use transcript title, or fallback to "Recording - {date}"
  const displayTitle = transcript.title || `Recording - ${createdDate}`;

  return (
    <div
      className="flex flex-col"
      style={{ backgroundColor: "#FBF5EE", minHeight: "100dvh" }}
    >
      <div
        style={{
          padding: "16px 20px",
          paddingBottom: 120,
        }}
      >
        <div className="mx-auto max-w-3xl flex flex-col" style={{ gap: 16 }}>
          {/* Back button */}
          <Link
            href="/transcripts"
            className="inline-flex items-center self-start"
            style={{ gap: 6, color: "#D2691E", fontSize: 14, fontWeight: 500 }}
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

          {/* Metadata: duration, date, number of speakers */}
          <div className="flex flex-wrap items-center" style={{ gap: 16, marginTop: -4 }}>
            {/* Date */}
            <div className="flex items-center" style={{ gap: 5 }}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="#8B7E74"
                style={{ width: 15, height: 15 }}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
                />
              </svg>
              <span style={{ fontSize: 13, color: "#8B7E74" }}>{createdDate}</span>
            </div>

            {/* Duration */}
            {transcript.duration !== undefined && (
              <div className="flex items-center" style={{ gap: 5 }}>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="#8B7E74"
                  style={{ width: 15, height: 15 }}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span style={{ fontSize: 13, color: "#8B7E74" }}>
                  {formatDuration(transcript.duration)}
                </span>
              </div>
            )}

            {/* Speaker count */}
            {speakerCount !== undefined && speakerCount > 0 && (
              <div className="flex items-center" style={{ gap: 5 }}>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="#8B7E74"
                  style={{ width: 15, height: 15 }}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
                  />
                </svg>
                <span style={{ fontSize: 13, color: "#8B7E74" }}>
                  {speakerCount} {speakerCount === 1 ? "speaker" : "speakers"}
                </span>
              </div>
            )}
          </div>

          {/* Audio Player - render once URL query resolves */}
          {audioUrl !== undefined && (
            <AudioPlayer audioUrl={audioUrl} />
          )}

          {/* Transcript View - scrollable, takes remaining space */}
          <TranscriptView transcriptId={transcriptId} />
        </div>
      </div>
    </div>
  );
}
