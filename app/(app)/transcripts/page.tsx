"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export default function TranscriptsPage() {
  const transcripts = useQuery(api.transcripts.list);

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <h1 className="text-3xl font-bold text-primary mb-4">Transcripts</h1>
      <div className="bg-white rounded-lg shadow-md p-6 border border-border">
        {transcripts === undefined ? (
          <p className="text-foreground/70">Loading...</p>
        ) : transcripts.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-foreground/70 mb-2">No transcripts yet</p>
            <p className="text-sm text-foreground/50">
              Transcript library coming in Phase 3
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {transcripts.map((transcript) => (
              <li
                key={transcript._id}
                className="p-3 bg-muted rounded-lg border border-border"
              >
                <div className="font-medium text-foreground">
                  {transcript.title}
                </div>
                <div className="text-sm text-foreground/60">
                  {transcript.status}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
