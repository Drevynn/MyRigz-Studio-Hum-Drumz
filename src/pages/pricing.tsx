import { Link } from "wouter";
import { Check, X, Sparkles, Zap, Crown, Music, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const tiers = [
  {
    id: "free",
    name: "Free",
    price: 0,
    description: "Perfect for trying out Hum Drumz",
    icon: Music,
    features: [
      { text: "5 generations per month", included: true },
      { text: "MP3 downloads", included: true },
      { text: "7-day history", included: true },
      { text: "Voice input", included: true },
      { text: "Ad-supported", included: true, note: "Shows ads" },
      { text: "WAV downloads", included: false },
      { text: "Priority generation", included: false },
    ],
    cta: "Get Started Free",
    popular: false,
  },
  {
    id: "basic",
    name: "Basic",
    price: 4.99,
    description: "For hobbyist musicians",
    icon: Zap,
    features: [
      { text: "25 generations per month", included: true },
      { text: "MP3 downloads", included: true },
      { text: "30-day history", included: true },
      { text: "Voice input", included: true },
      { text: "Ad-free experience", included: true },
      { text: "WAV downloads", included: false },
      { text: "Priority generation", included: false },
    ],
    cta: "Start Basic",
    popular: false,
  },
  {
    id: "pro",
    name: "Pro",
    price: 9.99,
    description: "For serious producers",
    icon: Sparkles,
    features: [
      { text: "100 generations per month", included: true },
      { text: "MP3 & WAV downloads", included: true },
      { text: "90-day history", included: true },
      { text: "Voice input", included: true },
      { text: "Ad-free experience", included: true },
      { text: "Priority generation", included: true },
      { text: "Email support", included: true },
    ],
    cta: "Go Pro",
    popular: true,
  },
  {
    id: "premium",
    name: "Premium",
    price: 19.99,
    description: "For professional studios",
    icon: Crown,
    features: [
      { text: "Unlimited generations", included: true },
      { text: "MP3 & WAV downloads", included: true },
      { text: "Unlimited history", included: true },
      { text: "Voice input", included: true },
      { text: "Ad-free experience", included: true },
      { text: "Priority generation", included: true },
      { text: "Priority support", included: true },
    ],
    cta: "Go Premium",
    popular: false,
  },
];

interface SubscriptionResponse {
  subscription: {
    tier: string;
    generationsThisMonth: number;
  };
  limits: {
    generationsPerMonth: number;
  };
  usage: {
    generationsUsed: number;
    generationsRemaining: number;
  };
}

export default function PricingPage() {
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  
  // Fetch current subscription
  const { data: subscriptionData } = useQuery<SubscriptionResponse>({
    queryKey: ["/api/subscription"],
    enabled: !!user,
  });
  
  const currentTier = subscriptionData?.subscription?.tier || "free";

  // Check for success/cancel URL params
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get("success") === "true") {
    toast({
      title: "Success!",
      description: "Your subscription has been activated.",
    });
    window.history.replaceState({}, "", "/pricing");
  } else if (urlParams.get("canceled") === "true") {
    toast({
      title: "Canceled",
      description: "Your checkout was canceled.",
      variant: "destructive",
    });
    window.history.replaceState({}, "", "/pricing");
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="py-24">
        <div className="mx-auto max-w-7xl px-4 md:px-6">
          <div className="text-center mb-16">
            <Badge variant="secondary" className="mb-4">
              Pricing
            </Badge>
            <h1 className="font-display text-4xl font-bold md:text-5xl">
              Simple, Transparent Pricing
            </h1>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              Choose the plan that fits your needs. Upgrade or downgrade anytime.
            </p>
            
            {user && subscriptionData && (
              <Card className="mt-8 p-4 inline-flex items-center gap-4 bg-primary/5 border-primary/20">
                <div className="text-left">
                  <p className="text-sm text-muted-foreground">Your current plan</p>
                  <p className="font-display font-bold text-lg capitalize">{currentTier}</p>
                </div>
                {subscriptionData.usage && (
                  <div className="text-left border-l pl-4">
                    <p className="text-sm text-muted-foreground">Generations this month</p>
                    <p className="font-display font-bold text-lg">
                      {subscriptionData.usage.generationsUsed} / {subscriptionData.usage.generationsRemaining === -1 ? "Unlimited" : subscriptionData.limits.generationsPerMonth}
                    </p>
                  </div>
                )}
              </Card>
            )}
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {tiers.map((tier) => (
              <PricingCard 
                key={tier.id} 
                tier={tier} 
                isAuthenticated={!!user}
                isLoading={isLoading}
                currentTier={currentTier}
              />
            ))}
          </div>

          <div className="mt-20 text-center">
            <h2 className="font-display text-2xl font-bold mb-4">
              All Plans Include
            </h2>
            <div className="flex flex-wrap justify-center gap-6 text-muted-foreground">
              {[
                "100% royalty-free",
                "Commercial use allowed",
                "Instant downloads",
                "No credit card for free tier",
              ].map((feature) => (
                <div key={feature} className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  <span>{feature}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-20">
            <Card className="p-8 text-center bg-primary/5 border-primary/20">
              <h2 className="font-display text-2xl font-bold">
                Need Something Custom?
              </h2>
              <p className="mt-2 text-muted-foreground">
                Contact us for enterprise pricing, API access, or custom solutions.
              </p>
              <Button variant="outline" className="mt-6" data-testid="button-contact-sales">
                Contact Sales
              </Button>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

interface PricingCardProps {
  key?: string;
  tier: typeof tiers[0];
  isAuthenticated: boolean;
  isLoading: boolean;
  currentTier: string;
}

function PricingCard({ tier, isAuthenticated, isLoading, currentTier }: PricingCardProps) {
  const Icon = tier.icon;
  const { toast } = useToast();
  const isCurrentPlan = tier.id === currentTier;
  
  const checkoutMutation = useMutation({
    mutationFn: async (tierId: string) => {
      const response = await apiRequest("POST", "/api/checkout", { tier: tierId });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to start checkout. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubscribe = () => {
    if (tier.id === "free") {
      if (isAuthenticated) {
        window.location.href = "/generate";
      } else {
        window.location.href = "/api/login";
      }
    } else {
      if (!isAuthenticated) {
        window.location.href = "/api/login";
      } else {
        checkoutMutation.mutate(tier.id);
      }
    }
  };

  const getButtonText = () => {
    if (checkoutMutation.isPending) {
      return <Loader2 className="h-4 w-4 animate-spin" />;
    }
    if (isCurrentPlan) {
      return "Current Plan";
    }
    return tier.cta;
  };

  return (
    <Card 
      className={`relative p-6 flex flex-col ${tier.popular ? "border-primary ring-2 ring-primary/20" : ""} ${isCurrentPlan ? "bg-primary/5" : ""}`}
      data-testid={`card-pricing-${tier.id}`}
    >
      {tier.popular && !isCurrentPlan && (
        <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
          Most Popular
        </Badge>
      )}
      {isCurrentPlan && (
        <Badge variant="secondary" className="absolute -top-3 left-1/2 -translate-x-1/2">
          Current Plan
        </Badge>
      )}

      <div className="mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${tier.popular ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"}`}>
            <Icon className="h-5 w-5" />
          </div>
          <h3 className="font-display text-xl font-bold">{tier.name}</h3>
        </div>
        
        <div className="flex items-baseline gap-1">
          <span className="font-display text-4xl font-bold">
            ${tier.price}
          </span>
          {tier.price > 0 && (
            <span className="text-muted-foreground">/month</span>
          )}
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          {tier.description}
        </p>
      </div>

      <ul className="space-y-3 flex-1 mb-6">
        {tier.features.map((feature, i) => (
          <li key={i} className="flex items-start gap-3">
            {feature.included ? (
              <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            ) : (
              <X className="h-4 w-4 text-muted-foreground/50 shrink-0 mt-0.5" />
            )}
            <span className={feature.included ? "" : "text-muted-foreground/50"}>
              {feature.text}
              {feature.note && (
                <span className="text-xs text-muted-foreground ml-1">({feature.note})</span>
              )}
            </span>
          </li>
        ))}
      </ul>

      <Button 
        className="w-full" 
        variant={tier.popular && !isCurrentPlan ? "default" : "outline"}
        onClick={handleSubscribe}
        disabled={isLoading || isCurrentPlan || checkoutMutation.isPending}
        data-testid={`button-subscribe-${tier.id}`}
      >
        {getButtonText()}
      </Button>
    </Card>
  );
}
