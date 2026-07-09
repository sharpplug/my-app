
"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Waves, Sparkles, Map, List, Camera, MessageSquare, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VibeFeed, CreateVibeDialog } from "@/components/vibes-feed";
import { FriendStoryCarousel, SuggestionCards } from "@/components/friends-carousel";
import { Switch } from "@/components/ui/switch";
import AuraNaya from "@/components/aura-naya";
import Link from "next/link";
import { useAuth } from "@/contexts/auth-provider";
import { subscribeToUserProfile, type UserProfile } from "@/lib/users";
import { Skeleton } from "@/components/ui/skeleton";
import NotificationBell from "@/components/notification-bell";
import GlobalSearchDialog from "@/components/global-search-dialog";
import InterestPickerDialog from "@/components/interest-picker-dialog";

const VibesMap = dynamic(() => import("@/components/vibes-map"), {
  ssr: false,
  loading: () => <Skeleton className="h-[70vh] w-full rounded-2xl bg-white/5" />,
});

const Logo = (props: React.SVGProps<SVGSVGElement>) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      {...props}
    >
        <defs>
            <linearGradient id="fire-header" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" style={{stopColor: '#FF4848'}} />
                <stop offset="100%" style={{stopColor: '#FACC15'}} />
            </linearGradient>
            <linearGradient id="water-header" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" style={{stopColor: '#22D3EE'}} />
                <stop offset="100%" style={{stopColor: '#3B82F6'}} />
            </linearGradient>
        </defs>
        <circle cx="12" cy="12" r="10" fill="url(#fire-header)" />
        <path d="M12 2a10 10 0 0 0 0 20c3.5 0 6.6-1.8 8.4-4.5a.5.5 0 0 1 .1-.5 8 8 0 0 0-15-5 .5.5 0 0 1 .2-1A10 10 0 0 1 12 2Z" fill="url(#water-header)" />
        <path d="M5.9 12.5a.5.5 0 0 0-.2 1 8 8 0 0 1 15 5 .5.5 0 0 0-.1.5A10 10 0 0 1 4 12c0-.8.1-1.6.4-2.3a.5.5 0 0 0-.3-.9ZM18.1 11.5a.5.5 0 0 0 .2-1 8 8 0 0 1-15-5A.5.5 0 0 0 3.4 6 10 10 0 0 1 20 12c0 .8-.1-1.6-.4 2.3a.5.5 0 0 0 .3.9Z" stroke="hsl(var(--background))" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
);

export default function VibeHubPage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState("vibes");
  const [vibeView, setVibeView] = useState("feed");
  const [isVibeCreatorOpen, setIsVibeCreatorOpen] = useState(false);
  const [isStoryCreatorOpen, setIsStoryCreatorOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isInterestsOpen, setIsInterestsOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    return subscribeToUserProfile(user.uid, setProfile);
  }, [user]);

  // First-run onboarding: prompt for interests once a profile has loaded
  // and genuinely has none yet (not on every load - only while empty).
  useEffect(() => {
    if (profile && (!profile.interests || profile.interests.length === 0)) {
      setIsInterestsOpen(true);
    }
  }, [profile]);

  return (
    <>
      <div className="w-full min-h-screen flex flex-col bg-gradient-to-br from-indigo-900 via-purple-900 to-black relative overflow-y-auto">
        {/* 3D Background */}
        <div
          className="absolute inset-0 z-0 animate-stars"
          style={{
            backgroundImage: `
              radial-gradient(1px 1px at 20px 30px, #fff, transparent),
              radial-gradient(1px 1px at 40px 70px, #fff, transparent),
              radial-gradient(1px 1px at 80px 120px, #ddd, transparent),
              radial-gradient(2px 2px at 160px 240px, #fff, transparent),
              radial-gradient(1px 1px at 50px 200px, #fff, transparent),
              radial-gradient(2px 2px at 200px 50px, #fff, transparent),
              radial-gradient(3px 3px at 300px 300px, #ddd, transparent)
            `,
            backgroundRepeat: 'repeat',
            backgroundSize: '350px 350px'
          }}
        />

        <div className="sticky top-0 z-20 p-4 bg-gradient-to-b from-black/50 via-black/30 to-transparent backdrop-blur-sm">
            <div className="flex items-center justify-between gap-2">
                <Link href="/vibes" className="flex items-center gap-2">
                  <Logo className="h-6 w-6" />
                   <h1 className="text-xl font-body font-bold">
                       <span className="bg-gradient-to-r from-red-500 via-yellow-500 to-blue-500 bg-clip-text text-transparent">
                            Moood
                       </span>
                   </h1>
                </Link>
               <div className="flex items-center">
                    <Button variant="ghost" size="icon" className="text-white h-9 w-9 flex-shrink-0 hover:bg-white/10 hover:text-white" onClick={() => setIsSearchOpen(true)} aria-label="Search">
                        <Search className="w-5 h-5" />
                    </Button>
                    <NotificationBell className="text-white hover:bg-white/10 hover:text-white" />
                    <Link href="/messages" passHref>
                        <Button variant="ghost" size="icon" className="text-white h-9 w-9 flex-shrink-0 hover:bg-white/10 hover:text-white">
                            <MessageSquare />
                            <span className="sr-only">Messages</span>
                        </Button>
                    </Link>
                   <Button variant="ghost" size="icon" className="text-white h-9 w-9 flex-shrink-0 hover:bg-white/10 hover:text-white" onClick={() => setIsVibeCreatorOpen(true)}>
                      <Camera />
                  </Button>
               </div>
            </div>
        </div>

        <div className="w-full p-4 z-10">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-black/20 border border-white/10 text-white backdrop-blur-sm">
                <TabsTrigger value="vibes" className="data-[state=active]:bg-white/10">
                <Waves className="mr-2" />
                Vibes
                </TabsTrigger>
                <TabsTrigger value="aura-naya" className="data-[state=active]:bg-white/10">
                <Sparkles className="mr-2" />
                Aura x Naya
                </TabsTrigger>
            </TabsList>

            <TabsContent value="vibes" className="mt-4">
                <div className="flex items-center justify-center py-4">
                   <div className="flex items-center space-x-2 bg-black/20 p-1.5 rounded-full border border-white/10 text-white backdrop-blur-sm">
                      <List className="w-4 h-4 ml-2" />
                      <Switch
                          id="view-toggle"
                          checked={vibeView === 'map'}
                          onCheckedChange={(checked) => setVibeView(checked ? 'map' : 'feed')}
                          className="data-[state=checked]:bg-purple-600"
                      />
                      <Map className="w-4 h-4 mr-2" />
                  </div>
                </div>

              {vibeView === 'feed' ? (
                  <>
                      <FriendStoryCarousel profile={profile} onAddStory={() => setIsStoryCreatorOpen(true)} />
                      <SuggestionCards profile={profile} />
                      <VibeFeed profile={profile} />
                  </>
              ) : (
                  <VibesMap />
              )}

            </TabsContent>

            <TabsContent value="aura-naya" className="mt-4">
                <AuraNaya />
            </TabsContent>
          </Tabs>
        </div>
      </div>
      <CreateVibeDialog open={isVibeCreatorOpen} onOpenChange={setIsVibeCreatorOpen} profile={profile} />
      <CreateVibeDialog open={isStoryCreatorOpen} onOpenChange={setIsStoryCreatorOpen} profile={profile} isStory />
      <GlobalSearchDialog open={isSearchOpen} onOpenChange={setIsSearchOpen} />
      {user && (
        <InterestPickerDialog
          open={isInterestsOpen}
          onOpenChange={setIsInterestsOpen}
          uid={user.uid}
          initialInterests={profile?.interests ?? []}
        />
      )}
    </>
  );
}
