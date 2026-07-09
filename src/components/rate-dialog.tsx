"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { submitRating, type RatableEntityType } from "@/lib/ratings";

export default function RateDialog({
  open,
  onOpenChange,
  entityType,
  entityId,
  title,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityType: RatableEntityType;
  entityId: string;
  title: string;
}) {
  const { toast } = useToast();
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const reset = () => {
    setRating(0);
    setHoverRating(0);
    setComment("");
  };

  const handleSubmit = async () => {
    if (rating < 1) {
      toast({ variant: "destructive", title: "Pick a star rating first" });
      return;
    }
    setIsSubmitting(true);
    try {
      await submitRating(entityType, entityId, rating, comment.trim() || undefined);
      toast({ title: "Thanks for rating!", description: `Your feedback on "${title}" has been posted.` });
      reset();
      onOpenChange(false);
    } catch (err) {
      toast({ variant: "destructive", title: "Couldn't submit rating", description: err instanceof Error ? err.message : "Please try again." });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="sm:rounded-[2rem] max-w-sm">
        <DialogHeader>
          <DialogTitle>Rate {title}</DialogTitle>
          <DialogDescription>Your rating helps other Moood users choose with confidence.</DialogDescription>
        </DialogHeader>
        <div className="flex items-center justify-center gap-2 py-4">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(n)}
              onMouseEnter={() => setHoverRating(n)}
              onMouseLeave={() => setHoverRating(0)}
              className="p-1"
            >
              <Star className={cn("w-8 h-8 transition-colors", n <= (hoverRating || rating) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30")} />
            </button>
          ))}
        </div>
        <Textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Add a comment (optional)"
          className="min-h-[80px]"
          maxLength={500}
        />
        <DialogFooter>
          <Button className="w-full h-12 rounded-xl font-bold" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="animate-spin mr-2 w-4 h-4" /> : null} Submit Rating
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
