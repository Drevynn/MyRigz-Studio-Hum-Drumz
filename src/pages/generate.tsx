import { useState } from "react";
import { ArrowLeft, Mic, Crown, Sparkles } from "lucide-react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { DrumGenerator } from "@/components/drum-generator";
import { GenerationHistory } from "@/components/generation-history";
import { AudioPlayer } from "@/components/audio-player";
import { AdUnit } from "@/components/adsense-script";
import { useAuth } from "@/hooks/use-auth";
import type { DrumGeneration } from "@shared/schema";

interface SubscriptionResponse {
  subscription: {
    tier: string;
    generationsThisMonth: number;
  };
  limits: {
    generationsPerMonth: number;
    adFree: boolean;
  };
  usage: {
    generationsUsed: number;
    generationsRemaining: number;
  };
}

export default function GeneratePage() {
  const [selectedGeneration, setSelectedGeneration] = useState<DrumGeneration | null>(null);
  const { user, isLoading: authLoading } = useAuth();
  
  const { data: subscriptionData } = useQuery<SubscriptionResponse>({
    queryKey: ["/api/subscription"],
    enabled: !!user,
  });

  const handlePlayGeneration = (generation: DrumGeneration) => {
    setSelectedGeneration(generation);
  };

  const tier = subscriptionData?.subscription?.tier || "free";
  const isAdFree = subscriptionData?.limits?.adFree ?? false;
  const remaining = subscriptionData?.usage?.generationsRemaining;
  const isUnlimited = remaining === -1;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      <main className="flex-1 py-8 md:py-12">
        <div className="mx-auto max-w-6xl px-4 md:px-6">
          <div className="mb-8">
            <Link href="/">
              <Button variant="ghost" size="sm" className="mb-4" data-testid="button-back-home">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Home
              </Button>
            </Link>
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <Mic className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h1 className="font-display text-3xl font-bold md:text-4xl">
                    Voice-Powered Drums
                  </h1>
                  <p className="text-muted-foreground">
                    Just say what you need - we'll create it
                  </p>
                </div>
              </div>
              
              {user && subscriptionData && (
                <Card className="p-3 flex items-center gap-3 bg-card/50">
                  <div className="flex items-center gap-2">
                    {tier === "premium" ? (
                      <Crown className="h-4 w-4 text-primary" />
                    ) : tier === "pro" ? (
                      <Sparkles className="h-4 w-4 text-primary" />
                    ) : null}
                    <Badge variant="secondary" className="capitalize">
                      {tier}
                    </Badge>
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">
                      {isUnlimited ? "Unlimited" : remaining}
                    </span>
                    <span className="text-muted-foreground">
                      {isUnlimited ? " generations" : " left this month"}
                    </span>
                  </div>
                  {tier === "free" && (
                    <Link href="/pricing">
                      <Button size="sm" variant="outline" data-testid="button-upgrade">
                        Upgrade
                      </Button>
                    </Link>
                  )}
                </Card>
              )}
            </div>
          </div>

          <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
            <div className="space-y-6">
              <DrumGenerator 
                onGenerationComplete={handlePlayGeneration} 
                canGenerate={remaining === undefined || remaining === -1 || remaining > 0}
                generationsRemaining={remaining}
              />
              
              {selectedGeneration && selectedGeneration.audioUrl && (
                <div>
                  <h2 className="font-display text-lg font-semibold mb-4">
                    Now Playing
                  </h2>
                  <AudioPlayer
                    audioUrl={selectedGeneration.audioUrl}
                    title={selectedGeneration.prompt}
                  />
                </div>
              )}
            </div>

            <div className="lg:sticky lg:top-24 lg:self-start space-y-6">
              <GenerationHistory onPlayGeneration={handlePlayGeneration} />
              {!isAdFree && (
                <div className="hidden lg:block">
                  <AdUnit slotId="0987654321" format="vertical" />
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
