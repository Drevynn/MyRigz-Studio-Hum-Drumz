import { useState, useEffect, useCallback } from "react";
import { Mic, MicOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface VoiceInputProps {
  onTranscript: (text: string) => void;
  disabled?: boolean;
}

export function VoiceInput({ onTranscript, disabled }: VoiceInputProps) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [interimTranscript, setInterimTranscript] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        setIsSupported(false);
      }
    }
  }, []);

  const startListening = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onstart = () => {
      setIsListening(true);
      setInterimTranscript("");
    };

    recognition.onresult = (event: any) => {
      let interim = "";
      let final = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += transcript;
        } else {
          interim += transcript;
        }
      }

      if (final) {
        onTranscript(final);
        setInterimTranscript("");
      } else {
        setInterimTranscript(interim);
      }
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      setIsListening(false);
      setInterimTranscript("");
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  }, [onTranscript]);

  if (!isSupported) {
    return (
      <div className="text-center text-sm text-muted-foreground">
        Voice input is not supported in this browser. Please use Chrome or Edge.
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <Button
        type="button"
        size="lg"
        variant={isListening ? "default" : "outline"}
        onClick={startListening}
        disabled={disabled || isListening}
        className={cn(
          "h-24 w-24 rounded-full transition-all",
          isListening && "animate-pulse ring-4 ring-primary/30"
        )}
        data-testid="button-voice-input"
      >
        {isListening ? (
          <Loader2 className="h-10 w-10 animate-spin" />
        ) : (
          <Mic className="h-10 w-10" />
        )}
      </Button>
      
      <div className="text-center">
        {isListening ? (
          <p className="text-sm text-primary font-medium animate-pulse">
            Listening...
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Tap to speak your drum request
          </p>
        )}
      </div>

      {interimTranscript && (
        <p className="text-sm text-muted-foreground italic max-w-md text-center">
          "{interimTranscript}"
        </p>
      )}
    </div>
  );
}
