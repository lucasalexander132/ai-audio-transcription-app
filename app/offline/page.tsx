"use client";

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#FFF9F0] px-6 text-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-[#D4622B]/10">
        <svg
          width="40"
          height="40"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#D4622B"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="1" y1="1" x2="23" y2="23" />
          <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
          <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
          <path d="M10.71 5.05A16 16 0 0 1 22.56 9" />
          <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
          <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
          <line x1="12" y1="20" x2="12.01" y2="20" />
        </svg>
      </div>
      <h1 className="font-lora mb-2 text-2xl font-semibold text-[#1a1a2e]">
        You&apos;re Offline
      </h1>
      <p className="mb-8 max-w-sm text-[#6b7280]">
        Transcripts needs an internet connection to record and transcribe audio.
        Please check your connection and try again.
      </p>
      <button
        onClick={() => window.location.reload()}
        className="rounded-xl bg-[#D4622B] px-6 py-3 font-medium text-white transition-colors hover:bg-[#b8531f]"
      >
        Try Again
      </button>
    </div>
  );
}
