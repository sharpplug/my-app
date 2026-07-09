"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { updateInterests } from "@/lib/users";
import { INTEREST_TAGS, MIN_INTERESTS } from "@/lib/interests";

/** Shown once after signup (vibes/page.tsx opens this when a profile has no
 * interests yet) and reopenable any time from Account settings. This is the
 * real "chosen at registration" signal that Find Friends discovery
 * (src/lib/social.ts) and interest-matched ad ranking (src/lib/ads.ts) are
 * built on - previously nothing like this existed. */
export default function InterestPickerDialog({
  open,
  onOpenChange,
  uid,
  initialInterests = [],
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  uid: string;
  initialInterests?: string[];
}) {
  const { toast } = useToast();
  const [selected, setSelected] = useState<string[]>(initialInterests);
  const [isSaving, setIsSaving] = useState(false);

  const toggle = (tag: string) => {
    setSelected((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  };

  const handleSave = async () => {
    if (selected.length < MIN_INTERESTS) {
      toast({ variant: "destructive", title: `Pick at least ${MIN_INTERESTS} interests`, description: "This helps us find your people and show you relevant promotions." });
      return;
    }
    setIsSaving(true);
    try {
      await updateInterests(uid, selected);
      toast({ title: "Interests Saved!", description: "Your Vibes feed, Find Friends, and promotions are now tuned to you." });
      onOpenChange(false);
    } catch (err) {
      toast({ variant: "destructive", title: "Couldn't save interests", description: err instanceof Error ? err.message : "Please try again." });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:rounded-[2rem] max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Sparkles className="w-5 h-5 text-primary" /> What are you into?</DialogTitle>
          <DialogDescription>Pick at least {MIN_INTERESTS} - we'll use these to find people like you and show promotions that actually matter to you.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap gap-2 py-2">
          {INTEREST_TAGS.map((tag) => {
            const isSelected = selected.includes(tag);
            return (
              <button
                key={tag}
                type="button"
                onClick={() => toggle(tag)}
                className={cn(
                  "px-4 py-2 rounded-full border text-sm font-bold transition-colors flex items-center gap-1.5",
                  isSelected ? "border-primary bg-primary/10 text-primary" : "border-white/10 bg-muted/30 text-muted-foreground"
                )}
              >
                {isSelected && <Check className="w-3.5 h-3.5" />} {tag}
              </button>
            );
          })}
        </div>

        <DialogFooter>
          <Button className="w-full h-12 rounded-xl font-bold" onClick={handleSave} disabled={isSaving}>
            {isSaving ? <Loader2 className="animate-spin mr-2 w-4 h-4" /> : null}
            Save Interests ({selected.length})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
