"use client";

import { useEffect, useRef } from "react";
import { useRecordingStore } from "@/app/lib/stores/recording-store";

interface WaveformVisualizerProps {
  mediaStream: MediaStream | null;
}

export function WaveformVisualizer({ mediaStream }: WaveformVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | undefined>(undefined);
  const analyserRef = useRef<AnalyserNode | undefined>(undefined);
  const dataArrayRef = useRef<Uint8Array | undefined>(undefined);
  const statusRef = useRef<string>("idle");
  const { status } = useRecordingStore();

  // Keep status ref in sync
  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  // Set up audio analyser when stream is available
  useEffect(() => {
    if (!mediaStream) return;

    const audioContext = new AudioContext();
    const analyser = audioContext.createAnalyser();
    const source = audioContext.createMediaStreamSource(mediaStream);

    analyser.fftSize = 128;
    source.connect(analyser);

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    analyserRef.current = analyser;
    dataArrayRef.current = dataArray;

    return () => {
      source.disconnect();
      audioContext.close();
    };
  }, [mediaStream]);

  // Continuous draw loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const displayWidth = canvas.clientWidth || 326;
    const displayHeight = canvas.clientHeight || 120;
    canvas.width = displayWidth * dpr;
    canvas.height = displayHeight * dpr;
    ctx.scale(dpr, dpr);

    const BAR_WIDTH = 3;
    const BAR_GAP = 3;
    const BAR_STEP = BAR_WIDTH + BAR_GAP;
    const NUM_BARS = Math.floor(displayWidth / BAR_STEP);
    const CENTER_Y = displayHeight / 2;

    const draw = () => {
      ctx.clearRect(0, 0, displayWidth, displayHeight);

      const analyser = analyserRef.current;
      const dataArray = dataArrayRef.current;
      const currentStatus = statusRef.current;

      if (
        (currentStatus === "recording" || currentStatus === "paused") &&
        analyser &&
        dataArray
      ) {
        analyser.getByteFrequencyData(dataArray as any);
        const step = Math.max(1, Math.floor(dataArray.length / NUM_BARS));

        for (let i = 0; i < NUM_BARS; i++) {
          const idx = Math.min(i * step, dataArray.length - 1);
          const value = dataArray[idx] / 255;
          const barHeight = Math.max(4, value * displayHeight * 0.85);
          const x = i * BAR_STEP;

          ctx.fillStyle =
            currentStatus === "paused" ? "#D4622B80" : "#D4622B";
          ctx.fillRect(x, CENTER_Y - barHeight / 2, BAR_WIDTH, barHeight);
        }
      } else {
        // Idle: small centered dots
        for (let i = 0; i < NUM_BARS; i++) {
          const x = i * BAR_STEP;
          ctx.fillStyle = "#D4622B30";
          ctx.fillRect(x, CENTER_Y - 2, BAR_WIDTH, 4);
        }
      }

      animationFrameRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="w-full"
      style={{ height: 120, display: "block" }}
    />
  );
}
