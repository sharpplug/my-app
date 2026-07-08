"use client";

import React, { useState, useEffect, useRef, useTransition } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Video, VideoOff, PhoneOff, Loader2, Sparkles, Volume2, Waves } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { nayaCallResponse } from '@/app/actions';

interface NayaCallProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function NayaCall({ open, onOpenChange }: NayaCallProps) {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isNayaThinking, setIsNayaThinking] = useState(false);
  const [lastNayaText, setLastNayaText] = useState("Hi! I'm Naya. How can I help you today?");
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
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
      toast({ variant: 'destructive', title: "Call Failed", description: "Camera and Microphone access are required for AI Video calls." });
    }
  };

  useEffect(() => {
    if (open) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [open]);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const captureFrame = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        return canvas.toDataURL('image/jpeg', 0.6);
      }
    }
    return undefined;
  };

  const handleSpeak = (text: string) => {
    if (isPending) return;

    startTransition(async () => {
      setIsNayaThinking(true);
      try {
        const frame = captureFrame();
        const response = await nayaCallResponse({
          photoDataUri: isVideoOff ? undefined : frame,
          userMessage: text,
        });

        setLastNayaText(response.textResponse);
        if (audioRef.current) {
          audioRef.current.src = response.audioDataUri;
          audioRef.current.play();
        }
      } catch (error) {
        toast({ variant: 'destructive', title: "Call Error", description: "Naya is having trouble speaking. Please try again." });
      } finally {
        setIsNayaThinking(false);
      }
    });
  };

  // Simulate "listening" - in a real app you'd use browser Web Speech API for STT
  const handleTalkToNaya = () => {
    setIsRecording(true);
    // Mock user speech for MVP demo
    setTimeout(() => {
      setIsRecording(false);
      handleSpeak("Hey Naya, can you see me? How's my vibe today?");
    }, 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full h-full max-w-full p-0 m-0 border-0 bg-black text-white flex flex-col overflow-hidden">
        <DialogHeader className="absolute top-0 left-0 right-0 z-20 flex-row items-center justify-between p-4 bg-gradient-to-b from-black/50 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center border-2 border-white/20">
              <Sparkles className="w-6 h-6 text-white animate-pulse" />
            </div>
            <div>
              <DialogTitle className="text-white text-lg">AI Call with Naya</DialogTitle>
              <div className="flex items-center gap-1.5 text-xs text-green-400">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                Live
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Remote View (Naya's "Presence") */}
        <div className="flex-1 relative flex items-center justify-center bg-zinc-900">
          <div className={cn(
            "w-48 h-48 rounded-full bg-primary/10 border-4 border-primary/20 flex items-center justify-center relative",
            isNayaThinking && "animate-pulse"
          )}>
            <Sparkles className={cn("w-24 h-24 text-primary transition-all duration-500", isNayaThinking ? "scale-110 opacity-100" : "scale-100 opacity-50")} />
            {isNayaThinking && (
              <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
            )}
          </div>
          
          <div className="absolute bottom-32 left-0 right-0 px-8 text-center">
            <div className="max-w-md mx-auto p-4 rounded-2xl bg-black/40 backdrop-blur-md border border-white/10">
              <p className="text-lg font-medium leading-relaxed italic">
                {isNayaThinking ? "Thinking..." : `"${lastNayaText}"`}
              </p>
            </div>
          </div>
        </div>

        {/* Local Preview (User) */}
        <div className="absolute top-24 right-4 w-32 h-48 sm:w-40 sm:h-60 rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl bg-zinc-800 z-10 transition-all hover:scale-105">
          {isVideoOff ? (
            <div className="w-full h-full flex items-center justify-center bg-zinc-800">
              <VideoOff className="w-8 h-8 text-zinc-500" />
            </div>
          ) : (
            <video 
              ref={videoRef} 
              autoPlay 
              muted 
              playsInline 
              className="w-full h-full object-cover mirror"
              style={{ transform: 'scaleX(-1)' }}
            />
          )}
          <canvas ref={canvasRef} className="hidden" />
        </div>

        {/* Bottom Controls */}
        <div className="p-8 pb-12 bg-gradient-to-t from-black/80 to-transparent flex flex-col items-center gap-8">
          
          {/* Wave/Voice Visualization */}
          {(isNayaThinking || isRecording) && (
            <div className="flex items-center gap-1 h-12">
              {[...Array(8)].map((_, i) => (
                <div 
                  key={i} 
                  className="w-1.5 bg-primary rounded-full animate-bounce" 
                  style={{ 
                    height: `${Math.random() * 100}%`,
                    animationDelay: `${i * 0.1}s`,
                    animationDuration: '0.5s'
                  }} 
                />
              ))}
            </div>
          )}

          <div className="flex items-center gap-6 sm:gap-10">
            <Button 
              variant="outline" 
              size="icon" 
              className={cn("w-14 h-14 rounded-full border-white/20 text-white hover:bg-white/10", isMuted && "bg-red-500/20 border-red-500/50 text-red-500")}
              onClick={() => setIsMuted(!isMuted)}
            >
              {isMuted ? <MicOff /> : <Mic />}
            </Button>

            <Button 
              variant="outline" 
              size="icon" 
              className={cn("w-14 h-14 rounded-full border-white/20 text-white hover:bg-white/10", isVideoOff && "bg-red-500/20 border-red-500/50 text-red-500")}
              onClick={() => setIsVideoOff(!isVideoOff)}
            >
              {isVideoOff ? <VideoOff /> : <Video />}
            </Button>

            <div className="relative">
              <Button 
                size="icon" 
                className={cn(
                  "w-20 h-20 rounded-full bg-primary text-white shadow-lg transition-all active:scale-95",
                  isRecording && "ring-4 ring-primary/30 scale-110"
                )}
                onClick={handleTalkToNaya}
                disabled={isNayaThinking}
              >
                {isRecording ? <Waves className="w-10 h-10 animate-pulse" /> : <Volume2 className="w-10 h-10" />}
              </Button>
              {!isRecording && !isNayaThinking && (
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 whitespace-nowrap bg-black/50 px-3 py-1 rounded-full text-xs text-white/80">
                  Tap to Talk
                </div>
              )}
            </div>

            <Button 
              variant="destructive" 
              size="icon" 
              className="w-14 h-14 rounded-full shadow-lg"
              onClick={() => onOpenChange(false)}
            >
              <PhoneOff />
            </Button>
          </div>
        </div>

        <audio ref={audioRef} className="hidden" />
      </DialogContent>
    </Dialog>
  );
}
