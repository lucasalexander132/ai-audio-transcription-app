"use client";

import { useRouter } from "next/navigation";
import { useAudioRecorder } from "@/app/lib/hooks/use-audio-recorder";
import { useRecordingStore } from "@/app/lib/stores/recording-store";
import { WaveformVisualizer } from "@/app/components/audio/waveform-visualizer";
import { RecordingControls } from "@/app/components/audio/recording-controls";
import { LiveTranscript } from "@/app/components/audio/live-transcript";

export default function RecordPage() {
  const router = useRouter();
  const { error } = useRecordingStore();
  const {
    status,
    transcriptId,
    mediaStream,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
  } = useAudioRecorder();

  const handleStop = () => {
    const finalTranscriptId = stopRecording();
    if (finalTranscriptId) {
      // Navigate to transcript view after a short delay to allow final processing
      setTimeout(() => {
        router.push(`/transcripts/${finalTranscriptId}`);
      }, 500);
    }
  };

  return (
    <div className="flex h-screen flex-col bg-cream">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white px-4 py-4">
        <h1 className="text-2xl font-bold text-gray-800">Record</h1>
      </header>

      {/* Error Alert */}
      {error && (
        <div className="mx-4 mt-4 rounded-lg bg-red-50 p-4 text-red-800">
          {error}
        </div>
      )}

      {/* Waveform Visualizer */}
      <div className="border-b border-gray-200 bg-white px-4 py-4">
        <WaveformVisualizer mediaStream={mediaStream} />
      </div>

      {/* Live Transcript (scrollable) */}
      <LiveTranscript transcriptId={transcriptId} />

      {/* Recording Controls (fixed bottom) */}
      <RecordingControls
        onStart={startRecording}
        onPause={pauseRecording}
        onResume={resumeRecording}
        onStop={handleStop}
      />
    </div>
  );
}
