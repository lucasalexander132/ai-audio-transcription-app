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

  // Loading state
  if (transcript === undefined) {
    return (
      <div className="flex min-h-screen flex-col bg-[#FFF9F0]">
        <div className="flex-1 p-4">
          <div className="mx-auto max-w-3xl space-y-4">
            {/* Skeleton loader */}
            <div className="animate-pulse space-y-4">
              <div className="h-8 w-48 bg-gray-200 rounded" />
              <div className="h-4 w-64 bg-gray-200 rounded" />
              <div className="h-32 bg-white rounded-lg" />
              <div className="h-24 bg-white rounded-lg" />
              <div className="h-24 bg-white rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Not found
  if (transcript === null) {
    return (
      <div className="flex min-h-screen flex-col bg-[#FFF9F0]">
        <div className="flex-1 p-4">
          <div className="mx-auto max-w-3xl">
            <Link
              href="/transcripts"
              className="mb-4 inline-flex items-center gap-2 text-[#D2691E] hover:underline"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="h-5 w-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.75 19.5L8.25 12l7.5-7.5"
                />
              </svg>
              Back to Transcripts
            </Link>
            <div className="rounded-lg bg-white p-8 shadow-sm text-center">
              <h1 className="text-xl font-bold text-gray-900 mb-2">
                Transcript Not Found
              </h1>
              <p className="text-gray-600">
                This transcript does not exist or you don&apos;t have access to it.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Still recording
  if (transcript.status === "recording") {
    return (
      <div className="flex min-h-screen flex-col bg-[#FFF9F0]">
        <div className="flex-1 p-4">
          <div className="mx-auto max-w-3xl">
            <Link
              href="/transcripts"
              className="mb-4 inline-flex items-center gap-2 text-[#D2691E] hover:underline"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="h-5 w-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.75 19.5L8.25 12l7.5-7.5"
                />
              </svg>
              Back to Transcripts
            </Link>
            <div className="rounded-lg bg-white p-8 shadow-sm text-center">
              <div className="mb-4 flex justify-center">
                <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
                  <div className="h-3 w-3 rounded-full bg-red-600 animate-pulse" />
                </div>
              </div>
              <h1 className="text-xl font-bold text-gray-900 mb-2">
                Recording in Progress
              </h1>
              <p className="text-gray-600">
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

  // Format duration
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#FFF9F0]">
      <div className="flex-1 p-4 pb-24">
        <div className="mx-auto max-w-3xl space-y-4">
          {/* Back button */}
          <Link
            href="/transcripts"
            className="inline-flex items-center gap-2 text-[#D2691E] hover:underline"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="h-5 w-5"
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
          <h1 className="text-2xl font-bold text-gray-900">{transcript.title}</h1>

          {/* Metadata */}
          <div className="flex flex-wrap gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="h-4 w-4"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
                />
              </svg>
              <span>{createdDate}</span>
            </div>
            {transcript.duration !== undefined && (
              <div className="flex items-center gap-1">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="h-4 w-4"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span>{formatDuration(transcript.duration)}</span>
              </div>
            )}
          </div>

          {/* Audio Player */}
          <AudioPlayer audioUrl={audioUrl ?? null} />

          {/* Transcript */}
          <TranscriptView transcriptId={transcriptId} />
        </div>
      </div>
    </div>
  );
}
