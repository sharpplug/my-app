
"use client";

import React, { useState, useTransition, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, Mic, Send, Sparkles, Loader2, Calendar, Utensils, Route, Bed, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { planMyDay as getDayPlan } from "@/app/actions";
import { getIdToken } from "@/lib/get-id-token";
import { ScrollArea } from "./ui/scroll-area";
import { Badge } from "./ui/badge";
import { Card, CardContent, CardHeader, CardTitle as CardTitleComponent } from "./ui/card";
import type { PlanMyDayOutput } from "@/app/actions";
import { useAuth } from "@/contexts/auth-provider";
import { spendFunds } from "@/lib/wallet";
import { mockEvents, mockServiceItems } from "@/lib/catalog-data";

const parseFareToNumber = (fare: string) => parseFloat(fare.replace(/[^0-9.]/g, '')) || 0;


const WelcomeMessage = () => (
  <div className="text-center p-8 flex flex-col items-center">
    <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center mb-4">
      <Sparkles className="w-10 h-10 text-white" />
    </div>
    <h2 className="text-2xl font-bold font-headline">Talk to Naya</h2>
    <p className="text-muted-foreground mt-2">
      Tell me your plans, and I'll organize your day. <br />
      For example: <span className="italic">"I have a business lunch tomorrow, then need to pick up a gift and go to a party in the evening."</span>
    </p>
  </div>
);

const ResultDisplay = ({ result, onNavigate }: { result: PlanMyDayOutput; onNavigate: () => void }) => {
    const router = useRouter();
    const { user } = useAuth();
    const { toast } = useToast();
    const [bookingKey, setBookingKey] = useState<string | null>(null);

    const goTo = (path: string) => {
        router.push(path);
        onNavigate();
    };

    // "Book This For Me" only appears where there's something real to book
    // against - a suggested event/food item that matches Moood's actual
    // catalog (src/lib/catalog-data.ts), or the trip plan's own AI-estimated
    // fare. Otherwise the AI's suggestion may not correspond to anything
    // purchasable, so it stays a "View"/search deep-link instead of
    // pretending to book something that doesn't exist.
    const handleBook = async (key: string, item: string, amount: number) => {
        if (!user) return;
        setBookingKey(key);
        try {
            await spendFunds(user.uid, item, amount);
            toast({ title: "Booked!", description: `${item} confirmed - paid from your Moood wallet.` });
        } catch (err) {
            toast({ variant: 'destructive', title: "Booking Failed", description: err instanceof Error ? err.message : "Please try again." });
        } finally {
            setBookingKey(null);
        }
    };

    return (
        <div className="space-y-6 p-4 bg-muted/50 rounded-lg">
            <div>
                <h3 className="text-lg font-semibold flex items-center gap-2"><Sparkles className="text-primary"/> Your Day's Vibe: {result.energyLevel}</h3>
                <p className="text-sm text-muted-foreground mt-1">{result.daySummary}</p>
            </div>

            {result.stayBooking && (
                <Card>
                    <CardHeader>
                        <CardTitleComponent className="text-base flex items-center gap-2"><Bed/> Stay Booking</CardTitleComponent>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="p-3 border rounded-lg text-sm">
                            <p className="font-bold">{result.stayBooking.location}</p>
                            <p className="text-muted-foreground">Check-in: {result.stayBooking.checkIn}</p>
                             <p className="text-muted-foreground">Check-out: {result.stayBooking.checkOut}</p>
                            <p className="font-bold text-right mt-2">{result.stayBooking.estimatedCost}</p>
                        </div>
                        <p className="text-xs text-muted-foreground italic">Stay booking isn't bookable in-app yet - this is a suggestion only.</p>
                    </CardContent>
                </Card>
            )}

            {result.suggestedEvents && result.suggestedEvents.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitleComponent className="text-base flex items-center gap-2"><Calendar/> Event & Service Suggestions</CardTitleComponent>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {result.suggestedEvents.map((event, i) => {
                            const matched = mockEvents.find(e => e.title.toLowerCase() === event.title.toLowerCase());
                            const key = `event-${i}`;
                            return (
                                <div key={i} className="p-3 border rounded-lg text-sm flex items-center justify-between gap-3">
                                    <div>
                                        <p className="font-bold">{event.title}</p>
                                        <p className="text-muted-foreground">{event.time} at {event.location}</p>
                                        <p className="text-xs italic mt-1">"{event.reason}"</p>
                                    </div>
                                    {matched ? (
                                        <Button size="sm" className="shrink-0 gap-1" onClick={() => handleBook(key, matched.title, matched.priceValue)} disabled={bookingKey === key}>
                                            {bookingKey === key ? "Booking..." : "Book Now"}
                                        </Button>
                                    ) : (
                                        <Button size="sm" variant="outline" className="shrink-0 gap-1" onClick={() => goTo(`/events?q=${encodeURIComponent(event.title)}`)}>
                                            View <ArrowRight className="w-3 h-3" />
                                        </Button>
                                    )}
                                </div>
                            );
                        })}
                    </CardContent>
                </Card>
            )}

            {result.foodRecommendations && result.foodRecommendations.length > 0 && (
                 <Card>
                    <CardHeader>
                        <CardTitleComponent className="text-base flex items-center gap-2"><Utensils/> Food Plan</CardTitleComponent>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {result.foodRecommendations.map((food, i) => {
                            const matched = mockServiceItems.find(item => item.title.toLowerCase().includes(food.suggestion.toLowerCase()) || food.suggestion.toLowerCase().includes(item.title.toLowerCase()));
                            const key = `food-${i}`;
                            return (
                                <div key={i} className="flex justify-between items-center text-sm">
                                    <span><Badge variant="secondary">{food.meal}</Badge> {food.suggestion}</span>
                                    {matched ? (
                                        <Button size="sm" variant="secondary" className="h-7 gap-1 text-xs" onClick={() => handleBook(key, matched.title, matched.price)} disabled={bookingKey === key}>
                                            {bookingKey === key ? "Booking..." : "Book Now"}
                                        </Button>
                                    ) : (
                                        <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs" onClick={() => goTo(`/shop?q=${encodeURIComponent(food.suggestion)}`)}>
                                            {food.venue_type} <ArrowRight className="w-3 h-3" />
                                        </Button>
                                    )}
                                </div>
                            );
                        })}
                    </CardContent>
                </Card>
            )}

             {result.tripPlan && (
                 <Card>
                    <CardHeader>
                        <CardTitleComponent className="text-base flex items-center gap-2"><Route/> SKIP Itinerary</CardTitleComponent>
                    </CardHeader>
                    <CardContent className="space-y-3">
                         <div className="p-3 border-dashed border rounded-lg bg-background">
                            <p className="text-xs font-semibold text-muted-foreground">Route Summary</p>
                            <p className="text-sm italic">"{result.tripPlan.summary}"</p>
                         </div>
                         <p className="text-center text-lg font-bold">{result.tripPlan.estimatedFare}</p>
                         <div className="grid grid-cols-2 gap-2">
                             <Button
                                variant="secondary"
                                className="gap-2"
                                onClick={() => handleBook('trip', 'Naya Trip Plan', parseFareToNumber(result.tripPlan!.estimatedFare))}
                                disabled={bookingKey === 'trip'}
                             >
                                {bookingKey === 'trip' ? "Booking..." : "Book Now"}
                             </Button>
                             <Button className="gap-2" onClick={() => goTo('/skip')}>
                                Customize in SKIP <ArrowRight className="w-4 h-4" />
                             </Button>
                         </div>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}

type Message = {
    id: number;
    by: 'user' | 'naya';
    text?: string;
    plan?: PlanMyDayOutput;
}

export default function TalkToNaya({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isPending, startTransition] = useTransition();
  const [isRecording, setIsRecording] = useState(false);
  const { toast } = useToast();
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    if (scrollAreaRef.current) {
        scrollAreaRef.current.scrollTo({ top: scrollAreaRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages]);

  useEffect(() => {
    return () => recognitionRef.current?.abort();
  }, []);

  const handleMicClick = () => {
    const SpeechRecognitionImpl = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionImpl) {
      toast({
        variant: 'destructive',
        title: "Voice Input Unsupported",
        description: "Your browser doesn't support speech recognition. Try Chrome or Edge.",
      });
      return;
    }

    const recognition: SpeechRecognition = new SpeechRecognitionImpl();
    recognitionRef.current = recognition;
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setIsRecording(true);
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0]?.[0]?.transcript;
      if (transcript) setInput(transcript);
    };
    recognition.onerror = () => {
      toast({ variant: 'destructive', title: "Didn't catch that", description: "Please try speaking again." });
    };
    recognition.onend = () => setIsRecording(false);

    recognition.start();
  };

  const handleSend = () => {
    if (!input.trim()) return;

    const userMessage: Message = { id: Date.now(), by: 'user', text: input };
    setMessages(prev => [...prev, userMessage]);
    const currentInput = input;
    setInput("");

    startTransition(async () => {
        try {
            const idToken = await getIdToken();
            const result = await getDayPlan(idToken, { request: currentInput });
            const nayaMessage: Message = { id: Date.now() + 1, by: 'naya', plan: result };
            setMessages(prev => [...prev, nayaMessage]);

        } catch (e) {
            console.error(e);
            toast({ variant: "destructive", title: "Error", description: "I couldn't create a plan right now. Please try again." });
             const errorMessage: Message = { id: Date.now() + 1, by: 'naya', text: "I'm having trouble connecting. Please check your connection and try again." };
            setMessages(prev => [...prev, errorMessage]);
        }
    })
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="h-full w-full max-w-full sm:h-[90vh] sm:max-w-2xl flex flex-col p-0 gap-0">
        <DialogHeader className="p-4 flex flex-row items-center justify-between border-b">
          <DialogTitle className="text-lg font-semibold flex items-center gap-2">
            <Sparkles className="text-primary"/> Plan My Day
          </DialogTitle>
          <button onClick={() => onOpenChange(false)} className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
            <X className="w-6 h-6" />
             <span className="sr-only">Close</span>
          </button>
        </DialogHeader>

        <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
          <div className="space-y-6">
            {messages.length === 0 ? <WelcomeMessage /> : (
                messages.map(msg => (
                    <div key={msg.id} className={cn("flex gap-3", msg.by === 'user' ? 'justify-end' : 'justify-start')}>
                        {msg.by === 'naya' && (
                            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0">
                                <Sparkles className="w-4 h-4 text-white" />
                            </div>
                        )}
                        <div className={cn("rounded-lg p-3 max-w-lg", msg.by === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted')}>
                            {msg.text && <p className="text-sm">{msg.text}</p>}
                            {msg.plan && <ResultDisplay result={msg.plan} onNavigate={() => onOpenChange(false)} />}
                        </div>
                    </div>
                ))
            )}
             {isPending && (
                <div className="flex gap-3 justify-start">
                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0">
                        <Sparkles className="w-4 h-4 text-white" />
                    </div>
                    <div className="rounded-lg p-3 bg-muted flex items-center">
                        <Loader2 className="w-5 h-5 animate-spin"/>
                    </div>
                </div>
             )}
          </div>
        </ScrollArea>

        <div className="p-4 border-t bg-background">
          <div className="relative">
            <textarea
              placeholder="Start typing or use the mic..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                  }
              }}
              className="w-full rounded-full bg-muted border-none resize-none p-3 pr-24 text-sm focus:ring-2 focus:ring-primary"
              rows={1}
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className={cn("rounded-full", isRecording && "text-red-500 animate-pulse")}
                onClick={handleMicClick}
                disabled={isRecording}
              >
                <Mic className="w-5 h-5" />
              </Button>
              <Button type="button" size="icon" className="rounded-full" onClick={handleSend} disabled={isPending || !input.trim()}>
                <Send className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
