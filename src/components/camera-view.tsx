"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowRightLeft, Repeat, Camera as CameraIcon, Video, X, Lock, RefreshCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

interface CameraViewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUsePhoto: (dataUri: string) => void;
  onUseVideo?: (dataUri: string) => void; 
  title?: string;
}

export default function CameraView({ open, onOpenChange, onUsePhoto, onUseVideo, title = "Capture Vibe" }: CameraViewProps) {
  const [step, setStep] = useState<"live" | "captured">("live");
  const [media, setMedia] = useState<{ type: 'photo' | 'video', uri: string } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [isRecording, setIsRecording] = useState(false);
  const [recordMode, setRecordMode] = useState<'photo' | 'video'>('photo');
  const [isLocked, setIsLocked] = useState(false);
  const [isVideoReady, setIsVideoReady] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const holdTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const cleanupStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsVideoReady(false);
  }, []);

  const getCameraPermission = useCallback(async (currentFacingMode: "user" | "environment") => {
    cleanupStream();
    setHasCameraPermission(null);
    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: currentFacingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: !!onUseVideo
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          setIsVideoReady(true);
          videoRef.current?.play().catch(console.error);
        };
      }
      setHasCameraPermission(true);
    } catch (error) {
      console.error('Error accessing camera:', error);
      setHasCameraPermission(false);
      toast({
        variant: 'destructive',
        title: 'Camera Access Denied',
        description: 'Please enable camera permissions in your browser settings.',
      });
    }
  }, [onUseVideo, toast, cleanupStream]);

  useEffect(() => {
    if (open) {
      setStep("live");
      setMedia(null);
      getCameraPermission(facingMode);
    } else {
      cleanupStream();
      setRecordMode('photo');
      setIsLocked(false);
    }
    
    return () => {
      cleanupStream();
      if (recordingTimeoutRef.current) clearTimeout(recordingTimeoutRef.current);
      if (holdTimeoutRef.current) clearTimeout(holdTimeoutRef.current);
    };
  }, [open, facingMode, getCameraPermission, cleanupStream]);

  const handleCapturePhoto = () => {
    const video = videoRef.current;
    if (video && isVideoReady) {
      const canvas = document.createElement("canvas");
      const maxDim = 1024;
      let width = video.videoWidth;
      let height = video.videoHeight;

      if (width > height) {
        if (width > maxDim) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        }
      } else if (height > maxDim) {
        width = Math.round((width * maxDim) / height);
        height = maxDim;
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        if (facingMode === 'user') {
          ctx.translate(canvas.width, 0);
          ctx.scale(-1, 1);
        }
        ctx.drawImage(video, 0, 0, width, height);
        setMedia({ type: 'photo', uri: canvas.toDataURL("image/jpeg", 0.85) });
        setStep("captured");
        cleanupStream();
      }
    }
  };

  const startRecording = () => {
    if (!streamRef.current || !onUseVideo || !videoRef.current) return;
    setIsRecording(true);
    const recordedChunks: Blob[] = [];
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : 'video/webm';
    mediaRecorderRef.current = new MediaRecorder(streamRef.current, { mimeType });
    
    mediaRecorderRef.current.ondataavailable = (event) => {
      if (event.data.size > 0) recordedChunks.push(event.data);
    };
    
    mediaRecorderRef.current.onstop = () => {
      const blob = new Blob(recordedChunks, { type: 'video/webm' });
      setMedia({ type: 'video', uri: URL.createObjectURL(blob) });
      setStep("captured");
      cleanupStream();
      setIsRecording(false);
    };
    
    mediaRecorderRef.current.start();
    recordingTimeoutRef.current = setTimeout(() => stopRecording(), 15000);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    if (recordingTimeoutRef.current) {
      clearTimeout(recordingTimeoutRef.current);
      recordingTimeoutRef.current = null;
    }
    setIsRecording(false);
    setIsLocked(false);
  };

  const handleUseMedia = async () => {
    if (!media) return;
    setIsProcessing(true);
    try {
      if(media.type === 'photo') {
        onUsePhoto(media.uri);
      } else if(media.type === 'video' && onUseVideo) {
        const response = await fetch(media.uri);
        const blob = await response.blob();
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = () => {
          onUseVideo(reader.result as string);
          onOpenChange(false);
        };
        return; // Wait for reader
      }
      onOpenChange(false);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Processing Failed' });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(
        "p-0 border-0 bg-black text-white flex flex-col backdrop-blur-md",
        isMobile ? "w-full h-full max-w-full" : "max-w-md h-auto sm:rounded-3xl"
      )}>
        <DialogHeader className="flex-row items-center justify-between p-4 absolute top-0 left-0 right-0 z-30 bg-gradient-to-b from-black/60 to-transparent">
          <DialogTitle className="text-white font-headline">{title}</DialogTitle>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/10" onClick={() => setFacingMode(f => f === 'user' ? 'environment' : 'user')} disabled={step !== 'live'}><ArrowRightLeft/></Button>
            <DialogClose asChild><Button variant="ghost" size="icon" className="text-white hover:bg-white/10"><X/></Button></DialogClose>
          </div>
        </DialogHeader>

        <div className="flex-1 flex items-center justify-center p-4 bg-zinc-900">
          <div className="relative aspect-[9/16] w-full max-w-[320px] rounded-[2rem] overflow-hidden border-4 border-white/10 bg-black shadow-2xl">
            <video 
              ref={videoRef} 
              className={cn("w-full h-full object-cover", step !== 'live' && "hidden")} 
              autoPlay muted playsInline 
              style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'scaleX(1)' }}
            />
            {step === "captured" && media?.type === 'photo' && (
              <Image src={media.uri} alt="Captured" fill className="object-cover" unoptimized />
            )}
            {step === 'captured' && media?.type === 'video' && (
              <video src={media.uri} className="w-full h-full object-cover" autoPlay loop />
            )}
            {hasCameraPermission === false && (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center gap-4">
                <Alert variant="destructive"><AlertTitle>No Access</AlertTitle></Alert>
                <Button variant="secondary" size="sm" onClick={() => getCameraPermission(facingMode)}><RefreshCcw className="mr-2 h-4 w-4"/> Retry</Button>
              </div>
            )}
          </div>
        </div>
        
        {step === 'live' && onUseVideo && (
          <div className="absolute bottom-32 left-1/2 -translate-x-1/2 flex gap-2 bg-black/40 p-1 rounded-full z-20 backdrop-blur-xl border border-white/10">
            <button onClick={() => setRecordMode('photo')} className={cn("px-4 py-1.5 rounded-full text-xs font-bold transition-all", recordMode === 'photo' ? 'bg-white text-black' : 'text-white/60')}>PHOTO</button>
            <button onClick={() => setRecordMode('video')} className={cn("px-4 py-1.5 rounded-full text-xs font-bold transition-all", recordMode === 'video' ? 'bg-white text-black' : 'text-white/60')}>VIDEO</button>
          </div>
        )}

        <div className="h-32 bg-black flex items-center justify-center relative z-20">
          {step === "live" ? (
            <button
              onClick={() => recordMode === 'photo' ? handleCapturePhoto() : (isRecording ? stopRecording() : startRecording())}
              disabled={!isVideoReady}
              className={cn("w-20 h-20 rounded-full border-4 border-white flex items-center justify-center transition-all", isRecording && "scale-110 border-red-500")}
            >
              <div className={cn("w-16 h-16 rounded-full bg-white transition-all", isRecording && "w-8 h-8 bg-red-500 rounded-sm")} />
            </button>
          ) : (
            <div className="flex w-full px-8 justify-between">
              <Button variant="ghost" className="text-white" onClick={() => { setMedia(null); setStep("live"); getCameraPermission(facingMode); }}><Repeat className="mr-2"/> Retake</Button>
              <Button size="lg" className="rounded-full px-8" onClick={handleUseMedia} disabled={isProcessing}>
                {isProcessing ? <Loader2 className="animate-spin mr-2"/> : (media?.type === 'photo' ? <CameraIcon className="mr-2"/> : <Video className="mr-2" />)}
                Send
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}