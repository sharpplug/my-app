
"use client";

import React, { useState, useTransition, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, Mic, Send, Bot, Sparkles, Loader2, Calendar, Utensils, Route, Bed } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { planMyDay as getDayPlan } from "@/app/actions";
import { ScrollArea } from "./ui/scroll-area";
import { Badge } from "./ui/badge";
import { Card, CardContent, CardHeader, CardTitle as CardTitleComponent } from "./ui/card";
import type { PlanMyDayOutput } from "@/app/actions";


const WelcomeMessage = () => (
  <div className="text-center p-8 flex flex-col items-center">
    <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-4">
      <Bot className="w-12 h-12 text-primary" />
    </div>
    <h2 className="text-2xl font-bold font-headline">Talk to Naya</h2>
    <p className="text-muted-foreground mt-2">
      Tell me your plans, and I'll organize your day. <br />
      For example: <span className="italic">"I have a business lunch tomorrow, then need to pick up a gift and go to a party in the evening."</span>
    </p>
  </div>
);

const ResultDisplay = ({ result }: { result: PlanMyDayOutput }) => {
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
                    </CardContent>
                </Card>
            )}

            {result.suggestedEvents && result.suggestedEvents.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitleComponent className="text-base flex items-center gap-2"><Calendar/> Event & Service Suggestions</CardTitleComponent>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {result.suggestedEvents.map((event, i) => (
                             <div key={i} className="p-3 border rounded-lg text-sm">
                                <p className="font-bold">{event.title}</p>
                                <p className="text-muted-foreground">{event.time} at {event.location}</p>
                                <p className="text-xs italic mt-1">"{event.reason}"</p>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}

            {result.foodRecommendations && result.foodRecommendations.length > 0 && (
                 <Card>
                    <CardHeader>
                        <CardTitleComponent className="text-base flex items-center gap-2"><Utensils/> Food Plan</CardTitleComponent>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {result.foodRecommendations.map((food, i) => (
                             <div key={i} className="flex justify-between items-center text-sm">
                                <span><Badge variant="secondary">{food.meal}</Badge> {food.suggestion}</span>
                                <Badge variant="outline">{food.venue_type}</Badge>
                            </div>
                        ))}
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
  const { toast } = useToast();
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollAreaRef.current) {
        scrollAreaRef.current.scrollTo({ top: scrollAreaRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;

    const userMessage: Message = { id: Date.now(), by: 'user', text: input };
    setMessages(prev => [...prev, userMessage]);
    const currentInput = input;
    setInput("");

    startTransition(async () => {
        try {
            const result = await getDayPlan({ request: currentInput });
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
            <Bot className="text-primary"/> Plan My Day
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
                        {msg.by === 'naya' && <Bot className="w-8 h-8 flex-shrink-0 text-primary" />}
                        <div className={cn("rounded-lg p-3 max-w-lg", msg.by === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted')}>
                            {msg.text && <p className="text-sm">{msg.text}</p>}
                            {msg.plan && <ResultDisplay result={msg.plan} />}
                        </div>
                    </div>
                ))
            )}
             {isPending && (
                <div className="flex gap-3 justify-start">
                    <Bot className="w-8 h-8 flex-shrink-0 text-primary" />
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
              <Button type="button" size="icon" variant="ghost" className="rounded-full">
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
