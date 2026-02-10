"use client";

export function TagChips({
  tags,
  onRemove,
  maxDisplay = 5,
}: {
  tags: { tagId: string; tagName: string }[];
  onRemove?: (tagId: string) => void;
  maxDisplay?: number;
}) {
  if (!tags || tags.length === 0) return null;

  const visibleTags = tags.slice(0, maxDisplay);
  const overflow = tags.length - maxDisplay;

  return (
    <div className="flex flex-wrap" style={{ gap: 6 }}>
      {visibleTags.map((tag) => (
        <span
          key={tag.tagId}
          className="inline-flex items-center"
          style={{
            backgroundColor: "#F5EDE4",
            color: "#8B7E74",
            borderRadius: 9999,
            padding: "4px 10px",
            fontSize: 11,
            fontWeight: 500,
            gap: 4,
          }}
        >
          {tag.tagName}
          {onRemove && (
            <button
              onClick={() => onRemove(tag.tagId)}
              aria-label={`Remove tag ${tag.tagName}`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 14,
                height: 14,
                borderRadius: 7,
                backgroundColor: "transparent",
                border: "none",
                cursor: "pointer",
                padding: 0,
                color: "#B5A99A",
                fontSize: 14,
                lineHeight: 1,
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
                <line x1="2" y1="2" x2="8" y2="8" />
                <line x1="8" y1="2" x2="2" y2="8" />
              </svg>
            </button>
          )}
        </span>
      ))}
      {overflow > 0 && (
        <span
          style={{
            backgroundColor: "#F5EDE4",
            color: "#B5A99A",
            borderRadius: 9999,
            padding: "4px 10px",
            fontSize: 11,
            fontWeight: 500,
          }}
        >
          +{overflow} more
        </span>
      )}
    </div>
  );
}
