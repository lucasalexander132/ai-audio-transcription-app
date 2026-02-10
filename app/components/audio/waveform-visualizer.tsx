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
  const { status } = useRecordingStore();

  useEffect(() => {
    if (!mediaStream || !canvasRef.current) return;

    const audioContext = new AudioContext();
    const analyser = audioContext.createAnalyser();
    const source = audioContext.createMediaStreamSource(mediaStream);

    analyser.fftSize = 256;
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

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const draw = () => {
      const width = canvas.width;
      const height = canvas.height;

      // Clear canvas with cream background
      ctx.fillStyle = "#FFF9F0";
      ctx.fillRect(0, 0, width, height);

      if (status === "recording" && analyserRef.current && dataArrayRef.current) {
        analyserRef.current.getByteFrequencyData(dataArrayRef.current as any);

        const barWidth = (width / dataArrayRef.current.length) * 2.5;
        let x = 0;

        for (let i = 0; i < dataArrayRef.current.length; i++) {
          const barHeight = (dataArrayRef.current[i] / 255) * height;

          // Burnt sienna color
          ctx.fillStyle = "#D2691E";
          ctx.fillRect(x, height - barHeight, barWidth, barHeight);

          x += barWidth + 1;
        }
      } else if (status === "paused" || status === "idle") {
        // Draw flat line when paused or idle
        ctx.strokeStyle = "#D2691E";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, height / 2);
        ctx.lineTo(width, height / 2);
        ctx.stroke();
      }

      animationFrameRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [status]);

  return (
    <canvas
      ref={canvasRef}
      width={800}
      height={80}
      className="w-full rounded-lg"
      style={{ height: "80px" }}
    />
  );
}
