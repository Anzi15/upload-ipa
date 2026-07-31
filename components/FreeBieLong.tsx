"use client";

import { useEffect, useRef, useState } from "react";
import { Play, Pause, RotateCcw, RotateCw } from "lucide-react";

// ✅ TypeScript global declarations for YouTube API
declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady?: () => void; 
  }
}

const YOUTUBE_ID = "uetWVSuVW0U";
const THUMBNAIL_URL =
  "https://img.youtube.com/vi/uetWVSuVW0U/maxresdefault.jpg";
const VIDEO_TITLE = "How to Heal After a Breakup"; // Added video title

export default function YouTubeLong() {
  const playerRef = useRef<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playerReady, setPlayerReady] = useState(false);
  const [started, setStarted] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const hideTimeout = useRef<any>(null);

  // Poll current time
  useEffect(() => {
    let interval: any;
    if (playerReady && started) {
      interval = setInterval(() => {
        if (
          playerRef.current &&
          typeof playerRef.current.getCurrentTime === "function"
        ) {
          setCurrentTime(playerRef.current.getCurrentTime());
        }
      }, 500);
    }
    return () => clearInterval(interval);
  }, [playerReady, started]);

  // Load YouTube API
  useEffect(() => {
    const loadYT = () => {
      if (window.YT && window.YT.Player) {
        createPlayer();
      } else {
        if (
          !document.querySelector(
            "script[src='https://www.youtube.com/iframe_api']"
          )
        ) {
          const tag = document.createElement("script");
          tag.src = "https://www.youtube.com/iframe_api";
          document.body.appendChild(tag);
        }
        window.onYouTubeIframeAPIReady = createPlayer;
      }
    };

    loadYT();

    // ✅ cleanup: clear timeout on unmount
    return () => {
      clearTimeout(hideTimeout.current);
    };
  }, []);

  const createPlayer = () => {
    const container = document.getElementById("yt-player");
    if (!container) {
      console.warn("YouTube player container not found.");
      return;
    }

    playerRef.current = new window.YT.Player(container, {
      videoId: YOUTUBE_ID,
      playerVars: {
        autoplay: 0,
        controls: 0,
        modestbranding: 1,
        rel: 0,
        fs: 0,
        // ❌ removed deprecated `showinfo`
      },
      events: {
        onReady: () => {
          setPlayerReady(true);
          if (
            playerRef.current &&
            typeof playerRef.current.getDuration === "function"
          ) {
            setDuration(playerRef.current.getDuration());
          }
        },
        onStateChange: (event: any) => {
          if (event.data === window.YT.PlayerState.PAUSED) setIsPlaying(false);
          if (event.data === window.YT.PlayerState.PLAYING) setIsPlaying(true);
        },
      },
    });

    console.log("YT Player Created:", playerRef.current);
  };

  const play = () => {
    if (
      playerReady &&
      playerRef.current &&
      typeof playerRef.current.playVideo === "function"
    ) {
      setStarted(true);
      playerRef.current.playVideo();
      triggerControlsAutoHide();
    }
  };

  const pause = () => {
    if (
      playerReady &&
      playerRef.current &&
      typeof playerRef.current.pauseVideo === "function"
    ) {
      playerRef.current.pauseVideo();
      triggerControlsAutoHide();
    }
  };

  const forward = () => {
    if (
      playerReady &&
      playerRef.current &&
      typeof playerRef.current.getCurrentTime === "function" &&
      typeof playerRef.current.seekTo === "function"
    ) {
      const current = playerRef.current.getCurrentTime();
      playerRef.current.seekTo(current + 10, true);
      triggerControlsAutoHide();
    }
  };

  const backward = () => {
    if (
      playerReady &&
      playerRef.current &&
      typeof playerRef.current.getCurrentTime === "function" &&
      typeof playerRef.current.seekTo === "function"
    ) {
      const current = playerRef.current.getCurrentTime();
      playerRef.current.seekTo(Math.max(current - 10, 0), true);
      triggerControlsAutoHide();
    }
  };

  const seek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (
      playerReady &&
      playerRef.current &&
      typeof playerRef.current.seekTo === "function"
    ) {
      const time = parseFloat(e.target.value);
      playerRef.current.seekTo(time, true);
      setCurrentTime(time);
      triggerControlsAutoHide();
    }
  };

  const triggerControlsAutoHide = () => {
    setShowControls(true);
    clearTimeout(hideTimeout.current);
    hideTimeout.current = setTimeout(() => {
      setShowControls(false);
    }, 2500);
  };

  const handleTap = () => {
    triggerControlsAutoHide();
  };

  return (
    <div
      className="relative w-full max-w-3xl mx-auto aspect-video rounded-xl overflow-hidden bg-black"
      onClick={handleTap}
      onMouseMove={triggerControlsAutoHide}
    >
      {/* YouTube iframe container wrapper */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-0">
        <div id="yt-player" className="w-full h-full" />
      </div>

      {/* Transparent overlay for interactions */}
      <div className="absolute top-0 left-0 w-full h-full bg-transparent z-10 pointer-events-auto" />

      {/* Thumbnail before play */}
      {!started && (
        <div className="absolute inset-0 z-20 cursor-pointer" onClick={play}>
          <img
            src={THUMBNAIL_URL}
            alt="Video Thumbnail"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <Play className="text-white w-16 h-16" />
          </div>
        </div>
      )}

      {/* Video Title at Bottom - YouTube style */}
      <div className="absolute bottom-0 left-0 right-0 z-15 p-4 bg-gradient-to-t from-black/80 to-transparent">
        <h4 className="text-white font-semibold text-lg">
          {VIDEO_TITLE}
        </h4>
      </div>

      {/* Custom controls */}
      {playerReady && started && (
        <div
          className={`absolute inset-x-0 bottom-0 z-20 flex flex-col gap-2 px-4 pb-4 transition-opacity duration-300 ${
            showControls ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
        >
          <input
            type="range"
            min={0}
            max={duration}
            value={Math.floor(currentTime)} // ✅ rounded to avoid jitter
            onChange={seek}
            className="w-full accent-white cursor-pointer"
          />
          <div className="flex gap-4 justify-center items-center">
            <button onClick={backward} className="text-white">
              <RotateCcw />
            </button>
            <button onClick={isPlaying ? pause : play} className="text-white">
              {isPlaying ? <Pause /> : <Play />}
            </button>
            <button onClick={forward} className="text-white">
              <RotateCw />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}