import { Link } from "wouter";
import { ArrowLeft, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { HelpGuide } from "@/components/HelpGuide";

export default function HelpGuidePage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      <main className="flex-1 py-8 md:py-12 bg-background/50">
        <div className="mx-auto max-w-6xl px-4 md:px-6">
          <div className="mb-4">
            <Link href="/">
              <Button variant="ghost" size="sm" className="mb-2" data-testid="button-back-home">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Home
              </Button>
            </Link>
          </div>

          <HelpGuide />
        </div>
      </main>

      <Footer />
    </div>
  );
}
