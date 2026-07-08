
"use client";

import AuraAnalysis from "@/components/aura-analysis";
import NayaWellness from "@/components/naya-wellness";
import { Separator } from "@/components/ui/separator";

export default function AuraNaya() {
  return (
    <div className="flex flex-col gap-12">
        <div className="text-center">
            <h1 className="text-3xl font-headline font-bold">Aura x Naya</h1>
            <p className="text-muted-foreground mt-1">Your AI beauty & wellness companion</p>
        </div>
      <AuraAnalysis />
      <Separator />
      <NayaWellness />
    </div>
  );
}
