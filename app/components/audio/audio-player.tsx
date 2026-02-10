"use client";

import { useEffect, useRef, useState, useCallback } from "react";

const SPEED_STEPS = [0.5, 0.75, 1, 1.25, 1.5, 2];

interface AudioPlayerProps {
  audioUrl: string | null;
  fallbackDuration?: number;
  onSkipBack?: () => void;
  onSkipForward?: () => void;
}

export function AudioPlayer({
  audioUrl,
  fallbackDuration,
  onSkipBack,
  onSkipForward,
}: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(fallbackDuration || 0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isLoaded, setIsLoaded] = useState(false);
  const [activeSrc, setActiveSrc] = useState<string | null>(null);
  const isSeeking = useRef(false);

  // Fetch audio as blob for seekable playback (WebM files need this)
  useEffect(() => {
    if (!audioUrl) {
      setActiveSrc(null);
      return;
    }

    setActiveSrc(audioUrl);

    let cancelled = false;
    let objectUrl: string | null = null;

    (async () => {
      try {
        const response = await fetch(audioUrl);
        if (cancelled) return;
        const blob = await response.blob();
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setActiveSrc(objectUrl);
      } catch {
        // Keep using direct URL
      }
    })();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [audioUrl]);

  // Update duration from fallback prop
  useEffect(() => {
    if (fallbackDuration && fallbackDuration > 0 && duration === 0) {
      setDuration(fallbackDuration);
    }
  }, [fallbackDuration, duration]);

  // Set up audio event listeners
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateDuration = () => {
      const d = audio.duration;
      if (isFinite(d) && d > 0) {
        setDuration(d);
      }
    };

    const handleCanPlay = () => {
      setIsLoaded(true);
      updateDuration();
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    const handleTimeUpdate = () => {
      if (!isSeeking.current) {
        setCurrentTime(audio.currentTime);
      }
      updateDuration();
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    audio.addEventListener("loadedmetadata", updateDuration);
    audio.addEventListener("durationchange", updateDuration);
    audio.addEventListener("canplay", handleCanPlay);
    audio.addEventListener("canplaythrough", handleCanPlay);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);

    if (audio.readyState >= 2) {
      handleCanPlay();
    }

    return () => {
      audio.removeEventListener("loadedmetadata", updateDuration);
      audio.removeEventListener("durationchange", updateDuration);
      audio.removeEventListener("canplay", handleCanPlay);
      audio.removeEventListener("canplaythrough", handleCanPlay);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
    };
  }, [activeSrc]);

  const togglePlayPause = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      await audio.play();
    }
  };

  const handleSeekStart = useCallback(() => {
    isSeeking.current = true;
  }, []);

  const handleSeekChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setCurrentTime(parseFloat(e.target.value));
    },
    []
  );

  const handleSeekCommit = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = currentTime;
    isSeeking.current = false;
  }, [currentTime]);

  const changePlaybackRate = (rate: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.playbackRate = rate;
    setPlaybackRate(rate);
  };

  const speedDown = () => {
    const idx = SPEED_STEPS.indexOf(playbackRate);
    if (idx > 0) {
      changePlaybackRate(SPEED_STEPS[idx - 1]);
    }
  };

  const speedUp = () => {
    const idx = SPEED_STEPS.indexOf(playbackRate);
    if (idx < SPEED_STEPS.length - 1) {
      changePlaybackRate(SPEED_STEPS[idx + 1]);
    }
  };

  const formatTime = (seconds: number): string => {
    if (!isFinite(seconds) || seconds < 0) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const progressPercent =
    duration > 0 ? Math.min((currentTime / duration) * 100, 100) : 0;

  if (!audioUrl) {
    return (
      <div style={{ padding: "16px 0", textAlign: "center" }}>
        <p style={{ fontSize: 14, color: "#B5A99A" }}>Audio unavailable</p>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col"
      style={{ gap: 12 }}
    >
      <audio ref={audioRef} src={activeSrc || undefined} preload="auto" />

      <style>{`
        .audio-seek-v2 {
          -webkit-appearance: none;
          appearance: none;
          width: 100%;
          height: 4px;
          border-radius: 2px;
          outline: none;
          cursor: pointer;
        }
        .audio-seek-v2::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: #D4622B;
          cursor: pointer;
          margin-top: -4px;
        }
        .audio-seek-v2::-moz-range-thumb {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: #D4622B;
          cursor: pointer;
          border: none;
        }
        .audio-seek-v2::-webkit-slider-runnable-track {
          height: 4px;
          border-radius: 2px;
        }
        .audio-seek-v2::-moz-range-track {
          height: 4px;
          border-radius: 2px;
          background: #EDE6DD;
        }
      `}</style>

      {/* Progress row */}
      <div className="flex items-center" style={{ gap: 8 }}>
        <span
          style={{
            fontSize: 11,
            fontWeight: 500,
            color: "#8B7E74",
            fontFamily: "Inter, sans-serif",
            minWidth: 32,
          }}
        >
          {formatTime(currentTime)}
        </span>
        <input
          type="range"
          min={0}
          max={duration || 1}
          step={0.1}
          value={currentTime}
          onPointerDown={handleSeekStart}
          onChange={handleSeekChange}
          onPointerUp={handleSeekCommit}
          className="audio-seek-v2 flex-1"
          style={{
            background: `linear-gradient(to right, #D4622B ${progressPercent}%, #EDE6DD ${progressPercent}%)`,
          }}
        />
        <span
          style={{
            fontSize: 11,
            fontWeight: 500,
            color: "#8B7E74",
            fontFamily: "Inter, sans-serif",
            minWidth: 32,
            textAlign: "right",
          }}
        >
          {formatTime(duration)}
        </span>
      </div>

      {/* Controls row */}
      <div
        className="flex items-center justify-center"
        style={{ gap: 32 }}
      >
        {/* Skip back (prev transcript) */}
        <button
          onClick={onSkipBack}
          disabled={!onSkipBack}
          style={{
            color: onSkipBack ? "#1A1A1A" : "#D5CEC6",
            background: "none",
            border: "none",
            cursor: onSkipBack ? "pointer" : "default",
            padding: 0,
            display: "flex",
            alignItems: "center",
          }}
          aria-label="Previous transcript"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="19 20 9 12 19 4 19 20" />
            <line x1="5" y1="19" x2="5" y2="5" />
          </svg>
        </button>

        {/* Rewind (decrease speed) */}
        <button
          onClick={speedDown}
          disabled={playbackRate <= SPEED_STEPS[0]}
          style={{
            color: playbackRate > SPEED_STEPS[0] ? "#1A1A1A" : "#D5CEC6",
            background: "none",
            border: "none",
            cursor: playbackRate > SPEED_STEPS[0] ? "pointer" : "default",
            padding: 0,
            display: "flex",
            alignItems: "center",
          }}
          aria-label="Decrease speed"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="11 19 2 12 11 5 11 19" />
            <polygon points="22 19 13 12 22 5 22 19" />
          </svg>
        </button>

        {/* Play/Pause */}
        <button
          onClick={togglePlayPause}
          disabled={!isLoaded}
          className="flex items-center justify-center transition-all active:scale-95"
          style={{
            width: 48,
            height: 48,
            borderRadius: 24,
            backgroundColor: isLoaded ? "#D4622B" : "#E0D4C8",
            color: "#FFFFFF",
            border: "none",
            cursor: isLoaded ? "pointer" : "default",
          }}
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="8" y1="4" x2="8" y2="20" />
              <line x1="16" y1="4" x2="16" y2="20" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 2 }}>
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
          )}
        </button>

        {/* Fast forward (increase speed) */}
        <button
          onClick={speedUp}
          disabled={playbackRate >= SPEED_STEPS[SPEED_STEPS.length - 1]}
          style={{
            color: playbackRate < SPEED_STEPS[SPEED_STEPS.length - 1] ? "#1A1A1A" : "#D5CEC6",
            background: "none",
            border: "none",
            cursor: playbackRate < SPEED_STEPS[SPEED_STEPS.length - 1] ? "pointer" : "default",
            padding: 0,
            display: "flex",
            alignItems: "center",
          }}
          aria-label="Increase speed"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="13 19 22 12 13 5 13 19" />
            <polygon points="2 19 11 12 2 5 2 19" />
          </svg>
        </button>

        {/* Skip forward (next transcript) */}
        <button
          onClick={onSkipForward}
          disabled={!onSkipForward}
          style={{
            color: onSkipForward ? "#1A1A1A" : "#D5CEC6",
            background: "none",
            border: "none",
            cursor: onSkipForward ? "pointer" : "default",
            padding: 0,
            display: "flex",
            alignItems: "center",
          }}
          aria-label="Next transcript"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="5 4 15 12 5 20 5 4" />
            <line x1="19" y1="5" x2="19" y2="19" />
          </svg>
        </button>
      </div>

      {/* Speed label */}
      <div className="flex justify-center">
        <span
          style={{
            fontFamily: "Inter, sans-serif",
            fontSize: 12,
            fontWeight: 600,
            color: "#8B7E74",
            backgroundColor: "#F5EDE4",
            borderRadius: 12,
            padding: "4px 12px",
          }}
        >
          {playbackRate === 1 ? "1.0" : playbackRate}x
        </span>
      </div>
    </div>
  );
}
