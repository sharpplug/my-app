
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, MicVocal, Search, Ticket } from "lucide-react";
import Image from "next/image";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";

const mockEvents = [
  {
    id: 1,
    title: "Artisan Market by the Sea",
    date: "Sat, Aug 24, 4:00 PM",
    location: "Jumeirah Beach Park",
    price: "Free Entry",
    category: "Market",
    badge: "Families",
    image: "https://picsum.photos/id/1015/600/400",
    hint: "outdoor market",
  },
  {
    id: 2,
    title: "Ladies Night Yoga Flow",
    date: "Tue, Aug 27, 7:00 PM",
    location: "Serenity Yoga Studio",
    price: "Dhs. 75",
    category: "Wellness",
    badge: "Ladies Only",
    image: "https://picsum.photos/id/1016/600/400",
    hint: "yoga class",
  },
  {
    id: 3,
    title: "Live Oud Performance",
    date: "Fri, Aug 30, 9:00 PM",
    location: "The Music Hall",
    price: "Dhs. 150",
    category: "Music",
    badge: "Mixed",
    image: "https://picsum.photos/id/1018/600/400",
    hint: "live music",
  },
  {
    id: 4,
    title: "Family Movie Night Under the Stars",
    date: "Sat, Sep 7, 6:30 PM",
    location: "Zabeel Park",
    price: "Dhs. 50",
    category: "Film",
    badge: "Families",
    image: "https://picsum.photos/id/1019/600/400",
    hint: "outdoor cinema",
  },
  {
    id: 5,
    title: "Desert Adventure Photography Trip",
    date: "Sun, Sep 8, 5:00 AM",
    location: "Al Qudra Desert",
    price: "Dhs. 350",
    category: "Adventure",
    badge: "Photography",
    image: "https://picsum.photos/seed/deserttrip/600/400",
    hint: "desert sunrise",
  },
  {
    id: 6,
    title: "Modern Art Expo",
    date: "Wed, Sep 11, 10:00 AM",
    location: "Dubai World Trade Centre",
    price: "Dhs. 100",
    category: "Art",
    badge: "Expo",
    image: "https://picsum.photos/seed/artexpo/600/400",
    hint: "art gallery",
  },
  {
    id: 7,
    title: "HydraFacial",
    date: "Daily",
    location: "Skin & Glow Clinic",
    price: "Dhs. 600",
    category: "Wellness",
    badge: "Beauty",
    image: "https://picsum.photos/seed/hydrafacial/600/400",
    hint: "hydrafacial treatment",
  },
];


const EventCard = ({ event }: { event: (typeof mockEvents)[0] }) => {
  const { toast } = useToast();

  const getBadgeVariant = (badge: string) => {
    switch (badge) {
      case "Ladies Only":
        return "default";
      case "Families":
        return "secondary";
      case "Photography":
        return "destructive";
      default:
        return "outline";
    }
  };

  const handleGetTicket = () => {
    toast({
      title: "Ticket Action",
      description: `You clicked to get a ticket for "${event.title}". In a real app, this would lead to a booking flow.`,
    });
  };

  return (
    <Card className="flex flex-col overflow-hidden shadow-lg transition-transform hover:scale-[1.02]">
      <div className="relative aspect-video w-full">
        <Image src={event.image} alt={event.title} fill className="object-cover" />
        <div className="hidden" data-ai-hint={event.hint} />
        <Badge variant={getBadgeVariant(event.badge)} className="absolute top-3 right-3">
          {event.badge}
        </Badge>
      </div>
      <CardHeader>
        <CardTitle className="font-headline text-xl">{event.title}</CardTitle>
        <div className="flex items-center text-sm text-muted-foreground gap-2 pt-1">
          <MicVocal className="w-4 h-4" />
          <span>{event.category}</span>
        </div>
      </CardHeader>
      <CardContent className="flex-grow space-y-3">
        <div className="flex items-center text-sm text-muted-foreground">
          <Calendar className="w-4 h-4 mr-2" />
          <span>{event.date}</span>
        </div>
        <div className="flex items-center text-sm text-muted-foreground">
          <MapPin className="w-4 h-4 mr-2" />
          <span>{event.location}</span>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between items-center bg-muted/50 p-4">
        <p className="font-bold text-lg text-foreground">{event.price}</p>
        <Button onClick={handleGetTicket}>
          <Ticket className="mr-2" />
          Get Ticket
        </Button>
      </CardFooter>
    </Card>
  );
};


export default function EventsPage() {
    const searchParams = useSearchParams();
    const querySearch = searchParams.get('q') || "";
    const [searchTerm, setSearchTerm] = useState(querySearch);

    useEffect(() => {
        setSearchTerm(querySearch);
    }, [querySearch]);

    const filteredEvents = useMemo(() => mockEvents.filter(event =>
        event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.location.toLowerCase().includes(searchTerm.toLowerCase())
    ), [searchTerm]);

    return (
        <div className="w-full p-4 md:p-6 lg:p-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                <h1 className="text-3xl font-headline font-bold flex items-center gap-3">
                    <Ticket className="w-8 h-8" /> Events
                </h1>
                <div className="relative md:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                        placeholder="Search events..."
                        className="pl-10"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredEvents.map(event => (
                    <EventCard key={event.id} event={event} />
                ))}
            </div>

             {filteredEvents.length === 0 && (
                <div className="text-center py-24 text-muted-foreground col-span-full">
                    <p className="text-lg">No events found for "{searchTerm}".</p>
                    <p>Try searching for something else!</p>
                </div>
            )}
        </div>
    );
}

    