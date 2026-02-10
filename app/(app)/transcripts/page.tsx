"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useDebounce } from "@/app/lib/hooks/use-debounce";
import { SearchBar } from "@/app/components/library/search-bar";
import { FilterTabs } from "@/app/components/library/filter-tabs";
import { TranscriptCard } from "@/app/components/library/transcript-card";

const TABS = ["All", "Recent", "Starred", "Meetings"];

export default function TranscriptsPage() {
  const router = useRouter();

  // Search state
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebounce(searchInput, 300);
  const [showSearch, setShowSearch] = useState(false);

  // Tab state
  const [activeTab, setActiveTab] = useState("All");

  // Data queries
  const allTranscripts = useQuery(api.transcripts.list);
  const searchResults = useQuery(
    api.transcripts.search,
    debouncedSearch.length >= 2 ? { searchTerm: debouncedSearch } : "skip"
  );
  const allTranscriptTags = useQuery(api.tags.getAllTranscriptTags);

  // Build tag lookup: transcriptId -> tagName[]
  const tagsByTranscript = useMemo(() => {
    const map = new Map<string, string[]>();
    if (allTranscriptTags) {
      for (const { transcriptId, tagName } of allTranscriptTags) {
        const existing = map.get(transcriptId);
        if (existing) {
          existing.push(tagName);
        } else {
          map.set(transcriptId, [tagName]);
        }
      }
    }
    return map;
  }, [allTranscriptTags]);

  // Is search active?
  const isSearchActive =
    debouncedSearch.length >= 2 && searchResults !== undefined;

  // Filtered transcripts (tab-based) when search is not active
  const filteredTranscripts = useMemo(() => {
    if (!allTranscripts) return [];

    // Exclude "recording" status from library list
    const eligible = allTranscripts.filter(
      (t) => t.status !== "recording"
    );

    switch (activeTab) {
      case "Recent": {
        const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        return eligible.filter((t) => t.createdAt >= sevenDaysAgo);
      }
      case "Starred":
        return eligible.filter((t) => t.isStarred);
      case "Meetings":
        return eligible.filter((t) => {
          const tags = tagsByTranscript.get(t._id) ?? [];
          return tags.some(
            (tag) => tag.toLowerCase() === "meetings"
          );
        });
      default:
        return eligible;
    }
  }, [allTranscripts, activeTab, tagsByTranscript]);

  // Display list: search results or filtered transcripts
  const displayTranscripts = isSearchActive
    ? searchResults ?? []
    : filteredTranscripts;

  // Loading state
  const isLoading = allTranscripts === undefined;

  return (
    <div
      className="flex flex-col"
      style={{ backgroundColor: "#FBF5EE", minHeight: "100dvh" }}
    >
      {/* Top spacer */}
      <div style={{ height: 16 }} />

      {/* Header */}
      <div
        className="flex items-center justify-between"
        style={{ padding: "0 24px" }}
      >
        <h1
          className="font-serif"
          style={{
            fontSize: 28,
            fontWeight: 600,
            letterSpacing: -0.5,
            color: "#1A1A1A",
          }}
        >
          Transcripts
        </h1>
        <div className="flex items-center" style={{ gap: 12 }}>
          {/* Search toggle */}
          <button
            className="flex items-center justify-center"
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: showSearch ? "#D4622B" : "#FFFFFF",
              border: showSearch ? "none" : "1px solid #EDE6DD",
              transition: "background-color 0.15s",
            }}
            onClick={() => {
              setShowSearch(!showSearch);
              if (showSearch) {
                setSearchInput("");
              }
            }}
          >
            <svg
              style={{ width: 20, height: 20 }}
              fill="none"
              stroke={showSearch ? "#FFFFFF" : "#8B7E74"}
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <circle cx="11" cy="11" r="8" />
              <line
                x1="21"
                y1="21"
                x2="16.65"
                y2="16.65"
                strokeLinecap="round"
              />
            </svg>
          </button>
          {/* Profile */}
          <button
            className="flex items-center justify-center"
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: "#D4622B",
            }}
            onClick={() => router.push("/settings")}
          >
            <svg
              style={{ width: 20, height: 20 }}
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </button>
        </div>
      </div>

      {/* Search bar (collapsible) */}
      {showSearch && (
        <div style={{ padding: "12px 24px 0" }}>
          <SearchBar
            value={searchInput}
            onChange={setSearchInput}
            onClear={() => setSearchInput("")}
          />
        </div>
      )}

      {/* Spacer */}
      <div style={{ height: 16 }} />

      {/* Filter Tabs - hidden when search has results */}
      {!isSearchActive && (
        <FilterTabs
          activeTab={activeTab}
          onTabChange={setActiveTab}
          tabs={TABS}
        />
      )}

      {/* Search results header */}
      {isSearchActive && (
        <div style={{ padding: "0 24px" }}>
          <span style={{ fontSize: 13, color: "#8B7E74", fontWeight: 500 }}>
            {displayTranscripts.length} search result
            {displayTranscripts.length !== 1 ? "s" : ""}
          </span>
        </div>
      )}

      {/* Spacer */}
      <div style={{ height: 20 }} />

      {/* Content */}
      {isLoading ? (
        /* Loading skeleton */
        <div className="flex flex-col" style={{ gap: 12, padding: "0 24px" }}>
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="animate-pulse"
              style={{
                height: 88,
                borderRadius: 16,
                backgroundColor: "#EDE6DD",
              }}
            />
          ))}
        </div>
      ) : displayTranscripts.length === 0 ? (
        /* Empty states */
        <EmptyState
          type={isSearchActive ? "search" : activeTab}
        />
      ) : (
        /* Transcript list */
        <div
          className="flex flex-col"
          style={{ gap: 12, padding: "0 24px", paddingBottom: 120 }}
        >
          {displayTranscripts.map((transcript) => (
            <TranscriptCard
              key={transcript._id}
              transcript={transcript}
              tags={tagsByTranscript.get(transcript._id) ?? []}
              onClick={() => router.push(`/transcripts/${transcript._id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyState({ type }: { type: string }) {
  const config: Record<string, { icon: React.ReactNode; title: string; description: string }> = {
    All: {
      icon: (
        <svg
          style={{ width: 32, height: 32 }}
          fill="none"
          stroke="#D4622B"
          strokeWidth="1.5"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19 10v2a7 7 0 01-14 0v-2"
          />
          <line x1="12" y1="19" x2="12" y2="23" strokeLinecap="round" />
          <line x1="8" y1="23" x2="16" y2="23" strokeLinecap="round" />
        </svg>
      ),
      title: "No transcripts yet",
      description: "Start a new recording to create your first transcript",
    },
    Recent: {
      icon: (
        <svg
          style={{ width: 32, height: 32 }}
          fill="none"
          stroke="#D4622B"
          strokeWidth="1.5"
          viewBox="0 0 24 24"
        >
          <circle cx="12" cy="12" r="10" />
          <polyline
            points="12 6 12 12 16 14"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ),
      title: "No recent transcripts",
      description: "Transcripts from the last 7 days appear here",
    },
    Starred: {
      icon: (
        <svg
          style={{ width: 32, height: 32 }}
          fill="none"
          stroke="#D4622B"
          strokeWidth="1.5"
          viewBox="0 0 24 24"
        >
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ),
      title: "No starred transcripts",
      description: "Star transcripts to find them quickly",
    },
    Meetings: {
      icon: (
        <svg
          style={{ width: 32, height: 32 }}
          fill="none"
          stroke="#D4622B"
          strokeWidth="1.5"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"
          />
          <line x1="7" y1="7" x2="7.01" y2="7" strokeLinecap="round" />
        </svg>
      ),
      title: "No meetings",
      description: "Tag transcripts as 'Meetings' to see them here",
    },
    search: {
      icon: (
        <svg
          style={{ width: 32, height: 32 }}
          fill="none"
          stroke="#D4622B"
          strokeWidth="1.5"
          viewBox="0 0 24 24"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" strokeLinecap="round" />
        </svg>
      ),
      title: "No results",
      description: "Try a different search term",
    },
  };

  const { icon, title, description } = config[type] ?? config.All;

  return (
    <div
      className="flex flex-col items-center justify-center"
      style={{ padding: "64px 24px", gap: 16 }}
    >
      <div
        className="flex items-center justify-center"
        style={{
          width: 64,
          height: 64,
          borderRadius: 32,
          backgroundColor: "#FFF0E6",
        }}
      >
        {icon}
      </div>
      <span
        className="font-serif"
        style={{ fontSize: 18, fontWeight: 600, color: "#1A1A1A" }}
      >
        {title}
      </span>
      <span
        style={{
          fontSize: 14,
          color: "#8B7E74",
          textAlign: "center",
          maxWidth: 240,
        }}
      >
        {description}
      </span>
    </div>
  );
}
