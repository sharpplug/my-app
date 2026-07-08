"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Camera, Radio, X, Loader2, Play, AlertTriangle, ShoppingBag, Users, MessageSquare } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface LiveStreamCreatorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function LiveStreamCreator({ open, onOpenChange }: LiveStreamCreatorProps) {
  const [step, setStep] = useState<'setup' | 'live'>('setup');
  const [title, setTitle] = useState('');
  const [isBusiness, setIsLiveShopping] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const { toast } = useToast();

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: true
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setHasPermission(true);
    } catch (err) {
      console.error("Camera error:", err);
      setHasPermission(false);
      toast({ variant: 'destructive', title: "Live Streaming Failed", description: "Camera and Microphone access are required to go live." });
    }
  };

  useEffect(() => {
    if (open) {
      startCamera();
    } else {
      stopCamera();
      setStep('setup');
      setTitle('');
      setIsLiveShopping(false);
    }
    return () => stopCamera();
  }, [open]);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const handleGoLive = () => {
    if (!title.trim()) {
      toast({ variant: 'destructive', title: "Title Required", description: "Give your show a name!" });
      return;
    }
    setIsStarting(true);
    // Simulate server connection
    setTimeout(() => {
      setStep('live');
      setIsStarting(false);
      toast({ title: "You are LIVE!", description: "Share your vibe with the community." });
    }, 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full h-full max-w-full p-0 m-0 border-0 bg-black text-white flex flex-col overflow-hidden">
        {step === 'setup' ? (
          <div className="flex-1 flex flex-col">
            <DialogHeader className="p-6 bg-zinc-900 border-b border-white/10">
              <div className="flex items-center justify-between">
                <DialogTitle className="text-xl flex items-center gap-2">
                  <Radio className="text-primary animate-pulse" /> Go Live
                </DialogTitle>
                <DialogClose asChild><Button variant="ghost" size="icon"><X /></Button></DialogClose>
              </div>
            </DialogHeader>
            
            <div className="flex-1 p-6 space-y-8 max-w-md mx-auto w-full">
              <div className="relative aspect-[9/16] bg-zinc-800 rounded-3xl overflow-hidden border-4 border-white/5 shadow-2xl">
                <video 
                  ref={videoRef} 
                  autoPlay 
                  muted 
                  playsInline 
                  className="w-full h-full object-cover"
                  style={{ transform: 'scaleX(-1)' }}
                />
                {!hasPermission && hasPermission !== null && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-black/60 backdrop-blur-sm">
                    <AlertTriangle className="w-12 h-12 text-amber-500 mb-4" />
                    <p>Camera access is blocked. Please enable it in your browser settings to go live.</p>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Show Title</Label>
                  <Input 
                    placeholder="e.g., My Morning Routine, Live Sale!..." 
                    className="bg-zinc-900 border-white/10 text-white h-12"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                  />
                </div>
                
                <div 
                  className={cn(
                    "p-4 rounded-xl border transition-all cursor-pointer flex items-center gap-4",
                    isBusiness ? "bg-primary/10 border-primary" : "bg-zinc-900 border-white/10"
                  )}
                  onClick={() => setIsLiveShopping(!isBusiness)}
                >
                  <div className={cn("p-2 rounded-lg", isBusiness ? "bg-primary/20" : "bg-white/5")}>
                    <ShoppingBag className={cn("w-6 h-6", isBusiness ? "text-primary" : "text-zinc-500")} />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold">Live Shopping</p>
                    <p className="text-xs text-zinc-400">Tag products from your shop to sell live.</p>
                  </div>
                </div>

                <Button 
                  className="w-full h-14 text-lg font-bold bg-primary hover:bg-primary/90"
                  onClick={handleGoLive}
                  disabled={isStarting || !hasPermission}
                >
                  {isStarting ? <Loader2 className="animate-spin mr-2" /> : <Play className="mr-2 fill-current" />}
                  Go Live Now
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 relative flex flex-col h-full">
            <video 
              ref={videoRef} 
              autoPlay 
              muted 
              playsInline 
              className="absolute inset-0 w-full h-full object-cover"
              style={{ transform: 'scaleX(-1)' }}
            />
            
            <div className="absolute top-0 left-0 right-0 p-6 z-20 flex justify-between items-start bg-gradient-to-b from-black/60 to-transparent">
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <Badge variant="destructive" className="animate-pulse flex items-center gap-1.5 px-3 py-1">
                    <div className="w-2 h-2 rounded-full bg-white animate-ping" /> LIVE
                  </Badge>
                  <Badge variant="secondary" className="bg-black/40 backdrop-blur-md flex items-center gap-1.5 px-3 py-1">
                    <Users className="w-3 h-3" /> 0
                  </Badge>
                </div>
                <h3 className="font-bold text-lg shadow-black [text-shadow:0_1px_4px_rgba(0,0,0,0.8)]">{title}</h3>
              </div>
              <Button variant="destructive" size="sm" onClick={() => onOpenChange(false)}>End Show</Button>
            </div>

            <div className="mt-auto p-6 z-20 space-y-4 bg-gradient-to-t from-black/80 to-transparent">
              <div className="h-48 overflow-hidden relative">
                <div className="absolute bottom-0 w-full space-y-2 opacity-60">
                  <p className="text-sm"><span className="font-bold text-primary">System:</span> Waiting for viewers to join...</p>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Input placeholder="Say something..." className="bg-black/40 border-white/20 text-white rounded-full h-12" />
                <Button size="icon" variant="secondary" className="rounded-full h-12 w-12"><MessageSquare/></Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
