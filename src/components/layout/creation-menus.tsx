'use client';

import { useEffect, useRef } from 'react';
import { Signal, Camera, Video, Phone, Radio } from 'lucide-react';
import { Button } from "../ui/button";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../ui/dialog";

const creationOptions = [
    { id: 'vibe', label: 'Post a Vibe', icon: Camera },
    { id: 'live', label: 'Go Live', icon: Radio },
    { id: 'call', label: 'Call Naya AI', icon: Phone },
    { id: 'heat', label: 'Broadcast Heat', icon: Signal },
];

const heatSignatures = [
    { id: 'food', label: 'Food', icon: '🍔', sound: null },
    { id: 'rave', label: 'Rave', icon: '🎉', sound: null },
    { id: 'party', label: 'Party', icon: '🎊', sound: '/sounds/horn.mp3' },
    { id: 'wedding', label: 'Wedding', icon: '💍', sound: null },
    { id: 'church', label: 'Church', icon: '⛪', sound: null },
    { id: 'good-music', label: 'Good Music', icon: '🎶', sound: '/sounds/horn.mp3' },
    { id: 'sports', label: 'Sports', icon: '⚽', sound: null },
    { id: 'shopping', label: 'Shopping', icon: '🛍️', sound: null },
    { id: 'art-culture', label: 'Art/Culture', icon: '🎨', sound: null },
    { id: 'celebration', label: 'Celebration', icon: '🎆', sound: null },
    { id: 'morning', label: 'Morning Gathering', icon: '☀️', sound: null, type: 'white-smoke' },
    { id: 'sorrow', label: 'Sorrow / Mourning', icon: '🖤', sound: null, type: 'black-smoke' },
];

export const CreateMenu = ({ open, onOpenChange, onSelect }: { open: boolean, onOpenChange: (open: boolean) => void, onSelect: (option: string) => void }) => (
    <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="bg-black/50 backdrop-blur-xl border-white/10 text-white">
            <DialogHeader>
                <DialogTitle>Create</DialogTitle>
                <DialogDescription>What would you like to do?</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-4">
                {creationOptions.map(opt => (
                    <Button key={opt.id} variant="outline" className="flex flex-col h-24 gap-2 bg-white/5 border-white/10 hover:bg-white/10" onClick={() => { onOpenChange(false); onSelect(opt.id); }}>
                        <opt.icon className="w-8 h-8 text-primary" />
                        <span>{opt.label}</span>
                    </Button>
                ))}
            </div>
        </DialogContent>
    </Dialog>
);

export const HeatBroadcastMenu = ({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) => {
    const { toast } = useToast();
    const audioRef = useRef<HTMLAudioElement | null>(null);

     useEffect(() => {
        if (typeof window !== 'undefined') {
            const audio = new Audio();
            audio.preload = 'auto';
            audioRef.current = audio;
        }
    }, []);

    const handleBroadcast = (signature: (typeof heatSignatures)[0]) => {
        let smokeType = "";
        if (signature.type === 'white-smoke') smokeType = " White smoke is rising from your location.";
        if (signature.type === 'black-smoke') smokeType = " Black smoke is rising from your location.";

        toast({
            title: `🔥 Heat Signature Broadcasted!`,
            description: `'${signature.label}' is now live on the map.${smokeType}`,
        });

        if (signature.sound && audioRef.current) {
            audioRef.current.src = signature.sound;
            audioRef.current.play().catch(e => console.error("Audio play failed", e));
        }

        onOpenChange(false);
    }
    
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="bg-black/50 backdrop-blur-xl border-white/10 text-white">
                <DialogHeader>
                    <DialogTitle>Broadcast Heat</DialogTitle>
                    <DialogDescription>Signal what's happening at your location. Your friends will see it on their maps.</DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-3 md:grid-cols-4 gap-4 py-4">
                     {heatSignatures.map(sig => (
                        <Button key={sig.id} variant="outline" className="flex flex-col h-24 gap-2 bg-white/5 border-white/10 hover:bg-white/10" onClick={() => handleBroadcast(sig)}>
                            <span className="text-3xl">{sig.icon}</span>
                            <span className="text-xs text-center">{sig.label}</span>
                        </Button>
                     ))}
                </div>
            </DialogContent>
        </Dialog>
    )
};
