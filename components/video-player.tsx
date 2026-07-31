"use client"

import React, { useEffect, useRef, useState } from "react"
import Image from "next/image"
import { Play, Pause, RotateCcw, AlertCircle } from "lucide-react"

// ✅ Extend window typing
declare global {
  interface Window {
    onYouTubeIframeAPIReady?: () => void
    YT: any
  }
}

interface VideoPlayerProps {
  videoId: string
  thumbnail?: string
  title?: string
}

const YT_API_SCRIPT_ID = "youtube-iframe-api-script"

// Warm up the connection to YouTube's domains as early as possible so the
// actual script/video fetch that follows doesn't pay the full DNS+TLS
// handshake cost. Runs once per page load, not once per book opened.
function warmYouTubeConnections() {
  if (typeof document === "undefined") return
  const hosts = ["https://www.youtube.com", "https://www.google.com", "https://i.ytimg.com"]
  hosts.forEach((href) => {
    if (document.querySelector(`link[href="${href}"]`)) return
    const link = document.createElement("link")
    link.rel = "preconnect"
    link.href = href
    link.crossOrigin = ""
    document.head.appendChild(link)
  })
}

// Load the IFrame API at most once per page, even if multiple
// VideoPlayer instances mount/unmount across a session (e.g. opening
// several books back to back) — previously every mount injected a brand
// new <script> tag, which could fire duplicate network requests and let
// onYouTubeIframeAPIReady callbacks stomp on each other.
function loadYouTubeAPI(onReady: () => void) {
  if (window.YT && window.YT.Player) {
    onReady()
    return
  }

  const existingCallback = window.onYouTubeIframeAPIReady
  window.onYouTubeIframeAPIReady = () => {
    existingCallback?.()
    onReady()
  }

  if (document.getElementById(YT_API_SCRIPT_ID)) return // already loading

  const script = document.createElement("script")
  script.id = YT_API_SCRIPT_ID
  script.src = "https://www.youtube.com/iframe_api"
  script.async = true
  document.body.appendChild(script)
}

export default function VideoPlayer({ videoId, thumbnail, title = "Video" }: VideoPlayerProps) {
  const playerRef = useRef<HTMLDivElement | null>(null)
  const youTubePlayerRef = useRef<any>(null)
  const [isReady, setIsReady] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    warmYouTubeConnections()

    let cancelled = false
    loadYouTubeAPI(() => {
      if (!cancelled) initializePlayer()
    })

    return () => {
      cancelled = true
      youTubePlayerRef.current?.destroy?.()
      youTubePlayerRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId])

  const initializePlayer = () => {
    if (!playerRef.current || youTubePlayerRef.current) return

    youTubePlayerRef.current = new window.YT.Player(playerRef.current, {
      videoId,
      playerVars: {
        autoplay: 0,
        controls: 0,
        modestbranding: 1,
        rel: 0,
        mute: 1,
        playsinline: 1, // avoid iOS forcing native fullscreen takeover
        iv_load_policy: 3, // hide annotations
        fs: 0, // no fullscreen button — video is hidden anyway
        disablekb: 1,
        origin: typeof window !== "undefined" ? window.location.origin : undefined,
      },
      events: {
        onReady: (event: any) => {
          // Video is never shown, only heard — force the lowest
          // available quality so buffering finishes as fast as possible
          // instead of fetching a resolution nobody will ever see.
          try {
            event.target.setPlaybackQuality("small")
          } catch {
            // Not all clients support this — safe to ignore.
          }
          setIsReady(true)
        },
        onStateChange: (event: any) => {
          if (event.data === window.YT.PlayerState.PLAYING) setIsPlaying(true)
          if (event.data === window.YT.PlayerState.PAUSED || event.data === window.YT.PlayerState.ENDED) {
            setIsPlaying(false)
          }
        },
        onError: () => setHasError(true),
      },
    })
  }

  // Handle Play/Pause toggle
  const handlePlayPause = () => {
    if (!isReady || !youTubePlayerRef.current) return
    const player = youTubePlayerRef.current
    const state = player.getPlayerState()

    player.unMute() // always unmute after click

    if (state === window.YT.PlayerState.PLAYING) {
      player.pauseVideo()
    } else {
      player.playVideo()
    }
  }

  // Handle restart
  const handleRestart = () => {
    if (isReady && youTubePlayerRef.current) {
      youTubePlayerRef.current.seekTo(0)
      youTubePlayerRef.current.playVideo()
    }
  }

  return (
    <div className="relative w-full h-[400px] md:h-[600px] bg-black overflow-hidden rounded-xl">
      {/* Thumbnail — kept visible at all times so only audio plays and the
          underlying YouTube video is never shown to the user. */}
      <Image
        src={thumbnail || "/placeholder.svg?height=600&width=800&text=Video+Thumbnail"}
        alt={title}
        fill
        priority
        className="object-cover pointer-events-none z-[5]"
      />

      {/* Overlay Controls */}
      <div className="absolute inset-0 bg-black/50 flex flex-col justify-between z-10">
        <div className="flex justify-between items-center p-4">
          <span className="text-white font-medium">{title}</span>
        </div>

        <div className="flex flex-col items-center pb-12 gap-4">
          {hasError ? (
            <div className="flex flex-col items-center gap-2 text-white/90 px-6 text-center">
              <AlertCircle size={28} />
              <p className="text-sm font-body">Couldn't load this audio. Please try again later.</p>
            </div>
          ) : !isReady ? (
            <div className="flex flex-col items-center gap-2 text-white/80">
              <div className="w-10 h-10 border-4 border-white/30 border-t-white rounded-full animate-spin" />
              <p className="text-xs font-body">Loading...</p>
            </div>
          ) : (
            <div className="flex items-center space-x-6">
              <button
                onClick={handlePlayPause}
                className="w-16 h-16 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/40 text-white transition"
              >
                {isPlaying ? <Pause size={32} /> : <Play size={32} />}
              </button>

              <button
                onClick={handleRestart}
                className="w-12 h-12 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/40 text-white transition"
              >
                <RotateCcw size={24} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* YouTube iframe goes here — kept behind the thumbnail/overlay (audio only) */}
      <div ref={playerRef} className="absolute inset-0 w-full h-full z-0" />
    </div>
  )
}
