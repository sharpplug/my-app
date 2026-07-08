
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { AnalyzeSkinConditionOutput } from "@/ai/flows/analyze-skin-condition";
import { Droplets, Sparkles, Heart, Repeat, Utensils, Info, ShieldAlert } from "lucide-react";
import { Separator } from "./ui/separator";
import { useRouter } from "next/navigation";
import { Button } from "./ui/button";

interface SkinCardProps {
  skinResult: AnalyzeSkinConditionOutput;
}

const RecommendationList = ({ title, items, icon: Icon, targetPage }: { title: string; items: string[]; icon: React.ElementType, targetPage: '/shop' | '/events' }) => {
  const router = useRouter();

  const handleClick = (item: string) => {
    const searchParams = new URLSearchParams({ q: item });
    router.push(`${targetPage}?${searchParams.toString()}`);
  }
  
  return (
    <div>
      <h4 className="flex items-center font-semibold mb-2">
        <Icon className="w-4 h-4 mr-2 text-primary" />
        {title}
      </h4>
      <div className="flex flex-wrap gap-2">
        {items.map((item, i) => (
           <Button key={i} variant="secondary" size="sm" className="h-auto font-normal" onClick={() => handleClick(item)}>
            {item}
          </Button>
        ))}
      </div>
    </div>
  );
};


export default function SkinCard({ skinResult }: SkinCardProps) {
  const {
    skinType,
    keyConcerns,
    detailedAnalysis,
    recommendedProducts,
    professionalTreatments,
    dailyRoutine,
    skinFriendlyFoods,
    disclaimer,
  } = skinResult;

  return (
    <Card className="w-full bg-card/50">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
                <Droplets className="text-primary" />
                <span className="font-headline text-2xl">Skin Analysis</span>
            </div>
            <Badge variant="default">{skinType}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
            <h3 className="font-semibold mb-3 text-lg">What We Noticed</h3>
            <div className="flex flex-wrap gap-2">
            {keyConcerns.map((concern, i) => (
                <Badge key={i} variant="secondary">
                {concern}
                </Badge>
            ))}
            </div>
        </div>

        {detailedAnalysis && detailedAnalysis.length > 0 && (
          <div className="space-y-4">
             <h3 className="font-semibold text-lg">Detailed Observations</h3>
             {detailedAnalysis.map((item, index) => (
                <div key={index} className="p-4 bg-muted/50 rounded-lg border">
                  <h4 className="font-bold flex items-center gap-2"><Info className="w-4 h-4 text-primary"/>{item.concern}</h4>
                  <p className="text-sm text-muted-foreground mt-1">{item.observation}</p>
                </div>
             ))}
          </div>
        )}

        <Separator />

        <div>
            <h3 className="font-semibold mb-4 text-lg">Your Personalized Plan</h3>
            <div className="grid md:grid-cols-2 gap-6">
                <RecommendationList title="Recommended Products" items={recommendedProducts} icon={Sparkles} targetPage="/shop"/>
                <RecommendationList title="Professional Treatments" items={professionalTreatments} icon={Heart} targetPage="/events"/>
                <RecommendationList title="Skin-Friendly Foods" items={skinFriendlyFoods} icon={Utensils} targetPage="/shop" />
                <div>
                    <h4 className="flex items-center font-semibold mb-2">
                        <Repeat className="w-4 h-4 mr-2 text-primary" />
                        Daily Routine
                    </h4>
                    <p className="text-sm text-muted-foreground bg-secondary px-3 py-2 rounded-md">{dailyRoutine}</p>
                </div>
            </div>
        </div>

        <div className="flex gap-3 p-4 rounded-lg bg-muted/50 border">
          <ShieldAlert className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            {disclaimer || "This is AI-generated cosmetic guidance, not a medical diagnosis. See a dermatologist for anything persistent, painful, or concerning."}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
