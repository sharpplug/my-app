"use client";

import { Car, ShoppingBag, User, Waves, Ticket, Mic, Plus } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useState } from 'react';
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Button } from "../ui/button";
import TalkToNaya from "../talk-to-naya";
import AppCall, { CallTarget } from "../app-call";
import { CreateVibeDialog } from "../vibes-feed";
import { CreateMenu, HeatBroadcastMenu } from "./creation-menus";
import LiveStreamCreator from "../live-stream-creator";


const navItems = [
    { href: "/vibes", label: "Vibes", icon: Waves },
    { href: "/shop", label: "Shop", icon: ShoppingBag },
    { href: "/events", label: "Events", icon: Ticket },
    { href: "/skip", label: "SKIP", icon: Car },
    { href: "/account", label: "Account", icon: User },
];

const MobileBottomNav = () => {
    const pathname = usePathname();
    return (
        <div className="bg-background/80 backdrop-blur-sm border-t">
            <nav className="flex justify-around items-center h-16">
            {navItems.map((item) => (
                <Link
                key={item.label}
                href={item.href}
                className={cn(
                    "flex flex-col items-center justify-center gap-1 w-full text-xs transition-colors relative",
                    pathname.startsWith(item.href)
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
                >
                <item.icon className="w-5 h-5" />
                <span>{item.label}</span>
                </Link>
            ))}
            </nav>
        </div>
    );
}


export default function DesktopLayout({ children }: { children: React.ReactNode }) {
    const [isNayaOpen, setIsNayaOpen] = useState(false);
    const [activeCallTarget, setActiveCallTarget] = useState<CallTarget | null>(null);
    const [isCreateMenuOpen, setIsCreateMenuOpen] = useState(false);
    const [isVibeCreatorOpen, setIsVibeCreatorOpen] = useState(false);
    const [isHeatBroadcastOpen, setIsHeatBroadcastOpen] = useState(false);
    const [isLiveCreatorOpen, setIsLiveCreatorOpen] = useState(false);
    const {toast} = useToast();

    const handlePost = (post: any) => {
        toast({
            title: "Vibe Posted!",
            description: "Your new vibe will appear in the feed shortly."
        })
    }

    const handleCreateSelect = (option: string) => {
        if (option === 'vibe') {
            setIsVibeCreatorOpen(true);
        } else if (option === 'call') {
            setActiveCallTarget({ name: 'Naya', type: 'ai' });
        } else if (option === 'heat') {
            setIsHeatBroadcastOpen(true);
        } else if (option === 'live') {
            setIsLiveCreatorOpen(true);
        }
    }

    return (
        <div className="w-full min-h-screen bg-muted flex items-center justify-center p-4">
            <div className="relative w-full max-w-md h-[90vh] max-h-[900px] bg-background rounded-2xl shadow-2xl border-4 border-foreground/80 flex flex-col overflow-hidden">
                <main className="flex-1 overflow-y-auto">
                    {children}
                </main>
                <MobileBottomNav />

                 <div className="absolute bottom-20 right-4 z-50 flex flex-col items-center gap-2">
                    <button 
                        onClick={() => setIsNayaOpen(true)}
                        className="w-8 h-8 bg-primary/80 text-primary-foreground rounded-full flex items-center justify-center shadow-lg hover:bg-primary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 backdrop-blur-sm"
                        aria-label="Talk to Naya"
                    >
                        <Mic className="w-4 h-4" />
                    </button>
                    <button 
                        onClick={() => setIsCreateMenuOpen(true)}
                        className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 text-white rounded-full flex items-center justify-center shadow-lg hover:scale-105 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 transition-transform"
                        aria-label="Create"
                    >
                        <Plus className="w-5 h-5" />
                    </button>
                </div>
        
                <CreateMenu open={isCreateMenuOpen} onOpenChange={setIsCreateMenuOpen} onSelect={handleCreateSelect} />
                <HeatBroadcastMenu open={isHeatBroadcastOpen} onOpenChange={setIsHeatBroadcastOpen} />
                <TalkToNaya open={isNayaOpen} onOpenChange={setIsNayaOpen} />
                <AppCall 
                  open={!!activeCallTarget} 
                  onOpenChange={(open) => !open && setActiveCallTarget(null)} 
                  target={activeCallTarget} 
                />
                <CreateVibeDialog open={isVibeCreatorOpen} onOpenChange={setIsVibeCreatorOpen} onPost={handlePost} />
                <LiveStreamCreator open={isLiveCreatorOpen} onOpenChange={setIsLiveCreatorOpen} />
            </div>
        </div>
    );
}
