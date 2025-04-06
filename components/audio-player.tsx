"use client"

import { useRef, useEffect } from "react"
import { motion } from "framer-motion"
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { useAudioContext } from "@/context/audio-context"

export default function AudioPlayer() {
  const {
    audioUrl,
    isPlaying,
    togglePlay,
    currentTime,
    duration,
    setCurrentTime,
    volume,
    setVolume,
    isMuted,
    toggleMute,
    activeEffects,
    downloadProcessedAudio,
  } = useAudioContext()

  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const animationRef = useRef<number | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null)

  // Set up audio visualization
  useEffect(() => {
    if (!canvasRef.current || !audioUrl) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")

    if (!ctx) return

    // Set up canvas
    canvas.width = canvas.clientWidth * window.devicePixelRatio
    canvas.height = canvas.clientHeight * window.devicePixelRatio

    // Create a separate audio context just for visualization
    if (!audioContextRef.current) {
      try {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
      } catch (error) {
        console.error("Error creating audio context for visualization:", error)
        return
      }
    }

    // Create analyser node
    if (!analyserRef.current) {
      analyserRef.current = audioContextRef.current.createAnalyser()
      analyserRef.current.fftSize = 256
    }

    const analyser = analyserRef.current
    const bufferLength = analyser.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)

    // Simulate audio data for visualization
    const draw = () => {
      animationRef.current = requestAnimationFrame(draw)

      // Generate random data for visualization when no audio is playing
      for (let i = 0; i < bufferLength; i++) {
        // If playing, create more active visualization
        if (isPlaying) {
          dataArray[i] = Math.random() * 150 + 50
        } else {
          dataArray[i] = Math.random() * 50 + 10
        }
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const barWidth = (canvas.width / bufferLength) * 2.5
      let x = 0

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * canvas.height

        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height)
        gradient.addColorStop(0, "#a855f7")
        gradient.addColorStop(1, "#ec4899")

        ctx.fillStyle = gradient
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight)

        x += barWidth + 1
      }
    }

    draw()

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [audioUrl, isPlaying])

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        audioContextRef.current.close()
      }
    }
  }, [])

  const handleSeek = (value: number[]) => {
    const newTime = value[0]
    setCurrentTime(newTime)
  }

  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0]
    setVolume(newVolume)
  }

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`
  }

  return (
    <motion.div
      className="mb-12 bg-purple-900/20 rounded-xl p-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.2 }}
    >
      <div className="mb-6">
        <canvas ref={canvasRef} className="w-full h-24 rounded-lg bg-purple-900/30" />
      </div>

      <div className="flex items-center gap-2 mb-4">
        <span className="text-white text-sm">{formatTime(currentTime)}</span>
        <Slider
          value={[currentTime]}
          max={duration || 100}
          step={0.1}
          onValueChange={handleSeek}
          className="flex-1 mx-2"
          disabled={!audioUrl}
        />
        <span className="text-white text-sm">{formatTime(duration)}</span>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="text-white hover:bg-purple-800/50" disabled={!audioUrl}>
            <SkipBack className="h-5 w-5" />
          </Button>
          <Button
            variant="default"
            size="icon"
            className={`${audioUrl ? "bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700" : "bg-purple-800/50"} rounded-full h-12 w-12`}
            onClick={togglePlay}
            disabled={!audioUrl}
          >
            {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
          </Button>
          <Button variant="ghost" size="icon" className="text-white hover:bg-purple-800/50" disabled={!audioUrl}>
            <SkipForward className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-purple-800/50"
            onClick={toggleMute}
            disabled={!audioUrl}
          >
            {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
          </Button>
          <Slider
            value={[isMuted ? 0 : volume]}
            max={1}
            step={0.01}
            onValueChange={handleVolumeChange}
            className="w-24"
            disabled={!audioUrl}
          />

          <Button
            variant="outline"
            size="icon"
            className="text-purple-400 border-purple-500 hover:bg-purple-800/50 ml-2"
            onClick={downloadProcessedAudio}
            disabled={!audioUrl}
            title="Download processed audio"
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {activeEffects.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {activeEffects.map((effect) => (
            <div key={effect.id} className="bg-purple-500/30 text-white text-xs px-2 py-1 rounded-full">
              {effect.name}
            </div>
          ))}
        </div>
      )}

      {!audioUrl && (
        <div className="mt-4 text-center text-purple-300 text-sm">Upload an audio file to start playing</div>
      )}
    </motion.div>
  )
}

