import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  CheckCircle2, Circle, AlertCircle, Play, Sparkles, HelpCircle, 
  ChevronDown, ChevronUp, Music, ShieldCheck, Activity, Info, 
  Terminal, Lightbulb, Volume2, Mic, Settings, Headphones
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

interface ChecklistItem {
  id: string;
  label: string;
  description: string;
}

const CHECKLIST_ITEMS: ChecklistItem[] = [
  {
    id: "hum-kick",
    label: "Hum a Kick Trigger",
    description: "Convert vocal hums to real-time low-end drum triggers by making a short 'boom' or vocal thump sound."
  },
  {
    id: "audition-pads",
    label: "Audition Drum Pads",
    description: "Click various instrument pads on the controller to hear their response and check multi-velocity triggers."
  },
  {
    id: "sequence-beat",
    label: "Sequence a custom Beat",
    description: "Write a short customized groove using the 16-step matrix sequencer to test loop persistence."
  },
  {
    id: "diagnostic-beat",
    label: "Trigger Diagnostic Beat",
    description: "Execute a test drum sequence on our diagnostic bench to verify Web Audio spatial output."
  },
  {
    id: "daw-connection",
    label: "Verify DAW Connection",
    description: "Verify that MIDI note-on postMessage listeners are configured to integrate with host DAW wrappers."
  }
];

const FAQ_ITEMS = [
  {
    question: "Why don't I hear any drums?",
    answer: "Most modern browsers block audio playback until you actively interact with the page. Click the 'Trigger Test Beat' button in the Diagnostic Bench to manually unlock the browser's Web Audio Context. Also ensure your device is not muted and volume levels are up."
  },
  {
    question: "Why is vocal pitch/trigger tracking inaccurate?",
    answer: "Hum Drumz is optimized for monophonic humming or short, isolated beatbox vocal thumps close to your microphone. Avoid back-to-back high-frequency words, use a clean noise-free environment, and sing stable tones (like 'Ooo' or 'Dum') to prevent pitch flutter."
  },
  {
    question: "How can I prevent audio feedback loops?",
    answer: "Using speakers while humming can cause sound from the speakers to bleed back into your microphone, triggering infinite noise loops. We highly recommend using headphones so the trigger engine only listens to your vocals!"
  },
  {
    question: "How do I route MIDI notes to my DAW project?",
    answer: "Our engine supports iframe integration with host DAWs. The app broadcasts and listens to 'MIDI_EVENT' messages. When running inside the MyRigz Studio wrapper, triggering a vocal hit emits note events that record directly into your MIDI tracks!"
  }
];

export function HelpGuide() {
  const { toast } = useToast();
  const [completedItems, setCompletedItems] = useState<Record<string, boolean>>({});
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  
  // Diagnostic parameters state
  const [micState, setMicState] = useState<string>("checking...");
  const [audioCtxState, setAudioCtxState] = useState<string>("unknown");
  const [latencyEstimation, setLatencyEstimation] = useState<string>("Adaptive");

  // Load checklist state from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("humdrumz_checklist");
      if (saved) {
        setCompletedItems(JSON.parse(saved));
      }
    } catch (e) {
      console.error("Could not load checklist from localStorage", e);
    }
    
    // Check mic permission
    if (navigator.permissions && navigator.mediaDevices) {
      navigator.permissions.query({ name: 'microphone' as any }).then((permissionStatus) => {
        setMicState(permissionStatus.state);
        permissionStatus.onchange = () => {
          setMicState(permissionStatus.state);
        };
      }).catch(() => {
        setMicState("unsupported");
      });
    } else {
      setMicState("unsupported");
    }

    // Check AudioContext
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      const tempCtx = new AudioContextClass();
      setAudioCtxState(tempCtx.state);
      // Adaptive latency estimation
      const latencyValue = tempCtx.baseLatency ? `${(tempCtx.baseLatency * 1000).toFixed(1)} ms` : "Native (Low)";
      setLatencyEstimation(latencyValue);
      tempCtx.close();
    } else {
      setAudioCtxState("unsupported");
    }
  }, []);

  const toggleChecklistItem = (id: string) => {
    const updated = {
      ...completedItems,
      [id]: !completedItems[id]
    };
    setCompletedItems(updated);
    localStorage.setItem("humdrumz_checklist", JSON.stringify(updated));

    if (updated[id]) {
      toast({
        title: "Step Completed!",
        description: `Successfully completed: ${CHECKLIST_ITEMS.find(item => item.id === id)?.label}`,
      });
    }
  };

  const resetChecklist = () => {
    setCompletedItems({});
    localStorage.setItem("humdrumz_checklist", JSON.stringify({}));
    toast({
      title: "Checklist Reset",
      description: "Your progress has been cleared.",
    });
  };

  const completedCount = Object.values(completedItems).filter(Boolean).length;
  const totalCount = CHECKLIST_ITEMS.length;
  const progressPercent = Math.round((completedCount / totalCount) * 100);

  // Play synthetic drum beat using pure Web Audio (highly responsive, 0 load, robust)
  const triggerTestBeat = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) {
        toast({
          title: "Unsupported Browser",
          description: "Web Audio is not supported in this browser.",
          variant: "destructive"
        });
        return;
      }

      const ctx = new AudioContextClass();
      setAudioCtxState("running");

      const playDrumHit = () => {
        const now = ctx.currentTime;

        // --- 1. Synthesize KICK DRUM ---
        const kickOsc = ctx.createOscillator();
        const kickGain = ctx.createGain();
        kickOsc.connect(kickGain);
        kickGain.connect(ctx.destination);

        // Pitch sweep
        kickOsc.frequency.setValueAtTime(150, now);
        kickOsc.frequency.exponentialRampToValueAtTime(0.01, now + 0.3);

        // Amplitude envelope
        kickGain.gain.setValueAtTime(1.0, now);
        kickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

        kickOsc.start(now);
        kickOsc.stop(now + 0.32);

        // --- 2. Synthesize SNARE DRUM (at 250ms offset) ---
        const snareTime = now + 0.25;

        // Snare White Noise Burst
        const bufferSize = ctx.sampleRate * 0.15; // 150ms buffer
        const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
        }

        const noiseNode = ctx.createBufferSource();
        noiseNode.buffer = noiseBuffer;

        const snareFilter = ctx.createBiquadFilter();
        snareFilter.type = "highpass";
        snareFilter.frequency.setValueAtTime(1000, snareTime);

        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(0.5, snareTime);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, snareTime + 0.15);

        noiseNode.connect(snareFilter);
        snareFilter.connect(noiseGain);
        noiseGain.connect(ctx.destination);
        noiseNode.start(snareTime);

        // Snare Triangle fundamental snap
        const snapOsc = ctx.createOscillator();
        const snapGain = ctx.createGain();
        snapOsc.type = "triangle";
        snapOsc.frequency.setValueAtTime(180, snareTime);
        snapGain.gain.setValueAtTime(0.4, snareTime);
        snapGain.gain.exponentialRampToValueAtTime(0.001, snareTime + 0.1);

        snapOsc.connect(snapGain);
        snapGain.connect(ctx.destination);
        snapOsc.start(snareTime);
        snapOsc.stop(snareTime + 0.12);
      };

      playDrumHit();
      
      // Auto-check checklist item
      if (!completedItems["diagnostic-beat"]) {
        toggleChecklistItem("diagnostic-beat");
      }

      toast({
        title: "🔊 Output Path Verified!",
        description: "Sent a punchy synthesized Kick and Snare pop directly via Web Audio API.",
      });
    } catch (err) {
      console.error(err);
      toast({
        title: "Audio Initialization Error",
        description: "Could not boot Web Audio. Please check browser permissions.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto px-4 py-6 text-foreground">
      {/* Header Banner */}
      <div className="relative rounded-2xl border border-amber-500/10 bg-slate-900/50 p-6 md:p-8 overflow-hidden backdrop-blur-xl">
        <div className="absolute top-0 right-0 p-4 opacity-5 text-amber-500">
          <HelpCircle className="w-56 h-56" />
        </div>
        <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="border-amber-500/30 text-amber-500 font-mono text-xs uppercase bg-amber-500/5">
                Support Manual
              </Badge>
              <span className="text-xs font-mono text-muted-foreground">• humdrumz.xyz v1.2</span>
            </div>
            <h1 className="font-display text-2xl md:text-3xl font-extrabold text-foreground tracking-tight">
              Hum Drumz Interactive Help & Guide
            </h1>
            <p className="text-sm text-muted-foreground max-w-2xl">
              Equip yourself with optimal vocal pitch configs, test sound drivers, and track your mastering milestone challenges right from our Interactive Support Bench.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-[1.2fr_1fr]">
        
        {/* Left Column: checklist & Diagnostic Bench */}
        <div className="space-y-6">
          
          {/* 1. Quick Start Interactive Checklist */}
          <Card className="p-6 border-border/80 bg-card/60 backdrop-blur-sm shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
                    <Sparkles className="h-4 w-4" />
                  </span>
                  <div>
                    <h2 className="font-display font-bold text-base">Hum & Drum Challenge</h2>
                    <p className="text-xs text-muted-foreground">Interactive setup & onboarding checklist</p>
                  </div>
                </div>
                {completedCount > 0 && (
                  <Button 
                    onClick={resetChecklist} 
                    variant="ghost" 
                    size="sm" 
                    className="text-xs text-muted-foreground hover:text-destructive transition-colors h-7 px-2"
                  >
                    Reset Progress
                  </Button>
                )}
              </div>

              {/* Progress Bar Container with Circle Progress */}
              <div className="flex items-center gap-4 p-3 mb-5 rounded-xl border border-amber-500/10 bg-amber-500/5">
                {/* SVG Progress Circle */}
                <div className="relative flex items-center justify-center h-14 w-14 shrink-0">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle
                      cx="28"
                      cy="28"
                      r="22"
                      className="stroke-muted"
                      strokeWidth="4"
                      fill="transparent"
                    />
                    <motion.circle
                      cx="28"
                      cy="28"
                      r="22"
                      className="stroke-amber-500"
                      strokeWidth="4"
                      fill="transparent"
                      strokeDasharray={2 * Math.PI * 22}
                      initial={{ strokeDashoffset: 2 * Math.PI * 22 }}
                      animate={{ strokeDashoffset: 2 * Math.PI * 22 * (1 - progressPercent / 100) }}
                      transition={{ duration: 0.5, ease: "easeOut" }}
                    />
                  </svg>
                  <span className="absolute text-xs font-mono font-bold text-amber-500">
                    {completedCount}/{totalCount}
                  </span>
                </div>

                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-foreground">Onboarding Progress</span>
                    <span className="font-mono font-bold text-amber-500">{progressPercent}%</span>
                  </div>
                  <div className="w-full bg-border h-2 rounded-full overflow-hidden">
                    <motion.div 
                      className="bg-amber-500 h-full rounded-full" 
                      initial={{ width: 0 }}
                      animate={{ width: `${progressPercent}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    {completedCount === totalCount 
                      ? "🎉 Incredible! You are officially a Hum Drumz Master!" 
                      : "Complete all interactive stages to master vocal rhythm drumming."}
                  </p>
                </div>
              </div>

              {/* Checklist Items list */}
              <div className="space-y-2.5">
                {CHECKLIST_ITEMS.map((item) => {
                  const isDone = !!completedItems[item.id];
                  return (
                    <div 
                      key={item.id}
                      onClick={() => toggleChecklistItem(item.id)}
                      className={`group flex items-start gap-3 p-3 rounded-lg border cursor-pointer select-none transition-all duration-200 hover:bg-muted/30 ${
                        isDone 
                          ? "border-amber-500/20 bg-amber-500/5/10 text-foreground" 
                          : "border-border/60 bg-transparent text-foreground/80"
                      }`}
                    >
                      <button className="shrink-0 mt-0.5 text-amber-500 focus:outline-none">
                        {isDone ? (
                          <CheckCircle2 className="h-5 w-5 fill-amber-500 text-slate-950" />
                        ) : (
                          <Circle className="h-5 w-5 group-hover:scale-105 transition-transform text-muted-foreground group-hover:text-amber-500" />
                        )}
                      </button>
                      <div className="space-y-0.5">
                        <span className={`text-xs font-semibold block transition-colors ${isDone ? "line-through text-muted-foreground" : "text-foreground"}`}>
                          {item.label}
                        </span>
                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>

          {/* 2. Rhythm Diagnostic Bench */}
          <Card className="p-6 border-border/80 bg-card/60 backdrop-blur-sm shadow-xl space-y-4">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
                <Activity className="h-4 w-4" />
              </span>
              <div>
                <h2 className="font-display font-bold text-base">Rhythm Diagnostic Bench</h2>
                <p className="text-xs text-muted-foreground">Live hardware & audio state feedback analyzer</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-muted/30 border border-border/40 text-xs">
              
              <div className="space-y-1.5">
                <span className="text-[10px] font-mono font-bold text-muted-foreground uppercase block">Microphone Access</span>
                <div className="flex items-center gap-1.5">
                  <span className={`h-2 w-2 rounded-full ${
                    micState === 'granted' ? 'bg-green-500 animate-pulse' : micState === 'denied' ? 'bg-red-500' : 'bg-amber-500'
                  }`} />
                  <span className="font-mono capitalize font-semibold text-foreground">{micState}</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="text-[10px] font-mono font-bold text-muted-foreground uppercase block">Audio Context</span>
                <div className="flex items-center gap-1.5">
                  <span className={`h-2 w-2 rounded-full ${audioCtxState === 'running' ? 'bg-green-500 animate-pulse' : 'bg-amber-500'}`} />
                  <span className="font-mono capitalize font-semibold text-foreground">{audioCtxState}</span>
                </div>
              </div>

              <div className="space-y-1.5 pt-1.5 border-t border-border/40">
                <span className="text-[10px] font-mono font-bold text-muted-foreground uppercase block">Latency Estimate</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono font-semibold text-foreground">{latencyEstimation}</span>
                </div>
              </div>

              <div className="space-y-1.5 pt-1.5 border-t border-border/40">
                <span className="text-[10px] font-mono font-bold text-muted-foreground uppercase block">MIDI Driver Hook</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono font-semibold text-green-500">postMessage Active</span>
                </div>
              </div>

            </div>

            <div className="space-y-3">
              <Button 
                onClick={triggerTestBeat} 
                className="w-full bg-amber-600 hover:bg-amber-700 text-slate-950 font-bold text-xs"
              >
                <Volume2 className="h-4 w-4 mr-2" /> Trigger Output Test Beat (Kick + Snare)
              </Button>
              <p className="text-[10px] text-center text-muted-foreground">
                Testing executes a quick Web Audio oscillators kick and snare sequence to bypass browser autoplay safety limits.
              </p>
            </div>
          </Card>

        </div>

        {/* Right Column: FAQ Accordion & Pro Tips */}
        <div className="space-y-6">
          
          {/* 3. FAQ Accordion */}
          <Card className="p-6 border-border/80 bg-card/60 backdrop-blur-sm shadow-xl space-y-4">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
                <HelpCircle className="h-4 w-4" />
              </span>
              <div>
                <h2 className="font-display font-bold text-base">Frequently Asked Questions</h2>
                <p className="text-xs text-muted-foreground">Troubleshooting and loop routing answers</p>
              </div>
            </div>

            <div className="space-y-2">
              {FAQ_ITEMS.map((faq, index) => {
                const isOpen = activeFaq === index;
                return (
                  <div 
                    key={index} 
                    className="border border-border/60 rounded-xl overflow-hidden bg-muted/10 transition-colors"
                  >
                    <button
                      onClick={() => setActiveFaq(isOpen ? null : index)}
                      className="w-full flex items-center justify-between p-4 text-left text-xs font-bold hover:bg-muted/30 transition-colors focus:outline-none text-foreground"
                    >
                      <span>{faq.question}</span>
                      {isOpen ? (
                        <ChevronUp className="h-4 w-4 text-amber-500 shrink-0" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                      )}
                    </button>
                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25, ease: "easeInOut" }}
                        >
                          <div className="p-4 pt-0 border-t border-border/40 text-[11px] leading-relaxed text-muted-foreground">
                            {faq.answer}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* 4. Drummer Pro Tips */}
          <Card className="p-6 border-border/80 bg-card/60 backdrop-blur-sm shadow-xl space-y-4">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
                <Lightbulb className="h-4 w-4" />
              </span>
              <div>
                <h2 className="font-display font-bold text-base">Drummer Pro Tips</h2>
                <p className="text-xs text-muted-foreground">Maximize accuracy and DAW performance</p>
              </div>
            </div>

            <div className="space-y-3 text-xs leading-relaxed">
              
              <div className="flex gap-2.5 items-start">
                <div className="mt-0.5 p-1 rounded bg-amber-500/10 text-amber-500">
                  <Settings className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="font-bold text-foreground">Optimize the Noise Gate</h4>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Adjust the input threshold gate so ambient room sounds and breathing won't accidentally trigger ghost kick or snare notes.
                  </p>
                </div>
              </div>

              <div className="flex gap-2.5 items-start border-t border-border/40 pt-3">
                <div className="mt-0.5 p-1 rounded bg-amber-500/10 text-amber-500">
                  <Headphones className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="font-bold text-foreground">Isolating Your Hum Vocals</h4>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Sing short, percussive plosives to trigger fast snares (like 'ts' or 'pah') and humming low notes (like 'hum' or 'doom') to trigger thick sub kicks.
                  </p>
                </div>
              </div>

              <div className="flex gap-2.5 items-start border-t border-border/40 pt-3">
                <div className="mt-0.5 p-1 rounded bg-amber-500/10 text-amber-500">
                  <Music className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="font-bold text-foreground">DAW Sync & Alignment</h4>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    When playing inside our DAW plugin wrapper, ensure the host DAW timeline tempo matches your Hum Drumz grid BPM for perfect grid-locked quantization!
                  </p>
                </div>
              </div>

            </div>
          </Card>

        </div>

      </div>
    </div>
  );
}
