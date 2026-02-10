"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";

const menuItems = [
  {
    label: "Transcripts",
    path: "/transcripts",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
        <polyline points="14 2 14 8 20 8" strokeLinecap="round" strokeLinejoin="round" />
        <line x1="16" y1="13" x2="8" y2="13" strokeLinecap="round" />
        <line x1="16" y1="17" x2="8" y2="17" strokeLinecap="round" />
        <polyline points="10 9 9 9 8 9" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    activeColor: "#D4622B",
  },
  {
    label: "Record",
    path: "/record",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 10v2a7 7 0 01-14 0v-2" />
        <line x1="12" y1="19" x2="12" y2="23" strokeLinecap="round" />
        <line x1="8" y1="23" x2="16" y2="23" strokeLinecap="round" />
      </svg>
    ),
    activeColor: "#D4622B",
  },
  {
    label: "Settings",
    path: "/settings",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="3" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
      </svg>
    ),
    activeColor: "#D4622B",
  },
];

export function FABMenu() {
  const [isExpanded, setIsExpanded] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement>(null);

  // Hide FAB on individual transcript pages
  const isTranscriptDetail = /^\/transcripts\/[^/]+$/.test(pathname);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsExpanded(false);
      }
    }

    if (isExpanded) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isExpanded]);

  if (isTranscriptDetail) return null;

  return (
    <div ref={menuRef} className="fixed inset-0 z-50 pointer-events-none">
      {/* Dim overlay */}
      {isExpanded && (
        <div
          className="absolute inset-0 pointer-events-auto"
          style={{ backgroundColor: "#1A1A1A50" }}
          onClick={() => setIsExpanded(false)}
        />
      )}

      {/* Dropdown card */}
      {isExpanded && (
        <div
          className="absolute pointer-events-auto"
          style={{
            bottom: 88,
            right: 24,
            width: 180,
            backgroundColor: "#FFFFFF",
            borderRadius: 20,
            border: "1px solid #EDE6DD",
            boxShadow: "0 8px 24px #1A1A1A18",
            overflow: "hidden",
            animation: "fabCardIn 0.18s ease-out",
          }}
        >
          {menuItems.map((item, i) => {
            const isActive = pathname === item.path;
            return (
              <div key={item.path}>
                {i > 0 && (
                  <div style={{ height: 1, backgroundColor: "#EDE6DD" }} />
                )}
                <button
                  onClick={() => {
                    router.push(item.path);
                    setIsExpanded(false);
                  }}
                  className="flex items-center justify-between w-full"
                  style={{
                    padding: "14px 16px",
                    gap: 12,
                    backgroundColor: isActive ? "#FBF5EE" : "transparent",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "Inter, sans-serif",
                      fontSize: 15,
                      fontWeight: 500,
                      color: "#1A1A1A",
                    }}
                  >
                    {item.label}
                  </span>
                  <span style={{ color: isActive ? item.activeColor : "#8B7E74" }}>
                    {item.icon}
                  </span>
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* FAB button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="absolute pointer-events-auto flex items-center justify-center"
        style={{
          bottom: 24,
          right: 24,
          width: 56,
          height: 56,
          borderRadius: 16,
          backgroundColor: "#D4622B",
          boxShadow: "0 6px 20px #D4622B40",
          color: "#FFFFFF",
          transition: "transform 0.15s ease",
        }}
        aria-label="Menu"
      >
        {isExpanded ? (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <line x1="18" y1="6" x2="6" y2="18" strokeLinecap="round" />
            <line x1="6" y1="6" x2="18" y2="18" strokeLinecap="round" />
          </svg>
        ) : (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <line x1="4" y1="12" x2="20" y2="12" strokeLinecap="round" />
            <line x1="4" y1="6" x2="20" y2="6" strokeLinecap="round" />
            <line x1="4" y1="18" x2="20" y2="18" strokeLinecap="round" />
          </svg>
        )}
      </button>

      <style jsx>{`
        @keyframes fabCardIn {
          from {
            opacity: 0;
            transform: translateY(8px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </div>
  );
}
