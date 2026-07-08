
"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Sparkles, Heart, Utensils, Home, Bot, User, Send, Calendar, CheckCircle2, Camera, Paperclip, X } from "lucide-react";
import { getNayaHealth } from "@/app/actions";
import { useToast } from "@/hooks/use-toast";
import { getIdToken } from "@/lib/get-id-token";
import type { AnalyzeNayaHealthOutput } from "@/ai/flows/analyze-naya-health";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "./ui/badge";
import { Card, CardContent } from "./ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { ScrollArea } from "./ui/scroll-area";
import { Carousel, CarouselContent, CarouselItem } from "./ui/carousel";
import { cn } from "@/lib/utils";
import CameraView from "./camera-view";
import { useRouter } from "next/navigation";

const fileToDataUri = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};


type NayaResult = AnalyzeNayaHealthOutput;
type Message = {
    type: 'user' | 'naya' | 'system';
    content: string | NayaResult;
    photoUri?: string;
}
type SelectionStep = 'gender' | 'lifeStage' | 'chat';

const femaleLifeStages = [
    { value: "menstrual-health", label: "Menstrual Health" },
    { value: "fertility-conception", label: "Fertility & Conception" },
    { value: "pregnancy", label: "Pregnancy" },
    { value: "postpartum-recovery", label: "Postpartum Recovery" },
    { value: "perimenopause", label: "Perimenopause" },
    { value: "menopause", label: "Menopause" },
    { value: "teen-wellness-female", label: "Teen Wellness (Female)" },
    { value: "young-woman-wellness", label: "Young Woman Wellness" },
    { value: "hormonal-balance", label: "Hormonal Balance" },
    { value: "general-wellness-female", label: "General Wellness (Female)" },
];

const maleLifeStages = [
    { value: "new-dad", label: "New Dad" },
    { value: "teen-wellness-male", label: "Teen Wellness (Male)" },
    { value: "young-men-health", label: "Young Men's Health" },
    { value: "performance-vitality", label: "Performance & Vitality" },
    { value: "stress-management", label: "Stress Management" },
    { value: "hair-scalp-health", label: "Hair & Scalp Health" },
    { value: "digestive-health", label: "Digestive Health" },
    { value: "fitness-nutrition", label: "Fitness & Nutrition" },
    { value: "prostate-health", label: "Prostate Health" },
    { value: "general-wellness-male", label: "General Wellness (Male)" },
];


const ResultDisplay = ({ result }: { result: NayaResult }) => {
    const router = useRouter();
    const handleRecommendationClick = (item: string, type: 'product' | 'service') => {
        const targetPage = type === 'product' ? '/shop' : '/events';
        const searchParams = new URLSearchParams({ q: item });
        router.push(`${targetPage}?${searchParams.toString()}`);
    }

    return (
        <div className="space-y-6 text-left">
            <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
                <p className="text-foreground/80 leading-relaxed">{result.advice}</p>
            </div>

            {result.homeRemedies && result.homeRemedies.length > 0 && (
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="home-remedies">
                  <AccordionTrigger className="text-lg font-semibold">
                    <div className="flex items-center gap-2"><Home /> Home Remedies</div>
                  </AccordionTrigger>
                  <AccordionContent className="pt-2 space-y-4">
                    {result.homeRemedies.map((remedy, i) => (
                      <div key={i} className="p-3 border rounded-lg">
                        <h4 className="font-bold">{remedy.name}</h4>
                        <p className="text-xs text-muted-foreground mt-1 mb-2">{remedy.instructions}</p>
                        <div className="flex flex-wrap gap-1">
                            {remedy.ingredients.map((ing, j) => <Badge key={j} variant="secondary">{ing}</Badge>)}
                        </div>
                      </div>
                    ))}
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            )}

            <div className="grid md:grid-cols-2 gap-4">
                <div className="p-4 bg-card rounded-lg border">
                    <h3 className="flex items-center font-semibold mb-3"><Sparkles className="w-4 h-4 mr-2 text-primary"/> Recommended Products</h3>
                    <div className="flex flex-wrap gap-2">
                        {result.productRecommendations.map((item, i) => <Button key={i} variant="outline" size="sm" className="h-auto" onClick={() => handleRecommendationClick(item, 'product')}>{item}</Button>)}
                    </div>
                </div>
                <div className="p-4 bg-card rounded-lg border">
                    <h3 className="flex items-center font-semibold mb-3"><Heart className="w-4 h-4 mr-2 text-destructive"/> Recommended Services</h3>
                     <div className="flex flex-wrap gap-2">
                        {result.serviceRecommendations.map((item, i) => <Button key={i} variant="destructive" size="sm" className="h-auto" onClick={() => handleRecommendationClick(item, 'service')}>{item}</Button>)}
                    </div>
                </div>
            </div>

            {result.mealPlan && result.mealPlan.length > 0 && (
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="meal-plan">
                  <AccordionTrigger className="text-lg font-semibold">
                    <div className="flex items-center gap-2"><Utensils /> Your 3-Day Meal Plan</div>
                  </AccordionTrigger>
                  <AccordionContent className="pt-4 space-y-4">
                    {result.mealPlan.map(dayPlan => (
                      <div key={dayPlan.day} className="p-4 border rounded-lg">
                        <h4 className="font-bold text-lg mb-2">{dayPlan.day}</h4>
                        <div className="space-y-2 text-sm">
                          <p><Badge variant="secondary">Breakfast</Badge> {dayPlan.breakfast}</p>
                          <p><Badge variant="secondary">Lunch</Badge> {dayPlan.lunch}</p>
                          <p><Badge variant="secondary">Dinner</Badge> {dayPlan.dinner}</p>
                          <p><Badge variant="secondary">Snacks</Badge> {dayPlan.snacks}</p>
                        </div>
                      </div>
                    ))}
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            )}
        </div>
    );
};


export default function NayaWellness() {
  const [messages, setMessages] = useState<Message[]>([
    { type: 'system', content: 'Let\'s get started. Please select your gender.' }
  ]);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const [input, setInput] = useState("");
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [gender, setGender] = useState("");
  const [lifeStage, setLifeStage] = useState("");
  const [selectionStep, setSelectionStep] = useState<SelectionStep>('gender');
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const lifeStages = gender === 'female' ? femaleLifeStages : maleLifeStages;
  const canStartChat = gender && lifeStage;

  useEffect(() => {
    if (scrollAreaRef.current) {
        scrollAreaRef.current.scrollTo({ top: scrollAreaRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages]);

  const handleGenderSelect = (selectedGender: string) => {
      setGender(selectedGender);
      setSelectionStep('lifeStage');
      setMessages(prev => [...prev, {type: 'system', content: `Great. Now, please select your current life stage.`}]);
  }

  const handleLifeStageSelect = (selectedLifeStage: string) => {
    setLifeStage(selectedLifeStage);
    setSelectionStep('chat');
    const stageLabel = lifeStages.find(s => s.value === selectedLifeStage)?.label;
    setMessages(prev => [...prev, {type: 'system', content: `Perfect. You've selected "${stageLabel}". How can Naya help you today? You can also attach a photo.`}]);
  }


  const handleSubmit = () => {
    if (!input.trim() || !canStartChat) return;

    const userMessage: Message = { type: 'user', content: input, photoUri: photoUri || undefined };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setPhotoUri(null);

    startTransition(async () => {
      try {
        const idToken = await getIdToken();
        const analysisResult = await getNayaHealth(idToken, { gender, lifeStage, concerns: input, photoDataUri: photoUri || undefined });
        const nayaMessage: Message = { type: 'naya', content: analysisResult };
        setMessages(prev => [...prev, nayaMessage]);
      } catch (error) {
        console.error(error);
        toast({
          variant: "destructive",
          title: "Analysis Failed",
          description: "Something went wrong. Please try again.",
        });
         const errorMessage: Message = { type: 'system', content: "Sorry, I couldn't process that. Please try again." };
         setMessages(prev => [...prev, errorMessage]);
      }
    });
  };
  
  const handlePhotoTaken = (dataUri: string) => {
    setPhotoUri(dataUri);
    setIsCameraOpen(false);
  };
  
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
        toast({
            variant: 'destructive',
            title: 'Unsupported File Type',
            description: 'Please select an image file.',
        });
        return;
    }

    const dataUri = await fileToDataUri(file);
    setPhotoUri(dataUri);
  };

  return (
    <>
    <div className="text-center">
      <h2 className="text-2xl font-headline font-semibold mb-2">Naya Wellness Coach</h2>
      <p className="text-muted-foreground mb-6">
        Chat with Naya about your health and wellness concerns.
      </p>
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="p-0">
          <ScrollArea className="h-[500px] p-4" ref={scrollAreaRef}>
             <div className="space-y-6">
                {messages.map((message, index) => (
                    <div key={index} className={cn('flex items-start gap-3', message.type === 'user' ? 'justify-end' : 'justify-start')}>
                       {message.type !== 'user' && (
                           <Avatar className="border">
                               <AvatarImage src="https://picsum.photos/seed/naya/40/40" alt="Naya" />
                               <AvatarFallback>N</AvatarFallback>
                           </Avatar>
                       )}
                       <div className={cn('rounded-lg p-3 max-w-md', message.type === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted')}>
                          {typeof message.content === 'string' ? (
                              <p className="text-sm text-left">{message.content}</p>
                          ) : (
                              <ResultDisplay result={message.content} />
                          )}
                          {message.photoUri && (
                            <div className="mt-2">
                               <Image src={message.photoUri} alt="User upload" width={200} height={200} className="rounded-lg" />
                            </div>
                          )}
                       </div>
                        {message.type === 'user' && <User className="w-8 h-8 p-1.5 rounded-full bg-muted text-muted-foreground" />}
                    </div>
                ))}
                {isPending && (
                     <div className="flex items-start gap-3 justify-start">
                         <Avatar className="border">
                            <AvatarImage src="https://picsum.photos/seed/naya/40/40" alt="Naya" />
                            <AvatarFallback>N</AvatarFallback>
                         </Avatar>
                        <div className="rounded-lg p-3 bg-muted flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin"/>
                            <p className="text-sm text-left text-muted-foreground">Naya is thinking...</p>
                        </div>
                     </div>
                )}
             </div>
          </ScrollArea>
          <div className="p-4 border-t bg-background/80 space-y-4">
             {selectionStep === 'gender' && (
                 <div className="grid grid-cols-2 gap-4">
                    <Button variant="outline" size="lg" onClick={() => handleGenderSelect('female')}>Female</Button>
                    <Button variant="outline" size="lg" onClick={() => handleGenderSelect('male')}>Male</Button>
                 </div>
             )}
             {selectionStep === 'lifeStage' && (
                 <Carousel opts={{align: 'start', dragFree: true}}>
                    <CarouselContent>
                        {lifeStages.map(stage => (
                             <CarouselItem key={stage.value} className="basis-auto">
                                <Button
                                     variant="outline"
                                     className="w-full"
                                     onClick={() => handleLifeStageSelect(stage.value)}
                                >
                                    {stage.label}
                                </Button>
                             </CarouselItem>
                        ))}
                    </CarouselContent>
                 </Carousel>
             )}
             {selectionStep === 'chat' && (
                <div className="space-y-2">
                     <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1"><CheckCircle2 className="w-4 h-4 text-green-500"/>Gender: <span className="font-semibold text-foreground capitalize">{gender}</span></div>
                        <div className="flex items-center gap-1"><CheckCircle2 className="w-4 h-4 text-green-500"/>Life Stage: <span className="font-semibold text-foreground">{lifeStages.find(s => s.value === lifeStage)?.label}</span></div>
                    </div>
                    {photoUri && (
                        <div className="relative w-24 h-24 rounded-md overflow-hidden">
                           <Image src={photoUri} alt="Preview" fill className="object-cover"/>
                           <Button variant="destructive" size="icon" className="absolute top-1 right-1 h-6 w-6" onClick={() => setPhotoUri(null)}>
                                <X className="h-4 w-4"/>
                           </Button>
                        </div>
                    )}
                    <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="flex items-center gap-2">
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileSelect}
                            className="hidden"
                            accept="image/*"
                        />
                        <Button type="button" variant="ghost" size="icon" onClick={() => setIsCameraOpen(true)} disabled={!!photoUri}>
                            <Camera className="w-4 h-4" />
                        </Button>
                         <Button type="button" variant="ghost" size="icon" onClick={() => fileInputRef.current?.click()} disabled={!!photoUri}>
                            <Paperclip className="w-4 h-4" />
                        </Button>
                      <Input 
                        placeholder={canStartChat ? "Describe your concern..." : "Please complete selections first"}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        disabled={!canStartChat || isPending}
                      />
                      <Button type="submit" disabled={!canStartChat || isPending || !input.trim()}>
                        <Send className="w-4 h-4" />
                      </Button>
                    </form>
                </div>
             )}
          </div>
        </CardContent>
      </Card>
    </div>
     <CameraView
        open={isCameraOpen}
        onOpenChange={setIsCameraOpen}
        onUsePhoto={handlePhotoTaken}
        title="Take a photo of your concern"
    />
    </>
  );
}
