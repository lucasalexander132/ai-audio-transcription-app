"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const FAQ_ITEMS = [
  {
    question: "How can I improve transcription accuracy?",
    answer:
      "Transcription accuracy depends on audio quality, background noise, and speaker clarity. For best results, record in a quiet environment, speak clearly, and hold the microphone close. You can also try switching the language setting to match your accent.",
  },
  {
    question: "What languages are supported?",
    answer:
      "Alliope supports over 30 languages including English, Spanish, French, German, Japanese, Korean, Chinese, Hindi, and many more. You can change the transcription language anytime in Settings > Language.",
  },
  {
    question: "How does speaker detection work?",
    answer:
      "Speaker detection uses AI to identify different voices in a recording and label them automatically (Speaker 1, Speaker 2, etc.). It works best when speakers take turns and don\u2019t talk over each other. You can rename speakers after the transcription is complete.",
  },
  {
    question: "Is my audio data private?",
    answer:
      "Your audio is encrypted in transit and stored securely. Audio is sent to Deepgram for transcription processing, and transcript text may be shared with AI services when you request summaries. Only you can access your recordings and transcripts. You can delete them at any time from your library.",
  },
  {
    question: "Can I edit transcripts after recording?",
    answer:
      "Absolutely. Tap on any transcript to open it, then tap on any text to edit it directly. You can fix errors, add punctuation, or rewrite sections. Changes are saved automatically.",
  },
];

const TIPS = [
  "Record in a quiet environment with minimal background noise for the best accuracy.",
  "Speak clearly and at a moderate pace. Avoid speaking over other participants.",
  "Keep the microphone 6\u201312 inches from the speaker for optimal audio capture.",
  "Select the correct language in Settings to match the speakers\u2019 primary language or dialect.",
];

function SectionHeader({ label }: { label: string }) {
  return (
    <div style={{ padding: "14px 16px 8px 16px" }}>
      <span
        style={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: 1,
          color: "#B5A99A",
        }}
      >
        {label}
      </span>
    </div>
  );
}

function Divider() {
  return <div style={{ height: 1, backgroundColor: "#EDE6DD" }} />;
}

function FaqItem({
  question,
  answer,
  isOpen,
  onToggle,
}: {
  question: string;
  answer: string;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      style={{ padding: "12px 16px", cursor: "pointer" }}
      onClick={onToggle}
    >
      <div
        className="flex items-center"
        style={{ gap: 12, marginBottom: isOpen ? 8 : 0 }}
      >
        <svg
          style={{
            width: 16,
            height: 16,
            flexShrink: 0,
            transition: "transform 0.2s",
            transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
          }}
          fill="none"
          stroke="#D4622B"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <polyline
            points="6 9 12 15 18 9"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span
          style={{
            fontSize: 15,
            fontWeight: 500,
            color: "#1A1A1A",
          }}
        >
          {question}
        </span>
      </div>
      {isOpen && (
        <p
          style={{
            fontSize: 13,
            color: "#8B7E74",
            lineHeight: 1.5,
            margin: 0,
          }}
        >
          {answer}
        </p>
      )}
    </div>
  );
}

export default function HelpSupportPage() {
  const router = useRouter();
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div
      className="flex flex-col"
      style={{ backgroundColor: "#FBF5EE", minHeight: "100dvh" }}
    >
      {/* Status bar spacer (safe area aware) */}
      <div style={{ height: "max(16px, env(safe-area-inset-top, 16px))" }} />

      {/* Header */}
      <div
        className="flex items-center"
        style={{ height: 40, padding: "0 24px" }}
      >
        <button
          onClick={() => router.back()}
          className="flex items-center"
          style={{ gap: 6 }}
        >
          <svg
            style={{ width: 22, height: 22 }}
            fill="none"
            stroke="#1A1A1A"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <polyline
              points="15 18 9 12 15 6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span style={{ fontSize: 16, fontWeight: 500, color: "#1A1A1A" }}>
            Settings
          </span>
        </button>
      </div>

      {/* Spacer */}
      <div style={{ height: 8 }} />

      {/* Title Section */}
      <div className="flex flex-col" style={{ gap: 4, padding: "0 24px" }}>
        <h1
          className="font-serif"
          style={{
            fontSize: 24,
            fontWeight: 600,
            letterSpacing: -0.3,
            color: "#1A1A1A",
          }}
        >
          Help & Support
        </h1>
        <p style={{ fontSize: 14, color: "#8B7E74", margin: 0 }}>
          Find answers and get in touch
        </p>
      </div>

      {/* Spacer */}
      <div style={{ height: 20 }} />

      {/* Body */}
      <div
        className="flex flex-col flex-1 overflow-y-auto"
        style={{ gap: 20, padding: "0 24px", paddingBottom: 120 }}
      >
        {/* FAQ Card */}
        <div
          className="flex flex-col overflow-hidden"
          style={{
            borderRadius: 16,
            backgroundColor: "#FFFFFF",
            border: "1px solid #EDE6DD",
          }}
        >
          <SectionHeader label="FREQUENTLY ASKED QUESTIONS" />
          {FAQ_ITEMS.map((item, i) => (
            <div key={i}>
              {i > 0 && <Divider />}
              <FaqItem
                question={item.question}
                answer={item.answer}
                isOpen={openFaq === i}
                onToggle={() => setOpenFaq(openFaq === i ? null : i)}
              />
            </div>
          ))}
        </div>

        {/* Contact Us Card */}
        <div
          className="flex flex-col overflow-hidden"
          style={{
            borderRadius: 16,
            backgroundColor: "#FFFFFF",
            border: "1px solid #EDE6DD",
          }}
        >
          <SectionHeader label="CONTACT US" />
          <div
            className="flex items-center justify-between"
            style={{ padding: "12px 16px", cursor: "pointer" }}
            onClick={() => window.open("mailto:support@alliope.app")}
          >
            <div className="flex items-center" style={{ gap: 12 }}>
              <svg
                style={{ width: 20, height: 20 }}
                fill="none"
                stroke="#8B7E74"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"
                />
                <polyline
                  points="22,6 12,13 2,6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <div className="flex flex-col" style={{ gap: 2 }}>
                <span style={{ fontSize: 15, color: "#1A1A1A" }}>
                  Email Support
                </span>
                <span style={{ fontSize: 12, color: "#D4622B" }}>
                  support@alliope.app
                </span>
              </div>
            </div>
            <svg
              style={{ width: 16, height: 16 }}
              fill="none"
              stroke="#B5A99A"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3"
              />
            </svg>
          </div>
        </div>

        {/* Tips Card */}
        <div
          className="flex flex-col"
          style={{
            borderRadius: 16,
            backgroundColor: "#FFF9F0",
            border: "1px solid #EDE6DD",
            padding: 20,
            gap: 14,
          }}
        >
          <div className="flex items-center" style={{ gap: 10 }}>
            <svg
              style={{ width: 22, height: 22 }}
              fill="none"
              stroke="#D4622B"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 18h6M10 22h4M12 2a7 7 0 015 11.9V17a1 1 0 01-1 1H8a1 1 0 01-1-1v-3.1A7 7 0 0112 2z"
              />
            </svg>
            <span
              style={{ fontSize: 16, fontWeight: 600, color: "#1A1A1A" }}
            >
              Tips for Better Transcriptions
            </span>
          </div>
          {TIPS.map((tip, i) => (
            <div
              key={i}
              className="flex"
              style={{ gap: 10, width: "100%" }}
            >
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#D4622B",
                  flexShrink: 0,
                }}
              >
                {i + 1}.
              </span>
              <p
                style={{
                  fontSize: 13,
                  color: "#6B5E54",
                  lineHeight: 1.5,
                  margin: 0,
                }}
              >
                {tip}
              </p>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div
          className="flex justify-center"
          style={{ padding: "12px 0" }}
        >
          <span style={{ fontSize: 12, fontWeight: 500, color: "#B5A99A" }}>
            Alliope v1.0.0
          </span>
        </div>
      </div>
    </div>
  );
}
