import { Link } from "wouter";
import { ArrowRight, Mic, Zap, Download, Sparkles, Volume2, Headphones, User } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { AdUnit } from "@/components/adsense-script";

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <HeroSection />
      <ExamplesSection />
      <HowItWorks />
      <SocialProof />
      <FeaturedCreators />
      <FinalCTA />
      
      <Footer />
    </div>
  );
}

interface CreatorProfile {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  bio: string | null;
  profileImageUrl: string | null;
  following: string[];
}

function FeaturedCreators() {
  const { data: creators, isLoading } = useQuery<CreatorProfile[]>({
    queryKey: ["/api/users"],
    queryFn: async () => {
      const res = await fetch("/api/users");
      if (!res.ok) return [];
      return res.json();
    }
  });

  if (isLoading || !creators || creators.length === 0) return null;

  return (
    <section className="py-24 bg-card/30 border-y border-border/50">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <Badge variant="secondary" className="mb-4">
            Hum Drumz Community
          </Badge>
          <h2 className="font-display text-2xl font-bold md:text-3xl tracking-tight">
            Meet the Beatmakers
          </h2>
          <p className="mt-4 text-muted-foreground leading-relaxed">
            Discover talented producers, listen to their voice-generated drum beats, and follow their creative journey.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {creators.slice(0, 6).map((creator) => (
            <Link key={creator.id} href={`/profile/${creator.username || creator.id}`}>
              <Card className="p-6 hover-elevate cursor-pointer group relative flex flex-col justify-between border-0 ring-1 ring-border bg-card">
                <div className="flex items-start gap-4">
                  <div className="h-14 w-14 rounded-full overflow-hidden shrink-0 border-2 border-primary bg-muted">
                    {creator.profileImageUrl ? (
                      <img 
                        src={creator.profileImageUrl} 
                        alt={creator.firstName} 
                        className="h-full w-full object-cover" 
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center bg-primary/10">
                        <User className="h-6 w-6 text-primary" />
                      </div>
                    )}
                  </div>

                  <div className="space-y-1">
                    <h3 className="font-display font-semibold text-base group-hover:text-primary transition-colors">
                      {creator.firstName} {creator.lastName}
                    </h3>
                    <p className="text-xs font-mono text-primary">@{creator.username}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 md:line-clamp-3 pt-1">
                      {creator.bio || "This beatmaker keeps their style raw and silent."}
                    </p>
                  </div>
                </div>

                <div className="mt-6 pt-3 border-t border-border/50 flex justify-between items-center text-[11px] text-muted-foreground font-mono">
                  <span>{(creator.following || []).length} Following</span>
                  <span className="text-primary font-semibold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                    View profile
                    <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function HeroSection() {
  return (
    <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
      
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      <div className="relative z-10 mx-auto max-w-4xl px-4 py-24 text-center">
        <img 
          src="/logo.jpg" 
          alt="Hum Drumz Logo" 
          className="mx-auto h-48 md:h-64 object-contain rounded-2xl border border-amber-500/15 shadow-[0_0_50px_rgba(245,158,11,0.1)] mb-6" 
          referrerPolicy="no-referrer"
        />
        <Badge variant="secondary" className="mb-6">
          Voice-Powered AI Drums
        </Badge>
        
        <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl lg:text-6xl">
          Just Say What You Need
          <span className="block text-primary">We'll Create the Beat</span>
        </h1>
        
        <p className="mx-auto mt-6 max-w-2xl text-base text-muted-foreground md:text-lg">
          Describe your perfect drum track in natural language. 
          "Give me a funky hip hop beat with ghost notes" - and it's yours in seconds.
        </p>
        
        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link href="/generate">
            <Button size="lg" className="text-base px-8" data-testid="button-hero-generate">
              <Mic className="mr-2 h-5 w-5" />
              Start Speaking
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>

        <div className="mt-16 grid grid-cols-3 gap-8 text-center">
          {[
            { icon: Mic, label: "Voice Input", desc: "Speak your request naturally" },
            { icon: Zap, label: "Instant", desc: "Get drums in seconds" },
            { icon: Download, label: "Download", desc: "MP3/WAV ready for your DAW" },
          ].map((item) => (
            <div key={item.label} className="flex flex-col items-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <item.icon className="h-6 w-6" />
              </div>
              <p className="mt-3 font-display font-semibold">{item.label}</p>
              <p className="text-sm text-muted-foreground">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ExamplesSection() {
  const examples = [
    "Funky hip hop beat with heavy snare and ghost notes",
    "Fast punk rock drums with crash fills",
    "Smooth jazz brushes, laid back feel",
    "Hard hitting trap beat with rolling hi-hats",
    "Classic rock groove, steady 4/4 with tom fills",
    "Reggae one-drop pattern, relaxed vibe",
  ];

  return (
    <section id="examples" className="py-24 bg-card/50">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <div className="text-center">
          <h2 className="font-display text-2xl font-bold md:text-3xl">
            Just Say It
          </h2>
          <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">
            Describe any drum sound you can imagine. Our AI understands natural language.
          </p>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {examples.map((example, i) => (
            <Link key={i} href="/generate">
              <Card className="p-5 hover-elevate cursor-pointer group">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors">
                    <Mic className="h-5 w-5" />
                  </div>
                  <p className="text-sm leading-relaxed">"{example}"</p>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    {
      number: "01",
      icon: Mic,
      title: "Speak or Type",
      description:
        "Describe the drums you need in plain English. Be as specific or general as you like - 'upbeat funk groove' or 'aggressive metal double bass at 200 BPM'.",
    },
    {
      number: "02",
      icon: Sparkles,
      title: "AI Creates Your Beat",
      description:
        "Our AI interprets your request and generates a custom drum track that matches your description. Takes just seconds.",
    },
    {
      number: "03",
      icon: Download,
      title: "Preview & Download",
      description:
        "Listen to your creation, tweak if needed, and download in MP3 or WAV format. Ready for your DAW instantly.",
    },
  ];

  return (
    <section className="py-24">
      <div className="mx-auto max-w-3xl px-4 md:px-6">
        <div className="text-center">
          <h2 className="font-display text-2xl font-bold md:text-3xl">
            How It Works
          </h2>
          <p className="mt-4 text-muted-foreground">
            From voice to drums in three simple steps
          </p>
        </div>

        <div className="mt-16 space-y-12">
          {steps.map((step) => (
            <div key={step.number} className="flex gap-6">
              <div className="flex-shrink-0">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary text-primary-foreground font-display text-xl font-bold">
                  {step.number}
                </div>
              </div>
              <div className="pt-2">
                <div className="flex items-center gap-2">
                  <step.icon className="h-5 w-5 text-primary" />
                  <h3 className="font-display text-lg font-semibold">
                    {step.title}
                  </h3>
                </div>
                <p className="mt-2 text-muted-foreground">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function SocialProof() {
  const stats = [
    { value: "10,000+", label: "Tracks Generated" },
    { value: "Unlimited", label: "Voice Requests" },
    { value: "100%", label: "Royalty-Free" },
  ];

  return (
    <section className="py-16 bg-card/50">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <div className="flex flex-wrap items-center justify-center gap-12 md:gap-24">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="font-display text-3xl font-bold text-primary">
                {stat.value}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCTA() {
  return (
    <section className="py-24">
      <div className="mx-auto max-w-3xl px-4 text-center md:px-6">
        <h2 className="font-display text-2xl font-bold md:text-3xl">
          Ready to Create Your Beat?
        </h2>
        <p className="mt-4 text-muted-foreground">
          Join thousands of musicians using Hum Drumz to power their music.
          Just speak and create.
        </p>
        <Link href="/generate">
          <Button size="lg" className="mt-8 text-base px-8" data-testid="button-final-cta">
            <Mic className="mr-2 h-5 w-5" />
            Start Creating Now
          </Button>
        </Link>
        
        <div className="mt-16 py-8 border-t">
          <AdUnit slotId="1234567890" format="auto" />
        </div>
      </div>
    </section>
  );
}
