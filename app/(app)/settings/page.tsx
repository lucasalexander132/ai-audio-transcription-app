"use client";

import { useState } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

const LANGUAGES = [
  { code: "en", name: "English" },
  { code: "en-US", name: "English (US)" },
  { code: "en-GB", name: "English (UK)" },
  { code: "en-AU", name: "English (AU)" },
  { code: "en-IN", name: "English (India)" },
  { code: "es", name: "Spanish" },
  { code: "fr", name: "French" },
  { code: "de", name: "German" },
  { code: "it", name: "Italian" },
  { code: "pt", name: "Portuguese" },
  { code: "pt-BR", name: "Portuguese (Brazil)" },
  { code: "nl", name: "Dutch" },
  { code: "ja", name: "Japanese" },
  { code: "ko", name: "Korean" },
  { code: "zh", name: "Chinese" },
  { code: "hi", name: "Hindi" },
  { code: "ru", name: "Russian" },
  { code: "uk", name: "Ukrainian" },
  { code: "pl", name: "Polish" },
  { code: "sv", name: "Swedish" },
  { code: "no", name: "Norwegian" },
  { code: "da", name: "Danish" },
  { code: "fi", name: "Finnish" },
  { code: "tr", name: "Turkish" },
  { code: "id", name: "Indonesian" },
  { code: "ms", name: "Malay" },
  { code: "th", name: "Thai" },
  { code: "vi", name: "Vietnamese" },
  { code: "ta", name: "Tamil" },
  { code: "tl", name: "Tagalog" },
] as const;

function Toggle({
  on,
  onToggle,
}: {
  on: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      style={{
        width: 44,
        height: 26,
        borderRadius: 13,
        backgroundColor: on ? "#D4622B" : "#EDE6DD",
        position: "relative",
        transition: "background-color 0.2s",
        flexShrink: 0,
      }}
    >
      <div
        style={{
          width: 22,
          height: 22,
          borderRadius: 11,
          backgroundColor: "#FFFFFF",
          position: "absolute",
          top: 2,
          left: on ? 20 : 2,
          transition: "left 0.2s",
          boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
        }}
      />
    </button>
  );
}

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

function SettingsRow({
  icon,
  label,
  right,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  right: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <div
      className="flex items-center justify-between"
      style={{ padding: "12px 16px", cursor: onClick ? "pointer" : undefined }}
      onClick={onClick}
    >
      <div className="flex items-center" style={{ gap: 12 }}>
        {icon}
        <span style={{ fontSize: 15, color: "#1A1A1A" }}>{label}</span>
      </div>
      {right}
    </div>
  );
}

function ValueChevron({ value }: { value: string }) {
  return (
    <div className="flex items-center" style={{ gap: 4 }}>
      <span style={{ fontSize: 14, color: "#B5A99A" }}>{value}</span>
      <svg
        style={{ width: 16, height: 16 }}
        fill="none"
        stroke="#B5A99A"
        strokeWidth="2"
        viewBox="0 0 24 24"
      >
        <polyline
          points="9 18 15 12 9 6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

function Chevron() {
  return (
    <svg
      style={{ width: 16, height: 16 }}
      fill="none"
      stroke="#B5A99A"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <polyline
        points="9 18 15 12 9 6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LanguagePickerModal({
  selectedCode,
  onSelect,
  onClose,
}: {
  selectedCode: string;
  onSelect: (code: string) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");

  const filtered = LANGUAGES.filter((lang) => {
    const term = search.toLowerCase();
    return (
      lang.name.toLowerCase().includes(term) ||
      lang.code.toLowerCase().includes(term)
    );
  });

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        backgroundColor: "rgba(0,0,0,0.4)",
      }}
      onClick={onClose}
    >
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          maxHeight: "70vh",
          backgroundColor: "#FFF9F0",
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          padding: 16,
          display: "flex",
          flexDirection: "column",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between"
          style={{ marginBottom: 12 }}
        >
          <h2
            style={{
              fontSize: 18,
              fontWeight: 600,
              color: "#1A1A1A",
              margin: 0,
            }}
          >
            Select Language
          </h2>
          <button
            onClick={onClose}
            style={{
              width: 32,
              height: 32,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 16,
              backgroundColor: "#F5EDE4",
            }}
          >
            <svg
              style={{ width: 18, height: 18 }}
              fill="none"
              stroke="#8B7E74"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <line
                x1="18"
                y1="6"
                x2="6"
                y2="18"
                strokeLinecap="round"
              />
              <line
                x1="6"
                y1="6"
                x2="18"
                y2="18"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        {/* Search input */}
        <input
          type="text"
          placeholder="Search languages..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            backgroundColor: "#F5EDE4",
            borderRadius: 12,
            padding: "10px 14px",
            border: "none",
            fontSize: 14,
            width: "100%",
            outline: "none",
            marginBottom: 12,
            color: "#1A1A1A",
          }}
        />

        {/* Language list */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            marginLeft: -16,
            marginRight: -16,
          }}
        >
          {filtered.map((lang) => {
            const isSelected = lang.code === selectedCode;
            return (
              <button
                key={lang.code}
                onClick={() => onSelect(lang.code)}
                className="flex items-center justify-between"
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  backgroundColor: isSelected ? "#F5EDE4" : "transparent",
                  textAlign: "left",
                }}
              >
                <div className="flex flex-col" style={{ gap: 2 }}>
                  <span
                    style={{
                      fontSize: 15,
                      fontWeight: isSelected ? 600 : 400,
                      color: "#1A1A1A",
                    }}
                  >
                    {lang.name}
                  </span>
                  <span style={{ fontSize: 12, color: "#B5A99A" }}>
                    {lang.code}
                  </span>
                </div>
                {isSelected && (
                  <svg
                    style={{ width: 20, height: 20, flexShrink: 0 }}
                    fill="none"
                    stroke="#D4622B"
                    strokeWidth="2.5"
                    viewBox="0 0 24 24"
                  >
                    <polyline
                      points="20 6 9 17 4 12"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </button>
            );
          })}
          {filtered.length === 0 && (
            <div
              style={{
                padding: "24px 16px",
                textAlign: "center",
                color: "#B5A99A",
                fontSize: 14,
              }}
            >
              No languages found
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const { signOut } = useAuthActions();
  const router = useRouter();

  // Convex settings (persisted)
  const settings = useQuery(api.userSettings.getUserSettings);
  const upsertSettings = useMutation(api.userSettings.upsertSettings);

  // Local-only state (future phases)
  const [detectSpeakers, setDetectSpeakers] = useState(true);
  // Language picker modal
  const [showLanguagePicker, setShowLanguagePicker] = useState(false);

  // Derive values from Convex settings (with defaults while loading)
  const autoPunctuation = settings?.autoPunctuation ?? true;
  const transcriptionLanguage = settings?.transcriptionLanguage ?? "en";
  const currentLanguageName =
    LANGUAGES.find((l) => l.code === transcriptionLanguage)?.name ?? "English";

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
  };

  const handleTogglePunctuation = () => {
    upsertSettings({ autoPunctuation: !autoPunctuation });
  };

  const handleSelectLanguage = (code: string) => {
    upsertSettings({ transcriptionLanguage: code });
    setShowLanguagePicker(false);
  };

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
            Back
          </span>
        </button>
      </div>

      {/* Spacer */}
      <div style={{ height: 8 }} />

      {/* Title Section */}
      <div
        className="flex flex-col"
        style={{ gap: 4, padding: "0 24px" }}
      >
        <h1
          className="font-serif"
          style={{
            fontSize: 24,
            fontWeight: 600,
            letterSpacing: -0.3,
            color: "#1A1A1A",
          }}
        >
          Settings
        </h1>
        <p style={{ fontSize: 14, color: "#8B7E74", margin: 0 }}>
          Manage your preferences
        </p>
      </div>

      {/* Spacer */}
      <div style={{ height: 20 }} />

      {/* Settings Body */}
      <div
        className="flex flex-col flex-1 overflow-y-auto"
        style={{ gap: 20, padding: "0 24px", paddingBottom: 120 }}
      >
        {/* Transcription Card */}
        <div
          className="flex flex-col overflow-hidden"
          style={{
            borderRadius: 16,
            backgroundColor: "#FFFFFF",
            border: "1px solid #EDE6DD",
          }}
        >
          <SectionHeader label="TRANSCRIPTION" />
          <SettingsRow
            icon={
              <svg
                style={{ width: 20, height: 20 }}
                fill="none"
                stroke="#8B7E74"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="2" y1="12" x2="22" y2="12" />
                <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
              </svg>
            }
            label="Language"
            right={<ValueChevron value={currentLanguageName} />}
            onClick={() => setShowLanguagePicker(true)}
          />
          <Divider />
          <SettingsRow
            icon={
              <svg
                style={{ width: 20, height: 20 }}
                fill="none"
                stroke="#8B7E74"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 00-3-3.87" />
                <path d="M16 3.13a4 4 0 010 7.75" />
              </svg>
            }
            label="Detect Speakers"
            right={
              <Toggle
                on={detectSpeakers}
                onToggle={() => setDetectSpeakers(!detectSpeakers)}
              />
            }
          />
          <Divider />
          <SettingsRow
            icon={
              <svg
                style={{ width: 20, height: 20 }}
                fill="none"
                stroke="#8B7E74"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path d="M5 4h1a3 3 0 013 3 3 3 0 013-3h1" />
                <path d="M13 20h-1a3 3 0 01-3-3 3 3 0 01-3 3H5" />
                <path d="M5 16H4a2 2 0 01-2-2v-4a2 2 0 012-2h1" />
                <path d="M13 8h7a2 2 0 012 2v4a2 2 0 01-2 2h-7" />
                <path d="M9 7v10" />
              </svg>
            }
            label="Auto-Punctuation"
            right={
              <Toggle
                on={autoPunctuation}
                onToggle={handleTogglePunctuation}
              />
            }
          />
        </div>

        {/* About Card */}
        <div
          className="flex flex-col overflow-hidden"
          style={{
            borderRadius: 16,
            backgroundColor: "#FFFFFF",
            border: "1px solid #EDE6DD",
          }}
        >
          <SectionHeader label="ABOUT" />
          <SettingsRow
            icon={
              <svg
                style={{ width: 20, height: 20 }}
                fill="none"
                stroke="#8B7E74"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <circle cx="12" cy="12" r="10" />
                <circle cx="12" cy="12" r="4" />
                <line x1="4.93" y1="4.93" x2="9.17" y2="9.17" />
                <line x1="14.83" y1="14.83" x2="19.07" y2="19.07" />
                <line x1="14.83" y1="9.17" x2="19.07" y2="4.93" />
                <line x1="4.93" y1="19.07" x2="9.17" y2="14.83" />
              </svg>
            }
            label="Help & Support"
            right={<Chevron />}
            onClick={() => router.push("/help")}
          />
          <Divider />
          <SettingsRow
            icon={
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
                  d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
                />
              </svg>
            }
            label="Privacy Policy"
            right={<Chevron />}
            onClick={() => router.push("/privacy")}
          />
          <Divider />
          <SettingsRow
            icon={
              <svg
                style={{ width: 20, height: 20 }}
                fill="none"
                stroke="#8B7E74"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" strokeLinecap="round" />
                <line
                  x1="12"
                  y1="8"
                  x2="12.01"
                  y2="8"
                  strokeLinecap="round"
                />
              </svg>
            }
            label="Version"
            right={
              <span style={{ fontSize: 14, color: "#B5A99A" }}>1.0.0</span>
            }
          />
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

        {/* Sign Out */}
        <button
          onClick={handleSignOut}
          className="flex items-center justify-center"
          style={{
            padding: "14px 16px",
            borderRadius: 16,
            backgroundColor: "#FFFFFF",
            border: "1px solid #EDE6DD",
            gap: 8,
          }}
        >
          <svg
            style={{ width: 20, height: 20 }}
            fill="none"
            stroke="#E53E3E"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"
            />
            <polyline
              points="16 17 21 12 16 7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <line
              x1="21"
              y1="12"
              x2="9"
              y2="12"
              strokeLinecap="round"
            />
          </svg>
          <span style={{ fontSize: 15, fontWeight: 500, color: "#E53E3E" }}>
            Sign Out
          </span>
        </button>
      </div>

      {/* Language Picker Modal */}
      {showLanguagePicker && (
        <LanguagePickerModal
          selectedCode={transcriptionLanguage}
          onSelect={handleSelectLanguage}
          onClose={() => setShowLanguagePicker(false)}
        />
      )}
    </div>
  );
}
