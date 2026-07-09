"use client";

import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

/** Read-only star display for an average rating. Renders nothing
 * meaningful (a muted "No ratings yet") when count is 0, rather than
 * showing a fake 5-star default. */
export default function RatingStars({
  average,
  count,
  size = "sm",
  showCount = true,
}: {
  average: number;
  count: number;
  size?: "sm" | "md";
  showCount?: boolean;
}) {
  const starSize = size === "md" ? "w-4 h-4" : "w-3 h-3";

  if (count === 0) {
    return <span className="text-xs text-muted-foreground">No ratings yet</span>;
  }

  return (
    <div className="flex items-center gap-1">
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((n) => (
          <Star
            key={n}
            className={cn(starSize, n <= Math.round(average) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30")}
          />
        ))}
      </div>
      <span className="text-xs font-bold">{average.toFixed(1)}</span>
      {showCount && <span className="text-xs text-muted-foreground">({count})</span>}
    </div>
  );
}
