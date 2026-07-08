
"use client";

import React, { useState, useMemo, Suspense, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import { ShoppingBag, Heart, ShieldCheck, CookingPot, Wheat, Plus, Search, PlayCircle, Loader2, Wand2, Camera, UserCheck, Stethoscope, Dumbbell, Home, Sparkles, Ticket, Calendar, MapPin, MicVocal, CreditCard, Shirt, SprayCan, Bed, Tent, Speaker, BookOpen, Phone, Smartphone } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from '@/components/ui/skeleton';
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { virtualTryOn } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { useSearchParams } from 'next/navigation';
import AppCall, { CallTarget } from '@/components/app-call';
import { useRegional } from '@/contexts/language-provider';

// Mock Data remains mostly same, but price display will use regional context
const mockServiceProviders = [
    { name: "Serenity Spa", videoUrl: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4" },
    { name: "M-Pesa Express Services", region: 'KE' },
    { name: "Flow Yoga Studio" },
    { name: "Skin & Glow Clinic" },
];

const mockServiceItems = [
    { category: 'wellness', title: "Relaxing Massage", description: "60-min session", image: "https://picsum.photos/seed/massage/400/400", hint: "spa massage", providerName: "Serenity Spa", type: 'on-site', price: 250 },
    { category: 'wellness', title: "Dermatology Consultation", description: "Acne & Skin concerns", image: "https://picsum.photos/seed/derm/400/400", hint: "dermatologist online", providerName: "Skin & Glow Clinic", type: 'virtual', price: 300 },
];

const MarketplaceItemCard = ({ item, onCall }: { item: any, onCall?: (target: CallTarget) => void }) => {
    const { currency } = useRegional();
    const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
    
    return (
        <>
            <Card className="overflow-hidden flex flex-col h-full shadow-sm hover:shadow-md transition-shadow">
                <div className="relative aspect-square w-full bg-muted">
                    <Image src={item.image} alt={item.title} fill className="object-cover" />
                    {item.type && <Badge className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm border-0">{item.type}</Badge>}
                </div>
                <CardHeader className="p-3">
                    <CardTitle className="text-sm font-bold truncate">{item.title}</CardTitle>
                    <CardDescription className="text-[10px] truncate">{item.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex-grow p-3 pt-0">
                    <p className="font-bold text-base text-primary">{currency.symbol} {item.price}</p>
                </CardContent>
                <CardFooter className="flex flex-col items-stretch gap-2 p-3 pt-0">
                    <div className="flex gap-2">
                        <Button variant="outline" size="icon" className="shrink-0 rounded-full" onClick={() => onCall?.({ name: item.providerName, type: 'business' })}><Phone className="w-4 h-4 text-green-500" /></Button>
                        <Button size="sm" className="w-full rounded-full bg-primary" onClick={() => setIsCheckoutOpen(true)}>Get Now</Button>
                    </div>
                </CardFooter>
            </Card>
            <CheckoutDialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen} item={item} />
        </>
    );
};

const CheckoutDialog = ({ open, onOpenChange, item }: { open: boolean, onOpenChange: (open: boolean) => void, item: any }) => {
    const { currency, region } = useRegional();
    const { toast } = useToast();

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:rounded-[2rem]">
                <DialogHeader>
                    <DialogTitle>Checkout</DialogTitle>
                    <DialogDescription>Review and pay securely.</DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4">
                    <div className="flex items-center gap-4 p-4 border rounded-2xl bg-muted/30">
                        <div className="relative w-16 h-16 rounded-xl overflow-hidden"><Image src={item.image} alt="item" fill className="object-cover" /></div>
                        <div className="flex-1">
                            <h4 className="font-bold text-sm">{item.title}</h4>
                            <p className="text-lg font-bold text-primary">{currency.symbol} {item.price}</p>
                        </div>
                    </div>
                    <div className="p-4 border rounded-2xl space-y-3">
                        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Select Payment</p>
                        <div className="grid grid-cols-1 gap-2">
                            {region === 'KE' && <Button variant="outline" className="justify-start h-12 rounded-xl"><Smartphone className="mr-2 text-green-600" /> M-Pesa Express</Button>}
                            {region === 'UG' && <Button variant="outline" className="justify-start h-12 rounded-xl"><Smartphone className="mr-2 text-yellow-500" /> MTN Mobile Money</Button>}
                            <Button variant="outline" className="justify-start h-12 rounded-xl"><CreditCard className="mr-2" /> Global Credit Card</Button>
                        </div>
                    </div>
                </div>
                <Button className="w-full h-14 rounded-xl text-lg font-bold" onClick={() => { toast({ title: "Order Confirmed!" }); onOpenChange(false); }}>Pay {currency.symbol} {item.price}</Button>
            </DialogContent>
        </Dialog>
    );
};

export default function ShopPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCallTarget, setActiveCallTarget] = useState<CallTarget | null>(null);

  return (
    <div className="w-full p-4 md:p-6 lg:p-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <h1 className="text-3xl font-headline font-bold flex items-center gap-3">
                <ShoppingBag className="w-8 h-8 text-primary" /> Marketplace
            </h1>
            <div className="relative md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input placeholder="Search global products..." className="pl-10 rounded-full bg-muted border-0" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}/>
            </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {mockServiceItems.map((item, i) => (
                <MarketplaceItemCard key={i} item={item} onCall={setActiveCallTarget} />
            ))}
        </div>

        <AppCall open={!!activeCallTarget} onOpenChange={(o) => !o && setActiveCallTarget(null)} target={activeCallTarget} />
    </div>
  );
}
