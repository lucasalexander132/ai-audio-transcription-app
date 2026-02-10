export interface ExportParams {
  title: string;
  date: string;
  duration: string;
  speakers: string[];
  tags: string[];
  segments: { speaker: string; timestamp: string; text: string }[];
}

export async function exportTranscriptAsPDF(
  params: ExportParams
): Promise<{ blob: Blob; filename: string }> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF();
  let y = 20;

  // Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(26, 26, 26); // #1A1A1A
  doc.text(params.title, 20, y);
  y += 10;

  // Metadata line
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(139, 126, 116); // #8B7E74
  doc.text(
    `${params.date} | ${params.duration} | ${params.speakers.length} speaker${params.speakers.length !== 1 ? "s" : ""}`,
    20,
    y
  );
  y += 6;

  // Tags line
  if (params.tags.length > 0) {
    doc.text(`Tags: ${params.tags.join(", ")}`, 20, y);
    y += 10;
  } else {
    y += 4;
  }

  // Divider line
  doc.setDrawColor(237, 230, 221); // #EDE6DD
  doc.line(20, y, 190, y);
  y += 10;

  // Transcript segments
  for (const segment of params.segments) {
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

    // Timestamp (gray, same line after speaker)
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(181, 169, 154); // #B5A99A
    const speakerWidth = doc.getTextWidth(segment.speaker);
    doc.text(`  ${segment.timestamp}`, 20 + speakerWidth, y);
    y += 6;

    // Text content (wrapped)
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(26, 26, 26);
    const lines = doc.splitTextToSize(segment.text, 170);
    doc.text(lines, 20, y);
    y += lines.length * 5 + 6;

    // Check again after text in case it pushed past page
    if (y > 270) {
      doc.addPage();
      y = 20;
    }
  }

  // Build filename: YYYY-MM-DD Title.pdf
  const safeTitle = params.title.replace(/[^a-zA-Z0-9 ]/g, "").trim();
  const filename = `${params.date} ${safeTitle}.pdf`;

  const blob = doc.output("blob");
  return { blob, filename };
}

export function exportTranscriptAsTXT(
  params: ExportParams
): { content: string; filename: string } {
  const lines: string[] = [];

  lines.push(params.title);
  lines.push("=".repeat(params.title.length));
  lines.push("");
  lines.push(`Date: ${params.date}`);
  lines.push(`Duration: ${params.duration}`);
  if (params.tags.length > 0) {
    lines.push(`Tags: ${params.tags.join(", ")}`);
  }
  lines.push("");
  lines.push("-".repeat(40));
  lines.push("");

  for (const segment of params.segments) {
    lines.push(`[${segment.timestamp}] ${segment.speaker}:`);
    lines.push(segment.text);
    lines.push("");
  }

  const content = lines.join("\n");

  // Build filename: YYYY-MM-DD Title.txt
  const safeTitle = params.title.replace(/[^a-zA-Z0-9 ]/g, "").trim();
  const filename = `${params.date} ${safeTitle}.txt`;

  return { content, filename };
}

export async function downloadFile(
  blob: Blob,
  filename: string
): Promise<void> {
  // Try Web Share API first (better on mobile / iOS Safari)
  try {
    const file = new File([blob], filename, { type: blob.type });
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({
        files: [file],
        title: filename,
      });
      return;
    }
  } catch (e) {
    // AbortError means user cancelled sharing — that's fine
    if ((e as Error).name === "AbortError") return;
    // Other errors: fall through to download
  }

  // Fallback: standard download via anchor element
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
