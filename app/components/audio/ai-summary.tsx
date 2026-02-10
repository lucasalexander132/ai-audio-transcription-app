"use client";

import { useState } from "react";
import { useQuery, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

interface AiSummaryProps {
  transcriptId: Id<"transcripts">;
}

function SectionHeader({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center" style={{ gap: 8 }}>
      {icon}
      <span
        style={{
          color: "#D4622B",
          fontFamily: "Inter, sans-serif",
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: 1,
        }}
      >
        {label}
      </span>
    </div>
  );
}

function SummaryCard({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        backgroundColor: "#FFFFFF",
        borderRadius: 16,
        border: "1px solid #EDE6DD",
        padding: 16,
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      {children}
    </div>
  );
}

function BulletPoint({ text }: { text: string }) {
  return (
    <div className="flex" style={{ gap: 10, width: "100%" }}>
      <div
        className="shrink-0 flex items-center justify-center"
        style={{ width: 6, height: 21 }}
      >
        <div
          style={{
            width: 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: "#D4622B",
          }}
        />
      </div>
      <p
        style={{
          fontSize: 14,
          color: "#1A1A1A",
          lineHeight: 1.5,
          margin: 0,
          flex: 1,
        }}
      >
        {text}
      </p>
    </div>
  );
}

function ActionItem({ text, assignee }: { text: string; assignee?: string }) {
  return (
    <div className="flex" style={{ gap: 10, width: "100%" }}>
      <div
        className="shrink-0"
        style={{
          width: 20,
          height: 20,
          borderRadius: 6,
          border: "1.5px solid #EDE6DD",
        }}
      />
      <div className="flex flex-col flex-1 min-w-0" style={{ gap: 2 }}>
        <p
          style={{
            fontSize: 14,
            color: "#1A1A1A",
            lineHeight: 1.4,
            margin: 0,
          }}
        >
          {text}
        </p>
        {assignee && (
          <span style={{ fontSize: 12, color: "#8B7E74" }}>{assignee}</span>
        )}
      </div>
    </div>
  );
}

// Lucide-style SVG icons as components
function FileTextIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#D4622B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
      <path d="M14 2v4a2 2 0 0 0 2 2h4" />
      <path d="M10 9H8" />
      <path d="M16 13H8" />
      <path d="M16 17H8" />
    </svg>
  );
}

function ListIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#D4622B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" x2="21" y1="6" y2="6" />
      <line x1="8" x2="21" y1="12" y2="12" />
      <line x1="8" x2="21" y1="18" y2="18" />
      <line x1="3" x2="3.01" y1="6" y2="6" />
      <line x1="3" x2="3.01" y1="12" y2="12" />
      <line x1="3" x2="3.01" y1="18" y2="18" />
    </svg>
  );
}

function CheckSquareIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#D4622B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="18" x="3" y="3" rx="2" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function SparklesIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#D4622B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
      <path d="M20 3v4" />
      <path d="M22 5h-4" />
      <path d="M4 17v2" />
      <path d="M5 18H3" />
    </svg>
  );
}

function SkeletonLoading() {
  return (
    <div className="flex flex-col" style={{ gap: 20 }}>
      {/* Overview skeleton */}
      <SummaryCard>
        <SectionHeader icon={<FileTextIcon />} label="OVERVIEW" />
        <div className="flex flex-col" style={{ gap: 8 }}>
          <div className="animate-pulse rounded" style={{ width: "100%", height: 16, backgroundColor: "#EDE6DD" }} />
          <div className="animate-pulse rounded" style={{ width: "83%", height: 16, backgroundColor: "#EDE6DD" }} />
          <div className="animate-pulse rounded" style={{ width: "80%", height: 16, backgroundColor: "#EDE6DD" }} />
          <div className="animate-pulse rounded" style={{ width: "75%", height: 16, backgroundColor: "#EDE6DD" }} />
        </div>
      </SummaryCard>

      {/* Key Points skeleton */}
      <SummaryCard>
        <SectionHeader icon={<ListIcon />} label="KEY POINTS" />
        <div className="flex flex-col" style={{ gap: 10 }}>
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center" style={{ gap: 10 }}>
              <div className="animate-pulse rounded-full shrink-0" style={{ width: 8, height: 8, backgroundColor: "#EDE6DD" }} />
              <div className="animate-pulse rounded" style={{ flex: 1, height: 16, backgroundColor: "#EDE6DD" }} />
            </div>
          ))}
        </div>
      </SummaryCard>

      {/* Action Items skeleton */}
      <SummaryCard>
        <SectionHeader icon={<CheckSquareIcon />} label="ACTION ITEMS" />
        <div className="flex flex-col" style={{ gap: 10 }}>
          {[1, 2].map((i) => (
            <div key={i} className="flex items-center" style={{ gap: 10 }}>
              <div className="animate-pulse rounded shrink-0" style={{ width: 20, height: 20, backgroundColor: "#EDE6DD" }} />
              <div className="animate-pulse rounded" style={{ flex: 1, height: 16, backgroundColor: "#EDE6DD" }} />
            </div>
          ))}
        </div>
      </SummaryCard>
    </div>
  );
}

export function AiSummary({ transcriptId }: AiSummaryProps) {
  const summary = useQuery(api.ai.getSummary, { transcriptId });
  const generateSummary = useAction(api.ai.generateSummary);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // State A: Summary exists - render content
  if (summary !== undefined && summary !== null) {
    return (
      <AiSummaryContent
        overview={summary.overview}
        keyPoints={summary.keyPoints}
        actionItems={summary.actionItems.map((item) => ({
          text: item.text,
          assignee: item.assignee === "Unassigned" ? undefined : item.assignee,
        }))}
      />
    );
  }

  // State B: Loading/generating - show skeleton
  if (isGenerating || summary === undefined) {
    return <SkeletonLoading />;
  }

  // State C: No summary yet (summary is null, not loading) - show generate button
  return (
    <div className="flex flex-col" style={{ gap: 20 }}>
      <div
        className="flex flex-col items-center text-center"
        style={{
          backgroundColor: "#FFFFFF",
          borderRadius: 16,
          border: "1px solid #EDE6DD",
          padding: "40px 24px",
          gap: 16,
        }}
      >
        <div
          className="flex items-center justify-center"
          style={{
            width: 48,
            height: 48,
            borderRadius: 24,
            backgroundColor: "#FFF0E6",
          }}
        >
          <SparklesIcon />
        </div>
        <div className="flex flex-col" style={{ gap: 6 }}>
          <h3
            style={{
              fontSize: 16,
              fontWeight: 600,
              color: "#1A1A1A",
              margin: 0,
              fontFamily: "Lora, serif",
            }}
          >
            AI Summary
          </h3>
          <p style={{ fontSize: 14, color: "#8B7E74", margin: 0, lineHeight: 1.5 }}>
            Generate an AI-powered summary with key points and action items.
          </p>
        </div>
        <button
          disabled={isGenerating}
          onClick={async () => {
            setIsGenerating(true);
            setError(null);
            try {
              await generateSummary({ transcriptId });
            } catch (e: any) {
              setError(e.message || "Failed to generate summary");
            } finally {
              setIsGenerating(false);
            }
          }}
          style={{
            padding: "10px 24px",
            borderRadius: 12,
            backgroundColor: "#D4622B",
            color: "#FFFFFF",
            fontSize: 14,
            fontWeight: 600,
            border: "none",
            cursor: isGenerating ? "not-allowed" : "pointer",
            opacity: isGenerating ? 0.5 : 1,
            pointerEvents: isGenerating ? "none" : "auto",
          }}
        >
          Generate Summary
        </button>
        {error && (
          <p style={{ color: "#E53E3E", fontSize: 13, marginTop: 8, margin: 0 }}>
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

// Exported for use when summary data is available
export function AiSummaryContent({
  overview,
  keyPoints,
  actionItems,
}: {
  overview: string;
  keyPoints: string[];
  actionItems: { text: string; assignee?: string }[];
}) {
  return (
    <div className="flex flex-col" style={{ gap: 20 }}>
      {/* Overview Card */}
      <SummaryCard>
        <SectionHeader icon={<FileTextIcon />} label="OVERVIEW" />
        <p
          style={{
            fontSize: 14,
            color: "#1A1A1A",
            lineHeight: 1.6,
            margin: 0,
          }}
        >
          {overview}
        </p>
      </SummaryCard>

      {/* Key Points Card */}
      {keyPoints.length > 0 && (
        <SummaryCard>
          <SectionHeader icon={<ListIcon />} label="KEY POINTS" />
          {keyPoints.map((point, i) => (
            <BulletPoint key={i} text={point} />
          ))}
        </SummaryCard>
      )}

      {/* Action Items Card - always renders */}
      <SummaryCard>
        <SectionHeader icon={<CheckSquareIcon />} label="ACTION ITEMS" />
        {actionItems.length > 0 ? (
          actionItems.map((item, i) => (
            <ActionItem key={i} text={item.text} assignee={item.assignee} />
          ))
        ) : (
          <p
            style={{
              fontSize: 14,
              color: "#8B7E74",
              margin: 0,
              lineHeight: 1.5,
            }}
          >
            No action items were identified in this transcript.
          </p>
        )}
      </SummaryCard>
    </div>
  );
}
