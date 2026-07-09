"use client";

import { useMemo, useState, useEffect } from "react";
import Image from "next/image";
import dynamic from "next/dynamic";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  Star, MapPin, Users, BedDouble, Bath, Wifi, Utensils, Waves, Car, Wind, Loader2, Home,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-provider";
import { useRegional } from "@/contexts/language-provider";
import { spendFunds } from "@/lib/wallet";
import { subscribeToStays, type HostedStay } from "@/lib/stays";

const StaticMap = dynamic(() => import("@/components/static-map"), {
  ssr: false,
  loading: () => <Skeleton className="w-full h-full bg-muted" />,
});

const AMENITY_ICONS: Record<string, React.ElementType> = {
  Wifi, Kitchen: Utensils, Pool: Waves, Parking: Car, AC: Wind,
};

export const stays = [
  {
    id: "1",
    title: "Oceanfront Villa in Jumeirah",
    location: "Jumeirah, Dubai",
    type: "Villa",
    pricePerNight: 1200,
    rating: 4.94,
    reviews: 128,
    guests: 8,
    bedrooms: 4,
    beds: 5,
    baths: 4,
    amenities: ["Wifi", "Pool", "Kitchen", "Parking"],
    images: ["https://picsum.photos/seed/villa-jumeirah-1/800/600", "https://picsum.photos/seed/villa-jumeirah-2/800/600"],
    hostName: "Layla",
    hostAvatar: "https://picsum.photos/seed/host-layla/100/100",
    lat: 25.2048, lng: 55.2708,
  },
  {
    id: "2",
    title: "Marina Skyline Apartment",
    location: "Dubai Marina, Dubai",
    type: "Apartment",
    pricePerNight: 450,
    rating: 4.8,
    reviews: 342,
    guests: 4,
    bedrooms: 2,
    beds: 2,
    baths: 2,
    amenities: ["Wifi", "AC", "Kitchen"],
    images: ["https://picsum.photos/seed/marina-apt-1/800/600", "https://picsum.photos/seed/marina-apt-2/800/600"],
    hostName: "Omar",
    hostAvatar: "https://picsum.photos/seed/host-omar/100/100",
    lat: 25.0805, lng: 55.1403,
  },
  {
    id: "3",
    title: "Desert Camp Retreat",
    location: "Al Qudra Desert",
    type: "Glamping",
    pricePerNight: 650,
    rating: 4.97,
    reviews: 87,
    guests: 6,
    bedrooms: 3,
    beds: 3,
    baths: 2,
    amenities: ["Wifi", "AC"],
    images: ["https://picsum.photos/seed/desert-camp-1/800/600", "https://picsum.photos/seed/desert-camp-2/800/600"],
    hostName: "Hamdan",
    hostAvatar: "https://picsum.photos/seed/host-hamdan/100/100",
    lat: 24.8834, lng: 55.4033,
  },
  {
    id: "4",
    title: "Nairobi Garden Cottage",
    location: "Karen, Nairobi",
    type: "Cottage",
    pricePerNight: 180,
    rating: 4.86,
    reviews: 64,
    guests: 3,
    bedrooms: 1,
    beds: 2,
    baths: 1,
    amenities: ["Wifi", "Kitchen", "Parking"],
    images: ["https://picsum.photos/seed/nairobi-cottage-1/800/600", "https://picsum.photos/seed/nairobi-cottage-2/800/600"],
    hostName: "Wanjiru",
    hostAvatar: "https://picsum.photos/seed/host-wanjiru/100/100",
    lat: -1.2921, lng: 36.8219,
  },
  {
    id: "5",
    title: "Kampala City Loft",
    location: "Kololo, Kampala",
    type: "Loft",
    pricePerNight: 140,
    rating: 4.72,
    reviews: 39,
    guests: 2,
    bedrooms: 1,
    beds: 1,
    baths: 1,
    amenities: ["Wifi", "AC"],
    images: ["https://picsum.photos/seed/kampala-loft-1/800/600", "https://picsum.photos/seed/kampala-loft-2/800/600"],
    hostName: "Grace",
    hostAvatar: "https://picsum.photos/seed/host-grace/100/100",
    lat: 0.3476, lng: 32.5825,
  },
  {
    id: "6",
    title: "Cape Town Cliffside House",
    location: "Camps Bay, Cape Town",
    type: "House",
    pricePerNight: 380,
    rating: 4.95,
    reviews: 156,
    guests: 6,
    bedrooms: 3,
    beds: 4,
    baths: 3,
    amenities: ["Wifi", "Pool", "Kitchen", "Parking"],
    images: ["https://picsum.photos/seed/capetown-house-1/800/600", "https://picsum.photos/seed/capetown-house-2/800/600"],
    hostName: "Thandiwe",
    hostAvatar: "https://picsum.photos/seed/host-thandiwe/100/100",
    lat: -33.9249, lng: 18.4241,
  },
];

export type Stay = (typeof stays)[0] & {
  /** Set only for real, host-listed stays (src/lib/stays.ts) - drives
   * server-side crediting in spendFunds and the "can't book your own
   * listing" guard, same pattern as Shop's productId. */
  stayId?: string;
  hostUid?: string;
  hostHandle?: string;
};

function hostedStayToDisplay(stay: HostedStay): Stay {
  return {
    id: stay.id,
    title: stay.title,
    location: stay.location,
    type: stay.type,
    pricePerNight: stay.pricePerNight,
    rating: 5,
    reviews: 0,
    guests: stay.guests,
    bedrooms: stay.bedrooms,
    beds: stay.beds,
    baths: stay.baths,
    amenities: stay.amenities,
    images: stay.images.length > 0 ? stay.images : [`https://picsum.photos/seed/${stay.id}/800/600`],
    hostName: stay.hostName,
    hostAvatar: stay.hostAvatar,
    lat: stay.lat,
    lng: stay.lng,
    stayId: stay.id,
    hostUid: stay.hostUid,
    hostHandle: stay.hostHandle,
  };
}

function nightsBetween(checkIn: string, checkOut: string): number {
  if (!checkIn || !checkOut) return 0;
  const inDate = new Date(checkIn);
  const outDate = new Date(checkOut);
  const diff = Math.round((outDate.getTime() - inDate.getTime()) / (1000 * 60 * 60 * 24));
  return diff > 0 ? diff : 0;
}

const StayDetailDialog = ({ stay, open, onOpenChange }: { stay: Stay | null; open: boolean; onOpenChange: (open: boolean) => void }) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { currency } = useRegional();
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    if (!open) { setCheckIn(""); setCheckOut(""); }
  }, [open]);

  if (!stay) return null;

  const nights = nightsBetween(checkIn, checkOut);
  const total = nights * stay.pricePerNight;

  const isOwnListing = !!stay.stayId && stay.hostUid === user?.uid;

  const handleBook = async () => {
    if (!user || nights <= 0) return;
    setIsPending(true);
    try {
      await spendFunds(
        user.uid,
        `${stay.title} (${nights} night${nights > 1 ? "s" : ""})`,
        total,
        stay.stayId ? { stayId: stay.stayId, checkIn, checkOut } : undefined
      );
      toast({ title: "Stay Booked!", description: `${nights} night${nights > 1 ? "s" : ""} at ${stay.title}, ${checkIn} - ${checkOut}.` });
      onOpenChange(false);
    } catch (err) {
      toast({ variant: "destructive", title: "Booking Failed", description: err instanceof Error ? err.message : "Please try again." });
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:rounded-[2rem] max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{stay.title}</DialogTitle>
          <DialogDescription className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> {stay.location}</DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-2 h-40 rounded-2xl overflow-hidden">
            {stay.images.slice(0, 2).map((img, i) => (
              <div key={i} className="relative h-full"><Image src={img} alt={stay.title} fill className="object-cover" /></div>
            ))}
          </div>

          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-1.5">
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
              <span className="font-bold">{stay.rating}</span>
              <span className="text-muted-foreground">({stay.reviews} reviews)</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground text-xs">
              <Users className="w-3.5 h-3.5" /> {stay.guests}
              <BedDouble className="w-3.5 h-3.5 ml-2" /> {stay.bedrooms}
              <Bath className="w-3.5 h-3.5 ml-2" /> {stay.baths}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {stay.amenities.map((a) => {
              const Icon = AMENITY_ICONS[a] || Home;
              return <Badge key={a} variant="secondary" className="gap-1"><Icon className="w-3 h-3" /> {a}</Badge>;
            })}
          </div>

          <div className="h-40 rounded-2xl overflow-hidden border">
            <StaticMap lat={stay.lat} lng={stay.lng} zoom={13} label={stay.location} interactive={false} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Check-in</Label>
              <input type="date" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} className="w-full h-10 rounded-lg border bg-background px-3 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Check-out</Label>
              <input type="date" value={checkOut} min={checkIn || undefined} onChange={(e) => setCheckOut(e.target.value)} className="w-full h-10 rounded-lg border bg-background px-3 text-sm" />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-muted/50 border space-y-1.5">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>{currency.symbol} {stay.pricePerNight} x {nights || 0} night{nights !== 1 ? "s" : ""}</span>
              <span>{currency.symbol} {total.toFixed(0)}</span>
            </div>
            <div className="flex justify-between font-bold text-lg pt-1.5 border-t">
              <span>Total</span>
              <span className="text-primary">{currency.symbol} {total.toFixed(0)}</span>
            </div>
          </div>
        </div>

        <Button className="w-full h-14 rounded-xl text-lg font-bold" onClick={handleBook} disabled={isPending || nights <= 0 || isOwnListing}>
          {isPending ? <Loader2 className="animate-spin mr-2 w-4 h-4" /> : null}
          {isOwnListing ? "This Is Your Listing" : nights > 0 ? `Book · ${currency.symbol} ${total.toFixed(0)}` : "Select dates"}
        </Button>
      </DialogContent>
    </Dialog>
  );
};

const StayCard = ({ stay, onView }: { stay: Stay; onView: (stay: Stay) => void }) => {
  const { currency } = useRegional();
  return (
    <Card className="overflow-hidden flex flex-col h-full shadow-sm hover:shadow-md transition-shadow cursor-pointer" onClick={() => onView(stay)}>
      <div className="relative aspect-square w-full bg-muted">
        <Image src={stay.images[0]} alt={stay.title} fill className="object-cover" />
        <Badge className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm border-0">{stay.type}</Badge>
        {stay.stayId && <Badge variant="secondary" className="absolute top-3 left-3">Hosted by @{stay.hostHandle}</Badge>}
      </div>
      <CardHeader className="p-3 pb-1">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm font-bold truncate">{stay.title}</CardTitle>
          <div className="flex items-center gap-1 text-xs shrink-0">
            <Star className="w-3 h-3 fill-amber-400 text-amber-400" /> {stay.rating}
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-grow p-3 pt-0 space-y-1">
        <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" /> {stay.location}</p>
        <p className="text-xs text-muted-foreground">{stay.guests} guests · {stay.bedrooms} bed · {stay.baths} bath</p>
      </CardContent>
      <CardFooter className="p-3 pt-0">
        <p className="font-bold text-base text-foreground">{currency.symbol} {stay.pricePerNight}<span className="text-xs font-normal text-muted-foreground"> / night</span></p>
      </CardFooter>
    </Card>
  );
};

export default function StaysMarketplace({ searchTerm }: { searchTerm: string }) {
  const [viewingStay, setViewingStay] = useState<Stay | null>(null);
  const [hostedStays, setHostedStays] = useState<HostedStay[]>([]);

  useEffect(() => subscribeToStays(setHostedStays), []);

  const allStays = useMemo(
    () => [...hostedStays.map(hostedStayToDisplay), ...stays],
    [hostedStays]
  );

  const filteredStays = useMemo(() => allStays.filter(stay =>
    stay.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    stay.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
    stay.type.toLowerCase().includes(searchTerm.toLowerCase())
  ), [allStays, searchTerm]);

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredStays.map(stay => (
          <StayCard key={stay.id} stay={stay} onView={setViewingStay} />
        ))}
      </div>

      {filteredStays.length === 0 && (
        <div className="text-center py-24 text-muted-foreground col-span-full">
          <p className="text-lg">No stays found for "{searchTerm}".</p>
          <p>Try searching for a different city or property type!</p>
        </div>
      )}

      <StayDetailDialog stay={viewingStay} open={!!viewingStay} onOpenChange={(open) => !open && setViewingStay(null)} />
    </>
  );
}
