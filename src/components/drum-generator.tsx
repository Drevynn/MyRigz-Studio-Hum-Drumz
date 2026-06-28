import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Loader2, Sparkles, Volume2, AlertCircle, Play, Pause, Disc } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { type DrumGeneration } from "@shared/schema";
import { AudioPlayer } from "./audio-player";
import { VoiceInput } from "./voice-input";
import { DRUM_KITS } from "@/data/drum-kits";

interface DrumGeneratorProps {
  onGenerationComplete?: (generation: DrumGeneration) => void;
  canGenerate?: boolean;
  generationsRemaining?: number;
}

export function DrumGenerator({ onGenerationComplete, canGenerate = true, generationsRemaining }: DrumGeneratorProps) {
  const { toast } = useToast();
  const [prompt, setPrompt] = useState<string>("");
  const [bpm, setBpm] = useState<number>(120);
  const [useBpm, setUseBpm] = useState<boolean>(false);
  const [currentGeneration, setCurrentGeneration] = useState<DrumGeneration | null>(null);
  
  // Custom Drum Kit Library states
  const [selectedKitId, setSelectedKitId] = useState<string>("classic-808");
  const [previewingKitId, setPreviewingKitId] = useState<string | null>(null);
  const [playingPreview, setPlayingPreview] = useState<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      if (playingPreview) {
        playingPreview.pause();
      }
    };
  }, [playingPreview]);

  const togglePreview = (kitId: string, audioUrl: string) => {
    if (previewingKitId === kitId) {
      playingPreview?.pause();
      setPreviewingKitId(null);
      setPlayingPreview(null);
    } else {
      if (playingPreview) {
        playingPreview.pause();
      }
      const audio = new Audio(audioUrl);
      audio.loop = true;
      audio.play().catch(e => console.log("Audio preview failed:", e));
      setPreviewingKitId(kitId);
      setPlayingPreview(audio);
      
      toast({
        title: `Playing preview`,
        description: `Listening to ${DRUM_KITS.find(k => k.id === kitId)?.name} demo.`,
      });
    }
  };

  const generateMutation = useMutation({
    mutationFn: async (data: { prompt: string; bpm?: number }) => {
      const response = await apiRequest("POST", "/api/generate", data);
      return await response.json() as DrumGeneration;
    },
    onSuccess: (data) => {
      setCurrentGeneration(data);
      queryClient.invalidateQueries({ queryKey: ["/api/history"] });
      onGenerationComplete?.(data);
      toast({
        title: "Beat generated!",
        description: "Your custom drums are ready to play.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Generation failed",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleVoiceTranscript = (text: string) => {
    setPrompt(text);
    handleGenerate(text);
  };

  const handleGenerate = (promptText?: string) => {
    const textToUse = promptText || prompt;
    if (!textToUse.trim()) {
      toast({
        title: "Describe your drums",
        description: "Tell us what kind of drum beat you want, or use voice input.",
        variant: "destructive",
      });
      return;
    }

    const selectedKit = DRUM_KITS.find(k => k.id === selectedKitId);
    let finalPrompt = textToUse;
    if (selectedKit) {
      finalPrompt += `, featuring the ${selectedKit.name} kit sound profile (${selectedKit.style})`;
    }

    // Stop any playing kit previews
    if (playingPreview) {
      playingPreview.pause();
      setPreviewingKitId(null);
      setPlayingPreview(null);
    }

    generateMutation.mutate({
      prompt: finalPrompt,
      bpm: useBpm ? bpm : undefined,
    });
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="space-y-6">
          <div className="text-center">
            <h2 className="font-display text-xl font-semibold mb-2">
              What drums do you need?
            </h2>
            <p className="text-sm text-muted-foreground">
              Speak or type your request - be as specific as you like
            </p>
          </div>

          <VoiceInput 
            onTranscript={handleVoiceTranscript}
            disabled={generateMutation.isPending}
          />

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">
                or type your request
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Textarea
              placeholder="e.g., Funky hip hop beat with heavy snare and ghost notes, or a fast punk rock pattern with crash fills..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="min-h-[100px] resize-none pb-8"
              data-testid="input-prompt"
            />
          </div>

          {/* Drum Kit Library Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold flex items-center gap-2">
                <Disc className="h-4 w-4 text-primary animate-pulse" />
                Selected Sound Profile (Drum Kit Library)
              </Label>
              <span className="text-xs text-muted-foreground">
                Select a style to customize your generation
              </span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[280px] overflow-y-auto pr-1">
              {DRUM_KITS.map((kit) => {
                const isSelected = selectedKitId === kit.id;
                const isPreviewing = previewingKitId === kit.id;
                return (
                  <div
                    key={kit.id}
                    onClick={() => setSelectedKitId(kit.id)}
                    className={`relative p-3 rounded-lg border text-left cursor-pointer transition-all duration-200 select-none flex flex-col justify-between ${
                      isSelected 
                        ? "border-primary bg-primary/5 ring-1 ring-primary/25" 
                        : "border-border hover:border-border-muted bg-card hover:bg-muted/30"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-display font-bold text-sm tracking-tight capitalize">
                          {kit.name}
                        </span>
                        <Badge variant={isSelected ? "default" : "secondary"} className="text-[10px] px-1.5 py-0">
                          {kit.style}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 md:line-clamp-3 mb-2 leading-relaxed">
                        {kit.description}
                      </p>
                    </div>

                    <div className="flex items-center justify-between mt-auto pt-2 border-t border-border/40">
                      <div className="flex flex-wrap gap-1 max-w-[70%]">
                        {kit.instruments.slice(0, 3).map((inst, index) => (
                          <span key={index} className="text-[9px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                            {inst}
                          </span>
                        ))}
                      </div>

                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 rounded-full bg-accent/20 hover:bg-accent/40"
                        onClick={(e) => {
                          e.stopPropagation();
                          togglePreview(kit.id, kit.audioUrl);
                        }}
                      >
                        {isPreviewing ? (
                          <Pause className="h-3.5 w-3.5 text-primary animate-pulse" />
                        ) : (
                          <Play className="h-3.5 w-3.5 text-foreground" />
                        )}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 p-4 rounded-lg bg-muted/50">
            <div className="flex items-center gap-3">
              <Switch
                id="use-bpm"
                checked={useBpm}
                onCheckedChange={setUseBpm}
                data-testid="switch-bpm"
              />
              <Label htmlFor="use-bpm" className="text-sm">
                Specify tempo
              </Label>
            </div>
            
            {useBpm && (
              <div className="flex items-center gap-4 flex-1 max-w-xs">
                <Slider
                  value={[bpm]}
                  onValueChange={(v) => setBpm(v[0])}
                  min={60}
                  max={220}
                  step={1}
                  className="flex-1"
                  data-testid="slider-bpm"
                />
                <span className="font-mono text-sm font-medium w-16 text-right">
                  {bpm} BPM
                </span>
              </div>
            )}
          </div>

          {!canGenerate && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Generation Limit Reached</AlertTitle>
              <AlertDescription className="flex items-center justify-between gap-4">
                <span>You've used all your generations this month.</span>
                <Link href="/pricing">
                  <Button size="sm" variant="outline" data-testid="button-upgrade-alert">
                    Upgrade Now
                  </Button>
                </Link>
              </AlertDescription>
            </Alert>
          )}

          <Button
            onClick={() => handleGenerate()}
            disabled={generateMutation.isPending || !prompt.trim() || !canGenerate}
            className="w-full"
            size="lg"
            data-testid="button-generate"
          >
            {generateMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Creating your beat...
              </>
            ) : !canGenerate ? (
              <>
                <AlertCircle className="mr-2 h-5 w-5" />
                Limit Reached - Upgrade to Continue
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-5 w-5" />
                Generate Drums
              </>
            )}
          </Button>
        </div>
      </Card>

      {currentGeneration && currentGeneration.audioUrl && currentGeneration.status === "completed" && (
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Volume2 className="h-5 w-5 text-primary" />
            <h3 className="font-display font-semibold">Your Beat</h3>
          </div>
          <AudioPlayer
            audioUrl={currentGeneration.audioUrl}
            title={currentGeneration.prompt.slice(0, 50) + (currentGeneration.prompt.length > 50 ? "..." : "")}
          />
        </Card>
      )}
    </div>
  );
}
