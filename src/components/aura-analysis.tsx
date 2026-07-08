
"use client";

import { useState, useTransition, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Camera, FileText, Loader2, Upload } from "lucide-react";
import CameraView from "./camera-view";
import MoodCard from "./mood-card";
import SkinCard from "./skin-card";
import { getAuraAnalysis, AuraAnalysisResult } from "@/app/actions";
import { useDynamicTheme } from "@/contexts/theme-provider";
import { useToast } from "@/hooks/use-toast";
import { getIdToken } from "@/lib/get-id-token";
import Image from 'next/image';

type AnalysisState = "idle" | "photo" | "text" | "analyzing" | "results";

const CONFIG_ERROR_MESSAGE = "The Gemini API is not enabled for your project. Please go to the Google Cloud Console, enable the 'Gemini API' for project 'moood-85d1s', and ensure a billing account is linked.";

const fileToDataUri = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export default function AuraAnalysis() {
  const [analysisState, setAnalysisState] = useState<AnalysisState>("idle");
  const [textDescription, setTextDescription] = useState("");
  const [photoDataUri, setPhotoDataUri] = useState<string | null>(null);
  const [results, setResults] = useState<AuraAnalysisResult | null>(null);
  const [isPending, startTransition] = useTransition();
  const { applyTheme } = useDynamicTheme();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUsePhoto = (dataUri: string) => {
    setPhotoDataUri(dataUri);
    handleAnalysis({ photoDataUri: dataUri, textDescription: textDescription });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const dataUri = await fileToDataUri(file);
        handleUsePhoto(dataUri);
      } catch (error) {
        toast({ variant: "destructive", title: "Upload Failed", description: "Could not read the file." });
      }
    }
  };
  
  const handleTextAnalysis = () => {
    if (textDescription.trim()) {
      handleAnalysis({ textDescription: textDescription, photoDataUri: photoDataUri || undefined });
    }
  };

  const handleAnalysis = (input: { photoDataUri?: string; textDescription?: string }) => {
    setAnalysisState("analyzing");
    startTransition(async () => {
      try {
        const idToken = await getIdToken();
        const analysisResults = await getAuraAnalysis(idToken, input);

        if (analysisResults.mood.mood === "CONFIG_ERROR") {
            toast({
                variant: "destructive",
                title: "Action Required: Configure Gemini API",
                description: CONFIG_ERROR_MESSAGE,
                duration: 20000,
            });
            resetState();
            return;
        }

        setResults(analysisResults);
        setAnalysisState("results");

        if (input.photoDataUri && analysisResults.mood.mood && analysisResults.mood.recommendedThemeColors.length > 0) {
          applyTheme({
              themeName: analysisResults.mood.mood,
              colorPalette: analysisResults.mood.recommendedThemeColors,
          });
        }
      } catch (error) {
        console.error(error);
        toast({
          variant: "destructive",
          title: "Analysis Failed",
          description: error instanceof Error ? error.message : "Something went wrong. Please try again.",
        });
        resetState();
      }
    });
  };

  const resetState = () => {
    setAnalysisState("idle");
    setResults(null);
    setPhotoDataUri(null);
    setTextDescription("");
  };

  if (isPending || analysisState === "analyzing") {
    return (
      <div className="flex flex-col items-center justify-center text-center p-8 min-h-[400px]">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <h2 className="text-2xl font-headline font-semibold mb-2">Analyzing your Aura...</h2>
        <p className="text-muted-foreground">Our AI is working its magic. This may take a moment.</p>
        {photoDataUri && (
          <div className="relative w-48 h-48 mt-6">
            <Image src={photoDataUri} alt="Analysis subject" fill className="rounded-lg object-cover shadow-lg" />
          </div>
        )}
      </div>
    );
  }

  if (analysisState === "results" && results) {
    return (
      <div className="flex flex-col gap-8">
        <MoodCard moodResult={results.mood} />
        {results.skin && <SkinCard skinResult={results.skin} />}
        <Button onClick={resetState} variant="outline" className="w-full sm:w-auto mx-auto">Start New Analysis</Button>
      </div>
    );
  }

  return (
    <div className="text-center">
      <h2 className="text-2xl font-headline font-semibold mb-2">Aura Analysis</h2>
      <p className="text-muted-foreground mb-6">
        How are you feeling today? Let our AI analyze your mood and skin.
      </p>

      {analysisState === "idle" && (
        <div className="flex flex-col gap-4 max-w-sm mx-auto">
          <Button size="lg" onClick={() => setAnalysisState("photo")} className="w-full">
            <Camera className="mr-2" />
            Photo Analysis
          </Button>
          <Button size="lg" variant="secondary" onClick={() => fileInputRef.current?.click()} className="w-full">
            <Upload className="mr-2" />
            Upload Photo
          </Button>
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept="image/*" 
            onChange={handleFileUpload}
          />
          <Button size="lg" variant="outline" onClick={() => setAnalysisState("text")} className="w-full">
            <FileText className="mr-2" />
            Text-only Analysis
          </Button>
        </div>
      )}

      <CameraView
        open={analysisState === "photo"}
        onOpenChange={(isOpen) => !isOpen && setAnalysisState("idle")}
        onUsePhoto={handleUsePhoto}
        title="Get your Aura"
      />

      {analysisState === "text" && (
        <div className="flex flex-col gap-4 max-w-lg mx-auto">
          <Textarea
            placeholder="I feel so tired today, and my face feels puffy and dry..."
            value={textDescription}
            onChange={(e) => setTextDescription(e.target.value)}
            rows={4}
          />
          <div className="flex gap-4 justify-center">
            <Button size="lg" onClick={handleTextAnalysis} disabled={!textDescription.trim()}>Analyze Aura</Button>
            <Button size="lg" variant="outline" onClick={() => setAnalysisState("idle")}>Cancel</Button>
          </div>
        </div>
      )}
    </div>
  );
}
