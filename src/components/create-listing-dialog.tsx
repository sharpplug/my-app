"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Wand2, Camera, X } from "lucide-react";
import Image from "next/image";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-provider";
import { useRegional } from "@/contexts/language-provider";
import { getIdToken } from "@/lib/get-id-token";
import { generateProductDescription } from "@/app/actions";
import { createProduct } from "@/lib/products";
import { type UserProfile } from "@/lib/users";
import CameraView from "@/components/camera-view";

const CATEGORIES = ["fashion", "beauty", "wellness", "home", "food"];

export default function CreateListingDialog({
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
  const { currency } = useRegional();
  const { toast } = useToast();

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [price, setPrice] = useState("");
  const [features, setFeatures] = useState("");
  const [description, setDescription] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const reset = () => {
    setTitle("");
    setCategory(CATEGORIES[0]);
    setPrice("");
    setFeatures("");
    setDescription("");
    setPhoto(null);
  };

  const handleGenerateDescription = async () => {
    if (!title.trim() || !features.trim()) {
      toast({ variant: "destructive", title: "Add a title and some features first" });
      return;
    }
    setIsGenerating(true);
    try {
      const idToken = await getIdToken();
      const result = await generateProductDescription(idToken, {
        productName: title,
        features,
        targetAudience: "shoppers on Moood's marketplace",
        photoDataUri: photo ?? undefined,
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
    const numPrice = parseFloat(price);
    if (!title.trim() || isNaN(numPrice) || numPrice <= 0 || !description.trim()) {
      toast({ variant: "destructive", title: "Missing details", description: "Give your listing a title, a positive price, and a description." });
      return;
    }
    setIsSaving(true);
    try {
      await createProduct({
        ownerUid: user.uid,
        ownerHandle: profile.handle,
        title: title.trim(),
        description: description.trim(),
        category,
        price: numPrice,
        image: photo ?? `https://picsum.photos/seed/${encodeURIComponent(title)}/600/600`,
      });
      toast({ title: "Listing Created!", description: `"${title}" is now live on the marketplace.` });
      reset();
      onOpenChange(false);
      onCreated?.();
    } catch (err) {
      toast({ variant: "destructive", title: "Couldn't create listing", description: err instanceof Error ? err.message : "Please try again." });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
        <DialogContent className="sm:rounded-[2rem] max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Listing</DialogTitle>
            <DialogDescription>List a real product on the Moood marketplace - buyers pay from their wallet and it lands straight in yours.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {photo ? (
              <div className="relative aspect-square w-32 mx-auto rounded-2xl overflow-hidden border">
                <Image src={photo} alt="Listing photo" fill className="object-cover" />
                <Button variant="destructive" size="icon" className="absolute top-1 right-1 h-6 w-6" onClick={() => setPhoto(null)}><X className="w-3 h-3" /></Button>
              </div>
            ) : (
              <Button variant="outline" className="w-full h-20 rounded-2xl border-dashed flex-col gap-1.5" onClick={() => setIsCameraOpen(true)}>
                <Camera className="w-5 h-5" />
                <span className="text-xs">Add a photo (optional)</span>
              </Button>
            )}

            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Handwoven Cotton Scarf" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Price ({currency.symbol})</Label>
                <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0.00" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Key Features</Label>
              <Input value={features} onChange={(e) => setFeatures(e.target.value)} placeholder="e.g. handmade, organic cotton, 3 colors" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Description</Label>
                <Button type="button" variant="ghost" size="sm" className="h-7 text-xs gap-1.5" onClick={handleGenerateDescription} disabled={isGenerating}>
                  {isGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />} Write with AI
                </Button>
              </div>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe your product, or generate one with AI above." className="min-h-[100px]" />
            </div>
          </div>

          <DialogFooter>
            <Button className="w-full h-12 rounded-xl font-bold" onClick={handleCreate} disabled={isSaving}>
              {isSaving ? <Loader2 className="animate-spin mr-2 w-4 h-4" /> : null} Publish Listing
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <CameraView open={isCameraOpen} onOpenChange={setIsCameraOpen} onUsePhoto={setPhoto} title="Take a photo of your product" />
    </>
  );
}
