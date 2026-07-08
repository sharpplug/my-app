
"use client";

import React, { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserPlus } from "lucide-react";
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

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

const mockSuggestions = [
    { id: 8, name: 'Nour', reason: 'Followed by Aisha', avatar: 'https://picsum.photos/id/201/100/100' },
    { id: 9, name: 'Ali', reason: 'Suggested for you', avatar: 'https://picsum.photos/id/202/100/100' },
    { id: 10, name: 'Hassan', reason: 'Popular in Dubai', avatar: 'https://picsum.photos/id/203/100/100' },
    { id: 11, name: 'Salma', reason: 'New to Moood', avatar: 'https://picsum.photos/id/204/100/100' },
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


export const SuggestionCards = () => {
    const [added, setAdded] = useState<number[]>([]);
    const { toast } = useToast();

    const handleAdd = (id: number, name: string) => {
        setAdded(prev => [...prev, id]);
        toast({ title: "Friend Added", description: `You are now following ${name}.`});
    }

    return (
        <div className="pl-4 my-6">
             <h3 className="text-sm font-semibold text-white/90 mb-3">Add to your feed</h3>
             <Carousel opts={{ align: "start", dragFree: true }}>
                <CarouselContent className="-ml-3">
                    {mockSuggestions.map(user => (
                        <CarouselItem key={user.id} className="basis-[40%] sm:basis-[30%] pl-3">
                            <Card className="bg-white/10 border-white/20 text-white text-center p-4">
                                <Avatar className="w-16 h-16 mx-auto mb-3 border-2 border-white/30">
                                    <AvatarImage src={user.avatar} alt={user.name} />
                                    <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <h4 className="font-bold text-sm">{user.name}</h4>
                                <p className="text-xs text-white/70 truncate mb-3">{user.reason}</p>
                                <Button
                                    size="sm"
                                    variant={added.includes(user.id) ? "secondary" : "default"}
                                    className="w-full text-xs h-7"
                                    onClick={() => handleAdd(user.id, user.name)}
                                    disabled={added.includes(user.id)}
                                >
                                    {added.includes(user.id) ? "Added" : "Add"}
                                </Button>
                            </Card>
                        </CarouselItem>
                    ))}
                </CarouselContent>
            </Carousel>
        </div>
    )
}
