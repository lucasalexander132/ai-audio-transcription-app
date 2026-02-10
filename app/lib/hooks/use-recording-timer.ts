"use client";

import { useEffect } from "react";
import { useRecordingStore } from "../stores/recording-store";

export function useRecordingTimer() {
  const { status, elapsedSeconds, incrementTimer, resetTimer } = useRecordingStore();

  useEffect(() => {
    if (status === "recording") {
      const interval = setInterval(() => {
        incrementTimer();
      }, 1000);

      return () => clearInterval(interval);
    }

    if (status === "idle" || status === "stopped") {
      resetTimer();
    }
  }, [status, incrementTimer, resetTimer]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return {
    elapsedSeconds,
    formattedTime: formatTime(elapsedSeconds),
  };
}
