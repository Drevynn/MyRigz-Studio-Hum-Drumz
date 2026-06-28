import { useState, useRef, useEffect } from "react";
import { Play, Pause, Download, RotateCcw, Volume2, VolumeX, Repeat, Gauge } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface AudioPlayerProps {
  audioUrl: string;
  title?: string;
  onRegenerate?: () => void;
  isRegenerating?: boolean;
}

const SPEED_OPTIONS = [
  { value: 0.5, label: "0.5x" },
  { value: 0.75, label: "0.75x" },
  { value: 1, label: "1x" },
  { value: 1.25, label: "1.25x" },
  { value: 1.5, label: "1.5x" },
  { value: 2, label: "2x" },
];

export function AudioPlayer({
  audioUrl,
  title,
  onRegenerate,
  isRegenerating,
}: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [isLooping, setIsLooping] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      if (!isLooping) {
        setIsPlaying(false);
        setCurrentTime(0);
      }
    };

    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("ended", handleEnded);
    };
  }, [audioUrl, isLooping]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.loop = isLooping;
    }
  }, [isLooping]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const drawWaveform = () => {
      const width = canvas.width;
      const height = canvas.height;
      const barWidth = 3;
      const gap = 2;
      const barCount = Math.floor(width / (barWidth + gap));
      
      ctx.clearRect(0, 0, width, height);
      
      const progress = duration > 0 ? currentTime / duration : 0;
      
      for (let i = 0; i < barCount; i++) {
        const x = i * (barWidth + gap);
        const seed = Math.sin(i * 0.5) * 0.5 + Math.sin(i * 0.3) * 0.3 + Math.sin(i * 0.1) * 0.2;
        const barHeight = Math.abs(seed) * (height * 0.7) + height * 0.1;
        const y = (height - barHeight) / 2;
        
        const isPlayed = i / barCount <= progress;
        
        ctx.fillStyle = isPlayed 
          ? "hsl(262, 83%, 58%)" 
          : "hsl(0, 0%, 30%)";
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, 1);
        ctx.fill();
      }

      if (isPlaying) {
        animationRef.current = requestAnimationFrame(drawWaveform);
      }
    };

    drawWaveform();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [currentTime, duration, isPlaying]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (value: number[]) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    
    const time = (value[0] / 100) * duration;
    audio.currentTime = time;
    setCurrentTime(time);
  };

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = audioUrl;
    const filename = title 
      ? `drumz-${title.slice(0, 30).replace(/\s+/g, "-").toLowerCase()}.mp3`
      : "drumz-beat.mp3";
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
  };

  return (
    <Card className="p-6">
      <audio ref={audioRef} src={audioUrl} preload="metadata" />
      
      {title && (
        <div className="flex items-center justify-between mb-3 gap-2">
          <p className="text-sm text-muted-foreground truncate flex-1">{title}</p>
          <div className="flex items-center gap-2 shrink-0">
            {isLooping && (
              <Badge variant="secondary" className="text-xs">
                Loop
              </Badge>
            )}
            {playbackSpeed !== 1 && (
              <Badge variant="secondary" className="text-xs">
                {playbackSpeed}x
              </Badge>
            )}
          </div>
        </div>
      )}
      
      <div className="mb-4">
        <canvas
          ref={canvasRef}
          width={600}
          height={60}
          className="w-full h-[60px] rounded-md"
        />
      </div>

      <Slider
        value={[duration > 0 ? (currentTime / duration) * 100 : 0]}
        onValueChange={handleSeek}
        max={100}
        step={0.1}
        className="mb-4"
        data-testid="slider-audio-progress"
      />

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Button
            size="icon"
            variant="default"
            onClick={togglePlay}
            data-testid="button-play-pause"
          >
            {isPlaying ? (
              <Pause className="h-5 w-5" />
            ) : (
              <Play className="h-5 w-5 ml-0.5" />
            )}
          </Button>
          
          <span className="font-mono text-sm text-muted-foreground min-w-[80px]">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant={isLooping ? "secondary" : "ghost"}
            onClick={() => setIsLooping(!isLooping)}
            className={isLooping ? "text-primary" : ""}
            data-testid="button-loop"
            title="Toggle loop"
          >
            <Repeat className="h-4 w-4" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="icon"
                variant={playbackSpeed !== 1 ? "secondary" : "ghost"}
                className={playbackSpeed !== 1 ? "text-primary" : ""}
                data-testid="button-speed"
                title="Playback speed"
              >
                <Gauge className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center">
              {SPEED_OPTIONS.map((option) => (
                <DropdownMenuItem
                  key={option.value}
                  onClick={() => handleSpeedChange(option.value)}
                  className={playbackSpeed === option.value ? "bg-accent" : ""}
                >
                  {option.label}
                  {option.value === 1 && " (Normal)"}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            size="icon"
            variant="ghost"
            onClick={() => setIsMuted(!isMuted)}
            data-testid="button-mute"
          >
            {isMuted ? (
              <VolumeX className="h-4 w-4" />
            ) : (
              <Volume2 className="h-4 w-4" />
            )}
          </Button>
          
          <Slider
            value={[isMuted ? 0 : volume * 100]}
            onValueChange={(v) => setVolume(v[0] / 100)}
            max={100}
            step={1}
            className="w-20"
            data-testid="slider-volume"
          />
        </div>

        <div className="flex items-center gap-2">
          {onRegenerate && (
            <Button
              size="icon"
              variant="outline"
              onClick={onRegenerate}
              disabled={isRegenerating}
              data-testid="button-regenerate"
            >
              <RotateCcw className={`h-4 w-4 ${isRegenerating ? "animate-spin" : ""}`} />
            </Button>
          )}
          
          <Button
            variant="outline"
            onClick={handleDownload}
            data-testid="button-download"
          >
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
        </div>
      </div>
    </Card>
  );
}
