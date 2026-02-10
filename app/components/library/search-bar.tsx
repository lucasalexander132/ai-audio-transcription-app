"use client";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
}

export function SearchBar({ value, onChange, onClear }: SearchBarProps) {
  return (
    <div
      className="flex items-center w-full"
      style={{
        height: 44,
        borderRadius: 22,
        backgroundColor: "#FFFFFF",
        border: "1px solid #EDE6DD",
        padding: "0 16px",
        gap: 10,
      }}
    >
      {/* Search icon */}
      <svg
        className="shrink-0"
        style={{ width: 18, height: 18 }}
        fill="none"
        stroke="#B5A99A"
        strokeWidth="2"
        viewBox="0 0 24 24"
      >
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" strokeLinecap="round" />
      </svg>

      {/* Input */}
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search transcripts..."
        autoFocus
        className="flex-1 bg-transparent outline-none"
        style={{
          fontSize: 15,
          color: "#1A1A1A",
          border: "none",
        }}
      />

      {/* Clear button */}
      {value.length > 0 && (
        <button
          onClick={onClear}
          className="flex items-center justify-center shrink-0"
          style={{
            width: 20,
            height: 20,
            borderRadius: 10,
            backgroundColor: "#EDE6DD",
          }}
        >
          <svg
            style={{ width: 12, height: 12 }}
            fill="none"
            stroke="#8B7E74"
            strokeWidth="2.5"
            viewBox="0 0 24 24"
          >
            <line x1="18" y1="6" x2="6" y2="18" strokeLinecap="round" />
            <line x1="6" y1="6" x2="18" y2="18" strokeLinecap="round" />
          </svg>
        </button>
      )}
    </div>
  );
}
