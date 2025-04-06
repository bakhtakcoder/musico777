"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect, useRef } from "react"

type AudioEffect = {
  id: number
  name: string
  active: boolean
  apply: (audioContext: AudioContext, source: AudioNode) => AudioNode
}

type AudioContextType = {
  audioFile: File | null
  setAudioFile: (file: File | null) => void
  isPlaying: boolean
  togglePlay: () => void
  currentTime: number
  duration: number
  setCurrentTime: (time: number) => void
  volume: number
  setVolume: (volume: number) => void
  isMuted: boolean
  toggleMute: () => void
  availableEffects: AudioEffect[]
  activeEffects: AudioEffect[]
  toggleEffect: (effectId: number) => void
  audioUrl: string | null
  downloadProcessedAudio: () => void
}

const AudioContext = createContext<AudioContextType | undefined>(undefined)

export function useAudioContext() {
  const context = useContext(AudioContext)
  if (context === undefined) {
    throw new Error("useAudioContext must be used within an AudioProvider")
  }
  return context
}

export function AudioProvider({ children }: { children: React.ReactNode }) {
  const [audioFile, setAudioFile] = useState<File | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(0.7)
  const [isMuted, setIsMuted] = useState(false)
  const [activeEffectIds, setActiveEffectIds] = useState<number[]>([])
  const [audioContextInitialized, setAudioContextInitialized] = useState(false)
  const [isRecording, setIsRecording] = useState(false)

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null)
  const gainNodeRef = useRef<GainNode | null>(null)
  const effectNodesRef = useRef<Map<number, AudioNode>>(new Map())
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recordedChunksRef = useRef<BlobPart[]>([])

  // Define available effects with their implementation
  const availableEffects: AudioEffect[] = [
    {
      id: 1,
      name: "Bass Boost",
      active: false,
      apply: (audioContext, source) => {
        const filter = audioContext.createBiquadFilter()
        filter.type = "lowshelf"
        filter.frequency.value = 100
        filter.gain.value = 15
        source.connect(filter)
        return filter
      },
    },
    {
      id: 2,
      name: "8D Audio",
      active: false,
      apply: (audioContext, source) => {
        const panner = audioContext.createStereoPanner()

        // Create oscillation effect with SLOWER speed
        const oscillationSpeed = 0.03 // Reduced from 0.1 for slower movement
        let time = 0

        const oscillate = () => {
          time += oscillationSpeed
          panner.pan.value = Math.sin(time)
          requestAnimationFrame(oscillate)
        }

        oscillate()
        source.connect(panner)
        return panner
      },
    },
    {
      id: 3,
      name: "Reverb",
      active: false,
      apply: (audioContext, source) => {
        const convolver = audioContext.createConvolver()

        // Create impulse response for reverb
        const sampleRate = audioContext.sampleRate
        const length = sampleRate * 3 // 3 seconds
        const impulse = audioContext.createBuffer(2, length, sampleRate)
        const leftChannel = impulse.getChannelData(0)
        const rightChannel = impulse.getChannelData(1)

        for (let i = 0; i < length; i++) {
          const decay = Math.pow(1 - i / length, 2)
          leftChannel[i] = (Math.random() * 2 - 1) * decay
          rightChannel[i] = (Math.random() * 2 - 1) * decay
        }

        convolver.buffer = impulse
        source.connect(convolver)
        return convolver
      },
    },
    {
      id: 4,
      name: "Nightcore",
      active: false,
      apply: (audioContext, source) => {
        // For nightcore, we need to adjust playback rate
        // This is handled separately in the audio element
        if (audioRef.current) {
          audioRef.current.playbackRate = 1.3
        }
        return source
      },
    },
    {
      id: 5,
      name: "Vaporwave",
      active: false,
      apply: (audioContext, source) => {
        // For vaporwave, we slow down playback rate
        if (audioRef.current) {
          audioRef.current.playbackRate = 0.8
        }
        return source
      },
    },
    {
      id: 6,
      name: "Distortion",
      active: false,
      apply: (audioContext, source) => {
        const distortion = audioContext.createWaveShaper()

        function makeDistortionCurve(amount = 50) {
          const k = amount
          const n_samples = 44100
          const curve = new Float32Array(n_samples)
          const deg = Math.PI / 180

          for (let i = 0; i < n_samples; ++i) {
            const x = (i * 2) / n_samples - 1
            curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x))
          }
          return curve
        }

        distortion.curve = makeDistortionCurve(400)
        distortion.oversample = "4x"
        source.connect(distortion)
        return distortion
      },
    },
    {
      id: 7,
      name: "Telephone",
      active: false,
      apply: (audioContext, source) => {
        // Create a bandpass filter to simulate telephone effect
        const lowPass = audioContext.createBiquadFilter()
        lowPass.type = "lowpass"
        lowPass.frequency.value = 2000
        lowPass.Q.value = 0.7

        const highPass = audioContext.createBiquadFilter()
        highPass.type = "highpass"
        highPass.frequency.value = 500
        highPass.Q.value = 0.7

        source.connect(highPass)
        highPass.connect(lowPass)
        return lowPass
      },
    },
    {
      id: 8,
      name: "Lo-Fi",
      active: false,
      apply: (audioContext, source) => {
        // Create a bitcrusher-like effect for lo-fi
        const lowPass = audioContext.createBiquadFilter()
        lowPass.type = "lowpass"
        lowPass.frequency.value = 3500

        // Add some distortion
        const distortion = audioContext.createWaveShaper()
        function makeDistortionCurve(amount = 50) {
          const k = amount
          const n_samples = 44100
          const curve = new Float32Array(n_samples)
          const deg = Math.PI / 180

          for (let i = 0; i < n_samples; ++i) {
            const x = (i * 2) / n_samples - 1
            curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x))
          }
          return curve
        }

        distortion.curve = makeDistortionCurve(50)
        distortion.oversample = "4x"

        source.connect(lowPass)
        lowPass.connect(distortion)
        return distortion
      },
    },
    {
      id: 9,
      name: "Pitch Shift Up",
      active: false,
      apply: (audioContext, source) => {
        // Simple pitch shift using playback rate
        if (audioRef.current) {
          audioRef.current.playbackRate = 1.2
        }
        return source
      },
    },
    {
      id: 10,
      name: "Pitch Shift Down",
      active: false,
      apply: (audioContext, source) => {
        // Simple pitch shift using playback rate
        if (audioRef.current) {
          audioRef.current.playbackRate = 0.85
        }
        return source
      },
    },
    {
      id: 11,
      name: "Chorus",
      active: false,
      apply: (audioContext, source) => {
        // Create a delay node for chorus effect
        const delay = audioContext.createDelay()
        delay.delayTime.value = 0.03

        // Create a gain node for the delayed signal
        const delayGain = audioContext.createGain()
        delayGain.gain.value = 0.5

        // Create an oscillator for modulation
        const oscillator = audioContext.createOscillator()
        oscillator.type = "sine"
        oscillator.frequency.value = 0.5

        // Create a gain for the oscillator
        const oscillatorGain = audioContext.createGain()
        oscillatorGain.gain.value = 0.002

        // Connect the oscillator to the delay time
        oscillator.connect(oscillatorGain)
        oscillatorGain.connect(delay.delayTime)

        // Start the oscillator
        oscillator.start()

        // Connect the source to both the output and the delay
        source.connect(delay)
        delay.connect(delayGain)

        // Create a merger to combine the original and delayed signals
        const merger = audioContext.createGain()
        source.connect(merger)
        delayGain.connect(merger)

        return merger
      },
    },
    {
      id: 12,
      name: "Tremolo",
      active: false,
      apply: (audioContext, source) => {
        // Create a gain node for amplitude modulation
        const gain = audioContext.createGain()

        // Create an oscillator for modulation
        const oscillator = audioContext.createOscillator()
        oscillator.type = "sine"
        oscillator.frequency.value = 5 // 5 Hz tremolo

        // Connect the oscillator to the gain
        oscillator.connect(gain.gain)

        // Set the gain range for tremolo
        gain.gain.value = 0.5

        // Start the oscillator
        oscillator.start()

        // Connect the source to the gain
        source.connect(gain)

        return gain
      },
    },
    {
      id: 13,
      name: "Vibrato",
      active: false,
      apply: (audioContext, source) => {
        // Create a delay node for vibrato effect
        const delay = audioContext.createDelay()
        delay.delayTime.value = 0.005

        // Create an oscillator for modulation
        const oscillator = audioContext.createOscillator()
        oscillator.type = "sine"
        oscillator.frequency.value = 6 // 6 Hz vibrato

        // Create a gain for the oscillator
        const oscillatorGain = audioContext.createGain()
        oscillatorGain.gain.value = 0.003

        // Connect the oscillator to the delay time
        oscillator.connect(oscillatorGain)
        oscillatorGain.connect(delay.delayTime)

        // Start the oscillator
        oscillator.start()

        // Connect the source to the delay
        source.connect(delay)

        return delay
      },
    },
    {
      id: 14,
      name: "Compressor",
      active: false,
      apply: (audioContext, source) => {
        // Create a compressor node
        const compressor = audioContext.createDynamicsCompressor()
        compressor.threshold.value = -24
        compressor.knee.value = 30
        compressor.ratio.value = 12
        compressor.attack.value = 0.003
        compressor.release.value = 0.25

        // Connect the source to the compressor
        source.connect(compressor)

        return compressor
      },
    },
    {
      id: 15,
      name: "Delay",
      active: false,
      apply: (audioContext, source) => {
        // Create a delay node
        const delay = audioContext.createDelay()
        delay.delayTime.value = 0.3

        // Create a feedback gain
        const feedback = audioContext.createGain()
        feedback.gain.value = 0.4

        // Create a dry/wet mix
        const dryGain = audioContext.createGain()
        dryGain.gain.value = 0.6

        const wetGain = audioContext.createGain()
        wetGain.gain.value = 0.4

        // Connect the nodes
        source.connect(dryGain)
        source.connect(delay)
        delay.connect(feedback)
        feedback.connect(delay)
        delay.connect(wetGain)

        // Create a merger to combine the dry and wet signals
        const merger = audioContext.createGain()
        dryGain.connect(merger)
        wetGain.connect(merger)

        return merger
      },
    },
    {
      id: 16,
      name: "Stereo Widener",
      active: false,
      apply: (audioContext, source) => {
        // Create a stereo panner
        const leftPanner = audioContext.createStereoPanner()
        leftPanner.pan.value = -1

        const rightPanner = audioContext.createStereoPanner()
        rightPanner.pan.value = 1

        // Create phase shifter for right channel
        const rightDelay = audioContext.createDelay()
        rightDelay.delayTime.value = 0.01

        // Connect the source to both panners
        source.connect(leftPanner)
        source.connect(rightDelay)
        rightDelay.connect(rightPanner)

        // Create a merger to combine the left and right signals
        const merger = audioContext.createGain()
        leftPanner.connect(merger)
        rightPanner.connect(merger)

        return merger
      },
    },
    {
      id: 17,
      name: "Vinyl",
      active: false,
      apply: (audioContext, source) => {
        // Create a filter for vinyl sound
        const filter = audioContext.createBiquadFilter()
        filter.type = "lowpass"
        filter.frequency.value = 8000

        // Create a gain node for noise
        const noiseGain = audioContext.createGain()
        noiseGain.gain.value = 0.01

        // Create a buffer for noise
        const noiseBuffer = audioContext.createBuffer(2, audioContext.sampleRate * 2, audioContext.sampleRate)

        // Fill the buffer with noise
        for (let channel = 0; channel < noiseBuffer.numberOfChannels; channel++) {
          const data = noiseBuffer.getChannelData(channel)
          for (let i = 0; i < data.length; i++) {
            data[i] = Math.random() * 2 - 1
          }
        }

        // Create a buffer source for noise
        const noise = audioContext.createBufferSource()
        noise.buffer = noiseBuffer
        noise.loop = true
        noise.start()

        // Connect the noise to the gain
        noise.connect(noiseGain)

        // Connect the source to the filter
        source.connect(filter)

        // Create a merger to combine the filtered signal and noise
        const merger = audioContext.createGain()
        filter.connect(merger)
        noiseGain.connect(merger)

        return merger
      },
    },
    {
      id: 18,
      name: "AM Radio",
      active: false,
      apply: (audioContext, source) => {
        // Create filters for AM radio sound
        const lowPass = audioContext.createBiquadFilter()
        lowPass.type = "lowpass"
        lowPass.frequency.value = 4000

        const highPass = audioContext.createBiquadFilter()
        highPass.type = "highpass"
        highPass.frequency.value = 500

        // Create a gain node for distortion
        const distortion = audioContext.createWaveShaper()

        function makeDistortionCurve(amount = 50) {
          const k = amount
          const n_samples = 44100
          const curve = new Float32Array(n_samples)
          const deg = Math.PI / 180

          for (let i = 0; i < n_samples; ++i) {
            const x = (i * 2) / n_samples - 1
            curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x))
          }
          return curve
        }

        distortion.curve = makeDistortionCurve(20)

        // Connect the nodes
        source.connect(highPass)
        highPass.connect(lowPass)
        lowPass.connect(distortion)

        return distortion
      },
    },
    {
      id: 19,
      name: "Bitcrusher",
      active: false,
      apply: (audioContext, source) => {
        // Create a script processor for bit crushing
        const bufferSize = 4096
        const bitDepth = 4 // 4-bit
        const normalizationFactor = Math.pow(2, bitDepth - 1)

        // Use worklet if available, fallback to script processor
        const scriptProcessor = audioContext.createScriptProcessor(bufferSize, 1, 1)

        scriptProcessor.onaudioprocess = (event) => {
          const inputBuffer = event.inputBuffer
          const outputBuffer = event.outputBuffer

          for (let channel = 0; channel < outputBuffer.numberOfChannels; channel++) {
            const inputData = inputBuffer.getChannelData(channel)
            const outputData = outputBuffer.getChannelData(channel)

            for (let i = 0; i < inputData.length; i++) {
              // Reduce bit depth
              outputData[i] = Math.round(inputData[i] * normalizationFactor) / normalizationFactor

              // Reduce sample rate (every 4th sample)
              if (i % 4 !== 0) {
                outputData[i] = outputData[i - (i % 4)]
              }
            }
          }
        }

        source.connect(scriptProcessor)

        return scriptProcessor
      },
    },
    {
      id: 20,
      name: "Underwater",
      active: false,
      apply: (audioContext, source) => {
        // Create filters for underwater sound
        const lowPass = audioContext.createBiquadFilter()
        lowPass.type = "lowpass"
        lowPass.frequency.value = 1000
        lowPass.Q.value = 2

        // Create a reverb for underwater ambience
        const convolver = audioContext.createConvolver()

        // Create impulse response for underwater reverb
        const sampleRate = audioContext.sampleRate
        const length = sampleRate * 2 // 2 seconds
        const impulse = audioContext.createBuffer(2, length, sampleRate)
        const leftChannel = impulse.getChannelData(0)
        const rightChannel = impulse.getChannelData(1)

        for (let i = 0; i < length; i++) {
          const decay = Math.pow(1 - i / length, 1.5)
          leftChannel[i] = (Math.random() * 2 - 1) * decay
          rightChannel[i] = (Math.random() * 2 - 1) * decay
        }

        convolver.buffer = impulse

        // Connect the nodes
        source.connect(lowPass)
        lowPass.connect(convolver)

        return convolver
      },
    },
    {
      id: 21,
      name: "Auto-Tune",
      active: false,
      apply: (audioContext, source) => {
        // Create a simple auto-tune effect using a biquad filter
        const filter = audioContext.createBiquadFilter()
        filter.type = "peaking"
        filter.frequency.value = 440 // A4 note
        filter.Q.value = 10
        filter.gain.value = 15

        source.connect(filter)
        return filter
      },
    },
    {
      id: 22,
      name: "Vocoder",
      active: false,
      apply: (audioContext, source) => {
        // Create a simple vocoder-like effect
        const highPass = audioContext.createBiquadFilter()
        highPass.type = "highpass"
        highPass.frequency.value = 1000

        const distortion = audioContext.createWaveShaper()
        function makeDistortionCurve(amount = 50) {
          const k = amount
          const n_samples = 44100
          const curve = new Float32Array(n_samples)
          const deg = Math.PI / 180

          for (let i = 0; i < n_samples; ++i) {
            const x = (i * 2) / n_samples - 1
            curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x))
          }
          return curve
        }

        distortion.curve = makeDistortionCurve(100)

        source.connect(highPass)
        highPass.connect(distortion)

        return distortion
      },
    },
    {
      id: 23,
      name: "Harmonizer",
      active: false,
      apply: (audioContext, source) => {
        // Create a simple harmonizer effect
        const pitchUp = audioContext.createGain()
        const pitchDown = audioContext.createGain()

        // Create a delay for each harmony
        const delayUp = audioContext.createDelay()
        delayUp.delayTime.value = 0.01

        const delayDown = audioContext.createDelay()
        delayDown.delayTime.value = 0.02

        // Set gains for the harmonies
        pitchUp.gain.value = 0.5
        pitchDown.gain.value = 0.5

        // Connect the source to the delays
        source.connect(delayUp)
        source.connect(delayDown)

        // Connect the delays to the gains
        delayUp.connect(pitchUp)
        delayDown.connect(pitchDown)

        // Create a merger to combine the original and harmonies
        const merger = audioContext.createGain()
        source.connect(merger)
        pitchUp.connect(merger)
        pitchDown.connect(merger)

        return merger
      },
    },
    {
      id: 24,
      name: "Voice Changer",
      active: false,
      apply: (audioContext, source) => {
        // Create a voice changer effect
        const pitchShift = audioContext.createBiquadFilter()
        pitchShift.type = "allpass"
        pitchShift.frequency.value = 700
        pitchShift.Q.value = 10

        const formantShift = audioContext.createBiquadFilter()
        formantShift.type = "peaking"
        formantShift.frequency.value = 1500
        formantShift.Q.value = 5
        formantShift.gain.value = 10

        source.connect(pitchShift)
        pitchShift.connect(formantShift)

        return formantShift
      },
    },
    {
      id: 25,
      name: "Whisper",
      active: false,
      apply: (audioContext, source) => {
        // Create a whisper effect
        const highPass = audioContext.createBiquadFilter()
        highPass.type = "highpass"
        highPass.frequency.value = 1000

        const gain = audioContext.createGain()
        gain.gain.value = 0.3

        // Add some noise
        const noiseGain = audioContext.createGain()
        noiseGain.gain.value = 0.05

        const noiseBuffer = audioContext.createBuffer(2, audioContext.sampleRate * 2, audioContext.sampleRate)

        for (let channel = 0; channel < noiseBuffer.numberOfChannels; channel++) {
          const data = noiseBuffer.getChannelData(channel)
          for (let i = 0; i < data.length; i++) {
            data[i] = Math.random() * 2 - 1
          }
        }

        const noise = audioContext.createBufferSource()
        noise.buffer = noiseBuffer
        noise.loop = true
        noise.start()

        noise.connect(noiseGain)

        source.connect(highPass)
        highPass.connect(gain)

        const merger = audioContext.createGain()
        gain.connect(merger)
        noiseGain.connect(merger)

        return merger
      },
    },
    {
      id: 26,
      name: "Megaphone",
      active: false,
      apply: (audioContext, source) => {
        // Create a megaphone effect
        const bandpass = audioContext.createBiquadFilter()
        bandpass.type = "bandpass"
        bandpass.frequency.value = 1800
        bandpass.Q.value = 0.7

        const distortion = audioContext.createWaveShaper()
        function makeDistortionCurve(amount = 50) {
          const k = amount
          const n_samples = 44100
          const curve = new Float32Array(n_samples)
          const deg = Math.PI / 180

          for (let i = 0; i < n_samples; ++i) {
            const x = (i * 2) / n_samples - 1
            curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x))
          }
          return curve
        }

        distortion.curve = makeDistortionCurve(50)

        const gain = audioContext.createGain()
        gain.gain.value = 1.5

        source.connect(bandpass)
        bandpass.connect(distortion)
        distortion.connect(gain)

        return gain
      },
    },
    {
      id: 27,
      name: "Chipmunk",
      active: false,
      apply: (audioContext, source) => {
        // Create a chipmunk effect
        if (audioRef.current) {
          audioRef.current.playbackRate = 1.5
        }

        const highPass = audioContext.createBiquadFilter()
        highPass.type = "highpass"
        highPass.frequency.value = 500

        source.connect(highPass)

        return highPass
      },
    },
    {
      id: 28,
      name: "Monster Voice",
      active: false,
      apply: (audioContext, source) => {
        // Create a monster voice effect
        if (audioRef.current) {
          audioRef.current.playbackRate = 0.7
        }

        const lowPass = audioContext.createBiquadFilter()
        lowPass.type = "lowpass"
        lowPass.frequency.value = 300

        const distortion = audioContext.createWaveShaper()
        function makeDistortionCurve(amount = 50) {
          const k = amount
          const n_samples = 44100
          const curve = new Float32Array(n_samples)
          const deg = Math.PI / 180

          for (let i = 0; i < n_samples; ++i) {
            const x = (i * 2) / n_samples - 1
            curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x))
          }
          return curve
        }

        distortion.curve = makeDistortionCurve(100)

        source.connect(lowPass)
        lowPass.connect(distortion)

        return distortion
      },
    },
    {
      id: 29,
      name: "Mono to Stereo",
      active: false,
      apply: (audioContext, source) => {
        // Create a mono to stereo effect
        const leftDelay = audioContext.createDelay()
        leftDelay.delayTime.value = 0.01

        const rightDelay = audioContext.createDelay()
        rightDelay.delayTime.value = 0.02

        const leftGain = audioContext.createGain()
        leftGain.gain.value = 0.8

        const rightGain = audioContext.createGain()
        rightGain.gain.value = 0.8

        const leftPanner = audioContext.createStereoPanner()
        leftPanner.pan.value = -0.8

        const rightPanner = audioContext.createStereoPanner()
        rightPanner.pan.value = 0.8

        source.connect(leftDelay)
        source.connect(rightDelay)

        leftDelay.connect(leftGain)
        rightDelay.connect(rightGain)

        leftGain.connect(leftPanner)
        rightGain.connect(rightPanner)

        const merger = audioContext.createGain()
        leftPanner.connect(merger)
        rightPanner.connect(merger)

        return merger
      },
    },
    {
      id: 30,
      name: "Binaural Beat",
      active: false,
      apply: (audioContext, source) => {
        // Create a binaural beat effect
        const leftOsc = audioContext.createOscillator()
        leftOsc.frequency.value = 200
        leftOsc.type = "sine"

        const rightOsc = audioContext.createOscillator()
        rightOsc.frequency.value = 210 // 10 Hz difference
        rightOsc.type = "sine"

        const leftGain = audioContext.createGain()
        leftGain.gain.value = 0.1

        const rightGain = audioContext.createGain()
        rightGain.gain.value = 0.1

        const leftPanner = audioContext.createStereoPanner()
        leftPanner.pan.value = -1

        const rightPanner = audioContext.createStereoPanner()
        rightPanner.pan.value = 1

        leftOsc.connect(leftGain)
        rightOsc.connect(rightGain)

        leftGain.connect(leftPanner)
        rightGain.connect(rightPanner)

        leftOsc.start()
        rightOsc.start()

        const merger = audioContext.createGain()
        source.connect(merger)
        leftPanner.connect(merger)
        rightPanner.connect(merger)

        return merger
      },
    },
    {
      id: 31,
      name: "Ambisonic",
      active: false,
      apply: (audioContext, source) => {
        // Create a simple ambisonic-like effect
        const frontLeft = audioContext.createStereoPanner()
        frontLeft.pan.value = -0.7

        const frontRight = audioContext.createStereoPanner()
        frontRight.pan.value = 0.7

        const rearLeft = audioContext.createStereoPanner()
        rearLeft.pan.value = -1

        const rearRight = audioContext.createStereoPanner()
        rearRight.pan.value = 1

        const frontLeftDelay = audioContext.createDelay()
        frontLeftDelay.delayTime.value = 0.01

        const frontRightDelay = audioContext.createDelay()
        frontRightDelay.delayTime.value = 0.01

        const rearLeftDelay = audioContext.createDelay()
        rearLeftDelay.delayTime.value = 0.02

        const rearRightDelay = audioContext.createDelay()
        rearRightDelay.delayTime.value = 0.02

        source.connect(frontLeftDelay)
        source.connect(frontRightDelay)
        source.connect(rearLeftDelay)
        source.connect(rearRightDelay)

        frontLeftDelay.connect(frontLeft)
        frontRightDelay.connect(frontRight)
        rearLeftDelay.connect(rearLeft)
        rearRightDelay.connect(rearRight)

        const merger = audioContext.createGain()
        frontLeft.connect(merger)
        frontRight.connect(merger)
        rearLeft.connect(merger)
        rearRight.connect(merger)

        return merger
      },
    },
    {
      id: 32,
      name: "HRTF",
      active: false,
      apply: (audioContext, source) => {
        // Create a simple HRTF-like effect
        const panner = audioContext.createPanner()
        panner.panningModel = "HRTF"
        panner.distanceModel = "inverse"
        panner.refDistance = 1
        panner.maxDistance = 10000
        panner.rolloffFactor = 1
        panner.coneInnerAngle = 360
        panner.coneOuterAngle = 360
        panner.coneOuterGain = 0

        // Position the panner in 3D space
        panner.positionX.value = 0
        panner.positionY.value = 0
        panner.positionZ.value = -1

        // Create an oscillator to move the sound source
        const oscillator = audioContext.createOscillator()
        oscillator.frequency.value = 0.1

        const oscillatorGain = audioContext.createGain()
        oscillatorGain.gain.value = 2

        oscillator.connect(oscillatorGain)
        oscillatorGain.connect(panner.positionX)

        oscillator.start()

        source.connect(panner)

        return panner
      },
    },
    {
      id: 33,
      name: "Tape Saturation",
      active: false,
      apply: (audioContext, source) => {
        // Create a tape saturation effect
        const lowPass = audioContext.createBiquadFilter()
        lowPass.type = "lowpass"
        lowPass.frequency.value = 7500

        const highPass = audioContext.createBiquadFilter()
        highPass.type = "highpass"
        highPass.frequency.value = 20

        const distortion = audioContext.createWaveShaper()
        function makeDistortionCurve(amount = 50) {
          const k = amount
          const n_samples = 44100
          const curve = new Float32Array(n_samples)

          for (let i = 0; i < n_samples; ++i) {
            const x = (i * 2) / n_samples - 1
            // Soft clipping function
            curve[i] = Math.tanh(k * x) / Math.tanh(k)
          }
          return curve
        }

        distortion.curve = makeDistortionCurve(2)
        distortion.oversample = "4x"

        source.connect(highPass)
        highPass.connect(distortion)
        distortion.connect(lowPass)

        return lowPass
      },
    },
    {
      id: 34,
      name: "Cassette",
      active: false,
      apply: (audioContext, source) => {
        // Create a cassette tape effect
        const lowPass = audioContext.createBiquadFilter()
        lowPass.type = "lowpass"
        lowPass.frequency.value = 6000

        const highPass = audioContext.createBiquadFilter()
        highPass.type = "highpass"
        highPass.frequency.value = 100

        // Add wow and flutter
        const oscillator = audioContext.createOscillator()
        oscillator.type = "sine"
        oscillator.frequency.value = 0.5 // 0.5 Hz for wow

        const oscillatorGain = audioContext.createGain()
        oscillatorGain.gain.value = 0.005

        // Create a delay for pitch variation
        const delay = audioContext.createDelay()
        delay.delayTime.value = 0.01

        oscillator.connect(oscillatorGain)
        oscillatorGain.connect(delay.delayTime)
        oscillator.start()

        // Add noise
        const noiseGain = audioContext.createGain()
        noiseGain.gain.value = 0.01

        const noiseBuffer = audioContext.createBuffer(2, audioContext.sampleRate * 2, audioContext.sampleRate)

        for (let channel = 0; channel < noiseBuffer.numberOfChannels; channel++) {
          const data = noiseBuffer.getChannelData(channel)
          for (let i = 0; i < data.length; i++) {
            data[i] = Math.random() * 2 - 1
          }
        }

        const noise = audioContext.createBufferSource()
        noise.buffer = noiseBuffer
        noise.loop = true
        noise.start()

        noise.connect(noiseGain)

        source.connect(highPass)
        highPass.connect(lowPass)
        lowPass.connect(delay)

        const merger = audioContext.createGain()
        delay.connect(merger)
        noiseGain.connect(merger)

        return merger
      },
    },
    {
      id: 35,
      name: "VHS Audio",
      active: false,
      apply: (audioContext, source) => {
        // Create a VHS audio effect
        const lowPass = audioContext.createBiquadFilter()
        lowPass.type = "lowpass"
        lowPass.frequency.value = 5000

        const highPass = audioContext.createBiquadFilter()
        highPass.type = "highpass"
        highPass.frequency.value = 150

        // Add tracking noise
        const noiseGain = audioContext.createGain()
        noiseGain.gain.value = 0.02

        const noiseBuffer = audioContext.createBuffer(2, audioContext.sampleRate * 2, audioContext.sampleRate)

        for (let channel = 0; channel < noiseBuffer.numberOfChannels; channel++) {
          const data = noiseBuffer.getChannelData(channel)
          for (let i = 0; i < data.length; i++) {
            data[i] = Math.random() * 2 - 1
          }
        }

        const noise = audioContext.createBufferSource()
        noise.buffer = noiseBuffer
        noise.loop = true
        noise.start()

        // Add dropouts
        const dropoutOscillator = audioContext.createOscillator()
        dropoutOscillator.type = "square"
        dropoutOscillator.frequency.value = 0.1

        const dropoutGain = audioContext.createGain()
        dropoutGain.gain.value = 0.95

        dropoutOscillator.connect(dropoutGain.gain)
        dropoutOscillator.start()

        noise.connect(noiseGain)

        source.connect(highPass)
        highPass.connect(lowPass)
        lowPass.connect(dropoutGain)

        const merger = audioContext.createGain()
        dropoutGain.connect(merger)
        noiseGain.connect(merger)

        return merger
      },
    },
    {
      id: 36,
      name: "Granular",
      active: false,
      apply: (audioContext, source) => {
        // Create a simple granular effect
        const bufferSize = 4096
        const scriptProcessor = audioContext.createScriptProcessor(bufferSize, 1, 1)

        const grainSize = 0.1 // 100ms grains
        const grainSpacing = 0.05 // 50ms between grains
        let grainPointer = 0
        const grainBuffer = new Float32Array(audioContext.sampleRate * grainSize)
        let isRecording = true
        let recordingPointer = 0

        scriptProcessor.onaudioprocess = (event) => {
          const inputBuffer = event.inputBuffer
          const outputBuffer = event.outputBuffer

          for (let channel = 0; channel < outputBuffer.numberOfChannels; channel++) {
            const inputData = inputBuffer.getChannelData(channel)
            const outputData = outputBuffer.getChannelData(channel)

            for (let i = 0; i < inputData.length; i++) {
              // Record into grain buffer
              if (isRecording) {
                grainBuffer[recordingPointer] = inputData[i]
                recordingPointer++

                if (recordingPointer >= grainBuffer.length) {
                  isRecording = false
                  recordingPointer = 0
                  grainPointer = 0
                }
              }

              // Play from grain buffer
              if (!isRecording) {
                outputData[i] = grainBuffer[grainPointer]
                grainPointer++

                if (grainPointer >= grainBuffer.length) {
                  grainPointer = 0

                  // Add random offset for granular effect
                  const randomOffset = Math.floor(Math.random() * grainBuffer.length * 0.1)
                  grainPointer = randomOffset

                  // Occasionally switch back to recording
                  if (Math.random() < 0.1) {
                    isRecording = true
                  }
                }
              } else {
                outputData[i] = inputData[i]
              }
            }
          }
        }

        return scriptProcessor
      },
    },
    {
      id: 37,
      name: "Reverse",
      active: false,
      apply: (audioContext, source) => {
        // Create a reverse effect
        const bufferSize = 8192
        const scriptProcessor = audioContext.createScriptProcessor(bufferSize, 1, 1)

        const buffer = new Float32Array(bufferSize)

        scriptProcessor.onaudioprocess = (event) => {
          const inputBuffer = event.inputBuffer
          const outputBuffer = event.outputBuffer

          for (let channel = 0; channel < outputBuffer.numberOfChannels; channel++) {
            const inputData = inputBuffer.getChannelData(channel)
            const outputData = outputBuffer.getChannelData(channel)

            // Copy input to buffer
            for (let i = 0; i < inputData.length; i++) {
              buffer[i] = inputData[i]
            }

            // Write buffer in reverse to output
            for (let i = 0; i < outputData.length; i++) {
              outputData[i] = buffer[buffer.length - 1 - i]
            }
          }
        }

        source.connect(scriptProcessor)

        return scriptProcessor
      },
    },
    {
      id: 38,
      name: "Glitch",
      active: false,
      apply: (audioContext, source) => {
        // Create a glitch effect
        const bufferSize = 4096
        const scriptProcessor = audioContext.createScriptProcessor(bufferSize, 1, 1)

        const buffer = new Float32Array(bufferSize)
        let glitchActive = false
        let glitchCounter = 0

        scriptProcessor.onaudioprocess = (event) => {
          const inputBuffer = event.inputBuffer
          const outputBuffer = event.outputBuffer

          for (let channel = 0; channel < outputBuffer.numberOfChannels; channel++) {
            const inputData = inputBuffer.getChannelData(channel)
            const outputData = outputBuffer.getChannelData(channel)

            // Randomly activate glitch
            if (Math.random() < 0.05) {
              glitchActive = true
              glitchCounter = Math.floor(Math.random() * 10) + 1
            }

            if (glitchActive) {
              // Copy input to buffer
              for (let i = 0; i < inputData.length; i++) {
                buffer[i] = inputData[i]
              }

              // Apply glitch effects
              for (let i = 0; i < outputData.length; i++) {
                // Random sample repeats
                if (Math.random() < 0.2) {
                  const repeatLength = Math.floor(Math.random() * 20) + 1
                  const repeatStart = Math.floor(Math.random() * (buffer.length - repeatLength))

                  for (let j = 0; j < repeatLength; j++) {
                    if (i + j < outputData.length) {
                      outputData[i + j] = buffer[repeatStart + j]
                    }
                  }

                  i += repeatLength - 1
                } else {
                  outputData[i] = buffer[i]
                }
              }

              glitchCounter--
              if (glitchCounter <= 0) {
                glitchActive = false
              }
            } else {
              // Normal processing
              for (let i = 0; i < outputData.length; i++) {
                outputData[i] = inputData[i]
              }
            }
          }
        }

        source.connect(scriptProcessor)

        return scriptProcessor
      },
    },
    {
      id: 39,
      name: "Stutter",
      active: false,
      apply: (audioContext, source) => {
        // Create a stutter effect
        const bufferSize = 4096
        const scriptProcessor = audioContext.createScriptProcessor(bufferSize, 1, 1)

        const buffer = new Float32Array(bufferSize)
        let stutterActive = false
        let stutterCounter = 0
        let stutterRate = 4 // Repeat every 4 samples

        scriptProcessor.onaudioprocess = (event) => {
          const inputBuffer = event.inputBuffer
          const outputBuffer = event.outputBuffer

          for (let channel = 0; channel < outputBuffer.numberOfChannels; channel++) {
            const inputData = inputBuffer.getChannelData(channel)
            const outputData = outputBuffer.getChannelData(channel)

            // Randomly activate stutter
            if (Math.random() < 0.1 && !stutterActive) {
              stutterActive = true
              stutterCounter = Math.floor(Math.random() * 20) + 10
              stutterRate = Math.pow(2, Math.floor(Math.random() * 4) + 2) // 4, 8, 16, or 32

              // Copy input to buffer
              for (let i = 0; i < inputData.length; i++) {
                buffer[i] = inputData[i]
              }
            }

            if (stutterActive) {
              // Apply stutter effect
              for (let i = 0; i < outputData.length; i++) {
                outputData[i] = buffer[Math.floor(i / stutterRate) * stutterRate]
              }

              stutterCounter--
              if (stutterCounter <= 0) {
                stutterActive = false
              }
            } else {
              // Normal processing
              for (let i = 0; i < outputData.length; i++) {
                outputData[i] = inputData[i]
              }
            }
          }
        }

        source.connect(scriptProcessor)

        return scriptProcessor
      },
    },
    {
      id: 40,
      name: "Time Stretch",
      active: false,
      apply: (audioContext, source) => {
        // Create a time stretch effect
        if (audioRef.current) {
          // Slow down without changing pitch
          audioRef.current.playbackRate = 0.7
        }

        return source
      },
    },
    {
      id: 41,
      name: "Formant Shift",
      active: false,
      apply: (audioContext, source) => {
        // Create a formant shift effect
        const formant1 = audioContext.createBiquadFilter()
        formant1.type = "peaking"
        formant1.frequency.value = 700 // First formant
        formant1.Q.value = 5
        formant1.gain.value = 10

        const formant2 = audioContext.createBiquadFilter()
        formant2.type = "peaking"
        formant2.frequency.value = 1200 // Second formant
        formant2.Q.value = 5
        formant2.gain.value = -5

        const formant3 = audioContext.createBiquadFilter()
        formant3.type = "peaking"
        formant3.frequency.value = 2500 // Third formant
        formant3.Q.value = 5
        formant3.gain.value = 8

        source.connect(formant1)
        formant1.connect(formant2)
        formant2.connect(formant3)

        return formant3
      },
    },
    {
      id: 42,
      name: "Autotune Extreme",
      active: false,
      apply: (audioContext, source) => {
        // Create an extreme autotune effect
        const filter1 = audioContext.createBiquadFilter()
        filter1.type = "peaking"
        filter1.frequency.value = 440 // A4
        filter1.Q.value = 30
        filter1.gain.value = 20

        const filter2 = audioContext.createBiquadFilter()
        filter2.type = "peaking"
        filter2.frequency.value = 523.25 // C5
        filter2.Q.value = 30
        filter2.gain.value = 20

        const filter3 = audioContext.createBiquadFilter()
        filter3.type = "peaking"
        filter3.frequency.value = 659.25 // E5
        filter3.Q.value = 30
        filter3.gain.value = 20

        source.connect(filter1)
        filter1.connect(filter2)
        filter2.connect(filter3)

        return filter3
      },
    },
    {
      id: 43,
      name: "Bluetooth Quality",
      active: false,
      apply: (audioContext, source) => {
        // Create a bluetooth quality effect
        const lowPass = audioContext.createBiquadFilter()
        lowPass.type = "lowpass"
        lowPass.frequency.value = 4000

        const highPass = audioContext.createBiquadFilter()
        highPass.type = "highpass"
        highPass.frequency.value = 200

        // Add compression
        const compressor = audioContext.createDynamicsCompressor()
        compressor.threshold.value = -20
        compressor.knee.value = 5
        compressor.ratio.value = 12
        compressor.attack.value = 0
        compressor.release.value = 0.25

        // Add artifacts
        const bufferSize = 4096
        const scriptProcessor = audioContext.createScriptProcessor(bufferSize, 1, 1)

        scriptProcessor.onaudioprocess = (event) => {
          const inputBuffer = event.inputBuffer
          const outputBuffer = event.outputBuffer

          for (let channel = 0; channel < outputBuffer.numberOfChannels; channel++) {
            const inputData = inputBuffer.getChannelData(channel)
            const outputData = outputBuffer.getChannelData(channel)

            for (let i = 0; i < inputData.length; i++) {
              // Randomly drop samples
              if (Math.random() < 0.01) {
                outputData[i] = 0
              } else {
                outputData[i] = inputData[i]
              }
            }
          }
        }

        source.connect(highPass)
        highPass.connect(lowPass)
        lowPass.connect(compressor)
        compressor.connect(scriptProcessor)

        return scriptProcessor
      },
    },
    {
      id: 44,
      name: "Phone Call",
      active: false,
      apply: (audioContext, source) => {
        // Create a phone call effect
        const lowPass = audioContext.createBiquadFilter()
        lowPass.type = "lowpass"
        lowPass.frequency.value = 3000

        const highPass = audioContext.createBiquadFilter()
        highPass.type = "highpass"
        highPass.frequency.value = 300

        // Add compression
        const compressor = audioContext.createDynamicsCompressor()
        compressor.threshold.value = -15
        compressor.knee.value = 5
        compressor.ratio.value = 12
        compressor.attack.value = 0
        compressor.release.value = 0.25

        // Add noise
        const noiseGain = audioContext.createGain()
        noiseGain.gain.value = 0.01

        const noiseBuffer = audioContext.createBuffer(2, audioContext.sampleRate * 2, audioContext.sampleRate)

        for (let channel = 0; channel < noiseBuffer.numberOfChannels; channel++) {
          const data = noiseBuffer.getChannelData(channel)
          for (let i = 0; i < data.length; i++) {
            data[i] = Math.random() * 2 - 1
          }
        }

        const noise = audioContext.createBufferSource()
        noise.buffer = noiseBuffer
        noise.loop = true
        noise.start()

        noise.connect(noiseGain)

        source.connect(highPass)
        highPass.connect(lowPass)
        lowPass.connect(compressor)

        const merger = audioContext.createGain()
        compressor.connect(merger)
        noiseGain.connect(merger)

        return merger
      },
    },
    {
      id: 45,
      name: "Stadium Echo",
      active: false,
      apply: (audioContext, source) => {
        // Create a stadium echo effect
        const convolver = audioContext.createConvolver()

        // Create impulse response for stadium
        const sampleRate = audioContext.sampleRate
        const length = sampleRate * 5 // 5 seconds
        const impulse = audioContext.createBuffer(2, length, sampleRate)
        const leftChannel = impulse.getChannelData(0)
        const rightChannel = impulse.getChannelData(1)

        // Create multiple echoes
        const echoes = [
          { delay: 0.8, gain: 0.7 },
          { delay: 1.2, gain: 0.5 },
          { delay: 1.8, gain: 0.3 },
          { delay: 2.5, gain: 0.2 },
          { delay: 3.5, gain: 0.1 },
        ]

        // Fill the impulse buffer with echoes
        for (let i = 0; i < length; i++) {
          leftChannel[i] = 0
          rightChannel[i] = 0
        }

        // Add the direct sound
        leftChannel[0] = 1
        rightChannel[0] = 1

        // Add the echoes
        for (const echo of echoes) {
          const delaySamples = Math.floor(echo.delay * sampleRate)
          if (delaySamples < length) {
            leftChannel[delaySamples] = echo.gain * (Math.random() * 0.2 + 0.9) // Slight randomization
            rightChannel[delaySamples] = echo.gain * (Math.random() * 0.2 + 0.9)
          }
        }

        convolver.buffer = impulse

        // Mix dry and wet signals
        const dryGain = audioContext.createGain()
        dryGain.gain.value = 0.5

        const wetGain = audioContext.createGain()
        wetGain.gain.value = 0.5

        source.connect(dryGain)
        source.connect(convolver)
        convolver.connect(wetGain)

        const merger = audioContext.createGain()
        dryGain.connect(merger)
        wetGain.connect(merger)

        return merger
      },
    },
    {
      id: 46,
      name: "Cathedral",
      active: false,
      apply: (audioContext, source) => {
        // Create a cathedral reverb effect
        const convolver = audioContext.createConvolver()

        // Create impulse response for cathedral
        const sampleRate = audioContext.sampleRate
        const length = sampleRate * 8 // 8 seconds
        const impulse = audioContext.createBuffer(2, length, sampleRate)
        const leftChannel = impulse.getChannelData(0)
        const rightChannel = impulse.getChannelData(1)

        // Fill the impulse buffer with a cathedral-like reverb
        for (let i = 0; i < length; i++) {
          const t = i / sampleRate
          const decay = Math.exp(-t * 0.5) // Slow decay

          // Add some early reflections
          if (i < sampleRate * 0.1) {
            const earlyReflections = Math.random() * 0.5 + 0.5
            leftChannel[i] = earlyReflections * decay
            rightChannel[i] = earlyReflections * decay
          } else {
            leftChannel[i] = (Math.random() * 2 - 1) * decay * 0.5
            rightChannel[i] = (Math.random() * 2 - 1) * decay * 0.5
          }
        }

        convolver.buffer = impulse

        // Mix dry and wet signals
        const dryGain = audioContext.createGain()
        dryGain.gain.value = 0.3

        const wetGain = audioContext.createGain()
        wetGain.gain.value = 0.7

        source.connect(dryGain)
        source.connect(convolver)
        convolver.connect(wetGain)

        const merger = audioContext.createGain()
        dryGain.connect(merger)
        wetGain.connect(merger)

        return merger
      },
    },
    {
      id: 47,
      name: "Random FX",
      active: false,
      apply: (audioContext, source) => {
        // Apply 3 random effects from the available effects
        const availableEffectsCopy = [...availableEffects].filter((effect) => effect.id !== 47) // Exclude self

        // Shuffle and take first 3
        for (let i = availableEffectsCopy.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1))
          ;[availableEffectsCopy[i], availableEffectsCopy[j]] = [availableEffectsCopy[j], availableEffectsCopy[i]]
        }

        const selectedEffects = availableEffectsCopy.slice(0, 3)

        // Apply the selected effects in sequence
        let currentNode = source

        for (const effect of selectedEffects) {
          currentNode = effect.apply(audioContext, currentNode)
        }

        return currentNode
      },
    },
    {
      id: 48,
      name: "Custom Chain",
      active: false,
      apply: (audioContext, source) => {
        // Create a predefined chain of effects
        // Reverb -> Distortion -> Delay

        // Reverb
        const convolver = audioContext.createConvolver()
        const sampleRate = audioContext.sampleRate
        const length = sampleRate * 2
        const impulse = audioContext.createBuffer(2, length, sampleRate)
        const leftChannel = impulse.getChannelData(0)
        const rightChannel = impulse.getChannelData(1)

        for (let i = 0; i < length; i++) {
          const decay = Math.pow(1 - i / length, 2)
          leftChannel[i] = (Math.random() * 2 - 1) * decay
          rightChannel[i] = (Math.random() * 2 - 1) * decay
        }

        convolver.buffer = impulse

        // Distortion
        const distortion = audioContext.createWaveShaper()
        function makeDistortionCurve(amount = 50) {
          const k = amount
          const n_samples = 44100
          const curve = new Float32Array(n_samples)
          const deg = Math.PI / 180

          for (let i = 0; i < n_samples; ++i) {
            const x = (i * 2) / n_samples - 1
            curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x))
          }
          return curve
        }

        distortion.curve = makeDistortionCurve(50)
        distortion.oversample = "4x"

        // Delay
        const delay = audioContext.createDelay()
        delay.delayTime.value = 0.3

        const feedback = audioContext.createGain()
        feedback.gain.value = 0.3

        // Connect the chain
        source.connect(convolver)
        convolver.connect(distortion)
        distortion.connect(delay)
        delay.connect(feedback)
        feedback.connect(delay)

        return delay
      },
    },
    {
      id: 49,
      name: "Pitch Stretch",
      active: false,
      apply: (audioContext, source) => {
        // Create a pitch stretch effect (pitch without changing speed)
        // This is a simplified version since true pitch shifting without time change
        // requires more complex algorithms

        // Create a simple formant shifter
        const formant1 = audioContext.createBiquadFilter()
        formant1.type = "peaking"
        formant1.frequency.value = 500
        formant1.Q.value = 5
        formant1.gain.value = 10

        const formant2 = audioContext.createBiquadFilter()
        formant2.type = "peaking"
        formant2.frequency.value = 1500
        formant2.Q.value = 5
        formant2.gain.value = 5

        source.connect(formant1)
        formant1.connect(formant2)

        return formant2
      },
    },
    {
      id: 50,
      name: "Flanger",
      active: false,
      apply: (audioContext, source) => {
        // Create a flanger effect
        const delay = audioContext.createDelay()
        delay.delayTime.value = 0.005 // 5ms initial delay

        // Create an oscillator for modulation
        const oscillator = audioContext.createOscillator()
        oscillator.type = "sine"
        oscillator.frequency.value = 0.2 // 0.2 Hz - slow sweep

        // Create a gain for the oscillator
        const oscillatorGain = audioContext.createGain()
        oscillatorGain.gain.value = 0.003 // Modulation depth

        // Connect the oscillator to the delay time
        oscillator.connect(oscillatorGain)
        oscillatorGain.connect(delay.delayTime)

        // Start the oscillator
        oscillator.start()

        // Create a feedback loop
        const feedback = audioContext.createGain()
        feedback.gain.value = 0.5 // 50% feedback

        // Create a mix of dry and wet signals
        const dryGain = audioContext.createGain()
        dryGain.gain.value = 0.5

        const wetGain = audioContext.createGain()
        wetGain.gain.value = 0.5

        // Connect everything
        source.connect(dryGain)
        source.connect(delay)
        delay.connect(feedback)
        feedback.connect(delay)
        delay.connect(wetGain)

        // Create a merger to combine the dry and wet signals
        const merger = audioContext.createGain()
        dryGain.connect(merger)
        wetGain.connect(merger)

        return merger
      },
    },
  ]

  // Get active effects
  const activeEffects = availableEffects.filter((effect) => activeEffectIds.includes(effect.id))

  // Initialize audio element
  useEffect(() => {
    const audio = new Audio()
    audioRef.current = audio

    const handleLoadedMetadata = () => {
      setDuration(audio.duration)
    }

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime)
    }

    const handleEnded = () => {
      setIsPlaying(false)
    }

    audio.addEventListener("loadedmetadata", handleLoadedMetadata)
    audio.addEventListener("timeupdate", handleTimeUpdate)
    audio.addEventListener("ended", handleEnded)

    // Set initial volume
    audio.volume = volume

    return () => {
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata)
      audio.removeEventListener("timeupdate", handleTimeUpdate)
      audio.removeEventListener("ended", handleEnded)

      // Clean up audio context
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        audioContextRef.current.close()
      }

      // Revoke object URL
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl)
      }
    }
  }, [])

  // Handle file changes
  useEffect(() => {
    if (audioFile) {
      // Revoke previous URL to prevent memory leaks
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl)
      }

      // Create a new URL for the audio file
      const newUrl = URL.createObjectURL(audioFile)
      setAudioUrl(newUrl)

      // Reset playback state
      setIsPlaying(false)
      setCurrentTime(0)
      setDuration(0)

      // Reset audio element
      if (audioRef.current) {
        audioRef.current.src = newUrl
        audioRef.current.load()
      }

      // Reset audio context
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        audioContextRef.current.close()
        audioContextRef.current = null
      }

      sourceNodeRef.current = null
      gainNodeRef.current = null
      effectNodesRef.current.clear()
      setAudioContextInitialized(false)
      setActiveEffectIds([])
    }
  }, [audioFile])

  // Initialize audio context when audio is loaded
  useEffect(() => {
    if (!audioRef.current || !audioUrl || audioContextInitialized) return

    const initializeAudioContext = () => {
      try {
        // Create new audio context
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
        const audioContext = audioContextRef.current

        // Create source node
        sourceNodeRef.current = audioContext.createMediaElementSource(audioRef.current!)

        // Create gain node
        gainNodeRef.current = audioContext.createGain()
        gainNodeRef.current.gain.value = isMuted ? 0 : volume

        // Connect source to gain node and gain node to destination
        sourceNodeRef.current.connect(gainNodeRef.current)
        gainNodeRef.current.connect(audioContext.destination)

        setAudioContextInitialized(true)
      } catch (error) {
        console.error("Error initializing audio context:", error)
      }
    }

    // Initialize on canplaythrough event to ensure audio is loaded
    const handleCanPlayThrough = () => {
      initializeAudioContext()
      audioRef.current?.removeEventListener("canplaythrough", handleCanPlayThrough)
    }

    audioRef.current.addEventListener("canplaythrough", handleCanPlayThrough)

    return () => {
      audioRef.current?.removeEventListener("canplaythrough", handleCanPlayThrough)
    }
  }, [audioUrl, isMuted, volume])

  // Apply effects when they change
  useEffect(() => {
    if (!audioContextInitialized || !audioContextRef.current || !sourceNodeRef.current || !gainNodeRef.current) return

    const audioContext = audioContextRef.current
    const sourceNode = sourceNodeRef.current
    const gainNode = gainNodeRef.current

    // Disconnect all existing connections
    effectNodesRef.current.forEach((node) => {
      node.disconnect()
    })

    effectNodesRef.current.clear()

    // Disconnect source from gain node
    sourceNode.disconnect()

    // Apply active effects
    let currentNode: AudioNode = sourceNode

    activeEffects.forEach((effect) => {
      const effectNode = effect.apply(audioContext, currentNode)
      effectNodesRef.current.set(effect.id, effectNode)
      currentNode = effectNode
    })

    // Connect the last node to the gain node
    currentNode.connect(gainNode)

    // Reset playback rate if no speed effects are active
    if (
      !activeEffects.some((effect) =>
        ["Nightcore", "Vaporwave", "Pitch Shift Up", "Pitch Shift Down"].includes(effect.name),
      )
    ) {
      audioRef.current!.playbackRate = 1.0
    }
  }, [activeEffectIds, audioContextInitialized])

  // Update volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume
    }

    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = isMuted ? 0 : volume
    }
  }, [volume, isMuted])

  // Handle recording for download
  useEffect(() => {
    if (!isRecording || !audioContextRef.current || !gainNodeRef.current) return

    try {
      console.log("Starting recording process...")
      // Create a destination node for recording
      const destination = audioContextRef.current.createMediaStreamDestination()

      // Connect the gain node to the destination
      gainNodeRef.current.connect(destination)

      // Create a media recorder with MP3 format if supported
      let mimeType = "audio/mp3"
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        // Fallback to default format if MP3 is not supported
        mimeType = ""
      }
      const mediaRecorder = new MediaRecorder(destination.stream, {
        mimeType: mimeType || undefined,
      })
      mediaRecorderRef.current = mediaRecorder
      recordedChunksRef.current = [] // Clear previous chunks

      // Set up event handlers
      mediaRecorder.ondataavailable = (event) => {
        console.log("Data available from recorder", event.data.size)
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        console.log("Recording stopped, creating download...")
        // Create a blob from the recorded chunks with MP3 MIME type
        const blob = new Blob(recordedChunksRef.current, { type: "audio/mp3" })
        console.log("Created blob of size:", blob.size)

        // Create a download link
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")

        // Generate filename based on original file and effects with .mp3 extension
        const originalName = audioFile?.name?.split(".")[0] || "audio"
        const effectNames =
          activeEffects.length > 0
            ? activeEffects.map((effect) => effect.name.toLowerCase().replace(/\s+/g, "-")).join("-")
            : "original"
        const filename = `${originalName}-${effectNames}.mp3`

        a.href = url
        a.download = filename
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)

        // Clean up
        URL.revokeObjectURL(url)
        recordedChunksRef.current = []
        setIsRecording(false)
        console.log("Download complete")
      }

      // Start recording
      console.log("Starting media recorder...")
      mediaRecorder.start()

      // Stop recording when audio ends or after 30 seconds (safety)
      const handleRecordingEnd = () => {
        console.log("Audio ended, stopping recorder")
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
          mediaRecorderRef.current.stop()
        }
      }

      audioRef.current?.addEventListener("ended", handleRecordingEnd)

      const safetyTimeout = setTimeout(() => {
        console.log("Safety timeout reached, stopping recorder")
        handleRecordingEnd()
      }, 30000)

      return () => {
        console.log("Cleaning up recording effect")
        audioRef.current?.removeEventListener("ended", handleRecordingEnd)
        clearTimeout(safetyTimeout)

        // Disconnect the destination
        try {
          gainNodeRef.current?.disconnect(destination)
        } catch (e) {
          console.log("Error disconnecting destination:", e)
        }

        if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
          console.log("Stopping recorder during cleanup")
          mediaRecorderRef.current.stop()
        }
      }
    } catch (error) {
      console.error("Error setting up recording:", error)
      setIsRecording(false)
    }
  }, [isRecording, audioFile, activeEffects])

  const togglePlay = () => {
    if (!audioRef.current || !audioUrl) return

    if (isPlaying) {
      audioRef.current.pause()
    } else {
      // Resume audio context if it was suspended
      if (audioContextRef.current && audioContextRef.current.state === "suspended") {
        audioContextRef.current.resume()
      }
      audioRef.current.play().catch((error) => {
        console.error("Error playing audio:", error)
      })
    }

    setIsPlaying(!isPlaying)
  }

  const toggleMute = () => {
    setIsMuted(!isMuted)
  }

  const toggleEffect = (effectId: number) => {
    setActiveEffectIds((prev) => {
      if (prev.includes(effectId)) {
        return prev.filter((id) => id !== effectId)
      } else {
        return [...prev, effectId]
      }
    })
  }

  const downloadProcessedAudio = () => {
    if (!audioRef.current || !audioUrl || !audioContextInitialized) return

    // Make sure audio is playing from the beginning
    if (audioRef.current) {
      audioRef.current.currentTime = 0

      // Resume audio context if it was suspended
      if (audioContextRef.current && audioContextRef.current.state === "suspended") {
        audioContextRef.current
          .resume()
          .then(() => {
            // Start recording after context is resumed
            setIsRecording(true)
            audioRef.current!.play().catch((error) => {
              console.error("Error playing audio for recording:", error)
              setIsRecording(false)
            })
          })
          .catch((error) => {
            console.error("Error resuming audio context:", error)
            setIsRecording(false)
          })
      } else {
        // Start recording directly
        setIsRecording(true)
        audioRef.current.play().catch((error) => {
          console.error("Error playing audio for recording:", error)
          setIsRecording(false)
        })
      }
    }
  }

  const value = {
    audioFile,
    setAudioFile,
    isPlaying,
    togglePlay,
    currentTime,
    duration,
    setCurrentTime: (time: number) => {
      if (audioRef.current) {
        audioRef.current.currentTime = time
      }
    },
    volume,
    setVolume,
    isMuted,
    toggleMute,
    availableEffects,
    activeEffects,
    toggleEffect,
    audioUrl,
    downloadProcessedAudio,
  }

  return <AudioContext.Provider value={value}>{children}</AudioContext.Provider>
}

