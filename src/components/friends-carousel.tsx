
"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserPlus } from "lucide-react";
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { UserProfile } from "@/lib/users";
import { fetchSuggestedUsers, followUser, unfollowUser, subscribeToFollowing, type SuggestedUser } from "@/lib/social";
import { subscribeToActiveStories, type VibePost } from "@/lib/vibes";
import StoryViewer from "@/components/story-viewer";

type AuthorGroup = { authorUid: string; authorHandle: string; authorDisplayName: string; authorPhotoURL: string | null; stories: VibePost[] };

/** Real Stories bar, grouped by author - previously this rendered eight
 * hardcoded mock avatars regardless of who actually posted a Story. See
 * src/lib/vibes.ts for the 24h Story window. */
export const FriendStoryCarousel = ({ profile, onAddStory }: { profile: UserProfile | null; onAddStory: () => void }) => {
  const [activeStories, setActiveStories] = useState<VibePost[]>([]);
  const [viewingGroup, setViewingGroup] = useState<AuthorGroup | null>(null);

  useEffect(() => subscribeToActiveStories(setActiveStories), []);

  const groups = useMemo<AuthorGroup[]>(() => {
    const byAuthor = new Map<string, AuthorGroup>();
    for (const story of activeStories) {
      const existing = byAuthor.get(story.authorUid);
      if (existing) {
        existing.stories.push(story);
      } else {
        byAuthor.set(story.authorUid, {
          authorUid: story.authorUid,
          authorHandle: story.authorHandle,
          authorDisplayName: story.authorDisplayName,
          authorPhotoURL: story.authorPhotoURL,
          stories: [story],
        });
      }
    }
    return Array.from(byAuthor.values()).sort(
      (a, b) => (b.stories[b.stories.length - 1].createdAt?.toMillis() ?? 0) - (a.stories[a.stories.length - 1].createdAt?.toMillis() ?? 0)
    );
  }, [activeStories]);

  const myGroup = profile ? groups.find((g) => g.authorUid === profile.uid) : undefined;
  const otherGroups = profile ? groups.filter((g) => g.authorUid !== profile.uid) : groups;

  return (
    <>
      <div className="pl-4">
        <Carousel opts={{ align: "start", dragFree: true }}>
          <CarouselContent className="-ml-2">
            <CarouselItem className="basis-auto pl-2">
              <button
                onClick={() => (myGroup ? setViewingGroup(myGroup) : onAddStory())}
                className="flex flex-col items-center gap-1.5 w-16 text-center"
              >
                <div className="relative">
                  <Avatar className={`w-14 h-14 border-2 p-0.5 ${myGroup ? "border-purple-400" : "border-white/20"}`}>
                    <AvatarImage src={profile?.photoURL || undefined} alt="You" />
                    <AvatarFallback>{profile?.displayName?.charAt(0) || "Y"}</AvatarFallback>
                  </Avatar>
                  <div
                    className="absolute -bottom-1 -right-1 bg-white text-purple-600 rounded-full w-5 h-5 flex items-center justify-center border-2 border-black"
                    onClick={(e) => { e.stopPropagation(); onAddStory(); }}
                  >
                    <UserPlus className="w-3 h-3" />
                  </div>
                </div>
                <p className="text-xs text-white/80 truncate">Your Story</p>
              </button>
            </CarouselItem>

            {otherGroups.map((group) => (
              <CarouselItem key={group.authorUid} className="basis-auto pl-2">
                <button onClick={() => setViewingGroup(group)} className="flex flex-col items-center gap-1.5 w-16 text-center">
                  <Avatar className="w-14 h-14 border-2 border-purple-400 p-0.5">
                    <AvatarImage src={group.authorPhotoURL || undefined} alt={group.authorDisplayName} />
                    <AvatarFallback>{group.authorDisplayName.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <p className="text-xs text-white/80 truncate">{group.authorDisplayName}</p>
                </button>
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>
      </div>

      {viewingGroup && (
        <StoryViewer
          authorName={viewingGroup.authorDisplayName}
          authorAvatar={viewingGroup.authorPhotoURL}
          stories={viewingGroup.stories}
          onClose={() => setViewingGroup(null)}
        />
      )}
    </>
  );
};


/** Real Find Friends discovery, ranked by shared interest tags (see
 * src/lib/social.ts) - previously this rendered four hardcoded mock people
 * regardless of who was viewing it. */
export const SuggestionCards = ({ profile }: { profile: UserProfile | null }) => {
    const [suggestions, setSuggestions] = useState<SuggestedUser[]>([]);
    const [followingUids, setFollowingUids] = useState<string[]>([]);
    const [pending, setPending] = useState<string[]>([]);
    const { toast } = useToast();

    useEffect(() => {
        if (!profile) return;
        return subscribeToFollowing(profile.uid, setFollowingUids);
    }, [profile?.uid]);

    useEffect(() => {
        if (!profile) return;
        fetchSuggestedUsers(profile, followingUids).then(setSuggestions).catch(() => {});
        // Only re-fetch when the follow list actually changes (a new
        // follow should drop that person from suggestions), not on every
        // profile field update.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [profile?.uid, profile?.interests?.join(","), followingUids.join(",")]);

    const handleFollow = async (target: SuggestedUser) => {
        if (!profile) return;
        setPending(prev => [...prev, target.uid]);
        try {
            await followUser(profile.uid, target.uid);
            toast({ title: "Following!", description: `You're now following @${target.handle}.` });
        } catch {
            toast({ variant: "destructive", title: "Couldn't follow", description: "Please try again." });
        } finally {
            setPending(prev => prev.filter(id => id !== target.uid));
        }
    };

    if (!profile || suggestions.length === 0) return null;

    return (
        <div className="pl-4 my-6">
             <h3 className="text-sm font-semibold text-white/90 mb-3">Find Friends</h3>
             <Carousel opts={{ align: "start", dragFree: true }}>
                <CarouselContent className="-ml-3">
                    {suggestions.map(user => (
                        <CarouselItem key={user.uid} className="basis-[40%] sm:basis-[30%] pl-3">
                            <Card className="bg-white/10 border-white/20 text-white text-center p-4">
                                <Avatar className="w-16 h-16 mx-auto mb-3 border-2 border-white/30">
                                    <AvatarImage src={user.photoURL || undefined} alt={user.displayName} />
                                    <AvatarFallback>{user.displayName.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <h4 className="font-bold text-sm truncate">{user.displayName}</h4>
                                <p className="text-xs text-white/70 truncate mb-3">
                                    {user.sharedInterests.length > 0 ? `Into ${user.sharedInterests.slice(0, 2).join(", ")}` : "Suggested for you"}
                                </p>
                                <Button
                                    size="sm"
                                    className="w-full text-xs h-7"
                                    onClick={() => handleFollow(user)}
                                    disabled={pending.includes(user.uid)}
                                >
                                    Follow
                                </Button>
                            </Card>
                        </CarouselItem>
                    ))}
                </CarouselContent>
            </Carousel>
        </div>
    )
}
