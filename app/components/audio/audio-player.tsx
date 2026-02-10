"use client";

import { useEffect, useRef, useState } from "react";

interface AudioPlayerProps {
  audioUrl: string | null;
}

export function AudioPlayer({ audioUrl }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isLoaded, setIsLoaded] = useState(false);

  // Update current time every 250ms during playback
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const interval = setInterval(() => {
      if (audio && !audio.paused) {
        setCurrentTime(audio.currentTime);
      }
    }, 250);

    return () => clearInterval(interval);
  }, []);

  // Set up audio event listeners
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      setIsLoaded(true);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleCanPlay = () => {
      setIsLoaded(true);
    };

    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("canplay", handleCanPlay);

    return () => {
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("canplay", handleCanPlay);
    };
  }, [audioUrl]);

  const togglePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;

    const newTime = parseFloat(e.target.value);
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const changePlaybackRate = (rate: number) => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.playbackRate = rate;
    setPlaybackRate(rate);
  };

  const formatTime = (seconds: number): string => {
    if (!isFinite(seconds) || seconds < 0) return "00:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // No audio URL - show unavailable message
  if (!audioUrl) {
    return (
      <div
        className="rounded-2xl p-4"
        style={{ backgroundColor: "#FFFFFF", border: "1px solid #EDE6DD" }}
      >
        <p className="text-center text-sm" style={{ color: "#B5A99A" }}>
          Audio unavailable
        </p>
      </div>
    );
  }

  return (
    <div
      className="rounded-2xl"
      style={{ backgroundColor: "#FFFFFF", border: "1px solid #EDE6DD", padding: "12px 16px" }}
    >
      <audio ref={audioRef} src={audioUrl} preload="metadata" />

      {/* Compact horizontal layout: Play | Seek bar with times | Speed buttons */}
      <div className="flex items-center" style={{ gap: 12 }}>
        {/* Play/Pause Button */}
        <button
          onClick={togglePlayPause}
          disabled={!isLoaded}
          className="flex shrink-0 items-center justify-center transition-all active:scale-95"
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: isLoaded ? "#D2691E" : "#E0D4C8",
            color: "#FFFFFF",
          }}
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2.5}
              stroke="currentColor"
              style={{ width: 20, height: 20 }}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 5.25v13.5m-7.5-13.5v13.5"
              />
            </svg>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2.5}
              stroke="currentColor"
              style={{ width: 20, height: 20, marginLeft: 2 }}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 010 1.972l-11.54 6.347a1.125 1.125 0 01-1.667-.986V5.653z"
              />
            </svg>
          )}
        </button>

        {/* Seek bar with time labels */}
        <div className="flex flex-1 flex-col" style={{ gap: 2 }}>
          <input
            type="range"
            min={0}
            max={duration || 0}
            step={0.1}
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-1.5 rounded-lg appearance-none cursor-pointer"
            style={{
              background: duration
                ? `linear-gradient(to right, #D2691E ${(currentTime / duration) * 100}%, #EDE6DD ${(currentTime / duration) * 100}%)`
                : "#EDE6DD",
              accentColor: "#D2691E",
            }}
          />
          <div className="flex justify-between">
            <span style={{ fontSize: 11, color: "#8B7E74" }}>
              {formatTime(currentTime)}
            </span>
            <span style={{ fontSize: 11, color: "#8B7E74" }}>
              {formatTime(duration)}
            </span>
          </div>
        </div>

        {/* Speed Controls */}
        <div className="flex shrink-0" style={{ gap: 4 }}>
          {[1, 1.5, 2].map((rate) => (
            <button
              key={rate}
              onClick={() => changePlaybackRate(rate)}
              className="transition-colors"
              style={{
                padding: "4px 8px",
                borderRadius: 12,
                fontSize: 12,
                fontWeight: 600,
                backgroundColor: playbackRate === rate ? "#D2691E" : "#F5E6D3",
                color: playbackRate === rate ? "#FFFFFF" : "#8B7E74",
                minWidth: 36,
              }}
            >
              {rate}x
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
