"use client";

import { useEffect, useRef, useState } from "react";
import { Play, Pause, RotateCcw, RotateCw } from "lucide-react";
import Link from "next/link";
import YouTubeLong from "@/components/FreeBieLong";
import YouTubeCustomPlayer from "@/components/IntroVide";

// ✅ YouTube Iframe API Loader (fixed: works for multiple players)
let ytApiPromise: Promise<void> | null = null;

const loadYouTubeAPI = (): Promise<void> => {
  if (ytApiPromise) return ytApiPromise;

  ytApiPromise = new Promise((resolve) => {
    if ((window as any).YT && (window as any).YT.Player) {
      resolve();
    } else {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      document.body.appendChild(tag);

      const prev = (window as any).onYouTubeIframeAPIReady;
      (window as any).onYouTubeIframeAPIReady = () => {
        if (typeof prev === "function") prev();
        resolve();
      };
    }
  });

  return ytApiPromise;
};

// ✅ YouTubeShort Component
const YouTubeShort = ({ videoId, title }: { videoId: string; title: string }) => {
  const playerRef = useRef<any>(null);
  const [playerReady, setPlayerReady] = useState(false);
  const [started, setStarted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    loadYouTubeAPI().then(() => {
      const container = document.getElementById(`short-${videoId}`);
      if (!container) return;

      playerRef.current = new (window as any).YT.Player(container, {
        videoId,
        playerVars: { controls: 0, rel: 0, modestbranding: 1 },
        events: {
          onReady: () => setPlayerReady(true),
          onStateChange: (e: any) => {
            if (e.data === (window as any).YT.PlayerState.PLAYING) setIsPlaying(true);
            if (e.data === (window as any).YT.PlayerState.PAUSED) setIsPlaying(false);
          },
        },
      });
    });
  }, []);

  const play = () => {
    if (!playerReady || !playerRef.current?.playVideo) return;
    setStarted(true);
    playerRef.current.playVideo();
  };

  const pause = () => playerRef.current?.pauseVideo();

  return (
    <div className="relative w-full max-w-xs aspect-[9/16] mx-auto rounded-xl overflow-hidden bg-black mb-10">
      <div className="absolute inset-0">
        <div id={`short-${videoId}`} className="w-full h-full pointer-events-auto" />
      </div>

      {!started && (
        <div className="absolute inset-0 z-20 cursor-pointer" onClick={play}>
          <img
            src={`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`}
            alt="Short Thumbnail"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <Play className="text-white w-12 h-12" />
          </div>
        </div>
      )}

      {playerReady && started && (
        <div className="absolute bottom-2 left-2 z-30 flex gap-2">
          <button onClick={pause} className="text-white bg-black/50 p-1 rounded">
            <Pause />
          </button>
        </div>
      )}
      
      {/* Video Title at Bottom - YouTube Shorts style */}
      <div className="absolute bottom-0 left-0 right-0 z-30 p-4 bg-gradient-to-t from-black/80 to-transparent">
        <h4 className="text-white font-semibold text-lg">
          {title}
        </h4>
      </div>
    </div>
  );
};

// ✅ Main Page
export default function ForYouPage() {
  return (
    <div className="p-6">
      <div className="mt-8 py-8">
        <Link
          href="/"
          className="inline-block text-blue-600 underline hover:text-blue-800 transition font-medium"
        >
          ← Back to Home
        </Link>
      </div>
      <h2 className="text-3xl text-center font-extrabold mb-6 ">Did you just breakup?</h2>

      <h3 className="text-center pb-4">
        Watch these free video guides to help you through it.
      </h3>
      <div className="w-full py-4">
        <YouTubeLong />
      </div>

      <YouTubeShort videoId="swZQE_4x6CY" title="Why Compatibility Is Important" />
      <YouTubeShort videoId="kehJ9yZhSz4" title="Why you must have an honest image of your partner in your mind?" />
    </div>
  );
}