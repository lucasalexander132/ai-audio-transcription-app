"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useRecordingStore } from "../stores/recording-store";
import fixWebmDuration from "fix-webm-duration";

export function useAudioRecorder() {
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const detectedMimeTypeRef = useRef<string>("");
  const wordOffsetRef = useRef<number>(0);
  const transcribeInFlightRef = useRef<boolean>(false);
  const stopResolveRef = useRef<(() => void) | null>(null);

  const { status, transcriptId, elapsedSeconds, setStatus, setTranscriptId, setError, resetTimer } =
    useRecordingStore();

  const createTranscript = useMutation(api.transcripts.create);
  const completeTranscript = useMutation(api.transcripts.complete);
  const generateUploadUrl = useMutation(api.recordings.generateUploadUrl);
  const saveRecording = useMutation(api.recordings.saveRecording);
  const transcribeChunk = useAction(api.deepgram.transcribeChunk);

  // Detect supported MIME type with fallback chain
  const detectMimeType = useCallback((): string => {
    const types = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/ogg;codecs=opus",
      "audio/mp4",
    ];

    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }

    return ""; // Browser will use default
  }, []);

  const startRecording = useCallback(async () => {
    try {
      setError(null);

      // Create transcript first
      const newTranscriptId = await createTranscript({ title: "New Recording" });
      setTranscriptId(newTranscriptId);

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      setMediaStream(stream);

      // Detect supported MIME type
      const mimeType = detectMimeType();
      detectedMimeTypeRef.current = mimeType;

      // Create MediaRecorder
      const recorder = new MediaRecorder(
        stream,
        mimeType ? { mimeType, audioBitsPerSecond: 128000 } : { audioBitsPerSecond: 128000 }
      );

      mediaRecorderRef.current = recorder;
      chunksRef.current = [];
      wordOffsetRef.current = 0;
      transcribeInFlightRef.current = false;

      recorder.ondataavailable = async (event) => {
        if (event.data.size > 44) {
          // iOS bug check - validate blob size
          chunksRef.current.push(event.data);

          // Skip if a transcription request is already in flight
          if (transcribeInFlightRef.current) return;
          transcribeInFlightRef.current = true;

          // Build complete blob from ALL accumulated chunks
          // Individual chunks after the first lack valid WebM headers,
          // but combining all chunks creates a valid audio file
          try {
            const completeBlob = new Blob(chunksRef.current, {
              type: detectedMimeTypeRef.current || "audio/webm",
            });
            const arrayBuffer = await completeBlob.arrayBuffer();
            const result = await transcribeChunk({
              transcriptId: newTranscriptId,
              audioData: arrayBuffer,
              mimeType: detectedMimeTypeRef.current || "audio/webm",
              wordOffset: wordOffsetRef.current,
            });
            if (result && typeof result.totalWords === "number") {
              wordOffsetRef.current = result.totalWords;
            }
          } catch (error) {
            console.error("Transcription error:", error);
            // Continue recording even if transcription fails
          } finally {
            transcribeInFlightRef.current = false;
          }
        }
      };

      recorder.onerror = (event) => {
        console.error("MediaRecorder error:", event);
        setError("Recording error occurred");
      };

      recorder.onstop = async () => {
        // Handle final recording upload
        if (chunksRef.current.length > 0 && newTranscriptId) {
          try {
            const rawBlob = new Blob(chunksRef.current, {
              type: detectedMimeTypeRef.current || "audio/webm",
            });

            // Fix WebM metadata (inject Duration + Cues for seekable playback)
            const currentElapsed = useRecordingStore.getState().elapsedSeconds;
            const durationMs = currentElapsed * 1000;
            const recordingBlob = await fixWebmDuration(rawBlob, durationMs, { logger: false });

            // Upload to Convex storage
            const uploadUrl = await generateUploadUrl();
            const uploadResponse = await fetch(uploadUrl, {
              method: "POST",
              body: recordingBlob,
            });

            const { storageId } = await uploadResponse.json();

            // Save recording metadata
            await saveRecording({
              transcriptId: newTranscriptId,
              storageId: storageId as Id<"_storage">,
              format: detectedMimeTypeRef.current || "audio/webm",
              size: recordingBlob.size,
            });

            // Mark transcript as complete (currentElapsed read above before fixWebmDuration)
            await completeTranscript({
              transcriptId: newTranscriptId,
              duration: currentElapsed,
            });
          } catch (error) {
            console.error("Error saving recording:", error);
            setError("Failed to save recording");
          }
        }
        // Signal that save is complete so stopRecording promise resolves
        if (stopResolveRef.current) {
          stopResolveRef.current();
          stopResolveRef.current = null;
        }
      };

      // Start recording with 5-second chunks (balances latency vs API calls)
      recorder.start(5000);
      setStatus("recording");
    } catch (error: any) {
      console.error("Error starting recording:", error);
      if (error.name === "NotAllowedError") {
        setError("Microphone permission denied. Please allow microphone access.");
      } else {
        setError("Failed to start recording. Please check your microphone.");
      }
    }
  }, [
    createTranscript,
    completeTranscript,
    generateUploadUrl,
    saveRecording,
    transcribeChunk,
    detectMimeType,
    setStatus,
    setTranscriptId,
    setError,
  ]);

  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && status === "recording") {
      mediaRecorderRef.current.pause();
      setStatus("paused");
    }
  }, [status, setStatus]);

  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && status === "paused") {
      mediaRecorderRef.current.resume();
      setStatus("recording");
    }
  }, [status, setStatus]);

  const stopRecording = useCallback((): { transcriptId: Id<"transcripts"> | null; saved: Promise<void> } => {
    if (mediaRecorderRef.current && (status === "recording" || status === "paused")) {
      // Create a promise that resolves when onstop handler finishes saving
      const saved = new Promise<void>((resolve) => {
        stopResolveRef.current = resolve;
      });

      mediaRecorderRef.current.stop();
      setStatus("stopped");

      // Stop all media stream tracks
      if (mediaStream) {
        mediaStream.getTracks().forEach((track) => track.stop());
        setMediaStream(null);
      }

      return { transcriptId, saved };
    }
    return { transcriptId: null, saved: Promise.resolve() };
  }, [status, mediaStream, transcriptId, setStatus]);

  const discardRecording = useCallback(() => {
    if (mediaRecorderRef.current && (status === "recording" || status === "paused")) {
      chunksRef.current = []; // Clear chunks so onstop handler won't save
      mediaRecorderRef.current.stop();

      if (mediaStream) {
        mediaStream.getTracks().forEach((track) => track.stop());
        setMediaStream(null);
      }

      setStatus("idle");
      setTranscriptId(null);
      resetTimer();
    }
  }, [status, mediaStream, setStatus, setTranscriptId, resetTimer]);

  // Handle page visibility change - auto-pause on hide
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && status === "recording") {
        pauseRecording();
        setError("Recording paused - app in background");
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [status, pauseRecording, setError]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mediaStream) {
        mediaStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [mediaStream]);

  return {
    status,
    transcriptId,
    mediaStream,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    discardRecording,
  };
}
