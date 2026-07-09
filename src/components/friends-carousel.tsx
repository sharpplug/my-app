
"use client";

import React, { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserPlus } from "lucide-react";
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { UserProfile } from "@/lib/users";
import { fetchSuggestedUsers, followUser, unfollowUser, subscribeToFollowing, type SuggestedUser } from "@/lib/social";

const mockFriends = [
  { id: 'you', name: 'Add Story', avatar: 'https://picsum.photos/id/237/40/40', isYou: true },
  { id: 1, name: 'Khalid', avatar: 'https://picsum.photos/id/1005/40/40' },
  { id: 2, name: 'Aisha', avatar: 'https://picsum.photos/id/1027/40/40' },
  { id: 3, name: 'Fatima', avatar: 'https://picsum.photos/id/1011/40/40' },
  { id: 4, name: 'Yusuf', avatar: 'https://picsum.photos/id/1012/40/40' },
  { id: 5, name: 'Layla', avatar: 'https://picsum.photos/id/1013/40/40' },
  { id: 6, name: 'Omar', avatar: 'https://picsum.photos/id/1014/40/40' },
  { id: 7, name: 'Zainab', avatar: 'https://picsum.photos/id/1025/40/40' },
];

export const FriendStoryCarousel = ({ onAddStory }: { onAddStory: () => void }) => {
  return (
    <div className="pl-4">
        <Carousel opts={{ align: "start", dragFree: true }}>
            <CarouselContent className="-ml-2">
                {mockFriends.map((friend, index) => (
                <CarouselItem key={index} className="basis-auto pl-2">
                    <button onClick={friend.isYou ? onAddStory : undefined} className="flex flex-col items-center gap-1.5 w-16 text-center">
                       <div className="relative">
                            <Avatar className="w-14 h-14 border-2 border-purple-400 p-0.5">
                                <AvatarImage src={friend.avatar} alt={friend.name} />
                                <AvatarFallback>{friend.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            {friend.isYou && (
                                <div className="absolute -bottom-1 -right-1 bg-white text-purple-600 rounded-full w-5 h-5 flex items-center justify-center border-2 border-black">
                                    <UserPlus className="w-3 h-3" />
                                </div>
                            )}
                       </div>
                       <p className="text-xs text-white/80 truncate">{friend.name}</p>
                    </button>
                </CarouselItem>
                ))}
            </CarouselContent>
        </Carousel>
    </div>
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
