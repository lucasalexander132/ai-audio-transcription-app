import { create } from "zustand";
import { Id } from "@/convex/_generated/dataModel";

type RecordingStatus = "idle" | "recording" | "paused" | "stopped";

interface RecordingState {
  status: RecordingStatus;
  transcriptId: Id<"transcripts"> | null;
  elapsedSeconds: number;
  error: string | null;
  setStatus: (status: RecordingStatus) => void;
  setTranscriptId: (id: Id<"transcripts"> | null) => void;
  incrementTimer: () => void;
  resetTimer: () => void;
  setError: (error: string | null) => void;
}

export const useRecordingStore = create<RecordingState>((set) => ({
  status: "idle",
  transcriptId: null,
  elapsedSeconds: 0,
  error: null,
  setStatus: (status) => set({ status }),
  setTranscriptId: (transcriptId) => set({ transcriptId }),
  incrementTimer: () => set((state) => ({ elapsedSeconds: state.elapsedSeconds + 1 })),
  resetTimer: () => set({ elapsedSeconds: 0 }),
  setError: (error) => set({ error }),
}));
