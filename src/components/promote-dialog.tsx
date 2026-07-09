"use client";

import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Megaphone, Camera, X } from "lucide-react";
import Image from "next/image";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-provider";
import { useRegional } from "@/contexts/language-provider";
import { purchaseAd, type AdTargetType } from "@/lib/ads";
import { subscribeToMyProducts, type Product } from "@/lib/products";
import { subscribeToMyStays, type HostedStay } from "@/lib/stays";
import { subscribeToMyEvents, type HostedEvent } from "@/lib/events";
import CameraView from "@/components/camera-view";

const DURATION_OPTIONS = [1, 3, 7, 14];
const PRICE_PER_DAY = 20;

type PickableListing = { key: string; targetType: AdTargetType; targetId: string; title: string; image: string; linkPath: string };

export default function PromoteDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { user } = useAuth();
  const { currency } = useRegional();
  const { toast } = useToast();

  const [myProducts, setMyProducts] = useState<Product[]>([]);
  const [myStays, setMyStays] = useState<HostedStay[]>([]);
  const [myEvents, setMyEvents] = useState<HostedEvent[]>([]);
  const [selectedKey, setSelectedKey] = useState<string>("custom");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [linkPath, setLinkPath] = useState("/shop");
  const [photo, setPhoto] = useState<string | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [durationDays, setDurationDays] = useState(3);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    return subscribeToMyProducts(user.uid, setMyProducts);
  }, [user]);
  useEffect(() => {
    if (!user) return;
    return subscribeToMyStays(user.uid, setMyStays);
  }, [user]);
  useEffect(() => {
    if (!user) return;
    return subscribeToMyEvents(user.uid, setMyEvents);
  }, [user]);

  const listings: PickableListing[] = useMemo(() => [
    ...myProducts.map((p): PickableListing => ({ key: `product-${p.id}`, targetType: "product", targetId: p.id, title: p.title, image: p.image, linkPath: `/shop?q=${encodeURIComponent(p.title)}` })),
    ...myStays.map((s): PickableListing => ({ key: `stay-${s.id}`, targetType: "stay", targetId: s.id, title: s.title, image: s.images[0], linkPath: `/events?tab=stays&q=${encodeURIComponent(s.title)}` })),
    ...myEvents.map((e): PickableListing => ({ key: `event-${e.id}`, targetType: "event", targetId: e.id, title: e.title, image: e.image, linkPath: `/events?q=${encodeURIComponent(e.title)}` })),
  ], [myProducts, myStays, myEvents]);

  const selectedListing = listings.find((l) => l.key === selectedKey);
  const cost = durationDays * PRICE_PER_DAY;

  const reset = () => {
    setSelectedKey("custom"); setTitle(""); setDescription(""); setLinkPath("/shop"); setPhoto(null); setDurationDays(3);
  };

  const handlePromote = async () => {
    if (!user) return;
    const finalTitle = selectedListing?.title || title.trim();
    const finalImage = selectedListing?.image || photo;
    const finalLinkPath = selectedListing?.linkPath || linkPath.trim();

    if (!finalTitle) {
      toast({ variant: "destructive", title: "Pick a listing or enter a title" });
      return;
    }
    if (!finalLinkPath.startsWith("/")) {
      toast({ variant: "destructive", title: "Link must be an in-app path", description: "e.g. /shop or /events" });
      return;
    }
    setIsSaving(true);
    try {
      await purchaseAd({
        title: finalTitle,
        description: selectedListing ? `Check out ${finalTitle} on Moood!` : description.trim(),
        image: finalImage ?? undefined,
        targetType: selectedListing?.targetType ?? "external",
        targetId: selectedListing?.targetId,
        linkPath: finalLinkPath,
        durationDays,
      });
      toast({ title: "You're Promoted!", description: `"${finalTitle}" is now running as a sponsored ad for ${durationDays} day${durationDays > 1 ? "s" : ""}.` });
      reset();
      onOpenChange(false);
    } catch (err) {
      toast({ variant: "destructive", title: "Couldn't start promotion", description: err instanceof Error ? err.message : "Please try again." });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
        <DialogContent className="sm:rounded-[2rem] max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Megaphone className="w-5 h-5 text-primary" /> Promote</DialogTitle>
            <DialogDescription>Run a paid ad in the app - it shows up in Vibes and Messages until your promotion runs out.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>What are you promoting?</Label>
              <Select value={selectedKey} onValueChange={setSelectedKey}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="custom">Custom Ad</SelectItem>
                  {listings.map((l) => <SelectItem key={l.key} value={l.key}>{l.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {selectedListing ? (
              <div className="p-3 rounded-2xl bg-muted/50 border flex items-center gap-3">
                <div className="relative w-12 h-12 rounded-lg overflow-hidden shrink-0 bg-muted"><Image src={selectedListing.image} alt={selectedListing.title} fill className="object-cover" /></div>
                <div>
                  <p className="font-bold text-sm">{selectedListing.title}</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest">{selectedListing.targetType}</p>
                </div>
              </div>
            ) : (
              <>
                {photo ? (
                  <div className="relative aspect-video w-full rounded-2xl overflow-hidden border">
                    <Image src={photo} alt="Ad photo" fill className="object-cover" />
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
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. 20% Off This Week" />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What should people know?" className="min-h-[70px]" />
                </div>
                <div className="space-y-2">
                  <Label>Link (in-app page)</Label>
                  <Input value={linkPath} onChange={(e) => setLinkPath(e.target.value)} placeholder="/shop?q=your-product" />
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label>Duration</Label>
              <div className="grid grid-cols-4 gap-2">
                {DURATION_OPTIONS.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDurationDays(d)}
                    className={`p-3 rounded-xl border text-center transition-colors ${durationDays === d ? "border-primary bg-primary/10" : "border-white/10 bg-muted/30"}`}
                  >
                    <p className="font-bold text-sm">{d}d</p>
                    <p className="text-[10px] text-muted-foreground">{currency.symbol} {d * PRICE_PER_DAY}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20 flex items-center justify-between">
              <span className="text-sm font-bold">Total Cost</span>
              <span className="text-xl font-black text-primary">{currency.symbol} {cost}</span>
            </div>
          </div>

          <DialogFooter>
            <Button className="w-full h-12 rounded-xl font-bold gap-2" onClick={handlePromote} disabled={isSaving}>
              {isSaving ? <Loader2 className="animate-spin w-4 h-4" /> : <Megaphone className="w-4 h-4" />} Pay & Promote
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <CameraView open={isCameraOpen} onOpenChange={setIsCameraOpen} onUsePhoto={setPhoto} title="Take a photo for your ad" />
    </>
  );
}
