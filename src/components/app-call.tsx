"use client";

import React, { useState, useEffect, useRef, useTransition } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Video, VideoOff, PhoneOff, Loader2, Sparkles, Volume2, Waves, User, Phone, PhoneForwarded, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { nayaCallResponse } from '@/app/actions';
import { getIdToken } from '@/lib/get-id-token';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import Image from 'next/image';

export type CallTarget = {
  name: string;
  avatar?: string;
  type: 'ai' | 'user' | 'business';
  id?: string | number;
};

interface AppCallProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: CallTarget | null;
}

export default function AppCall({ open, onOpenChange, target }: AppCallProps) {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [status, setStatus] = useState<'ringing' | 'connected' | 'ended'>('ringing');
  const [lastAiText, setLastAiText] = useState("Hi! I'm Naya. How can I help you today?");
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
        video: { facingMode: 'user' },
        audio: true
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      toast({ variant: 'destructive', title: "Media Access Denied" });
    }
  };

  useEffect(() => {
    if (open && target) {
      startCamera();
      setStatus('ringing');
      const timer = setTimeout(() => setStatus('connected'), 2500);
      return () => clearTimeout(timer);
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [open, target]);

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
      if (ctx && video.videoWidth) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        return canvas.toDataURL('image/jpeg', 0.6);
      }
    }
    return undefined;
  };

  const handleAiSpeak = (text: string) => {
    if (isPending || !target || target.type !== 'ai') return;
    startTransition(async () => {
      setIsThinking(true);
      try {
        const idToken = await getIdToken();
        const frame = isVideoOff ? undefined : captureFrame();
        const response = await nayaCallResponse(idToken, { userMessage: text, photoDataUri: frame });
        setLastAiText(response.textResponse);
        if (audioRef.current) {
          audioRef.current.src = response.audioDataUri;
          audioRef.current.play();
        }
      } catch (error) {
        toast({ variant: 'destructive', title: "AI Voice Offline" });
      } finally {
        setIsThinking(false);
      }
    });
  };

  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const handleInteraction = () => {
    if (status !== 'connected' || target?.type !== 'ai') return;

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
      if (transcript) handleAiSpeak(transcript);
    };
    recognition.onerror = () => {
      toast({ variant: 'destructive', title: "Didn't catch that", description: "Please try speaking again." });
    };
    recognition.onend = () => setIsRecording(false);

    recognition.start();
  };

  useEffect(() => {
    return () => recognitionRef.current?.abort();
  }, []);

  if (!target) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full h-full max-w-full p-0 m-0 border-0 bg-black text-white flex flex-col overflow-hidden">
        <DialogHeader className="absolute top-0 left-0 right-0 z-20 flex-row items-center justify-between p-6 bg-gradient-to-b from-black/60 to-transparent">
          <div className="flex items-center gap-4">
            <div className={cn("w-12 h-12 rounded-full flex items-center justify-center border-2 border-white/20", target.type === 'ai' ? 'bg-primary' : 'bg-zinc-800')}>
              {target.type === 'ai' ? <Sparkles className="w-6 h-6" /> : <User className="w-6 h-6" />}
            </div>
            <div>
              <DialogTitle className="text-white text-xl font-headline">{target.type === 'ai' ? 'Naya AI' : target.name}</DialogTitle>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-green-400">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" /> {status === 'connected' ? 'Connected' : 'Ringing...'}
              </div>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="text-white" onClick={() => onOpenChange(false)}><X /></Button>
        </DialogHeader>

        <div className="flex-1 relative flex items-center justify-center bg-zinc-950">
          {status === 'connected' ? (
            target.type === 'ai' ? (
              <div className="flex flex-col items-center gap-8">
                <div className={cn("w-48 h-48 rounded-full border-4 border-primary/30 flex items-center justify-center relative", isThinking && "animate-pulse")}>
                  <Sparkles className={cn("w-20 h-20 text-primary transition-all duration-700", isThinking ? "scale-125 opacity-100" : "opacity-40")} />
                  {isThinking && <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />}
                </div>
                <div className="max-w-xs text-center p-4 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl">
                  <p className="text-lg italic font-medium">"{isThinking ? "Listening..." : lastAiText}"</p>
                </div>
              </div>
            ) : (
              <div className="w-full h-full relative">
                <Image src={target.avatar || `https://picsum.photos/seed/${target.name}/800/1200`} alt="Target" fill className="object-cover opacity-40 grayscale" />
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8">
                  <div className="p-10 bg-black/40 backdrop-blur-2xl rounded-[3rem] border border-white/10">
                    <p className="text-2xl font-bold font-headline mb-2">Video Encrypted</p>
                    <p className="text-neutral-400 text-sm">Connection quality is excellent.</p>
                  </div>
                </div>
              </div>
            )
          ) : (
            <div className="flex flex-col items-center gap-6 animate-in fade-in zoom-in duration-500">
              <Avatar className="w-32 h-32 border-4 border-white/10 shadow-2xl">
                <AvatarImage src={target.avatar} />
                <AvatarFallback className="text-4xl">{target.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <h3 className="text-3xl font-headline font-bold">{target.name}</h3>
            </div>
          )}
        </div>

        {/* Self Preview */}
        <div className="absolute top-28 right-6 w-32 h-48 rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl bg-zinc-900 z-10">
          {!isVideoOff ? (
            <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover scale-x-[-1]" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-zinc-800"><VideoOff className="w-8 h-8 text-zinc-600" /></div>
          )}
        </div>

        <div className="p-10 pb-16 bg-gradient-to-t from-black via-black/80 to-transparent flex flex-col items-center gap-8">
          {(isThinking || isRecording) && (
            <div className="flex items-center gap-1.5 h-10">
              {[...Array(12)].map((_, i) => (
                <div key={i} className="w-1 bg-primary rounded-full animate-bounce" style={{ height: `${20 + Math.random() * 80}%`, animationDelay: `${i * 0.05}s` }} />
              ))}
            </div>
          )}

          <div className="flex items-center gap-8">
            <Button variant="outline" size="icon" className={cn("w-14 h-14 rounded-full border-white/10", isMuted && "bg-red-500/20 text-red-500")} onClick={() => setIsMuted(!isMuted)}>
              {isMuted ? <MicOff /> : <Mic />}
            </Button>
            
            <div className="relative">
              <Button size="icon" className={cn("w-20 h-20 rounded-full bg-primary shadow-xl transition-all", isRecording && "scale-110 ring-4 ring-primary/20")} onClick={handleInteraction} disabled={isThinking || status === 'ringing'}>
                {isRecording ? <Waves className="w-10 h-10 animate-pulse" /> : <Volume2 className="w-10 h-10" />}
              </Button>
              {status === 'connected' && !isRecording && !isThinking && (
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 text-[10px] font-bold uppercase tracking-widest text-white/60 whitespace-nowrap">Tap to Talk</div>
              )}
            </div>

            <Button variant="destructive" size="icon" className="w-14 h-14 rounded-full shadow-lg" onClick={() => onOpenChange(false)}><PhoneOff /></Button>
          </div>
        </div>
        <audio ref={audioRef} className="hidden" />
        <canvas ref={canvasRef} className="hidden" />
      </DialogContent>
    </Dialog>
  );
}