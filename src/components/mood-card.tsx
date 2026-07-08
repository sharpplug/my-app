
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { AnalyzeUserMoodOutput } from "@/ai/flows/analyze-user-mood";
import { Smile, Zap, Heart, Utensils, Palette } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "./ui/button";

interface MoodCardProps {
  moodResult: AnalyzeUserMoodOutput;
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


export default function MoodCard({ moodResult }: MoodCardProps) {
  const {
    mood,
    confidence,
    recommendedProducts,
    recommendedServices,
    recommendedFoods,
    recommendedThemeColors,
  } = moodResult;

  return (
    <Card className="w-full bg-card/50">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Smile className="text-primary" />
            <span className="font-headline text-2xl">Mood Analysis</span>
          </div>
          <Badge variant={confidence > 0.7 ? "default" : "secondary"}>
            {mood} - {Math.round(confidence * 100)}% Confidence
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid md:grid-cols-2 gap-6">
            <RecommendationList title="Recommended Products" items={recommendedProducts} icon={Zap} targetPage="/shop" />
            <RecommendationList title="Recommended Services" items={recommendedServices} icon={Heart} targetPage="/events" />
            <RecommendationList title="Recommended Foods" items={recommendedFoods} icon={Utensils} targetPage="/shop" />
            
            <div>
                <h4 className="flex items-center font-semibold mb-2">
                    <Palette className="w-4 h-4 mr-2 text-primary" />
                    Color Palette
                </h4>
                <div className="flex flex-wrap gap-2">
                    {recommendedThemeColors.map((color, i) => (
                        <div key={i} className="flex items-center gap-2">
                        <div
                            className="w-6 h-6 rounded-full border"
                            style={{ backgroundColor: color }}
                        />
                        <span className="text-sm text-muted-foreground">{color}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
      </CardContent>
    </Card>
  );
}
