"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Wand2, Camera, X } from "lucide-react";
import Image from "next/image";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-provider";
import { useRegional } from "@/contexts/language-provider";
import { getIdToken } from "@/lib/get-id-token";
import { generateEventDescription } from "@/app/actions";
import { createEvent } from "@/lib/events";
import { REGION_CENTERS } from "@/lib/catalog-data";
import { type UserProfile } from "@/lib/users";
import CameraView from "@/components/camera-view";

export default function CreateEventDialog({
  open,
  onOpenChange,
  profile,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: UserProfile | null;
  onCreated?: () => void;
}) {
  const { user } = useAuth();
  const { currency, region } = useRegional();
  const { toast } = useToast();

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [badge, setBadge] = useState("Mixed");
  const [date, setDate] = useState("");
  const [location, setLocation] = useState("");
  const [price, setPrice] = useState("0");
  const [details, setDetails] = useState("");
  const [description, setDescription] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const reset = () => {
    setTitle(""); setCategory(""); setBadge("Mixed"); setDate(""); setLocation("");
    setPrice("0"); setDetails(""); setDescription(""); setPhoto(null);
  };

  const handleGenerateDescription = async () => {
    if (!title.trim() || !category.trim()) {
      toast({ variant: "destructive", title: "Add a title and category first" });
      return;
    }
    setIsGenerating(true);
    try {
      const idToken = await getIdToken();
      const result = await generateEventDescription(idToken, {
        title,
        category,
        targetAudience: "Moood users in the area",
        details: details || `at ${location || "the venue"} on ${date || "the scheduled date"}`,
      });
      setDescription(result.description);
    } catch (err) {
      toast({ variant: "destructive", title: "Couldn't generate a description", description: err instanceof Error ? err.message : "Please try again." });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCreate = async () => {
    if (!user || !profile) return;
    const priceValue = parseFloat(price) || 0;
    if (!title.trim() || !category.trim() || !date.trim() || !location.trim()) {
      toast({ variant: "destructive", title: "Missing details", description: "Fill in the title, category, date, and location." });
      return;
    }
    setIsSaving(true);
    try {
      const center = REGION_CENTERS[region] ?? REGION_CENTERS.AE;
      await createEvent({
        organizerUid: user.uid,
        organizerHandle: profile.handle,
        title: title.trim(),
        date: date.trim(),
        location: location.trim(),
        priceValue,
        category: category.trim(),
        badge,
        image: photo ?? `https://picsum.photos/seed/${encodeURIComponent(title)}/600/400`,
        description: description.trim() || details.trim(),
        lat: center.lat,
        lng: center.lng,
      });
      toast({ title: "Event Created!", description: `"${title}" is now live on Links.` });
      reset();
      onOpenChange(false);
      onCreated?.();
    } catch (err) {
      toast({ variant: "destructive", title: "Couldn't create event", description: err instanceof Error ? err.message : "Please try again." });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
        <DialogContent className="sm:rounded-[2rem] max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Event</DialogTitle>
            <DialogDescription>List a real event on Links - paid tickets go straight to your wallet, free events just take RSVPs.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {photo ? (
              <div className="relative aspect-video w-full rounded-2xl overflow-hidden border">
                <Image src={photo} alt="Event photo" fill className="object-cover" />
                <Button variant="destructive" size="icon" className="absolute top-2 right-2 h-7 w-7" onClick={() => setPhoto(null)}><X className="w-3.5 h-3.5" /></Button>
              </div>
            ) : (
              <Button variant="outline" className="w-full h-20 rounded-2xl border-dashed flex-col gap-1.5" onClick={() => setIsCameraOpen(true)}>
                <Camera className="w-5 h-5" />
                <span className="text-xs">Add a photo (optional)</span>
              </Button>
            )}

            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Sunset Rooftop Jazz Night" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Category</Label>
                <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Music, Market, Wellness..." />
              </div>
              <div className="space-y-2">
                <Label>Ticket Price ({currency.symbol})</Label>
                <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0 for free entry" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Date & Time</Label>
                <Input value={date} onChange={(e) => setDate(e.target.value)} placeholder="Sat, Sep 20, 7:00 PM" />
              </div>
              <div className="space-y-2">
                <Label>Location</Label>
                <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Venue, City" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Extra Details (for AI description)</Label>
              <Input value={details} onChange={(e) => setDetails(e.target.value)} placeholder="Live band, food trucks, family friendly..." />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Description</Label>
                <Button type="button" variant="ghost" size="sm" className="h-7 text-xs gap-1.5" onClick={handleGenerateDescription} disabled={isGenerating}>
                  {isGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />} Write with AI
                </Button>
              </div>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe your event, or generate one with AI above." className="min-h-[90px]" />
            </div>
          </div>

          <DialogFooter>
            <Button className="w-full h-12 rounded-xl font-bold" onClick={handleCreate} disabled={isSaving}>
              {isSaving ? <Loader2 className="animate-spin mr-2 w-4 h-4" /> : null} Publish Event
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <CameraView open={isCameraOpen} onOpenChange={setIsCameraOpen} onUsePhoto={setPhoto} title="Take a photo for your event" />
    </>
  );
}
