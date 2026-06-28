import { useState, useEffect } from "react";
import { useRoute, Link, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  User as UserIcon,
  UserPlus,
  UserCheck,
  Disc,
  Play,
  ArrowLeft,
  Loader2,
  Edit3,
  Camera,
  Check,
  Award,
  Globe,
  Settings
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { AudioPlayer } from "@/components/audio-player";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface ProfileUser {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  bio: string | null;
  profileImageUrl: string | null;
  following: string[];
  followers: string[];
}

interface ProfileBeat {
  id: string;
  prompt: string;
  bpm: number | null;
  audioUrl: string | null;
  status: string;
  userId: string | null;
  createdAt: string;
}

interface ProfileResponse {
  user: ProfileUser;
  beats: ProfileBeat[];
  isFollowing: boolean;
}

const AVATAR_PRESETS = [
  "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop",
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop",
  "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&h=150&fit=crop",
  "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop",
  "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop",
];

export default function ProfilePage() {
  const [, params] = useRoute("/profile/:id");
  const idOrUsername = params ? (params as any).id : undefined;
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  // Selected beat for player
  const [selectedBeat, setSelectedBeat] = useState<ProfileBeat | null>(null);

  // Edit states
  const [isEditing, setIsEditing] = useState(false);
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [profileImageUrl, setProfileImageUrl] = useState("");

  const { data: profileData, isLoading, error } = useQuery<ProfileResponse>({
    queryKey: [`/api/users/${idOrUsername}`],
    queryFn: async () => {
      const res = await fetch(`/api/users/${idOrUsername}`);
      if (!res.ok) {
        throw new Error("Profile not found");
      }
      return res.json();
    },
    enabled: !!idOrUsername,
  });

  // Keep edits state synchronized when starting editing
  useEffect(() => {
    if (profileData?.user) {
      setUsername(profileData.user.username || "");
      setBio(profileData.user.bio || "");
      setProfileImageUrl(profileData.user.profileImageUrl || "");
    }
  }, [profileData, isEditing]);

  const followMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/users/${profileData?.user.id}/follow`);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [`/api/users/${idOrUsername}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: data.following ? "Followed User" : "Unfollowed User",
        description: data.following 
          ? `You are now following @${profileData?.user.username}`
          : `You unfollowed @${profileData?.user.username}`,
      });
    },
    onError: (err: Error) => {
      toast({
        title: "Action failed",
        description: err.message || "Could not toggle follow.",
        variant: "destructive"
      });
    }
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (updates: { username: string; bio: string; profileImageUrl: string }) => {
      const res = await apiRequest("POST", `/api/users/${currentUser?.id}`, updates);
      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || "Failed to update profile");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [`/api/users/${idOrUsername}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      setIsEditing(false);
      // If username changed, redirect to new profile path
      if (data.username && data.username !== idOrUsername) {
        setLocation(`/profile/${data.username}`);
      }
      toast({
        title: "Profile Updated",
        description: "Your settings have been saved successfully.",
      });
    },
    onError: (err: Error) => {
      toast({
        title: "Update failed",
        description: err.message || "Could not save profile details.",
        variant: "destructive"
      });
    }
  });

  const handleSaveProfile = () => {
    if (!username.trim()) {
      toast({
        title: "Invalid Username",
        description: "Please enter a valid username.",
        variant: "destructive"
      });
      return;
    }
    // Validation for simple alphabets/numbers/underscores
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      toast({
        title: "Invalid Username style",
        description: "Username can only contain letters, numbers, and underscores.",
        variant: "destructive"
      });
      return;
    }

    updateProfileMutation.mutate({
      username: username.toLowerCase().trim(),
      bio: bio.trim(),
      profileImageUrl
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col justify-between">
        <Header />
        <div className="flex-1 flex flex-col items-center justify-center gap-4 py-20">
          <Loader2 className="h-10 w-10 text-primary animate-spin" />
          <p className="text-muted-foreground font-display">Tuning the workspace...</p>
        </div>
        <Footer />
      </div>
    );
  }

  if (error || !profileData) {
    return (
      <div className="min-h-screen bg-background flex flex-col justify-between">
        <Header />
        <div className="flex-1 max-w-xl mx-auto px-4 py-20 text-center space-y-6">
          <Award className="h-16 w-16 text-muted mx-auto" />
          <h2 className="text-2xl font-bold font-display text-foreground">User Profile Not Found</h2>
          <p className="text-muted-foreground leading-relaxed">
            We couldn't locate this user profile. They might have changed their username, or you are seeking a route that hasn't been configured yet.
          </p>
          <Link href="/">
            <Button variant="outline" className="mt-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Return Home
            </Button>
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const { user: profileUser, beats, isFollowing } = profileData;
  const isSelf = currentUser?.id === profileUser.id;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      <main className="flex-1 py-8 md:py-12">
        <div className="mx-auto max-w-5xl px-4 md:px-6">
          <Link href="/generate">
            <Button variant="ghost" size="sm" className="mb-6 hover-elevate">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Studio
            </Button>
          </Link>

          {/* Profile Overview Card */}
          <Card className="p-6 md:p-8 bg-card/50 backdrop-blur-md mb-8 ring-1 ring-border border-0">
            <div className="flex flex-col md:flex-row gap-6 items-center md:items-start text-center md:text-left">
              <div className="relative group">
                <div className="h-24 w-24 md:h-28 md:w-28 rounded-full overflow-hidden border-2 border-primary bg-muted shadow-lg">
                  {profileUser.profileImageUrl ? (
                    <img 
                      src={profileUser.profileImageUrl} 
                      alt={profileUser.firstName || "User"} 
                      className="h-full w-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center bg-primary/10">
                      <UserIcon className="h-10 w-10 text-primary" />
                    </div>
                  )}
                </div>
                {isSelf && (
                  <Button
                    size="icon"
                    variant="outline"
                    className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full bg-card shadow-sm border"
                    onClick={() => setIsEditing(true)}
                  >
                    <Camera className="h-4 w-4 text-primary" />
                  </Button>
                )}
              </div>

              <div className="flex-1 space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h1 className="font-display text-2xl md:text-3xl font-extrabold tracking-tight">
                      {profileUser.firstName} {profileUser.lastName}
                    </h1>
                    <p className="text-primary font-mono text-xs mt-1 font-semibold">
                      @{profileUser.username}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-3 justify-center">
                    {isSelf ? (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="hover-elevate cursor-pointer border"
                        onClick={() => setIsEditing(!isEditing)}
                      >
                        <Settings className="mr-2 h-4 w-4 text-muted-foreground" />
                        Edit Profile
                      </Button>
                    ) : (
                      currentUser && (
                        <Button
                          variant={isFollowing ? "outline" : "default"}
                          size="sm"
                          className="hover-elevate cursor-pointer"
                          onClick={() => followMutation.mutate()}
                          disabled={followMutation.isPending}
                        >
                          {followMutation.isPending ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : isFollowing ? (
                            <>
                              <UserCheck className="mr-2 h-4 w-4 text-primary" />
                              Following
                            </>
                          ) : (
                            <>
                              <UserPlus className="mr-2 h-4 w-4" />
                              Follow
                            </>
                          )}
                        </Button>
                      )
                    )}
                  </div>
                </div>

                <p className="text-sm md:text-base text-muted-foreground leading-relaxed max-w-2xl font-sans">
                  {profileUser.bio || "No biography provided yet. This beatmaker is silent but deadly."}
                </p>

                {/* Statistics Box */}
                <div className="flex items-center gap-6 justify-center md:justify-start pt-2 border-t border-border/50 max-w-xs">
                  <div className="text-center md:text-left">
                    <span className="block font-mono text-lg font-bold text-foreground">
                      {profileUser.followers.length}
                    </span>
                    <span className="text-xs text-muted-foreground">Followers</span>
                  </div>
                  <div className="text-center md:text-left">
                    <span className="block font-mono text-lg font-bold text-foreground">
                      {profileUser.following.length}
                    </span>
                    <span className="text-xs text-muted-foreground">Following</span>
                  </div>
                  <div className="text-center md:text-left">
                    <span className="block font-mono text-lg font-bold text-foreground">
                      {beats.length}
                    </span>
                    <span className="text-xs text-muted-foreground">Beats</span>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Edit Profile Form Sub-view */}
          {isEditing && (
            <Card className="p-6 bg-card/85 ring-1 ring-primary/20 border-0 mb-8 max-w-2xl">
              <h2 className="font-display font-semibold text-lg mb-4 flex items-center gap-2">
                <Edit3 className="h-4 w-4 text-primary" />
                Customize Profile
              </h2>
              
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-mono text-muted-foreground font-bold uppercase">Username</label>
                  <p className="text-[10px] text-muted-foreground">Unique identifier used on your profile link (letters, numbers, underscore only).</p>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-muted-foreground font-mono text-sm font-semibold">@</span>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full pl-7 pr-3 py-2 border rounded-md bg-transparent font-mono text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-mono text-muted-foreground font-bold uppercase">Short Biography</label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    rows={3}
                    placeholder="Describe your musical vibe, favorite genres, instruments, or experiences..."
                    className="w-full p-2.5 border rounded-md bg-transparent text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary resize-none"
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-xs font-mono text-muted-foreground font-bold uppercase block">Profile Picture URL</label>
                  <input
                    type="url"
                    value={profileImageUrl}
                    onChange={(e) => setProfileImageUrl(e.target.value)}
                    placeholder="Enter custom image format link (HTTPS)..."
                    className="w-full px-3 py-2 border rounded-md bg-transparent text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                  />

                  <div className="space-y-1.5">
                    <p className="text-[11px] text-muted-foreground font-medium">Or pick an artistic preset avatar:</p>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {AVATAR_PRESETS.map((preset, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => setProfileImageUrl(preset)}
                          className={`h-11 w-11 rounded-full overflow-hidden border-2 transition-all ${
                            profileImageUrl === preset ? "border-primary scale-110 shadow-md" : "border-transparent opacity-80 hover:opacity-100"
                          }`}
                        >
                          <img src={preset} alt={`Preset ${index}`} className="h-full w-full object-cover" />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 justify-end pt-3">
                  <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>
                    Cancel
                  </Button>
                  <Button 
                    size="sm" 
                    onClick={handleSaveProfile}
                    disabled={updateProfileMutation.isPending}
                  >
                    {updateProfileMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="mr-2 h-4 w-4" />
                    )}
                    Save Details
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* User's Created Beats Section */}
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <Disc className="h-5 w-5 text-primary animate-spin" />
              <h2 className="font-display text-xl font-bold text-foreground">
                Beat Archive ({beats.length})
              </h2>
            </div>

            {beats.length === 0 ? (
              <Card className="p-8 text-center bg-card/30 border-dashed border-2 py-12 flex flex-col items-center justify-center gap-3">
                <Globe className="h-10 w-10 text-muted" />
                <p className="text-muted-foreground text-sm font-display font-medium">
                  {profileUser.firstName} hasn't compiled any public formats yet.
                </p>
                {isSelf && (
                  <Link href="/generate">
                    <Button size="sm" className="mt-2 text-xs">
                      Generate My First Beat
                    </Button>
                  </Link>
                )}
              </Card>
            ) : (
              <div className="grid gap-6">
                <div className="grid gap-4 md:grid-cols-2">
                  {beats.map((beat) => (
                    <Card 
                      key={beat.id} 
                      className={`p-4 bg-card hover:bg-muted/30 transition-all duration-200 ring-1 ring-border border-0 flex flex-col justify-between ${
                        selectedBeat?.id === beat.id ? "ring-primary bg-primary/5 shadow-md" : ""
                      }`}
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between">
                          <p className="text-sm font-semibold text-foreground line-clamp-2 pr-2">
                            {beat.prompt}
                          </p>
                          {beat.bpm && (
                            <Badge variant="secondary" className="font-mono text-[10px]">
                              {beat.bpm} BPM
                            </Badge>
                          )}
                        </div>
                        <p className="text-[10px] text-muted-foreground font-mono">
                          Generated {new Date(beat.createdAt).toLocaleDateString()}
                        </p>
                      </div>

                      {beat.audioUrl && (
                        <div className="mt-4 pt-3 border-t border-border/50 flex justify-end">
                          <Button
                            size="sm"
                            variant={selectedBeat?.id === beat.id ? "default" : "secondary"}
                            className="w-full text-xs hover-elevate cursor-pointer flex items-center justify-center gap-2"
                            onClick={() => setSelectedBeat(beat)}
                          >
                            <Play className="h-3 w-3" />
                            {selectedBeat?.id === beat.id ? "Playing in deck" : "Play Beat"}
                          </Button>
                        </div>
                      )}
                    </Card>
                  ))}
                </div>

                {/* Sticky Now Playing deck for profile beats */}
                {selectedBeat && selectedBeat.audioUrl && (
                  <div className="sticky bottom-4 z-40 bg-card p-4 rounded-xl border shadow-xl ring-2 ring-primary">
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2">
                        <Disc className="h-4 w-4 text-primary animate-spin" />
                        <span className="text-xs font-semibold text-muted-foreground tracking-tight line-clamp-1">
                          Now Deck: {selectedBeat.prompt}
                        </span>
                      </div>
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-6 w-6 text-muted-foreground" 
                        onClick={() => setSelectedBeat(null)}
                      >
                        ×
                      </Button>
                    </div>
                    <AudioPlayer
                      audioUrl={selectedBeat.audioUrl}
                      title={selectedBeat.prompt}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
