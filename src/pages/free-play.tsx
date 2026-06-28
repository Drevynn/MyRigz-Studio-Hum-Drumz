import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import { 
  ArrowLeft, Play, Pause, Square, Trash2, Shuffle, Info, 
  Volume2, VolumeX, Activity, Sparkles, Sliders, Music, Disc,
  Mic, MicOff, Guitar
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { useToast } from "@/hooks/use-toast";

// Types
interface DrumPreset {
  name: string;
  bpm: number;
  grid: Record<string, number[]>;
}

interface InstrumentConfig {
  id: string;
  name: string;
  key: string;
  color: string;
  oscType?: OscillatorType;
  baseFreq?: number;
}

const INSTRUMENTS: InstrumentConfig[] = [
  { id: "kick", name: "Bass Kick", key: "A", color: "from-amber-500 to-red-600" },
  { id: "snare", name: "Crisp Snare", key: "S", color: "from-blue-500 to-indigo-600" },
  { id: "closedHat", name: "Closed Hat", key: "D", color: "from-emerald-400 to-teal-600" },
  { id: "openHat", name: "Open Hat", key: "F", color: "from-lime-400 to-green-600" },
  { id: "highTom", name: "High Tom", key: "G", color: "from-pink-500 to-rose-600" },
  { id: "lowTom", name: "Low Tom", key: "H", color: "from-purple-500 to-violet-600" },
  { id: "clap", name: "Synth Clap", key: "J", color: "from-cyan-400 to-blue-600" },
  { id: "cowbell", name: "808 Cowbell", key: "K", color: "from-yellow-400 to-amber-600" }
];

const PRESETS: DrumPreset[] = [
  {
    name: "Classic Hip-Hop",
    bpm: 90,
    grid: {
      kick:      [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0],
      snare:     [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1],
      closedHat: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
      openHat:   [0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0],
      highTom:   [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      lowTom:    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      clap:      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      cowbell:   [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0],
    }
  },
  {
    name: "Four-On-The-Floor House",
    bpm: 124,
    grid: {
      kick:      [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
      snare:     [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      closedHat: [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0],
      openHat:   [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
      highTom:   [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      lowTom:    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0],
      clap:      [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
      cowbell:   [0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0],
    }
  },
  {
    name: "Trap Heavy Roll",
    bpm: 142,
    grid: {
      kick:      [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0, 0],
      snare:     [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      closedHat: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      openHat:   [0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
      highTom:   [0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      lowTom:    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      clap:      [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
      cowbell:   [0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0],
    }
  },
  {
    name: "Retro Indie Rock",
    bpm: 112,
    grid: {
      kick:      [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0],
      snare:     [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
      closedHat: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
      openHat:   [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1],
      highTom:   [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      lowTom:    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      clap:      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      cowbell:   [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    }
  },
  {
    name: "Latin Bossa & Shaker",
    bpm: 116,
    grid: {
      kick:      [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0],
      snare:     [0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 0, 0],
      closedHat: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      openHat:   [0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0],
      highTom:   [0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0],
      lowTom:    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      clap:      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      cowbell:   [1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0, 0],
    }
  }
];

export default function FreePlayPage() {
  const { toast } = useToast();

  // AI Guitar Matcher States
  const [guitarMatchStyle, setGuitarMatchStyle] = useState("heavy-metal");
  const [customGuitarPrompt, setCustomGuitarPrompt] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [isMatching, setIsMatching] = useState(false);
  const [matchedDetails, setMatchedDetails] = useState<{ bpm: number, genre: string, description: string } | null>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: "audio/webm" });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Audio = reader.result as string;
          await handleMatchGuitarDrums(base64Audio, "audio/webm");
        };
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      setRecordingSeconds(0);
      
      toast({
        title: "Listening to guitar...",
        description: "Play your guitar riff now! Recording will automatically stop in 10 seconds.",
      });
    } catch (err: any) {
      console.error("Failed to start recording:", err);
      toast({
        title: "Microphone Access Failed",
        description: "Could not access microphone/audio input. Please select a style or type a description instead!",
        variant: "destructive"
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.stop();
      setIsRecording(false);
    }
  };

  useEffect(() => {
    let interval: any;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingSeconds(prev => {
          if (prev >= 9) {
            stopRecording();
            return 10;
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording, mediaRecorder]);

  const handleMatchGuitarDrums = async (audioData?: string, mimeType?: string) => {
    setIsMatching(true);
    setMatchedDetails(null);
    try {
      const response = await fetch("/api/match-guitar-drums", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audioData,
          mimeType,
          guitarStyle: guitarMatchStyle,
          customPrompt: customGuitarPrompt,
        })
      });

      if (!response.ok) throw new Error("Match request failed");
      const matchedData = await response.json();

      if (matchedData.grid) {
        setIsPlaying(false);
        if (timerIdRef.current) {
          clearInterval(timerIdRef.current);
          timerIdRef.current = null;
        }
        setCurrentStep(0);
        currentStepRef.current = 0;

        setBpm(matchedData.bpm);
        setGrid(matchedData.grid);
        setMatchedDetails({
          bpm: matchedData.bpm,
          genre: matchedData.genre,
          description: matchedData.description,
        });

        toast({
          title: "🎸 Guitar Riff Matched!",
          description: `Detected ${matchedData.genre} at ${matchedData.bpm} BPM. Loaded a custom matched pattern!`,
        });
      }
    } catch (err: any) {
      console.error("Match error:", err);
      toast({
        title: "Matching Failed",
        description: "Could not match drums. Please try choosing a preset style or check connection.",
        variant: "destructive"
      });
    } finally {
      setIsMatching(false);
    }
  };
  
  // Audio Context & Analyser refs
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Sequencer State
  const [isPlaying, setIsPlaying] = useState(false);
  const [bpm, setBpm] = useState(120);
  const [swing, setSwing] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [mutedTracks, setMutedTracks] = useState<Record<string, boolean>>({});
  
  // 16-step grid state for 8 instruments
  const [grid, setGrid] = useState<Record<string, number[]>>(() => {
    const initialGrid: Record<string, number[]> = {};
    INSTRUMENTS.forEach(inst => {
      initialGrid[inst.id] = Array(16).fill(0);
    });
    // Set classic hiphop as default start
    PRESETS[0].grid && INSTRUMENTS.forEach(inst => {
      initialGrid[inst.id] = [...(PRESETS[0].grid[inst.id] || Array(16).fill(0))];
    });
    return initialGrid;
  });

  // Track active keys visually
  const [activeKeys, setActiveKeys] = useState<Record<string, boolean>>({});

  // Audio Scheduler References
  const nextNoteTimeRef = useRef(0);
  const currentStepRef = useRef(0);
  const timerIdRef = useRef<number | null>(null);

  // Sync state to refs for accurate lookahead thread
  const gridRef = useRef(grid);
  const bpmRef = useRef(bpm);
  const swingRef = useRef(swing);
  const isPlayingRef = useRef(isPlaying);
  const mutedTracksRef = useRef(mutedTracks);

  useEffect(() => {
    gridRef.current = grid;
  }, [grid]);

  useEffect(() => {
    bpmRef.current = bpm;
  }, [bpm]);

  useEffect(() => {
    swingRef.current = swing;
  }, [swing]);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    mutedTracksRef.current = mutedTracks;
  }, [mutedTracks]);

  // Lazy initialize Web Audio API
  const getAudioContext = (): { ctx: AudioContext; analyser: AnalyserNode; masterGain: GainNode } => {
    if (!audioCtxRef.current) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContextClass();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 128;
      
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(0.8, ctx.currentTime);
      
      masterGain.connect(analyser);
      analyser.connect(ctx.destination);
      
      audioCtxRef.current = ctx;
      analyserRef.current = analyser;
      masterGainRef.current = masterGain;

      // Start canvas drawing loop
      drawVisualizer();
    }
    
    if (audioCtxRef.current.state === "suspended") {
      audioCtxRef.current.resume();
    }
    
    return {
      ctx: audioCtxRef.current,
      analyser: analyserRef.current!,
      masterGain: masterGainRef.current!
    };
  };

  // Drum synthesis algorithms using Web Audio API Nodes
  const playSynth = (instId: string, time: number = 0) => {
    try {
      const { ctx, masterGain } = getAudioContext();
      const playTime = time || ctx.currentTime;

      switch (instId) {
        case "kick": {
          const osc = ctx.createOscillator();
          const oscGain = ctx.createGain();
          
          osc.connect(oscGain);
          oscGain.connect(masterGain);
          
          osc.frequency.setValueAtTime(150, playTime);
          osc.frequency.exponentialRampToValueAtTime(0.01, playTime + 0.3);
          
          oscGain.gain.setValueAtTime(1.0, playTime);
          oscGain.gain.exponentialRampToValueAtTime(0.001, playTime + 0.3);
          
          osc.start(playTime);
          osc.stop(playTime + 0.3);
          break;
        }

        case "snare": {
          // White noise snare wire snap
          const bufferSize = ctx.sampleRate * 0.2;
          const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
          const data = buffer.getChannelData(0);
          for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
          }
          const noise = ctx.createBufferSource();
          noise.buffer = buffer;
          
          const filter = ctx.createBiquadFilter();
          filter.type = "highpass";
          filter.frequency.value = 1000;
          
          const noiseGain = ctx.createGain();
          noiseGain.gain.setValueAtTime(0.6, playTime);
          noiseGain.gain.exponentialRampToValueAtTime(0.01, playTime + 0.18);
          
          noise.connect(filter);
          filter.connect(noiseGain);
          noiseGain.connect(masterGain);
          
          // Snare body shell resonance
          const osc = ctx.createOscillator();
          const oscGain = ctx.createGain();
          osc.type = "triangle";
          osc.frequency.setValueAtTime(180, playTime);
          osc.frequency.exponentialRampToValueAtTime(100, playTime + 0.08);
          
          oscGain.gain.setValueAtTime(0.4, playTime);
          oscGain.gain.exponentialRampToValueAtTime(0.01, playTime + 0.1);
          
          osc.connect(oscGain);
          oscGain.connect(masterGain);
          
          noise.start(playTime);
          osc.start(playTime);
          noise.stop(playTime + 0.2);
          osc.stop(playTime + 0.12);
          break;
        }

        case "closedHat": {
          const bufferSize = ctx.sampleRate * 0.05;
          const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
          const data = buffer.getChannelData(0);
          for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
          }
          const noise = ctx.createBufferSource();
          noise.buffer = buffer;
          
          const filter = ctx.createBiquadFilter();
          filter.type = "highpass";
          filter.frequency.value = 8000;
          
          const gain = ctx.createGain();
          gain.gain.setValueAtTime(0.4, playTime);
          gain.gain.exponentialRampToValueAtTime(0.001, playTime + 0.04);
          
          noise.connect(filter);
          filter.connect(gain);
          gain.connect(masterGain);
          
          noise.start(playTime);
          noise.stop(playTime + 0.05);
          break;
        }

        case "openHat": {
          const bufferSize = ctx.sampleRate * 0.35;
          const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
          const data = buffer.getChannelData(0);
          for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
          }
          const noise = ctx.createBufferSource();
          noise.buffer = buffer;
          
          const filter = ctx.createBiquadFilter();
          filter.type = "highpass";
          filter.frequency.value = 7000;
          
          const gain = ctx.createGain();
          gain.gain.setValueAtTime(0.35, playTime);
          gain.gain.exponentialRampToValueAtTime(0.001, playTime + 0.32);
          
          noise.connect(filter);
          filter.connect(gain);
          gain.connect(masterGain);
          
          noise.start(playTime);
          noise.stop(playTime + 0.35);
          break;
        }

        case "highTom": {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sine";
          
          osc.frequency.setValueAtTime(220, playTime);
          osc.frequency.exponentialRampToValueAtTime(80, playTime + 0.22);
          
          gain.gain.setValueAtTime(0.5, playTime);
          gain.gain.exponentialRampToValueAtTime(0.001, playTime + 0.22);
          
          osc.connect(gain);
          gain.connect(masterGain);
          osc.start(playTime);
          osc.stop(playTime + 0.23);
          break;
        }

        case "lowTom": {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sine";
          
          osc.frequency.setValueAtTime(125, playTime);
          osc.frequency.exponentialRampToValueAtTime(50, playTime + 0.28);
          
          gain.gain.setValueAtTime(0.65, playTime);
          gain.gain.exponentialRampToValueAtTime(0.001, playTime + 0.28);
          
          osc.connect(gain);
          gain.connect(masterGain);
          osc.start(playTime);
          osc.stop(playTime + 0.29);
          break;
        }

        case "clap": {
          const bufferSize = ctx.sampleRate * 0.25;
          const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
          const data = buffer.getChannelData(0);
          for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
          }
          const noise = ctx.createBufferSource();
          noise.buffer = buffer;
          
          const filter = ctx.createBiquadFilter();
          filter.type = "bandpass";
          filter.frequency.value = 1300;
          filter.Q.value = 2.5;
          
          const gain = ctx.createGain();
          
          // Multistrike handclap envelope
          gain.gain.setValueAtTime(0.5, playTime);
          gain.gain.exponentialRampToValueAtTime(0.01, playTime + 0.012);
          
          gain.gain.setValueAtTime(0.5, playTime + 0.016);
          gain.gain.exponentialRampToValueAtTime(0.01, playTime + 0.026);
          
          gain.gain.setValueAtTime(0.55, playTime + 0.032);
          gain.gain.exponentialRampToValueAtTime(0.001, playTime + 0.22);
          
          noise.connect(filter);
          filter.connect(gain);
          gain.connect(masterGain);
          
          noise.start(playTime);
          noise.stop(playTime + 0.25);
          break;
        }

        case "cowbell": {
          const osc1 = ctx.createOscillator();
          const osc2 = ctx.createOscillator();
          const filter = ctx.createBiquadFilter();
          const gain = ctx.createGain();
          
          osc1.type = "square";
          osc1.frequency.value = 540;
          
          osc2.type = "square";
          osc2.frequency.value = 800;
          
          filter.type = "bandpass";
          filter.frequency.value = 800;
          filter.Q.value = 3;
          
          gain.gain.setValueAtTime(0.5, playTime);
          gain.gain.exponentialRampToValueAtTime(0.001, playTime + 0.25);
          
          osc1.connect(filter);
          osc2.connect(filter);
          filter.connect(gain);
          gain.connect(masterGain);
          
          osc1.start(playTime);
          osc2.start(playTime);
          
          osc1.stop(playTime + 0.25);
          osc2.stop(playTime + 0.25);
          break;
        }
      }
    } catch (err) {
      console.warn("Audio synthesis error:", err);
    }
  };

  // Live triggered tap play (by clicking pads or keyboard)
  const triggerDrumPlay = (instId: string) => {
    // Explicitly wake or retrieve context
    getAudioContext();
    playSynth(instId);

    // Provide short active visual feedback to pad
    setActiveKeys(prev => ({ ...prev, [instId]: true }));
    setTimeout(() => {
      setActiveKeys(prev => ({ ...prev, [instId]: false }));
    }, 100);
  };

  // Keep track of triggerDrumPlay in a ref to avoid stale closure issues in the message listener
  const triggerDrumPlayRef = useRef(triggerDrumPlay);
  useEffect(() => {
    triggerDrumPlayRef.current = triggerDrumPlay;
  }, [triggerDrumPlay]);

  // MIDI postMessage interface listener (for host DAW/Plugin container integration)
  useEffect(() => {
    // Helper function to resolve MIDI notes to drum instrument IDs
    const getInstrumentIdFromMidiNote = (note: number): string => {
      switch (note) {
        case 35:
        case 36:
          return "kick";
        case 38:
        case 40:
          return "snare";
        case 42:
        case 44:
          return "closedHat";
        case 46:
          return "openHat";
        case 47:
        case 48:
        case 50:
          return "highTom";
        case 41:
        case 43:
        case 45:
          return "lowTom";
        case 39:
          return "clap";
        case 56:
          return "cowbell";
        default: {
          // Fallback module matching for indices 0-7, 60-67, etc.
          const index = note % 8;
          const instrumentsOrder = ["kick", "snare", "closedHat", "openHat", "highTom", "lowTom", "clap", "cowbell"];
          return instrumentsOrder[index];
        }
      }
    };

    // Define a direct playNote function exposed to host page script if running in iframe wrapper
    const playNote = (note: number, channel: number = 0, velocity: number = 100) => {
      if (velocity > 0) {
        const instId = getInstrumentIdFromMidiNote(note);
        if (instId) {
          triggerDrumPlayRef.current(instId);
        }
      }
    };

    (window as any).playNote = playNote;

    const handleMessage = (e: MessageEvent) => {
      if (e.data && e.data.type === 'MIDI_EVENT') {
        const { note, velocity, action } = e.data;
        if (action === 'NOTE_ON') {
          playNote(note, 0, velocity ?? 100);
        }
      }
    };

    window.addEventListener("message", handleMessage);
    return () => {
      window.removeEventListener("message", handleMessage);
      delete (window as any).playNote;
    };
  }, []);

  // Keyboard finger drumming listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore key hits in inputs/textareas
      if (document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "TEXTAREA") {
        return;
      }
      
      const char = e.key.toUpperCase();
      const match = INSTRUMENTS.find(inst => inst.key === char);
      if (match) {
        e.preventDefault();
        triggerDrumPlay(match.id);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // HTML5 visualizer render
  const drawVisualizer = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const analyser = analyserRef.current;
    if (!ctx || !analyser) return;

    const width = canvas.width;
    const height = canvas.height;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animationFrameRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      ctx.fillStyle = "rgba(10, 10, 12, 0.2)";
      ctx.fillRect(0, 0, width, height);

      // Sleek grid lines in visualizer background
      ctx.strokeStyle = "rgba(255, 255, 255, 0.03)";
      ctx.lineWidth = 1;
      for (let i = 0; i < width; i += 40) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, height);
        ctx.stroke();
      }
      for (let i = 0; i < height; i += 20) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(width, i);
        ctx.stroke();
      }

      // Draw custom frequency wave
      const barWidth = (width / bufferLength) * 1.5;
      let barHeight;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        barHeight = dataArray[i] * 0.45;

        // Custom glow gradient
        const grad = ctx.createLinearGradient(0, height, 0, height - barHeight);
        grad.addColorStop(0, "rgba(139, 92, 246, 0.1)"); // violet
        grad.addColorStop(0.5, "rgba(59, 130, 246, 0.6)"); // blue
        grad.addColorStop(1, "rgba(20, 184, 166, 0.95)"); // teal

        ctx.fillStyle = grad;
        ctx.fillRect(x, height - barHeight, barWidth - 2, barHeight);

        x += barWidth;
      }
    };

    draw();
  };

  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Professional Clock lookahead Scheduler
  const scheduler = () => {
    const lookahead = 0.1; // 100ms
    const { ctx } = getAudioContext();

    while (nextNoteTimeRef.current < ctx.currentTime + lookahead) {
      const scheduledTime = nextNoteTimeRef.current;
      const stepToPlay = currentStepRef.current;

      // Play each enabled sound for this step
      INSTRUMENTS.forEach(inst => {
        const isMuted = mutedTracksRef.current[inst.id];
        const isTriggered = gridRef.current[inst.id]?.[stepToPlay] === 1;

        if (isTriggered && !isMuted) {
          playSynth(inst.id, scheduledTime);
        }
      });

      // Update current playing step state dynamically for React view sync
      const visualStep = stepToPlay;
      setCurrentStep(visualStep);

      // Advance time for next note
      const secondsPerBeat = 60.0 / bpmRef.current;
      const stepDuration = secondsPerBeat / 4.0; // 16th note

      // Incorporate MPC swing for odd steps
      let finalDuration = stepDuration;
      if (stepToPlay % 2 !== 0) {
        const swingPercentage = swingRef.current / 100.0;
        finalDuration += stepDuration * swingPercentage * 0.4;
      } else {
        const swingPercentage = swingRef.current / 100.0;
        finalDuration -= stepDuration * swingPercentage * 0.4;
      }

      nextNoteTimeRef.current += finalDuration;
      currentStepRef.current = (stepToPlay + 1) % 16;
    }
  };

  // Start / Pause Sequencer Clock Loop
  const togglePlay = () => {
    if (isPlaying) {
      // Pause Clock
      if (timerIdRef.current) {
        clearInterval(timerIdRef.current);
        timerIdRef.current = null;
      }
      setIsPlaying(false);
    } else {
      // Resume or wake Audio Context
      const { ctx } = getAudioContext();
      
      // Sync clock parameters
      nextNoteTimeRef.current = ctx.currentTime + 0.05;
      currentStepRef.current = 0;
      setCurrentStep(0);

      // Schedule fast ticks to check lookahead
      timerIdRef.current = window.setInterval(scheduler, 25);
      setIsPlaying(true);
      
      toast({
        title: "Sequencer Playing",
        description: `BPM is set to ${bpm}. Jam along live!`,
      });
    }
  };

  const stopSequencer = () => {
    if (timerIdRef.current) {
      clearInterval(timerIdRef.current);
      timerIdRef.current = null;
    }
    setIsPlaying(false);
    setCurrentStep(0);
    currentStepRef.current = 0;
  };

  // Apply Preset Rhythm Grid
  const handleApplyPreset = (preset: DrumPreset) => {
    setGrid({ ...preset.grid });
    setBpm(preset.bpm);
    stopSequencer();
    
    toast({
      title: `${preset.name} applied`,
      description: `Grid populated with professional drum template.`,
    });
  };

  // Clear Grid
  const clearGrid = () => {
    const emptyGrid: Record<string, number[]> = {};
    INSTRUMENTS.forEach(inst => {
      emptyGrid[inst.id] = Array(16).fill(0);
    });
    setGrid(emptyGrid);
    stopSequencer();

    toast({
      title: "Sequencer cleared",
      description: "Ready for your own custom rhythms.",
    });
  };

  // Randomize Grid Pattern
  const randomizeGrid = () => {
    const randomGrid: Record<string, number[]> = {};
    INSTRUMENTS.forEach(inst => {
      // Create interesting organic sparsity
      randomGrid[inst.id] = Array(16).fill(0).map(() => {
        const threshold = inst.id === "kick" || inst.id === "closedHat" ? 0.35 : 0.15;
        return Math.random() < threshold ? 1 : 0;
      });
    });
    setGrid(randomGrid);
    
    toast({
      title: "Pattern Randomized",
      description: "A fresh organic beat has been generated on the matrix.",
    });
  };

  // Clear or toggle individual steps
  const toggleStep = (instId: string, index: number) => {
    getAudioContext(); // Ensure AudioContext is ready

    const newGrid = { ...grid };
    const currentVal = newGrid[instId][index];
    newGrid[instId][index] = currentVal === 1 ? 0 : 1;
    setGrid(newGrid);

    // If step toggled ON, play sound preview instantly
    if (newGrid[instId][index] === 1) {
      playSynth(instId);
    }
  };

  // Clean timers up on component unmount
  useEffect(() => {
    return () => {
      if (timerIdRef.current) {
        clearInterval(timerIdRef.current);
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col justify-between">
      <Header />

      <main className="flex-1 py-8 md:py-12">
        <div className="mx-auto max-w-7xl px-4 md:px-6 space-y-8">
          
          {/* Studio Header Nav */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <Link href="/generate">
                <Button variant="ghost" size="sm" className="mb-2 pl-0 hover:bg-transparent text-muted-foreground hover:text-foreground">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to AI Studio
                </Button>
              </Link>
              <h1 className="font-display text-3xl font-extrabold tracking-tight md:text-4xl flex items-center gap-3">
                <Music className="h-8 w-8 text-primary animate-pulse" />
                Free Play Studio
              </h1>
              <p className="text-muted-foreground text-sm max-w-xl">
                Perform live using drum pads or trigger keys, and sequence custom rhythms using a fully customizable Web Audio beat synthesizer.
              </p>
            </div>

            {/* Custom Visualizer screen */}
            <div className="w-full md:w-80 h-24 rounded-xl overflow-hidden border border-border/60 bg-muted/20 relative shadow-inner">
              <canvas 
                ref={canvasRef} 
                width={320} 
                height={96}
                className="w-full h-full block"
              />
              <div className="absolute top-2 left-2 flex items-center gap-1.5 text-[10px] font-mono text-emerald-400 bg-background/60 backdrop-blur px-2 py-0.5 rounded border border-emerald-500/20">
                <Activity className="h-3 w-3 animate-ping" />
                REAL-TIME WAVE OSC
              </div>
            </div>
          </div>

          {/* Virtual Drum Pads Section */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-bold flex items-center gap-2">
                <Disc className="h-5 w-5 text-primary animate-spin-slow" />
                Virtual Finger Drumming Pads
              </h2>
              <span className="text-xs text-muted-foreground font-mono hidden md:inline-block">
                Press listed keys <kbd className="px-1.5 py-0.5 border rounded bg-muted text-foreground text-[10px] font-bold">A S D F G H J K</kbd> to play live
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {INSTRUMENTS.map((inst) => {
                const isActive = activeKeys[inst.id];
                return (
                  <button
                    key={inst.id}
                    onClick={() => triggerDrumPlay(inst.id)}
                    className={`h-24 rounded-xl border text-left p-4 flex flex-col justify-between transition-all duration-75 relative group select-none overflow-hidden ${
                      isActive 
                        ? "bg-gradient-to-br scale-[0.96] ring-2 ring-primary border-transparent shadow-lg text-white" 
                        : "bg-card hover:bg-muted/40 border-border/80 hover:border-primary/50 shadow-sm text-foreground"
                    }`}
                  >
                    {/* Color overlay glow */}
                    <div className={`absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity bg-gradient-to-br ${inst.color}`} />
                    
                    <div className="flex justify-between items-start w-full">
                      <span className="text-[10px] font-mono font-bold tracking-wider text-muted-foreground group-hover:text-primary uppercase transition-colors">
                        PERC PAD
                      </span>
                      <span className={`text-xs font-mono font-extrabold px-1.5 py-0.5 rounded border ${
                        isActive 
                          ? "bg-white/20 border-white/40" 
                          : "bg-muted border-border text-muted-foreground"
                      }`}>
                        {inst.key}
                      </span>
                    </div>

                    <span className={`font-display font-black text-sm tracking-tight ${
                      isActive ? "text-white" : "text-foreground group-hover:text-primary transition-colors"
                    }`}>
                      {inst.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* AI Guitar Matcher Card */}
          <Card className="p-6 bg-card border-border shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 p-3 text-muted-foreground/10 select-none pointer-events-none">
              <Guitar className="w-40 h-40" />
            </div>

            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Guitar className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-display text-lg font-bold">🎸 AI Guitar Track Matcher (MyRigz DAW Tool)</h2>
                <p className="text-xs text-muted-foreground">
                  Connect your DAW track or play live. Let Gemini listen to your guitar riff and program a perfect backing drum groove to lock in with your rhythm!
                </p>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              {/* Left Column: Audio Recorder */}
              <div className="p-4 rounded-xl bg-muted/40 border flex flex-col justify-between space-y-4">
                <div className="space-y-1">
                  <span className="text-xs font-bold font-mono text-primary uppercase">OPTION 1: Listen to Live Audio</span>
                  <p className="text-xs text-muted-foreground">
                    Record your guitar playing live via microphone or audio input for 10 seconds. AI will analyze the tempo and vibe.
                  </p>
                </div>

                {isRecording ? (
                  <div className="flex-1 flex flex-col items-center justify-center py-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
                      <span className="text-xs font-mono font-bold text-red-500 uppercase">Listening Live... {recordingSeconds}s / 10s</span>
                    </div>
                    
                    {/* Recording progress meter */}
                    <div className="w-full bg-border h-2 rounded-full overflow-hidden">
                      <div className="bg-red-500 h-full transition-all duration-1000" style={{ width: `${recordingSeconds * 10}%` }} />
                    </div>

                    <Button onClick={stopRecording} variant="destructive" size="sm" className="w-full">
                      <MicOff className="h-4 w-4 mr-2" /> Stop & Analyze
                    </Button>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center py-4 space-y-3">
                    <Button onClick={startRecording} disabled={isMatching} className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold">
                      <Mic className="h-4 w-4 mr-2" /> Record Guitar Riff (10s)
                    </Button>
                    <span className="text-[10px] text-muted-foreground">Make sure your instrument is close to your microphone!</span>
                  </div>
                )}
              </div>

              {/* Right Column: Presets & Custom Descriptor */}
              <div className="p-4 rounded-xl bg-muted/40 border flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="space-y-1">
                    <span className="text-xs font-bold font-mono text-primary uppercase">OPTION 2: Choose Style / Describe Track</span>
                    <p className="text-xs text-muted-foreground">
                      No instrument at hand? Choose a preset guitar feel or type what you are playing!
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-mono font-bold text-muted-foreground uppercase block">Select Guitar Style Preset</label>
                    <select
                      value={guitarMatchStyle}
                      onChange={(e) => setGuitarMatchStyle(e.target.value)}
                      className="w-full bg-background border border-border/80 rounded-md p-2 text-xs focus:ring-1 focus:ring-primary outline-none text-foreground"
                    >
                      <option value="heavy-metal" className="bg-background text-foreground">Heavy Metal Palm Mutes (Fast driving riffs)</option>
                      <option value="funk-wah" className="bg-background text-foreground">Groovy Funk Wah-Wah (Syncopated rhythm strumming)</option>
                      <option value="acoustic-folk" className="bg-background text-foreground">Acoustic Folk Picking (Soft warm chords)</option>
                      <option value="punk-rock" className="bg-background text-foreground">Upbeat Punk Rock Chords (Fast energetic progressions)</option>
                      <option value="blues-solo" className="bg-background text-foreground">Slow Blues Shuffle Solo (Swung expressive bends)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-mono font-bold text-muted-foreground uppercase block">Or Describe Custom Guitar Groove</label>
                    <textarea
                      placeholder="e.g. A fast trash metal riff with heavy distortion and blastbeat transitions at 180 BPM..."
                      value={customGuitarPrompt}
                      onChange={(e) => setCustomGuitarPrompt(e.target.value)}
                      className="w-full h-16 bg-background border border-border/80 rounded-md p-2 text-xs focus:ring-1 focus:ring-primary outline-none resize-none text-foreground"
                    />
                  </div>
                </div>

                <Button 
                  onClick={() => handleMatchGuitarDrums()} 
                  disabled={isMatching || isRecording} 
                  className="w-full"
                >
                  {isMatching ? "AI Listening & Generating Matching Beat..." : "Analyze Guitar style & Generate Match"}
                </Button>
              </div>
            </div>

            {/* AI Results Output Container */}
            {matchedDetails && (
              <div className="mt-4 p-4 rounded-xl border border-primary/20 bg-primary/5 space-y-2 animate-fade-in">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <span className="text-xs font-bold text-primary uppercase tracking-wider font-mono">Matched Analysis Result</span>
                  </div>
                  <Badge variant="secondary" className="text-xs font-mono text-foreground">
                    {matchedDetails.bpm} BPM • {matchedDetails.genre}
                  </Badge>
                </div>
                <p className="text-xs font-medium text-foreground leading-relaxed">
                  {matchedDetails.description}
                </p>
                <div className="text-[10px] text-muted-foreground font-mono">
                  ✨ Matching drum patterns automatically loaded into the sequencer matrix below. Click "Play Beat" to jam along!
                </div>
              </div>
            )}
          </Card>

          {/* Advanced Sequencer Layout Grid */}
          <Card className="p-6 bg-card/40 backdrop-blur border-border/60 shadow-lg">
            
            {/* Sequencer controls toolbar */}
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-6 pb-6 border-b border-border/50 mb-6">
              
              {/* Play / Tempo controls */}
              <div className="flex flex-wrap items-center gap-3">
                <Button 
                  onClick={togglePlay} 
                  variant={isPlaying ? "destructive" : "default"} 
                  className="gap-2 font-semibold hover-elevate shadow-md min-w-[110px]"
                >
                  {isPlaying ? (
                    <>
                      <Pause className="h-4 w-4" />
                      Pause
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 fill-current" />
                      Play Beat
                    </>
                  )}
                </Button>
                
                <Button 
                  onClick={stopSequencer} 
                  variant="outline" 
                  size="icon"
                  className="h-10 w-10 border-border/60 hover:bg-muted/50"
                  title="Stop and Reset"
                >
                  <Square className="h-4 w-4 fill-current" />
                </Button>

                <div className="h-8 w-[1px] bg-border/60 mx-1 hidden sm:block" />

                {/* Tempo BPM slider */}
                <div className="flex items-center gap-4 bg-muted/40 px-4 py-2 rounded-lg border">
                  <div className="space-y-0.5">
                    <span className="block text-[9px] font-mono font-bold text-muted-foreground uppercase leading-none">TEMPO</span>
                    <span className="font-mono text-sm font-black tracking-tight">{bpm} BPM</span>
                  </div>
                  <input 
                    type="range"
                    min={60}
                    max={200}
                    value={bpm}
                    onChange={(e) => setBpm(parseInt(e.target.value))}
                    className="w-24 sm:w-32 h-1 bg-border rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                </div>

                {/* Swing settings */}
                <div className="flex items-center gap-4 bg-muted/40 px-4 py-2 rounded-lg border">
                  <div className="space-y-0.5">
                    <span className="block text-[9px] font-mono font-bold text-muted-foreground uppercase leading-none">SWING</span>
                    <span className="font-mono text-sm font-black tracking-tight">{swing}%</span>
                  </div>
                  <input 
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={swing}
                    onChange={(e) => setSwing(parseInt(e.target.value))}
                    className="w-20 sm:w-24 h-1 bg-border rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                </div>
              </div>

              {/* Presets and functional actions */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-muted-foreground font-mono mr-1 flex items-center gap-1">
                  <Sparkles className="h-3 w-3 text-primary" /> Preset Grooves:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {PRESETS.map((p, idx) => (
                    <Button
                      key={idx}
                      onClick={() => handleApplyPreset(p)}
                      variant="outline"
                      size="sm"
                      className="text-xs h-8 border-border/50 hover:bg-primary/5 hover:text-primary hover:border-primary/30 transition-all rounded-md"
                    >
                      {p.name.split(" ")[0]}
                    </Button>
                  ))}
                </div>

                <div className="h-6 w-[1px] bg-border/60 mx-1 hidden xl:block" />

                <div className="flex gap-1.5 ml-auto">
                  <Button 
                    onClick={randomizeGrid} 
                    variant="ghost" 
                    size="sm" 
                    className="text-xs h-8 hover:bg-muted/50 text-muted-foreground hover:text-foreground"
                    title="Randomize matrix blocks"
                  >
                    <Shuffle className="h-3.5 w-3.5 mr-1" />
                    Randomize
                  </Button>
                  <Button 
                    onClick={clearGrid} 
                    variant="ghost" 
                    size="sm" 
                    className="text-xs h-8 text-destructive/80 hover:text-destructive hover:bg-destructive/5"
                    title="Clear sequencer"
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1" />
                    Clear
                  </Button>
                </div>
              </div>

            </div>

            {/* Steps Timeline Header Bar */}
            <div className="hidden md:grid grid-cols-[140px_1fr] gap-4 mb-3 items-center px-2 select-none">
              <span className="text-[10px] font-mono font-bold text-muted-foreground uppercase">Instrument</span>
              <div className="grid gap-1 w-full text-center" style={{ gridTemplateColumns: "repeat(16, minmax(0, 1fr))" }}>
                {Array(16).fill(0).map((_, index) => {
                  const isPlayingStep = currentStep === index && isPlaying;
                  const isBeatStart = index % 4 === 0;
                  return (
                    <div 
                      key={index} 
                      className={`text-[9px] font-mono font-bold rounded py-0.5 transition-colors ${
                        isPlayingStep 
                          ? "bg-primary text-primary-foreground scale-110 shadow" 
                          : isBeatStart 
                            ? "text-primary/90 font-black" 
                            : "text-muted-foreground"
                      }`}
                    >
                      {index + 1}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Matrix Sequencer Rows */}
            <div className="space-y-2.5">
              {INSTRUMENTS.map((inst) => {
                const isMuted = mutedTracks[inst.id];
                return (
                  <div 
                    key={inst.id} 
                    className="grid grid-cols-[1fr] md:grid-cols-[140px_1fr] gap-3 md:gap-4 items-center bg-muted/10 md:bg-transparent p-2 md:p-0 rounded-lg border border-border/20 md:border-transparent"
                  >
                    
                    {/* Left side controller info for track */}
                    <div className="flex items-center justify-between md:justify-start gap-2 pr-2">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-gradient-to-r" />
                        <span className="text-xs font-display font-bold tracking-tight text-foreground line-clamp-1">
                          {inst.name}
                        </span>
                      </div>
                      
                      {/* Solo/Mute triggers */}
                      <button
                        onClick={() => setMutedTracks(prev => ({ ...prev, [inst.id]: !prev[inst.id] }))}
                        className={`text-[10px] font-mono px-2 py-0.5 rounded uppercase font-bold transition-all border ${
                          isMuted 
                            ? "bg-destructive/15 text-destructive border-destructive/20 hover:bg-destructive/20" 
                            : "bg-muted/40 hover:bg-muted text-muted-foreground border-border/40"
                        }`}
                        title={isMuted ? "Unmute track" : "Mute track"}
                      >
                        {isMuted ? "Muted" : "Mute"}
                      </button>
                    </div>

                    {/* 16 Checkable Steps blocks */}
                    <div className="grid gap-1.5 md:gap-1 w-full" style={{ gridTemplateColumns: "repeat(16, minmax(0, 1fr))" }}>
                      {Array(16).fill(0).map((_, index) => {
                        const isStepActive = grid[inst.id]?.[index] === 1;
                        const isPlayingStep = currentStep === index && isPlaying;
                        const isBeatStart = index % 4 === 0;

                        return (
                          <button
                            key={index}
                            onClick={() => toggleStep(inst.id, index)}
                            className={`h-10 md:h-12 rounded transition-all duration-75 relative select-none cursor-pointer flex items-center justify-center border ${
                              isStepActive
                                ? `bg-gradient-to-br ${inst.color} border-transparent text-white shadow-sm ring-1 ring-white/10 scale-[0.98]`
                                : isBeatStart 
                                  ? "bg-muted/60 border-border hover:bg-muted/80 hover:border-primary/30" 
                                  : "bg-background/40 border-border/40 hover:bg-muted/40"
                            } ${
                              isPlayingStep 
                                ? "ring-2 ring-primary ring-offset-2 ring-offset-background scale-105 z-10" 
                                : ""
                            }`}
                          >
                            {/* Inner active dot trigger indicator */}
                            {isStepActive && (
                              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                            )}
                            
                            {/* Visual guide for beat divisions on backgrounds */}
                            {!isStepActive && isBeatStart && (
                              <span className="absolute bottom-1 right-1 w-1 h-1 rounded-full bg-primary/20" />
                            )}
                          </button>
                        );
                      })}
                    </div>

                  </div>
                );
              })}
            </div>

            {/* Mini Sequencer User Tips Info banner */}
            <div className="mt-6 p-4 rounded-lg bg-primary/5 border border-primary/15 flex items-start gap-3">
              <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="block text-xs font-semibold text-primary">Jam Session Guide:</span>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  The step sequencer divides 1 beat loop into 16 steps (16th notes). Active columns light up as the timeline rolls. 
                  Toggle blocks to program a snare roll or bass kick pattern. Use your hardware keyboard keys <kbd className="px-1 bg-muted rounded border text-[9px] font-sans">A</kbd> through <kbd className="px-1 bg-muted rounded border text-[9px] font-sans">K</kbd> to record or drum live on top of the loop!
                </p>
              </div>
            </div>

          </Card>

        </div>
      </main>

      <Footer />
    </div>
  );
}
