"use client";

import { useState, useEffect, useRef } from "react";
import {
  ExportParams,
  exportTranscriptAsPDF,
  exportTranscriptAsTXT,
  downloadFile,
} from "./transcript-exporter";

export function ExportMenu(props: ExportParams) {
  const [open, setOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const handleExportPDF = async () => {
    setExporting(true);
    setOpen(false);
    try {
      const { blob, filename } = await exportTranscriptAsPDF(props);
      await downloadFile(blob, filename);
    } catch (e) {
      console.error("PDF export failed:", e);
    } finally {
      setExporting(false);
    }
  };

  const handleExportTXT = async () => {
    setExporting(true);
    setOpen(false);
    try {
      const { content, filename } = exportTranscriptAsTXT(props);
      const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
      await downloadFile(blob, filename);
    } catch (e) {
      console.error("TXT export failed:", e);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div ref={menuRef} style={{ position: "relative" }}>
      {/* 3-dot icon button */}
      <button
        onClick={() => setOpen(!open)}
        disabled={exporting}
        aria-label="More options"
        style={{
          width: 36,
          height: 36,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "transparent",
          border: "none",
          borderRadius: 8,
          cursor: exporting ? "wait" : "pointer",
          opacity: exporting ? 0.5 : 1,
        }}
      >
        {/* Vertical dots icon */}
        <svg
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="10" cy="4" r="1.5" fill="#8B7E74" />
          <circle cx="10" cy="10" r="1.5" fill="#8B7E74" />
          <circle cx="10" cy="16" r="1.5" fill="#8B7E74" />
        </svg>
      </button>

      {/* Dropdown menu */}
      {open && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            right: 0,
            marginTop: 4,
            backgroundColor: "#FFFFFF",
            border: "1px solid #EDE6DD",
            borderRadius: 12,
            boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
            zIndex: 50,
            overflow: "hidden",
            minWidth: 180,
          }}
        >
          <button
            onClick={handleExportPDF}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              width: "100%",
              padding: "12px 16px",
              backgroundColor: "transparent",
              border: "none",
              borderBottom: "1px solid #EDE6DD",
              cursor: "pointer",
              fontSize: 14,
              color: "#1A1A1A",
              textAlign: "left",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.backgroundColor = "#FBF5EE")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.backgroundColor = "transparent")
            }
          >
            {/* Document icon */}
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#8B7E74"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
            Export as PDF
          </button>
          <button
            onClick={handleExportTXT}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              width: "100%",
              padding: "12px 16px",
              backgroundColor: "transparent",
              border: "none",
              cursor: "pointer",
              fontSize: 14,
              color: "#1A1A1A",
              textAlign: "left",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.backgroundColor = "#FBF5EE")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.backgroundColor = "transparent")
            }
          >
            {/* Text file icon */}
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#8B7E74"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
            Export as TXT
          </button>
        </div>
      )}
    </div>
  );
}
