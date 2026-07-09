"use client";

import Image from "next/image";
import Link from "next/link";
import { Card, CardHeader, CardContent, CardFooter, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Megaphone } from "lucide-react";
import { cn } from "@/lib/utils";
import AdTierBadge from "@/components/ad-tier-badge";
import type { Ad } from "@/lib/ads";

/** A real, partner-paid promotion dropped into a marketplace grid (Shop,
 * Links > Events, Links > Stays) - see src/lib/ads.ts. Disappears on its
 * own once the ad's paid duration runs out. */
export default function PromotedTile({ ad, aspect = "square" }: { ad: Ad; aspect?: "square" | "video" }) {
  return (
    <Card className="overflow-hidden flex flex-col h-full border-amber-400/30 bg-amber-500/5 shadow-sm hover:shadow-md transition-shadow">
      <div className={cn("relative w-full bg-muted", aspect === "square" ? "aspect-square" : "aspect-video")}>
        {ad.image ? (
          <Image src={ad.image} alt={ad.title} fill className="object-cover" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/20 to-purple-600/20" />
        )}
        <Badge className="absolute top-2 left-2 bg-amber-500/90 border-0 gap-1 text-black"><Megaphone className="w-3 h-3" /> Promoted</Badge>
        <div className="absolute top-2 right-2"><AdTierBadge tier={ad.tier} /></div>
      </div>
      <CardHeader className="p-3 pb-1">
        <CardTitle className="text-sm font-bold truncate">{ad.title}</CardTitle>
      </CardHeader>
      <CardContent className="flex-grow p-3 pt-0">
        <p className="text-[10px] text-muted-foreground line-clamp-2">{ad.description}</p>
      </CardContent>
      <CardFooter className="p-3 pt-0">
        <Button asChild size="sm" className="w-full rounded-full bg-amber-500 hover:bg-amber-400 text-black font-bold">
          <Link href={ad.linkPath}>View</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
