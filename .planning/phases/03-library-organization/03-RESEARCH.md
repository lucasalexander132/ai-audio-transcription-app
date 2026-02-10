# Phase 3: Library & Organization - Research

**Researched:** 2026-02-10
**Domain:** Transcript library UI, Convex search/filtering, PDF/TXT export
**Confidence:** HIGH

## Summary

Phase 3 transforms the existing basic transcript list page into a full-featured library with search, filter tabs, starring, tagging, and export capabilities. The existing codebase already has a `transcripts/page.tsx` with a simple list view and non-functional filter tab buttons that need to be wired up. The Convex schema needs extensions for `isStarred`, search indexes, and a new `tags`/`transcriptTags` table.

The standard approach is: (1) extend the Convex schema with starred boolean, a search index on transcript title, and a junction table for tags; (2) use Convex's built-in full-text search with `withSearchIndex` for title/content search; (3) implement client-side filtering for tabs since tab filters are simple boolean/date checks on already-fetched data; (4) use jsPDF for client-side PDF generation with styled output; (5) use Blob + download link for TXT export; (6) use `useDeferredValue` or a 300ms debounce hook for search input responsiveness.

**Primary recommendation:** Keep search and tab filtering as separate concerns. Search uses Convex's full-text search index (server-side). Tab filtering applies client-side on the fetched results since the dataset per user is small enough. Tags use a junction table pattern for clean many-to-many relationships.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| jsPDF | 4.1.0 | Client-side PDF generation | 4.7M+ weekly downloads, TypeScript support, no server needed, built-in font styling (bold, color, size) |
| Convex full-text search | Built-in | Search transcripts by title/content | Native Convex feature, reactive, consistent, transactional, supports prefix matching |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| convex-helpers | Latest | `filter()` helper for complex TypeScript-based query filters | When combining tag lookups with transcript queries |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| jsPDF | @react-pdf/renderer | React-component-based PDF building, heavier bundle (~860K weekly downloads), more complex setup for simple text documents |
| jsPDF | html2pdf.js | Renders HTML to PDF via html2canvas, less control over precise layout, depends on DOM rendering |
| Client-side filtering | Server-side filtering per tab | Over-engineering for typical user dataset sizes (<1000 transcripts); server filtering adds query complexity for negligible benefit |

**Installation:**
```bash
npm install jspdf
```

No other new dependencies needed. Convex search is built-in. File download uses native browser APIs.

## Architecture Patterns

### Schema Extensions
```
convex/schema.ts additions:
  transcripts table:
    + isStarred: v.optional(v.boolean())        // Starring support
    + searchIndex("search_title", { searchField: "title", filterFields: ["userId"] })

  tags table (NEW):
    - userId: v.id("users")
    - name: v.string()
    - index("by_userId", ["userId"])
    - index("by_userId_name", ["userId", "name"])  // For uniqueness check

  transcriptTags table (NEW - junction):
    - transcriptId: v.id("transcripts")
    - tagId: v.id("tags")
    - index("by_transcript", ["transcriptId"])
    - index("by_tag", ["tagId"])
```

### Recommended Project Structure
```
app/
├── (app)/transcripts/
│   ├── page.tsx                    # Library page (enhanced from existing)
│   └── [id]/
│       └── page.tsx                # Detail page (add export menu + tags)
├── components/
│   ├── library/
│   │   ├── transcript-card.tsx     # Individual card in list
│   │   ├── search-bar.tsx          # Search input with debounce
│   │   ├── filter-tabs.tsx         # All/Recent/Starred/Meetings tabs
│   │   ├── tag-picker-modal.tsx    # Tag selection/creation modal
│   │   └── tag-chips.tsx           # Tag display chips
│   └── export/
│       ├── export-menu.tsx         # 3-dot overflow menu with export options
│       └── transcript-exporter.ts  # PDF/TXT generation logic (pure functions)
convex/
├── schema.ts                       # Extended with search index + new tables
├── transcripts.ts                  # Extended with search, star, tag queries
└── tags.ts                         # NEW: tag CRUD operations
```

### Pattern 1: Convex Full-Text Search for Transcript Search
**What:** Use Convex's built-in search index to search transcript titles with real-time results
**When to use:** When the user types in the search bar
**Example:**
```typescript
// Source: https://docs.convex.dev/search/text-search
// In convex/schema.ts - add search index
transcripts: defineTable({
  userId: v.id("users"),
  title: v.string(),
  isStarred: v.optional(v.boolean()),
  // ... existing fields
})
  .index("by_userId", ["userId"])
  .searchIndex("search_title", {
    searchField: "title",
    filterFields: ["userId"],
  }),

// In convex/transcripts.ts - search query
export const search = query({
  args: { searchTerm: v.string() },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (userId === null) return [];

    return await ctx.db
      .query("transcripts")
      .withSearchIndex("search_title", (q) =>
        q.search("title", args.searchTerm).eq("userId", userId)
      )
      .take(50);
  },
});
```

### Pattern 2: Client-Side Tab Filtering
**What:** Filter already-fetched transcripts by tab (All, Recent, Starred, Meetings) in the React component
**When to use:** When the user switches tabs; search is independent and searches all transcripts
**Example:**
```typescript
// In the library page component
const allTranscripts = useQuery(api.transcripts.list);
const transcriptTags = useQuery(api.tags.getTranscriptTags);

const filteredTranscripts = useMemo(() => {
  if (!allTranscripts) return [];

  switch (activeTab) {
    case "Recent":
      const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      return allTranscripts.filter(t => t.createdAt >= sevenDaysAgo);
    case "Starred":
      return allTranscripts.filter(t => t.isStarred);
    case "Meetings":
      // Filter transcripts that have a "Meetings" tag
      return allTranscripts.filter(t =>
        transcriptTags?.some(tt =>
          tt.transcriptId === t._id && tt.tagName === "Meetings"
        )
      );
    default:
      return allTranscripts;
  }
}, [allTranscripts, activeTab, transcriptTags]);
```

### Pattern 3: Junction Table for Tags (Many-to-Many)
**What:** Use a separate `tags` table and `transcriptTags` junction table instead of embedding tags as arrays
**When to use:** Always for this use case - allows tag reuse, renaming, and querying by tag
**Example:**
```typescript
// convex/tags.ts
export const addTagToTranscript = mutation({
  args: {
    transcriptId: v.id("transcripts"),
    tagName: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Find or create tag
    let tag = await ctx.db
      .query("tags")
      .withIndex("by_userId_name", (q) =>
        q.eq("userId", userId).eq("name", args.tagName)
      )
      .first();

    if (!tag) {
      const tagId = await ctx.db.insert("tags", {
        userId,
        name: args.tagName,
      });
      tag = await ctx.db.get(tagId);
    }

    // Check existing link
    const existing = await ctx.db
      .query("transcriptTags")
      .withIndex("by_transcript", (q) => q.eq("transcriptId", args.transcriptId))
      .filter((q) => q.eq(q.field("tagId"), tag!._id))
      .first();

    if (!existing) {
      await ctx.db.insert("transcriptTags", {
        transcriptId: args.transcriptId,
        tagId: tag!._id,
      });
    }
  },
});
```

### Pattern 4: jsPDF Styled Transcript Export
**What:** Generate a styled PDF with title header, speaker names bolded, timestamps in gray
**When to use:** When user selects "Export as PDF" from the overflow menu
**Example:**
```typescript
// Source: https://github.com/parallax/jsPDF
import { jsPDF } from "jspdf";

function exportTranscriptAsPDF(
  title: string,
  date: string,
  duration: string,
  speakers: string[],
  tags: string[],
  segments: { speaker: string; timestamp: string; text: string }[]
) {
  const doc = new jsPDF();
  let y = 20;

  // Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(26, 26, 26); // #1A1A1A
  doc.text(title, 20, y);
  y += 10;

  // Metadata line
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(139, 126, 116); // #8B7E74
  doc.text(`${date} | ${duration} | ${speakers.length} speakers`, 20, y);
  y += 6;

  if (tags.length > 0) {
    doc.text(`Tags: ${tags.join(", ")}`, 20, y);
    y += 10;
  } else {
    y += 4;
  }

  // Divider line
  doc.setDrawColor(237, 230, 221); // #EDE6DD
  doc.line(20, y, 190, y);
  y += 10;

  // Transcript segments
  for (const segment of segments) {
    // Check page break
    if (y > 270) {
      doc.addPage();
      y = 20;
    }

    // Speaker name (bold)
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(26, 26, 26);
    doc.text(segment.speaker, 20, y);

    // Timestamp (gray, same line)
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(181, 169, 154); // #B5A99A
    const speakerWidth = doc.getTextWidth(segment.speaker);
    doc.text(`  ${segment.timestamp}`, 20 + speakerWidth, y);
    y += 6;

    // Text content
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(26, 26, 26);
    const lines = doc.splitTextToSize(segment.text, 170);
    doc.text(lines, 20, y);
    y += lines.length * 5 + 6;
  }

  // File naming: date + title
  const dateStr = new Date().toISOString().split("T")[0];
  const safeTitle = title.replace(/[^a-zA-Z0-9 ]/g, "").trim();
  doc.save(`${dateStr} ${safeTitle}.pdf`);
}
```

### Pattern 5: Debounced Search with Convex
**What:** Use a debounce hook to prevent excessive Convex search queries while typing
**When to use:** For the search bar input
**Example:**
```typescript
// Custom useDebounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}

// In search component
const [searchInput, setSearchInput] = useState("");
const debouncedSearch = useDebounce(searchInput, 300);

// Only query Convex when debounced value changes
const searchResults = useQuery(
  api.transcripts.search,
  debouncedSearch.length >= 2
    ? { searchTerm: debouncedSearch }
    : "skip"
);
```

### Anti-Patterns to Avoid
- **Searching on every keystroke without debounce:** Convex queries are reactive, but firing a new search query on every character wastes resources. Use 300ms debounce.
- **Server-side tab filtering with separate queries per tab:** For typical user data sizes (<1000 transcripts), fetching all and filtering client-side is simpler and avoids multiple subscriptions.
- **Embedding tags as arrays on the transcript document:** Makes tag renaming, querying by tag, and tag management much harder. Use a junction table.
- **Using html2canvas for PDF generation:** Depends on DOM rendering, unreliable on mobile, and produces bitmap-based PDFs instead of text-based ones.
- **Using `file-saver` for iOS:** Has known issues on iOS Safari where files open in new tabs instead of downloading. Use native approach with fallback.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| PDF generation | Custom canvas/SVG to PDF | jsPDF | Text wrapping, page breaks, font metrics are complex; jsPDF handles all of it |
| Full-text search | Manual string matching on client | Convex searchIndex | Convex search uses BM25 scoring, prefix matching, and is reactive. Manual search doesn't scale and misses ranking |
| File download on mobile | Custom download handler | `<a>` tag with download attribute + Web Share API fallback | Browser-native approach is most reliable across platforms |
| Text splitting/wrapping for PDF | Manual character counting | `jsPDF.splitTextToSize()` | Handles font metrics and multi-byte characters correctly |

**Key insight:** PDF generation and text search are both domains where "simple" implementations break on edge cases (page breaks, Unicode, relevance ranking). Use the established libraries.

## Common Pitfalls

### Pitfall 1: Convex Search Index Requires Non-Empty Search Term
**What goes wrong:** Passing an empty string to `withSearchIndex` will throw an error or return unexpected results.
**Why it happens:** Convex full-text search requires at least one non-empty search term.
**How to avoid:** Conditionally skip the search query when the search term is empty. Use Convex's `"skip"` argument to useQuery: `useQuery(api.transcripts.search, searchTerm ? { searchTerm } : "skip")`.
**Warning signs:** Error in console about empty search term, blank results on first render.

### Pitfall 2: Search Returning Relevance-Ordered Results vs. Tab List Being Time-Ordered
**What goes wrong:** Search results come back in relevance order (BM25), but the normal list is time-ordered. Users may be confused by the order change.
**Why it happens:** Convex search always returns relevance-ordered results.
**How to avoid:** When search is active, show search results in relevance order (this is expected behavior). When search is cleared, return to the time-ordered tab view. Make the visual distinction clear - e.g., show "Search results" header when searching.
**Warning signs:** Users report "my transcript disappeared" when it's just sorted differently.

### Pitfall 3: iOS Safari PDF Download Opens in New Tab
**What goes wrong:** `jsPDF.save()` opens the PDF in a new tab on iOS Safari instead of downloading.
**Why it happens:** iOS Safari has restrictions on programmatic file downloads.
**How to avoid:** Use Web Share API (`navigator.share()`) as the primary export mechanism on mobile, with `jsPDF.save()` as desktop fallback. Check `navigator.canShare()` to detect capability. The share sheet on iOS allows saving to Files.
**Warning signs:** User taps "Export PDF" and a new tab opens with the PDF but no download dialog.

### Pitfall 4: Convex Search Index 1024 Result Limit
**What goes wrong:** `.collect()` on search results throws if more than 1024 documents match.
**Why it happens:** Convex search queries can scan up to 1024 results from the search index.
**How to avoid:** Use `.take(50)` or `.paginate()` instead of `.collect()` for search queries. For a library view, 50 results is a reasonable limit for search.
**Warning signs:** Runtime error when user searches a common term.

### Pitfall 5: Tags Junction Table Queries Are Two-Step
**What goes wrong:** Fetching tags for display on transcript cards requires joining transcriptTags + tags, which can be slow if done per-card.
**Why it happens:** Convex doesn't have SQL-style JOINs. Each lookup is a separate query.
**How to avoid:** Create a single query that fetches all tags for a user's transcripts at once (batch approach), returning a map of transcriptId -> tag names. This is one query instead of N queries.
**Warning signs:** Slow library page load, visible per-card loading of tags.

### Pitfall 6: jsPDF Page Break Detection
**What goes wrong:** Long transcript text runs off the bottom of the page.
**Why it happens:** jsPDF doesn't auto-paginate. You must manually track the Y position and call `addPage()`.
**How to avoid:** After each segment, check if `y > 270` (for A4) and add a new page. Account for the height of wrapped text using `splitTextToSize()` line count.
**Warning signs:** PDF output has text cut off at page bottom.

## Code Examples

### Full-Text Search on Title with Content Fallback
```typescript
// Source: https://docs.convex.dev/search/text-search
// For searching transcript content (words), we need a separate search index
// on the words table, or we can store a denormalized "fullText" field on transcripts.
//
// Decision: Search title only for highlights (per CONTEXT.md), but also match
// content. Two approaches:
//
// Approach A (recommended): Add a "fullText" denormalized field to transcripts
// that concatenates all words when transcription completes. Add search index on it.
//
// Approach B: Search title index, plus client-side filter on word content.
// This doesn't scale but works for small datasets.
//
// Going with Approach A:

// Schema addition:
transcripts: defineTable({
  // ... existing fields
  fullText: v.optional(v.string()),  // Denormalized concatenated transcript text
})
  .index("by_userId", ["userId"])
  .searchIndex("search_content", {
    searchField: "fullText",
    filterFields: ["userId"],
  })
  .searchIndex("search_title", {
    searchField: "title",
    filterFields: ["userId"],
  }),

// Search query that checks both title and content:
export const search = query({
  args: { searchTerm: v.string() },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (userId === null) return [];

    // Search by title
    const titleMatches = await ctx.db
      .query("transcripts")
      .withSearchIndex("search_title", (q) =>
        q.search("title", args.searchTerm).eq("userId", userId)
      )
      .take(25);

    // Search by content
    const contentMatches = await ctx.db
      .query("transcripts")
      .withSearchIndex("search_content", (q) =>
        q.search("fullText", args.searchTerm).eq("userId", userId)
      )
      .take(25);

    // Merge and deduplicate (title matches first for higher relevance)
    const seen = new Set(titleMatches.map(t => t._id));
    const merged = [...titleMatches];
    for (const t of contentMatches) {
      if (!seen.has(t._id)) {
        merged.push(t);
        seen.add(t._id);
      }
    }
    return merged;
  },
});
```

### Star/Unstar Mutation
```typescript
export const toggleStar = mutation({
  args: { transcriptId: v.id("transcripts") },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const transcript = await ctx.db.get(args.transcriptId);
    if (!transcript || transcript.userId !== userId) {
      throw new Error("Transcript not found or unauthorized");
    }

    await ctx.db.patch(args.transcriptId, {
      isStarred: !transcript.isStarred,
    });
  },
});
```

### TXT Export Formatting
```typescript
// Plain text export with clean formatting
function exportTranscriptAsTXT(
  title: string,
  date: string,
  duration: string,
  tags: string[],
  segments: { speaker: string; timestamp: string; text: string }[]
): string {
  const lines: string[] = [];

  lines.push(title);
  lines.push("=".repeat(title.length));
  lines.push("");
  lines.push(`Date: ${date}`);
  lines.push(`Duration: ${duration}`);
  if (tags.length > 0) {
    lines.push(`Tags: ${tags.join(", ")}`);
  }
  lines.push("");
  lines.push("-".repeat(40));
  lines.push("");

  for (const segment of segments) {
    lines.push(`[${segment.timestamp}] ${segment.speaker}:`);
    lines.push(segment.text);
    lines.push("");
  }

  return lines.join("\n");
}

// Download as file
function downloadTXT(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
```

### Mobile-Friendly Export with Web Share API Fallback
```typescript
async function exportFile(blob: Blob, filename: string) {
  // Try Web Share API first (better on mobile)
  if (navigator.canShare?.({ files: [new File([blob], filename)] })) {
    try {
      await navigator.share({
        files: [new File([blob], filename, { type: blob.type })],
        title: filename,
      });
      return;
    } catch (e) {
      // User cancelled or share failed, fall through to download
      if ((e as Error).name === "AbortError") return;
    }
  }

  // Fallback: standard download
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
```

### Batch Tag Fetching for Library List
```typescript
// Fetch all tags for all of a user's transcripts in one query
export const getAllTranscriptTags = query({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return [];

    // Get all user's tags
    const userTags = await ctx.db
      .query("tags")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    const tagMap = new Map(userTags.map(t => [t._id, t.name]));

    // Get all transcript-tag links for user's tags
    const links: { transcriptId: string; tagName: string }[] = [];
    for (const tag of userTags) {
      const tagLinks = await ctx.db
        .query("transcriptTags")
        .withIndex("by_tag", (q) => q.eq("tagId", tag._id))
        .collect();
      for (const link of tagLinks) {
        links.push({
          transcriptId: link.transcriptId,
          tagName: tagMap.get(link.tagId) || "",
        });
      }
    }
    return links;
  },
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Custom debounce with setTimeout | `useDeferredValue` for rendering, custom hook for API calls | React 18 (2022) | Use `useDeferredValue` for display optimization, 300ms debounce hook for search API calls |
| file-saver.js for downloads | Web Share API + native `<a download>` fallback | 2020+ | Better mobile support, native share sheet integration |
| Embedded tag arrays on documents | Junction table pattern | Standard practice | Enables tag reuse, renaming, querying by tag |
| Fuzzy search in Convex | Exact + prefix search only | January 2025 | Convex deprecated fuzzy matching; design search UX around prefix matching |

**Deprecated/outdated:**
- Convex fuzzy search matches: Deprecated after January 15, 2025. Only exact and prefix matching remain.
- `file-saver.js` on iOS: Known issues with iOS Safari opening files in new tabs. Prefer Web Share API.

## Discretion Recommendations

These areas were marked as Claude's Discretion in CONTEXT.md:

### Library List Card Layout
**Recommendation:** Keep the existing card layout from `transcripts/page.tsx` but add: (1) a star icon on the right side of each card (where the 3-dot icon currently is), (2) tag chips below the info row, (3) a brief text preview line (first ~80 chars of transcript text). The existing card structure with icon + title + date + duration is good information density for mobile.

### Search Debounce Timing
**Recommendation:** 300ms debounce delay. This balances between feeling responsive (under 500ms feels "instant" to users) and avoiding excessive queries. Convex queries are cheap but the 300ms sweet spot is well-established for typeahead search on mobile devices (~30 WPM typing speed).

### Exact Tag Limit
**Recommendation:** 8 tags per transcript. This is in the middle of the 5-10 range. Display the first 5 as chips, show "+3 more" if truncated. 8 provides enough flexibility for categorization without cluttering the UI.

### TXT Export Formatting
**Recommendation:** Simple, readable plain text with clear section headers. Title underlined with `=`, metadata on separate lines, `---` divider, then `[timestamp] Speaker:` format per segment. No special encoding, UTF-8 throughout.

### Empty State Designs per Tab
**Recommendation:**
- **All:** Existing empty state (microphone icon + "No transcripts yet" + "Start a new recording...")
- **Recent:** Clock icon + "No recent transcripts" + "Transcripts from the last 7 days appear here"
- **Starred:** Star icon + "No starred transcripts" + "Star transcripts to find them quickly"
- **Meetings:** Tag icon + "No meetings" + "Tag transcripts as 'Meetings' to see them here"

Each uses the same pattern as the existing empty state (64px icon circle in `#FFF0E6`, title in font-serif, description in `#8B7E74`).

## Open Questions

1. **Content search fullText denormalization timing**
   - What we know: LIB-02 requires search by content. Convex search indexes work on document fields, not across tables. The transcript text is stored as individual words in the `words` table.
   - What's unclear: Whether to denormalize at transcript completion time (add a `fullText` field when transcription finishes) or query words on the fly.
   - Recommendation: Denormalize. Add a `fullText` field to the `transcripts` table, populated when `completeTranscript` is called. This enables a single search index on `fullText`. The alternative (searching the `words` table) would require a per-word search index and complex result aggregation. Update the existing `completeTranscript` internal mutation to also concatenate words into `fullText`.

2. **"Meetings" tab filtering mechanism**
   - What we know: Per CONTEXT.md, "Meetings" requires manual tagging. The Meetings tab shows transcripts tagged with a "Meetings" tag.
   - What's unclear: Should "Meetings" be a special hard-coded tag or just any tag named "Meetings"?
   - Recommendation: It's just a regular tag named "Meetings". The Meetings tab filters by checking if a transcript has a tag whose name equals "Meetings" (case-insensitive). No special schema field needed. Optionally, pre-create the "Meetings" tag for new users.

3. **jsPDF bundle size on mobile**
   - What we know: jsPDF 4.1.0 is the standard, but the exact bundle size is not documented on the repo.
   - What's unclear: Whether the full jsPDF bundle is acceptable for a mobile-first PWA.
   - Recommendation: Use dynamic `import()` to lazy-load jsPDF only when the user actually triggers export. This avoids impacting initial page load. The export is an infrequent action, so the lazy load delay is acceptable.

## Sources

### Primary (HIGH confidence)
- [Convex Full Text Search docs](https://docs.convex.dev/search/text-search) - Search index definition, query syntax, filterFields, prefix matching, limits
- [Convex Pagination docs](https://docs.convex.dev/database/pagination) - usePaginatedQuery hook, PaginationResult, cursor handling
- [jsPDF GitHub](https://github.com/parallax/jsPDF) - Version 4.1.0, API methods, TypeScript support
- [Convex Complex Filters article](https://stack.convex.dev/complex-filters-in-convex) - TypeScript filter patterns, convex-helpers filter() helper

### Secondary (MEDIUM confidence)
- [MDN Web Share API](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/share) - navigator.share() for mobile file export
- [React useDeferredValue docs](https://react.dev/reference/react/useDeferredValue) - React 18+ deferred value for search optimization

### Tertiary (LOW confidence)
- [Apple Developer Forums on PWA file downloads](https://developer.apple.com/forums/thread/119017) - iOS Safari limitations for file downloads in PWAs

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - jsPDF is well-established, Convex search is documented, no new experimental tools
- Architecture: HIGH - Schema patterns verified against Convex docs, junction table is standard practice
- Pitfalls: HIGH - iOS Safari download issues, Convex search limits, and empty search term are well-documented
- Discretion recommendations: MEDIUM - Based on mobile UX best practices and existing codebase patterns

**Research date:** 2026-02-10
**Valid until:** 2026-03-10 (30 days - stable domain, no fast-moving dependencies)
