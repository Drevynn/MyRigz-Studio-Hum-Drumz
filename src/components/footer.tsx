import { Github, Twitter } from "lucide-react";
import { Link } from "wouter";

export function Footer() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto max-w-7xl px-4 py-12 md:px-6">
        <div className="grid gap-8 md:grid-cols-4">
          <div className="md:col-span-1">
            <Link href="/" className="flex items-center" data-testid="link-footer-logo">
              <img 
                src="/logo.png" 
                alt="Hum Drumz" 
                className="h-10 w-auto"
              />
            </Link>
            <p className="mt-4 text-sm text-muted-foreground">
              AI-powered drum track generation for musicians. Create custom beats in seconds.
            </p>
          </div>

          <div>
            <h3 className="font-display font-semibold">Product</h3>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/generate" className="hover:text-foreground transition-colors" data-testid="link-footer-generate">
                  Generate Drums
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="hover:text-foreground transition-colors" data-testid="link-footer-pricing">
                  Pricing
                </Link>
              </li>
              <li>
                <span className="cursor-default">API Access (Coming Soon)</span>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-display font-semibold">Resources</h3>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              <li>
                <span className="cursor-default">Documentation</span>
              </li>
              <li>
                <span className="cursor-default">Tutorials</span>
              </li>
              <li>
                <span className="cursor-default">FAQs</span>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-display font-semibold">Connect</h3>
            <div className="mt-4 flex gap-3">
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Twitter"
              >
                <Twitter className="h-5 w-5" />
              </a>
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="GitHub"
              >
                <Github className="h-5 w-5" />
              </a>
            </div>
          </div>
        </div>

        <div className="mt-12 border-t border-border pt-6">
          <p className="text-center text-sm text-muted-foreground">
            {new Date().getFullYear()} Hum Drumz. All generated audio is royalty-free for commercial use.
          </p>
        </div>
      </div>
    </footer>
  );
}
