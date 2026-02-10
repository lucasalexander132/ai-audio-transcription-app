"use client";

import { useRouter } from "next/navigation";

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

function DataItem({
  icon,
  label,
  description,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
}) {
  return (
    <div
      className="flex flex-col"
      style={{ gap: 4, padding: "12px 16px" }}
    >
      <div className="flex items-center" style={{ gap: 10 }}>
        {icon}
        <span style={{ fontSize: 15, fontWeight: 500, color: "#1A1A1A" }}>
          {label}
        </span>
      </div>
      <p
        style={{
          fontSize: 13,
          color: "#8B7E74",
          lineHeight: 1.5,
          margin: 0,
        }}
      >
        {description}
      </p>
    </div>
  );
}

function RightsItem({
  icon,
  label,
  description,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
}) {
  return (
    <div className="flex" style={{ gap: 10, padding: "12px 16px" }}>
      {icon}
      <div className="flex flex-col" style={{ gap: 2, flex: 1 }}>
        <span style={{ fontSize: 15, fontWeight: 500, color: "#1A1A1A" }}>
          {label}
        </span>
        <p
          style={{
            fontSize: 13,
            color: "#8B7E74",
            lineHeight: 1.5,
            margin: 0,
          }}
        >
          {description}
        </p>
      </div>
    </div>
  );
}

function IconSvg({ d }: { d: string }) {
  return (
    <svg
      style={{ width: 18, height: 18, flexShrink: 0 }}
      fill="none"
      stroke="#D4622B"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  );
}

export default function PrivacyPolicyPage() {
  const router = useRouter();

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
          Privacy Policy
        </h1>
        <p style={{ fontSize: 14, color: "#8B7E74", margin: 0 }}>
          Last updated February 2026
        </p>
      </div>

      {/* Spacer */}
      <div style={{ height: 20 }} />

      {/* Body */}
      <div
        className="flex flex-col flex-1 overflow-y-auto"
        style={{ gap: 20, padding: "0 24px", paddingBottom: 120 }}
      >
        {/* Intro */}
        <p
          style={{
            fontSize: 14,
            color: "#6B5E54",
            lineHeight: 1.6,
            margin: 0,
          }}
        >
          Alliope is committed to protecting your privacy. This policy explains
          what data we collect, how we use it, and the choices you have.
        </p>

        {/* Data We Collect Card */}
        <div
          className="flex flex-col overflow-hidden"
          style={{
            borderRadius: 16,
            backgroundColor: "#FFFFFF",
            border: "1px solid #EDE6DD",
          }}
        >
          <SectionHeader label="DATA WE COLLECT" />
          <DataItem
            icon={<IconSvg d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 3a4 4 0 100 8 4 4 0 000-8z" />}
            label="Account Information"
            description="Your email address and password (hashed) when you create an account. We use this solely for authentication."
          />
          <Divider />
          <DataItem
            icon={<IconSvg d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3zM19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8" />}
            label="Audio Recordings"
            description="Audio you record or upload is stored securely in the cloud so you can play it back later. Recordings are linked to your account and only accessible by you."
          />
          <Divider />
          <DataItem
            icon={<IconSvg d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8" />}
            label="Transcripts & Summaries"
            description="Transcribed text, speaker labels, and AI-generated summaries are stored in our database. This data is tied to your account and not accessible by other users."
          />
          <Divider />
          <DataItem
            icon={<IconSvg d="M12.22 2h-.44a2 2 0 00-2 2v.18a2 2 0 01-1 1.73l-.43.25a2 2 0 01-2 0l-.15-.08a2 2 0 00-2.73.73l-.22.38a2 2 0 00.73 2.73l.15.1a2 2 0 011 1.72v.51a2 2 0 01-1 1.74l-.15.09a2 2 0 00-.73 2.73l.22.38a2 2 0 002.73.73l.15-.08a2 2 0 012 0l.43.25a2 2 0 011 1.73V20a2 2 0 002 2h.44a2 2 0 002-2v-.18a2 2 0 011-1.73l.43-.25a2 2 0 012 0l.15.08a2 2 0 002.73-.73l.22-.39a2 2 0 00-.73-2.73l-.15-.08a2 2 0 01-1-1.74v-.5a2 2 0 011-1.74l.15-.09a2 2 0 00.73-2.73l-.22-.38a2 2 0 00-2.73-.73l-.15.08a2 2 0 01-2 0l-.43-.25a2 2 0 01-1-1.73V4a2 2 0 00-2-2zM12 8a4 4 0 100 8 4 4 0 000-8z" />}
            label="Preferences"
            description="Your app settings such as transcription language and punctuation preferences. These are stored to personalize your experience."
          />
        </div>

        {/* Third-Party Services Card */}
        <div
          className="flex flex-col overflow-hidden"
          style={{
            borderRadius: 16,
            backgroundColor: "#FFFFFF",
            border: "1px solid #EDE6DD",
          }}
        >
          <SectionHeader label="THIRD-PARTY SERVICES" />
          <DataItem
            icon={
              <svg
                style={{ width: 18, height: 18, flexShrink: 0 }}
                fill="none"
                stroke="#D4622B"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M2 12h2M6 8l2 4-2 4M10 8l2 4-2 4M14 8l2 4-2 4M18 8l2 4-2 4" />
              </svg>
            }
            label="Deepgram (Transcription)"
            description="Your audio is sent to Deepgram over an encrypted connection (HTTPS) for speech-to-text processing. Deepgram processes the audio and returns the transcribed text. We do not control Deepgram's data retention policies."
          />
          <Divider />
          <DataItem
            icon={
              <svg
                style={{ width: 18, height: 18, flexShrink: 0 }}
                fill="none"
                stroke="#D4622B"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3l1.5 3.2 3.5.5-2.5 2.5.6 3.5L12 11l-3.1 1.7.6-3.5L7 6.7l3.5-.5L12 3zM5 19h14M6 22h12" />
              </svg>
            }
            label="Anthropic (AI Summaries)"
            description='When you request an AI summary, your transcript text (not audio) is sent to Anthropic&apos;s Claude API over an encrypted connection. This only happens when you explicitly tap "Generate Summary." Raw audio is never sent to Anthropic.'
          />
          <Divider />
          <DataItem
            icon={<IconSvg d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />}
            label="Convex (Storage & Database)"
            description="All your data — audio files, transcripts, settings, and account information — is hosted on Convex's cloud infrastructure. Data is encrypted in transit."
          />
        </div>

        {/* What We Will Never Do Card */}
        <div
          className="flex flex-col"
          style={{
            borderRadius: 16,
            backgroundColor: "#FFF9F0",
            border: "1px solid #EDE6DD",
            padding: 20,
            gap: 12,
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
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
            <span
              style={{ fontSize: 16, fontWeight: 600, color: "#1A1A1A" }}
            >
              What We Will Never Do
            </span>
          </div>
          {[
            "Sell your personal data or audio recordings to anyone",
            "Use your recordings or transcripts to train AI models",
            "Share your data with advertisers or marketing platforms",
            "Access or listen to your recordings for any purpose",
          ].map((item, i) => (
            <div key={i} className="flex" style={{ gap: 10, width: "100%" }}>
              <svg
                style={{ width: 14, height: 14, flexShrink: 0, marginTop: 2 }}
                fill="none"
                stroke="#D4622B"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <line x1="18" y1="6" x2="6" y2="18" strokeLinecap="round" />
                <line x1="6" y1="6" x2="18" y2="18" strokeLinecap="round" />
              </svg>
              <p
                style={{
                  fontSize: 13,
                  color: "#6B5E54",
                  lineHeight: 1.5,
                  margin: 0,
                }}
              >
                {item}
              </p>
            </div>
          ))}
        </div>

        {/* Security Card */}
        <div
          className="flex flex-col overflow-hidden"
          style={{
            borderRadius: 16,
            backgroundColor: "#FFFFFF",
            border: "1px solid #EDE6DD",
          }}
        >
          <SectionHeader label="SECURITY" />
          <div style={{ padding: "12px 16px" }}>
            <p
              style={{
                fontSize: 13,
                color: "#8B7E74",
                lineHeight: 1.5,
                margin: 0,
              }}
            >
              All data transmitted between your device and our servers is
              encrypted using HTTPS/TLS. Your password is hashed and never
              stored in plain text. Every database query verifies your identity,
              ensuring only you can access your data.
            </p>
          </div>
        </div>

        {/* Your Rights Card */}
        <div
          className="flex flex-col overflow-hidden"
          style={{
            borderRadius: 16,
            backgroundColor: "#FFFFFF",
            border: "1px solid #EDE6DD",
          }}
        >
          <SectionHeader label="YOUR RIGHTS" />
          <RightsItem
            icon={<IconSvg d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6" />}
            label="Delete Your Data"
            description="You can delete any transcript from your library at any time. This permanently removes the transcript, audio recording, speaker labels, and any AI summaries associated with it."
          />
          <Divider />
          <RightsItem
            icon={<IconSvg d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />}
            label="Export Your Data"
            description="You can export your transcripts at any time using the export feature. Your data belongs to you."
          />
          <Divider />
          <RightsItem
            icon={<IconSvg d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6" />}
            label="Control AI Features"
            description="AI summaries are opt-in only. Your transcript text is never sent to AI services unless you explicitly request it."
          />
        </div>

        {/* Contact Note */}
        <p
          style={{
            fontSize: 13,
            color: "#8B7E74",
            lineHeight: 1.5,
            margin: 0,
            textAlign: "center",
          }}
        >
          If you have questions about this policy or your data, contact us at{" "}
          <span style={{ color: "#D4622B" }}>support@alliope.app</span>.
        </p>

        {/* Footer */}
        <div
          className="flex justify-center"
          style={{ padding: "8px 0" }}
        >
          <span style={{ fontSize: 12, fontWeight: 500, color: "#B5A99A" }}>
            Alliope v1.0.0
          </span>
        </div>
      </div>
    </div>
  );
}
