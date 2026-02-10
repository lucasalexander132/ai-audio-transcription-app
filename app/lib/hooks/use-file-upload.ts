"use client";

import { useState, useCallback } from "react";
import { useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

type UploadStatus = "idle" | "validating" | "uploading" | "processing" | "complete" | "error";

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const MIN_FILE_SIZE = 1024; // 1KB

const ACCEPTED_MIME_TYPES = new Set([
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/wave",
  "audio/mp4",
  "audio/x-m4a",
  "audio/m4a",
  "audio/webm",
  "audio/ogg",
]);

const ACCEPTED_EXTENSIONS = new Set([".mp3", ".wav", ".m4a", ".webm", ".ogg"]);

function validateFile(file: File): string | null {
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    const sizeMB = Math.round(file.size / (1024 * 1024));
    return `File is too large (${sizeMB}MB). Maximum size is 100MB.`;
  }

  if (file.size < MIN_FILE_SIZE) {
    return "File appears to be empty or corrupted.";
  }

  // Check MIME type
  if (file.type && ACCEPTED_MIME_TYPES.has(file.type.split(";")[0].trim())) {
    return null;
  }

  // Fallback: check file extension
  const ext = file.name.toLowerCase().match(/\.[^.]+$/)?.[0];
  if (ext && ACCEPTED_EXTENSIONS.has(ext)) {
    return null;
  }

  return "Unsupported file format. Please upload an MP3, WAV, M4A, or WebM file.";
}

function uploadWithProgress(
  url: string,
  file: File,
  onProgress: (percent: number) => void,
): Promise<{ storageId: string }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percent = Math.round((event.loaded / event.total) * 100);
        onProgress(percent);
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText);
          resolve({ storageId: response.storageId });
        } catch {
          reject(new Error("Invalid response from upload server"));
        }
      } else {
        reject(new Error(`Upload failed with status ${xhr.status}`));
      }
    };

    xhr.onerror = () => {
      reject(new Error("Network error during upload"));
    };

    xhr.onabort = () => {
      reject(new Error("Upload was cancelled"));
    };

    xhr.open("POST", url);
    xhr.setRequestHeader("Content-Type", file.type || "audio/mpeg");
    xhr.send(file);
  });
}

export function useFileUpload() {
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const createFromUpload = useMutation(api.transcripts.createFromUpload);
  const generateUploadUrl = useMutation(api.recordings.generateUploadUrl);
  const saveRecording = useMutation(api.recordings.saveRecording);
  const transcribeFile = useAction(api.deepgram.transcribeFile);

  const uploadFile = useCallback(
    async (file: File): Promise<Id<"transcripts"> | null> => {
      try {
        // Validate
        setStatus("validating");
        setError(null);
        setProgress(0);

        const validationError = validateFile(file);
        if (validationError) {
          setError(validationError);
          setStatus("error");
          return null;
        }

        // Create transcript record
        const transcriptId = await createFromUpload({
          title: file.name.replace(/\.[^.]+$/, ""),
        });

        // Upload file with progress
        setStatus("uploading");
        const uploadUrl = await generateUploadUrl();
        const { storageId } = await uploadWithProgress(uploadUrl, file, setProgress);

        // Save recording metadata
        await saveRecording({
          transcriptId,
          storageId: storageId as Id<"_storage">,
          format: file.type || "audio/mpeg",
          size: file.size,
        });

        // Trigger transcription (fire-and-forget)
        setStatus("processing");
        transcribeFile({
          transcriptId,
          storageId: storageId as Id<"_storage">,
          mimeType: file.type || "audio/mpeg",
        }).catch((err) => {
          console.error("Transcription action error:", err);
        });

        return transcriptId;
      } catch (err: any) {
        console.error("Upload error:", err);
        setError(err.message || "Upload failed. Please try again.");
        setStatus("error");
        return null;
      }
    },
    [createFromUpload, generateUploadUrl, saveRecording, transcribeFile],
  );

  const reset = useCallback(() => {
    setStatus("idle");
    setProgress(0);
    setError(null);
  }, []);

  return { status, progress, error, uploadFile, reset };
}
