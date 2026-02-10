"use client";

import { useRef, useEffect } from "react";
import { AnimatePresence, m } from "motion/react";
import { Id } from "@/convex/_generated/dataModel";
import { TranscriptCard } from "./transcript-card";

const STAGGER_CAP = 8;
const STAGGER_DELAY = 0.05;
const STAGGER_START = 0.1;

interface TranscriptForCard {
  _id: Id<"transcripts">;
  title: string;
  createdAt: number;
  duration?: number;
  status: string;
  source?: string;
  isStarred?: boolean;
}

interface AnimatedCardListProps {
  transcripts: TranscriptForCard[];
  tagsByTranscript: Map<string, string[]>;
  speakersByTranscript: Map<string, string[]>;
  onCardClick: (id: string) => void;
}

export function AnimatedCardList({
  transcripts,
  tagsByTranscript,
  speakersByTranscript,
  onCardClick,
}: AnimatedCardListProps) {
  const isInitialLoad = useRef(true);

  useEffect(() => {
    // After first render, disable stagger for subsequent updates
    isInitialLoad.current = false;
  }, []);

  return (
    <m.div
      className="flex flex-col"
      style={{ gap: 12, padding: "0 24px", paddingBottom: 120, position: "relative" }}
    >
      <AnimatePresence initial={false} mode="popLayout">
        {transcripts.map((transcript, index) => {
          const staggerDelay = isInitialLoad.current
            ? STAGGER_START + Math.min(index, STAGGER_CAP) * STAGGER_DELAY
            : 0;

          return (
            <m.div
              key={transcript._id}
              layout
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{
                opacity: 1,
                scale: 1,
                y: 0,
                transition: {
                  duration: 0.2,
                  ease: "easeOut",
                  delay: staggerDelay,
                },
              }}
              exit={{
                opacity: 0,
                scale: 0.96,
                transition: {
                  duration: 0.15,
                  ease: "easeIn",
                },
              }}
              transition={{
                layout: {
                  duration: 0.2,
                  ease: [0.25, 0.1, 0.25, 1],
                },
              }}
            >
              <TranscriptCard
                transcript={transcript}
                tags={tagsByTranscript.get(transcript._id) ?? []}
                speakers={speakersByTranscript.get(transcript._id) ?? []}
                onClick={() => onCardClick(transcript._id)}
              />
            </m.div>
          );
        })}
      </AnimatePresence>
    </m.div>
  );
}
