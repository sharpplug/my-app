"use client";

import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { TIER_INFO, type AdTier } from "@/lib/ads";

/** Verification stars shown on a promoted ad, one filled star per paid
 * tier level (see TIER_INFO in src/lib/ads.ts) - Basic gets 1, Featured 2,
 * Premium 3 (+ a "Verified Partner" label). */
export default function AdTierBadge({ tier, className }: { tier: AdTier; className?: string }) {
  const info = TIER_INFO[tier];
  return (
    <div className={cn("inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-2 py-0.5 text-amber-300", className)}>
      <div className="flex items-center">
        {Array.from({ length: 3 }).map((_, i) => (
          <Star key={i} className={cn("w-2.5 h-2.5", i < info.stars ? "fill-amber-300 text-amber-300" : "text-amber-300/30")} />
        ))}
      </div>
      <span className="text-[9px] font-bold uppercase tracking-wider">{info.label}</span>
    </div>
  );
}
