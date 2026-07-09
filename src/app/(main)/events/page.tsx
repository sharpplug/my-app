
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, MapPin, MicVocal, Search, Ticket, Loader2, Link2, Home } from "lucide-react";
import Image from "next/image";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/auth-provider";
import { useRegional } from "@/contexts/language-provider";
import { spendFunds } from "@/lib/wallet";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import StaysMarketplace from "@/components/stays-marketplace";
import { mockEvents, type MoodEvent as BaseMoodEvent } from "@/lib/catalog-data";
import { subscribeToEvents, type HostedEvent } from "@/lib/events";
import { averageRating } from "@/lib/ratings";
import RatingStars from "@/components/rating-stars";
import RateDialog from "@/components/rate-dialog";

const StaticMap = dynamic(() => import("@/components/static-map"), {
  ssr: false,
  loading: () => <Skeleton className="w-full h-full bg-muted" />,
});

type MoodEvent = Omit<BaseMoodEvent, "id"> & {
  id: string | number;
  /** Set only for real, partner-created events (src/lib/events.ts) - drives
   * server-side crediting in spendFunds and the "can't book your own
   * event" guard, same pattern as Shop's productId. */
  eventId?: string;
  organizerUid?: string;
  organizerHandle?: string;
  /** Only set for real, partner-created events - mock events have no
   * genuine rating data to show. */
  ratingAverage?: number;
  ratingCount?: number;
};

function hostedEventToDisplay(event: HostedEvent, currencySymbol: string): MoodEvent {
  const { average, count } = averageRating(event);
  return {
    id: event.id,
    title: event.title,
    date: event.date,
    location: event.location,
    price: event.priceValue === 0 ? "Free Entry" : `${currencySymbol} ${event.priceValue}`,
    priceValue: event.priceValue,
    category: event.category,
    badge: event.badge || "Mixed",
    image: event.image,
    hint: event.title,
    lat: event.lat,
    lng: event.lng,
    eventId: event.id,
    organizerUid: event.organizerUid,
    organizerHandle: event.organizerHandle,
    ratingAverage: average,
    ratingCount: count,
  };
}

const BookingDialog = ({ event, open, onOpenChange }: { event: MoodEvent | null; open: boolean; onOpenChange: (open: boolean) => void }) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isPending, setIsPending] = useState(false);
  const [isRateOpen, setIsRateOpen] = useState(false);

  if (!event) return null;
  const isFree = event.priceValue === 0;
  const isOwnEvent = !!event.eventId && event.organizerUid === user?.uid;

  const handleBook = async () => {
    if (!user) return;
    setIsPending(true);
    try {
      if (!isFree) {
        await spendFunds(user.uid, event.title, event.priceValue, event.eventId ? { eventId: event.eventId } : undefined);
      }
      toast({ title: isFree ? "Spot Reserved!" : "Ticket Booked!", description: `You're set for "${event.title}".` });
      onOpenChange(false);
    } catch (err) {
      toast({ variant: "destructive", title: "Booking Failed", description: err instanceof Error ? err.message : "Please try again." });
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:rounded-[2rem] max-w-md">
        <DialogHeader>
          <DialogTitle>{event.title}</DialogTitle>
          <DialogDescription>{event.date}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="h-40 rounded-2xl overflow-hidden border">
            <StaticMap lat={event.lat} lng={event.lng} zoom={14} label={event.location} interactive={false} />
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="w-4 h-4" /> {event.location}
          </div>
          <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/50 border">
            <span className="text-sm font-bold">{isFree ? "Entry" : "Ticket Price"}</span>
            <span className="text-xl font-black text-primary">{event.price}</span>
          </div>
          {event.eventId && !isOwnEvent && (
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setIsRateOpen(true)}>
              <Ticket className="w-3.5 h-3.5" /> Rate this event
            </Button>
          )}
        </div>
        <Button className="w-full h-14 rounded-xl text-lg font-bold" onClick={handleBook} disabled={isPending || isOwnEvent}>
          {isPending ? <Loader2 className="animate-spin mr-2 w-4 h-4" /> : <Ticket className="mr-2 w-4 h-4" />}
          {isOwnEvent ? "This Is Your Event" : isFree ? "Reserve Free Spot" : `Pay ${event.price}`}
        </Button>
      </DialogContent>
      {event.eventId && (
        <RateDialog open={isRateOpen} onOpenChange={setIsRateOpen} entityType="event" entityId={event.eventId} title={event.title} />
      )}
    </Dialog>
  );
};

const EventCard = ({ event, onBook }: { event: MoodEvent; onBook: (event: MoodEvent) => void }) => {
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

  return (
    <Card className="flex flex-col overflow-hidden shadow-lg transition-transform hover:scale-[1.02]">
      <div className="relative aspect-video w-full">
        <Image src={event.image} alt={event.title} fill className="object-cover" />
        <div className="hidden" data-ai-hint={event.hint} />
        <Badge variant={getBadgeVariant(event.badge)} className="absolute top-3 right-3">
          {event.badge}
        </Badge>
        {event.eventId && <Badge variant="secondary" className="absolute top-3 left-3">By @{event.organizerHandle}</Badge>}
      </div>
      <CardHeader>
        <CardTitle className="font-headline text-xl">{event.title}</CardTitle>
        <div className="flex items-center text-sm text-muted-foreground gap-2 pt-1">
          <MicVocal className="w-4 h-4" />
          <span>{event.category}</span>
        </div>
        {event.eventId && (
          <div className="pt-1">
            <RatingStars average={event.ratingAverage ?? 0} count={event.ratingCount ?? 0} />
          </div>
        )}
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
        <Button onClick={() => onBook(event)}>
          <Ticket className="mr-2" />
          Get Ticket
        </Button>
      </CardFooter>
    </Card>
  );
};


export default function LinksPage() {
    const searchParams = useSearchParams();
    const { currency } = useRegional();
    const querySearch = searchParams.get('q') || "";
    const [searchTerm, setSearchTerm] = useState(querySearch);
    const [bookingEvent, setBookingEvent] = useState<MoodEvent | null>(null);
    const [activeTab, setActiveTab] = useState<"events" | "stays">(searchParams.get('tab') === 'stays' ? 'stays' : 'events');
    const [hostedEvents, setHostedEvents] = useState<HostedEvent[]>([]);

    useEffect(() => subscribeToEvents(setHostedEvents), []);

    useEffect(() => {
        setSearchTerm(querySearch);
        if (searchParams.get('tab') === 'stays') setActiveTab('stays');
    }, [querySearch, searchParams]);

    const allEvents = useMemo(
        () => [...hostedEvents.map((e) => hostedEventToDisplay(e, currency.symbol)), ...mockEvents],
        [hostedEvents, currency.symbol]
    );

    const filteredEvents = useMemo(() => allEvents.filter(event =>
        event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.location.toLowerCase().includes(searchTerm.toLowerCase())
    ), [allEvents, searchTerm]);

    return (
        <div className="w-full p-4 md:p-6 lg:p-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                <h1 className="text-3xl font-headline font-bold flex items-center gap-3">
                    <Link2 className="w-8 h-8" /> Links
                </h1>
                <div className="relative md:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                        placeholder={activeTab === 'events' ? "Search events..." : "Search stays..."}
                        className="pl-10"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "events" | "stays")} className="w-full">
                <TabsList className="grid w-full max-w-xs grid-cols-2 mb-6">
                    <TabsTrigger value="events" className="gap-2"><Ticket className="w-4 h-4" /> Events</TabsTrigger>
                    <TabsTrigger value="stays" className="gap-2"><Home className="w-4 h-4" /> Stays</TabsTrigger>
                </TabsList>

                <TabsContent value="events" className="mt-0">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredEvents.map(event => (
                            <EventCard key={event.id} event={event} onBook={setBookingEvent} />
                        ))}
                    </div>

                    {filteredEvents.length === 0 && (
                        <div className="text-center py-24 text-muted-foreground col-span-full">
                            <p className="text-lg">No events found for "{searchTerm}".</p>
                            <p>Try searching for something else!</p>
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="stays" className="mt-0">
                    <StaysMarketplace searchTerm={searchTerm} />
                </TabsContent>
            </Tabs>

            <BookingDialog event={bookingEvent} open={!!bookingEvent} onOpenChange={(open) => !open && setBookingEvent(null)} />
        </div>
    );
}
