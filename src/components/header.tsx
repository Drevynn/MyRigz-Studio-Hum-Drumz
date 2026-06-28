import { Link } from "wouter";
import { Drum, LogIn, LogOut, User, CreditCard, Music, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "./theme-toggle";
import { useAuth } from "@/hooks/use-auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Header() {
  const { user, isLoading, isAuthenticated } = useAuth();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 md:px-6">
        <Link href="/" className="flex items-center">
          <img 
            src="/logo.png" 
            alt="Hum Drumz" 
            className="h-12 w-auto"
            data-testid="img-logo"
          />
        </Link>

        <nav className="flex items-center gap-2">
          <Link href="/free-play">
            <Button variant="ghost" data-testid="button-free-play">
              Free Play
            </Button>
          </Link>
          <Link href="/pricing">
            <Button variant="ghost" data-testid="button-pricing">
              Pricing
            </Button>
          </Link>
          <Link href="/help">
            <Button variant="ghost" className="text-amber-500 font-medium" data-testid="button-help-guide">
              📖 Help & Guide
            </Button>
          </Link>
          <ThemeToggle />
          
          {isLoading ? (
            <div className="h-9 w-9 rounded-full bg-muted animate-pulse" />
          ) : isAuthenticated && user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full" data-testid="button-user-menu">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.profileImageUrl || undefined} alt={user.firstName || "User"} />
                    <AvatarFallback>
                      {user.firstName?.[0] || user.email?.[0] || "U"}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium">
                    {user.firstName} {user.lastName}
                  </p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/generate" className="cursor-pointer">
                    <Drum className="mr-2 h-4 w-4" />
                    Generate Drums
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/free-play" className="cursor-pointer">
                    <Music className="mr-2 h-4 w-4" />
                    Free Play
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/help" className="cursor-pointer">
                    <HelpCircle className="mr-2 h-4 w-4 text-amber-500" />
                    📖 Help & Guide
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={`/profile/${user.id}`} className="cursor-pointer">
                    <User className="mr-2 h-4 w-4" />
                    My Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/pricing" className="cursor-pointer">
                    <CreditCard className="mr-2 h-4 w-4" />
                    My Plan
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <a href="/api/logout" className="cursor-pointer text-destructive">
                    <LogOut className="mr-2 h-4 w-4" />
                    Log Out
                  </a>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <a href="/api/login">
                <Button variant="outline" data-testid="button-login">
                  <LogIn className="mr-2 h-4 w-4" />
                  Log In
                </Button>
              </a>
              <Link href="/generate">
                <Button data-testid="button-generate-cta">
                  Generate Drums
                </Button>
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
