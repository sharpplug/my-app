
"use client";

import { useState, useMemo, useTransition, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
    Car, 
    Bike, 
    Package, 
    MapPin, 
    Star, 
    MessageSquare, 
    Phone, 
    Loader2, 
    FileText, 
    Truck, 
    Wand2, 
    Shield, 
    Navigation, 
    ShieldCheck, 
    ChevronRight, 
    Zap, 
    CreditCard, 
    Smartphone,
    Bus,
    Music,
    Users,
    Clock,
    Sparkles,
    Search
} from "lucide-react";
import Image from "next/image";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { planComplexTrip } from '@/app/actions';
import { getIdToken } from '@/lib/get-id-token';
import { Textarea } from '@/components/ui/textarea';
import type { PlanComplexTripOutput } from '@/app/actions';
import imagesData from '@/app/lib/placeholder-images.json';
import { Badge } from '@/components/ui/badge';
import { useRegional } from '@/contexts/language-provider';
import AppCall, { CallTarget } from '@/components/app-call';

type RideStep = 'initial' | 'vehicles' | 'searching' | 'confirmed' | 'tracking' | 'itinerary' | 'payment';
type RideType = 'personal' | 'courier';
type RideOption = { id: string; name: string; icon: React.ElementType; eta: string; price: number; description: string; premium?: boolean };

const personalRideOptions: RideOption[] = [
  { id: 'boda', name: 'Boda Boda', icon: Bike, eta: '2 min', price: 12, description: 'Fastest city motorcycle taxi' },
  { id: 'save', name: 'SKIP Save', icon: Zap, eta: '6 min', price: 35, description: 'Economical city transit' },
  { id: 'quick', name: 'SKIP Quick', icon: Car, eta: '4 min', price: 50, description: 'Comfortable standard ride' },
  { id: 'vip', name: 'SKIP VIP', icon: Star, eta: '8 min', price: 150, description: 'Luxury chauffeur experience', premium: true },
  { id: 'van', name: 'SKIP Van', icon: Users, eta: '10 min', price: 90, description: 'Group travel (up to 7 pax)' },
  { id: 'party', name: 'Party Bus', icon: Music, eta: 'Scheduled', price: 450, description: 'Premium group event lounge' },
  { id: 'tour', name: 'Tour Truck', icon: Truck, eta: 'Scheduled', price: 800, description: 'Rugged regional expeditions' },
];

const courierRideOptions: RideOption[] = [
    { id: 'c-bike', name: 'Bike Delivery', icon: Bike, eta: '5 min', price: 20, description: 'Quick documents & small parcels' },
    { id: 'c-van', name: 'Mini Van', icon: Truck, eta: '12 min', price: 120, description: 'Medium business logistics' },
    { id: 'c-bus', name: 'Regional Bus', icon: Bus, eta: 'Scheduled', price: 350, description: 'Heavy & bulk regional transport' },
];

const aiSuggestions = ["Work in Downtown", "Airport Transfer", "Mall of the Emirates", "Beach Gathering"];

const InitialStep = ({ activeTab, onTabChange, onFindRide, onOpenAiPlanner, currency }: { activeTab: RideType, onTabChange: (tab: RideType) => void, onFindRide: () => void, onOpenAiPlanner: () => void, currency: any }) => (
    <div className="space-y-6 pb-4">
      <Tabs value={activeTab} onValueChange={(value) => onTabChange(value as RideType)} className="w-full">
        <TabsList className="grid w-full grid-cols-2 rounded-2xl p-1.5 h-auto bg-muted">
          <TabsTrigger value="personal" className="rounded-xl py-2.5 font-bold transition-all">SKIP</TabsTrigger>
          <TabsTrigger value="courier" className="rounded-xl py-2.5 font-bold transition-all">COURIER</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="space-y-3">
        <div className="relative group">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 flex flex-col items-center gap-1">
                <div className="w-2.5 h-2.5 rounded-full border-2 border-primary bg-background" />
                <div className="w-0.5 h-10 bg-gradient-to-b from-primary to-transparent opacity-20" />
            </div>
            <Input placeholder="Pick-up location" className="pl-12 h-14 rounded-2xl bg-muted/50 border-0 text-base font-medium focus-visible:ring-primary/20" />
        </div>
        <div className="relative">
            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-primary animate-pulse" />
            <Input placeholder={activeTab === 'personal' ? "Where are we headed?" : "Drop-off destination"} className="pl-12 h-14 rounded-2xl bg-muted/50 border-0 text-base font-medium focus-visible:ring-primary/20" />
        </div>
      </div>
      
       <Button variant="premium" className="w-full h-16 rounded-[1.5rem] justify-start px-6 group transition-all hover:scale-[1.02]" onClick={onOpenAiPlanner}>
          <div className="flex items-center gap-4 w-full">
            <div className="p-2.5 bg-amber-400 rounded-xl text-black group-hover:rotate-12 transition-transform">
                <Wand2 className="w-6 h-6" />
            </div>
            <div className="text-left flex-1">
                <p className="font-bold text-base leading-tight">AI Expedition Planner</p>
                <p className="text-[10px] opacity-60 font-medium text-white">Describe your journey, let Naya handle the rest</p>
            </div>
            <ChevronRight className="w-5 h-5 opacity-40 group-hover:translate-x-1 transition-transform text-white" />
          </div>
       </Button>
      
      <div className="space-y-3">
         <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2 ml-1">Suggested Destinations</h3>
         <div className="flex flex-wrap gap-2">
            {aiSuggestions.map(s => (
                <Button key={s} variant="outline" size="sm" className="rounded-full border-muted h-9 px-4 font-bold text-xs bg-muted/30" onClick={onFindRide}>
                    {s}
                </Button>
            ))}
         </div>
      </div>
    </div>
);

const VehicleSelectionStep = ({ rideOptions, onSelectRide, onBack, currency }: { rideOptions: RideOption[], onSelectRide: (ride: RideOption) => void, onBack: () => void, currency: any }) => (
    <div className="space-y-3">
      {rideOptions.map((ride) => (
        <button key={ride.id} onClick={() => onSelectRide(ride)} className="w-full group text-left">
          <Card className={cn(
              "flex items-center p-4 border-2 transition-all duration-300 rounded-[1.5rem] hover:border-primary/20",
              ride.premium ? "bg-zinc-950 border-amber-400/30 text-white" : "bg-card border-transparent"
          )}>
              <div className={cn("p-4 rounded-2xl mr-4", ride.premium ? "bg-amber-400 text-black" : "bg-primary/10 text-primary")}>
                <ride.icon className="h-7 w-7" />
              </div>
              <div className="flex-1">
                  <p className="font-black text-lg leading-tight flex items-center gap-2">
                    {ride.name}
                    {ride.premium && <Sparkles className="w-4 h-4 animate-pulse text-amber-400" />}
                  </p>
                  <p className="text-xs opacity-60 font-medium">{ride.description}</p>
              </div>
              <div className="text-right">
                <p className={cn("font-black text-xl tracking-tighter", ride.premium ? "text-amber-400" : "text-foreground")}>{currency.symbol} {ride.price}</p>
                <Badge variant="secondary" className="text-[9px] font-bold tracking-widest">{ride.eta}</Badge>
              </div>
          </Card>
        </button>
      ))}
       <Button variant="ghost" className="w-full mt-4 text-muted-foreground font-bold rounded-xl" onClick={onBack}>Change Route</Button>
    </div>
);

const PaymentStep = ({ ride, onConfirm, onBack, currency, region }: { ride: RideOption, onConfirm: () => void, onBack: () => void, currency: any, region: string }) => (
    <div className="space-y-6">
        <div className="text-center space-y-2">
            <h3 className="text-xl font-bold font-headline">Trip Overview</h3>
            <p className="text-sm text-muted-foreground">Total fare for your {ride.name} booking</p>
            <p className="text-4xl font-black text-primary">{currency.symbol} {ride.price}</p>
        </div>

        <div className="space-y-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Select Payment Rail</p>
            <div className="grid gap-2">
                {(region === 'KE' || region === 'UG') && (
                    <Button variant="outline" className="h-14 rounded-2xl justify-between px-4 border-green-500/20 bg-green-500/5 hover:bg-green-500/10" onClick={onConfirm}>
                        <div className="flex items-center gap-3">
                            <Smartphone className="text-green-600" />
                            <span className="font-bold">{region === 'KE' ? 'M-Pesa Express' : 'MTN Mobile Money'}</span>
                        </div>
                        <Badge className="bg-green-600">Fast Pay</Badge>
                    </Button>
                )}
                <Button variant="outline" className="h-14 rounded-2xl justify-start px-4 gap-3" onClick={onConfirm}>
                    <CreditCard className="text-blue-500" />
                    <span className="font-bold">Global Credit Card</span>
                </Button>
                <Button variant="outline" className="h-14 rounded-2xl justify-start px-4 gap-3" onClick={onConfirm}>
                    <Zap className="text-amber-500" />
                    <span className="font-bold">Wallet Balance</span>
                </Button>
            </div>
        </div>

        <div className="p-4 bg-muted/50 rounded-2xl text-[10px] text-muted-foreground flex gap-2">
            <ShieldCheck className="w-4 h-4 text-primary shrink-0" />
            <p>Your transaction is secured by regional multi-factor encryption. Moood uses local infrastructure for instant settlement.</p>
        </div>

        <Button variant="ghost" className="w-full font-bold" onClick={onBack}>Change Vehicle</Button>
    </div>
);

export default function SkipPage() {
  const [step, setStep] = useState<RideStep>('initial');
  const [activeTab, setActiveTab] = useState<RideType>('personal');
  const [isSheetOpen, setIsSheetOpen] = useState(true);
  const [itinerary, setItinerary] = useState<PlanComplexTripOutput | null>(null);
  const [selectedRide, setSelectedRide] = useState<RideOption | null>(null);
  const [activeCallTarget, setActiveCallTarget] = useState<CallTarget | null>(null);
  const [isPlanning, startPlanning] = useTransition();
  const { toast } = useToast();
  const { currency, region } = useRegional();

  const mapPlaceholder = imagesData.images.find(img => img.id === 'map-view');
  const rideOptions = activeTab === 'personal' ? personalRideOptions : courierRideOptions;

  const handlePlanTrip = (request: string) => {
      if (!request.trim()) return;
      startPlanning(async () => {
          try {
              const idToken = await getIdToken();
              const result = await planComplexTrip(idToken, { request });
              setItinerary(result);
              setStep('itinerary');
          } catch (error) {
              toast({ variant: 'destructive', title: "Planning Failed", description: "Couldn't design your itinerary. Please try again."})
          }
      })
  }

  const handleRideSelect = (ride: RideOption) => {
      setSelectedRide(ride);
      setStep('payment');
  }

  const handlePaymentConfirm = () => {
      setStep('searching');
      setTimeout(() => setStep('confirmed'), 2500);
  }

  const sheetTitle = useMemo(() => {
    if (isPlanning) return 'Naya AI Designing Expedition...';
    switch (step) {
      case 'initial': return activeTab === 'personal' ? 'Where to?' : 'Send Anything';
      case 'vehicles': return 'Choose your Experience';
      case 'payment': return 'Secure Payment';
      case 'searching': return 'Searching Regional Fleet';
      case 'confirmed': return 'Driver Engaged';
      case 'tracking': return 'Tracking Active Expedition';
      case 'itinerary': return 'AI Travel Plan';
      default: return 'SKIP';
    }
  }, [step, isPlanning, activeTab]);

  return (
    <div className="w-full h-screen flex flex-col relative overflow-hidden bg-background">
        {/* Map Background */}
        <div className="absolute inset-0 w-full h-full opacity-90 mix-blend-multiply grayscale brightness-75 contrast-125 pointer-events-none z-0">
            {mapPlaceholder ? (
                <Image 
                    src={mapPlaceholder.url} 
                    alt="Map" 
                    fill 
                    className="object-cover" 
                    priority
                    sizes="100vw"
                />
            ) : (
                <div className="w-full h-full bg-muted" />
            )}
        </div>

        {/* Top Control Overlay */}
        <div className="absolute top-6 left-6 right-6 z-20 flex items-center justify-between pointer-events-none">
            <div className="flex flex-col gap-1">
                <Badge className="px-4 py-1.5 rounded-full font-black tracking-widest text-[10px] bg-primary text-white shadow-xl pointer-events-auto">
                    {activeTab === 'personal' ? 'SKIP RIDE' : 'SKIP COURIER'}
                </Badge>
                {step === 'tracking' && <Badge variant="secondary" className="bg-black/40 text-green-400 backdrop-blur-md border-0 pointer-events-auto"><ShieldCheck className="w-3 h-3 mr-1"/> ENCRYPTED TRIP</Badge>}
            </div>
            
            <div className="bg-black/40 backdrop-blur-xl p-2 rounded-2xl border border-white/10 pointer-events-auto flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[9px] font-bold text-white uppercase tracking-tighter">Live Traffic Sync</span>
            </div>
        </div>

        {/* Slidable Sheet */}
        <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
            <SheetContent 
              side="bottom" 
              className="w-full max-w-2xl mx-auto rounded-t-[3rem] p-0 border-0 bg-background/95 backdrop-blur-xl transition-all z-50"
              onInteractOutside={(e) => e.preventDefault()}
            >
                <SheetHeader className="p-6 text-center">
                    <div className="w-12 h-1.5 bg-muted-foreground/20 rounded-full mx-auto mb-4" />
                    <SheetTitle className="text-xl font-headline tracking-tight">{sheetTitle}</SheetTitle>
                </SheetHeader>
                
                <div className="p-6 pb-12 max-h-[70vh] overflow-y-auto scrollbar-hide">
                  {isPlanning ? (
                      <div className="flex flex-col items-center justify-center py-20 text-center gap-6">
                          <div className="relative">
                            <Loader2 className="h-16 w-16 animate-spin text-primary opacity-20" />
                            <Wand2 className="absolute inset-0 m-auto h-8 w-8 text-primary animate-pulse" />
                          </div>
                          <div className="space-y-2">
                            <p className="text-lg font-headline font-bold">Synchronizing Regional Logistics</p>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-[0.2em] font-medium">Naya is calculating routes & availability...</p>
                          </div>
                      </div>
                  ) : step === 'initial' ? (
                      <InitialStep activeTab={activeTab} onTabChange={setActiveTab} onFindRide={() => setStep('vehicles')} onOpenAiPlanner={() => setStep('itinerary')} currency={currency} />
                  ) : step === 'vehicles' ? (
                      <VehicleSelectionStep rideOptions={rideOptions} onSelectRide={handleRideSelect} onBack={() => setStep('initial')} currency={currency} />
                  ) : step === 'payment' && selectedRide ? (
                      <PaymentStep ride={selectedRide} onConfirm={handlePaymentConfirm} onBack={() => setStep('vehicles')} currency={currency} region={region} />
                  ) : step === 'searching' ? (
                      <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
                          <div className="relative h-24 w-24">
                            <div className="absolute inset-0 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                            <Car className="absolute inset-0 m-auto h-10 w-10 text-primary" />
                          </div>
                          <p className="font-bold text-lg">Contacting your {selectedRide?.name}...</p>
                      </div>
                  ) : step === 'confirmed' ? (
                      <div className="space-y-6">
                          <Card className="p-6 border-0 rounded-[2.5rem] bg-muted/50">
                              <div className="flex items-center gap-6">
                                  <Avatar className="h-20 w-24 rounded-2xl border-2 border-primary shadow-2xl">
                                      <AvatarImage src="https://picsum.photos/seed/driver/200/200" />
                                      <AvatarFallback>D</AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1 space-y-1">
                                      <p className="text-2xl font-black leading-tight tracking-tight uppercase">Hassan M.</p>
                                      <div className="flex items-center gap-2">
                                          <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                                          <span className="text-sm font-bold">4.9 • 1,240 Trips</span>
                                      </div>
                                  </div>
                                  <Button size="icon" variant="outline" className="h-12 w-12 rounded-full border-green-500/20 bg-green-500/5 text-green-600" onClick={() => setActiveCallTarget({ name: 'Hassan M.', type: 'user' })}>
                                      <Phone className="w-5 h-5" />
                                  </Button>
                              </div>
                              <Separator className="my-6" />
                              <div className="text-center space-y-1">
                                  <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-50">Assigned Vehicle</p>
                                  <p className="text-2xl font-mono font-black tracking-widest text-primary">KBA 452X</p>
                                  <p className="text-xs font-bold opacity-60">Matte Black {selectedRide?.name}</p>
                              </div>
                          </Card>
                          <Button className="w-full h-16 rounded-[1.5rem] bg-primary text-white font-black text-lg shadow-2xl shadow-primary/30" onClick={() => setStep('tracking')}>BEGIN EXPEDITION</Button>
                      </div>
                  ) : step === 'tracking' ? (
                      <div className="space-y-6">
                          <div className="flex items-center justify-between bg-primary/10 p-4 rounded-2xl border border-primary/20">
                              <div className="flex items-center gap-3">
                                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                  <p className="text-sm font-bold">Arriving in <span className="text-primary">3 minutes</span></p>
                              </div>
                              <div className="flex gap-2">
                                  <Button size="icon" variant="outline" className="rounded-full h-10 w-10" onClick={() => setActiveCallTarget({ name: 'Hassan M.', type: 'user' })}><Phone className="w-4 h-4 text-green-600" /></Button>
                                  <Button size="icon" variant="outline" className="rounded-full h-10 w-10"><MessageSquare className="w-4 h-4" /></Button>
                              </div>
                          </div>
                          <div className="p-6 bg-muted/30 rounded-3xl border text-center space-y-2">
                              <p className="text-[10px] font-black uppercase tracking-widest opacity-50">Current Leg</p>
                              <p className="font-bold text-lg">Heading to Downtown</p>
                              <div className="flex items-center justify-center gap-2">
                                  <Navigation className="w-3 h-3 text-primary animate-bounce"/>
                                  <span className="text-xs text-muted-foreground">Regional traffic optimization active</span>
                              </div>
                          </div>
                          <Button variant="outline" className="w-full h-14 rounded-2xl font-bold border-red-500/20 text-red-500" onClick={() => { setStep('initial'); setSelectedRide(null); }}>CANCEL TRIP</Button>
                      </div>
                  ) : step === 'itinerary' ? (
                      <div className="space-y-6">
                          <p className="text-sm font-medium leading-relaxed opacity-70">Tell me where you need to be today. I'll handle the route, the timing, and your SKIP fleet.</p>
                          <Textarea 
                            placeholder="e.g. I have a business meeting at 10 AM, then a lunch, and I need to drop a package at the post office by 3 PM."
                            className="bg-muted border-0 rounded-2xl h-40 text-lg p-6 focus-visible:ring-primary/20"
                            autoFocus
                            id="ai-request"
                          />
                          <div className="grid grid-cols-2 gap-3">
                              <Button variant="outline" className="h-14 rounded-2xl font-bold" onClick={() => setStep('initial')}>Back</Button>
                              <Button className="h-14 rounded-2xl font-black bg-primary text-white" onClick={() => {
                                  const val = (document.getElementById('ai-request') as HTMLTextAreaElement).value;
                                  handlePlanTrip(val);
                              }}>GENERATE PLAN</Button>
                          </div>
                      </div>
                  ) : null}
                </div>
            </SheetContent>
        </Sheet>

        <AppCall 
            open={!!activeCallTarget} 
            onOpenChange={(o) => !o && setActiveCallTarget(null)} 
            target={activeCallTarget} 
        />
    </div>
  );
}
