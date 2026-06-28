import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { AdSenseScript } from "@/components/adsense-script";
import Home from "@/pages/home";
import GeneratePage from "@/pages/generate";
import PricingPage from "@/pages/pricing";
import ProfilePage from "@/pages/profile";
import FreePlayPage from "@/pages/free-play";
import HelpGuidePage from "@/pages/help-guide";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/generate" component={GeneratePage} />
      <Route path="/pricing" component={PricingPage} />
      <Route path="/profile/:id" component={ProfilePage} />
      <Route path="/free-play" component={FreePlayPage} />
      <Route path="/help" component={HelpGuidePage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <AdSenseScript />
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
