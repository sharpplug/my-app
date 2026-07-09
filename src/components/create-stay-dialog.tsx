"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Camera, X } from "lucide-react";
import Image from "next/image";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-provider";
import { useRegional } from "@/contexts/language-provider";
import { createStay } from "@/lib/stays";
import { REGION_CENTERS } from "@/lib/catalog-data";
import { type UserProfile } from "@/lib/users";
import CameraView from "@/components/camera-view";

const STAY_TYPES = ["Apartment", "Villa", "House", "Cottage", "Loft", "Glamping"];
const AMENITY_OPTIONS = ["Wifi", "Kitchen", "Pool", "Parking", "AC"];

export default function CreateStayDialog({
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
  const [location, setLocation] = useState("");
  const [type, setType] = useState(STAY_TYPES[0]);
  const [pricePerNight, setPricePerNight] = useState("");
  const [guests, setGuests] = useState("2");
  const [bedrooms, setBedrooms] = useState("1");
  const [beds, setBeds] = useState("1");
  const [baths, setBaths] = useState("1");
  const [amenities, setAmenities] = useState<string[]>([]);
  const [photo, setPhoto] = useState<string | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const reset = () => {
    setTitle(""); setLocation(""); setType(STAY_TYPES[0]); setPricePerNight("");
    setGuests("2"); setBedrooms("1"); setBeds("1"); setBaths("1"); setAmenities([]); setPhoto(null);
  };

  const toggleAmenity = (a: string) => {
    setAmenities((prev) => (prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]));
  };

  const handleCreate = async () => {
    if (!user || !profile) return;
    const price = parseFloat(pricePerNight);
    if (!title.trim() || !location.trim() || isNaN(price) || price <= 0) {
      toast({ variant: "destructive", title: "Missing details", description: "Give your place a title, location, and a positive nightly price." });
      return;
    }
    setIsSaving(true);
    try {
      const center = REGION_CENTERS[region] ?? REGION_CENTERS.AE;
      const image = photo ?? `https://picsum.photos/seed/${encodeURIComponent(title)}/800/600`;
      await createStay({
        hostUid: user.uid,
        hostHandle: profile.handle,
        hostName: profile.displayName,
        hostAvatar: profile.photoURL || `https://picsum.photos/seed/${profile.handle}/100/100`,
        title: title.trim(),
        location: location.trim(),
        type,
        pricePerNight: price,
        guests: parseInt(guests, 10) || 1,
        bedrooms: parseInt(bedrooms, 10) || 1,
        beds: parseInt(beds, 10) || 1,
        baths: parseInt(baths, 10) || 1,
        amenities,
        images: [image, image],
        lat: center.lat,
        lng: center.lng,
      });
      toast({ title: "You're a Host!", description: `"${title}" is now live on Stays.` });
      reset();
      onOpenChange(false);
      onCreated?.();
    } catch (err) {
      toast({ variant: "destructive", title: "Couldn't list your place", description: err instanceof Error ? err.message : "Please try again." });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
        <DialogContent className="sm:rounded-[2rem] max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Become a Host</DialogTitle>
            <DialogDescription>List your place on Stays - guests pay from their wallet and it lands straight in yours.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {photo ? (
              <div className="relative aspect-video w-full rounded-2xl overflow-hidden border">
                <Image src={photo} alt="Stay photo" fill className="object-cover" />
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
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Sunny 2-Bed near the Marina" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STAY_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Price / Night ({currency.symbol})</Label>
                <Input type="number" value={pricePerNight} onChange={(e) => setPricePerNight(e.target.value)} placeholder="0.00" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Location</Label>
              <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Dubai Marina, Dubai" />
            </div>

            <div className="grid grid-cols-4 gap-2">
              <div className="space-y-1.5"><Label className="text-xs">Guests</Label><Input type="number" min={1} value={guests} onChange={(e) => setGuests(e.target.value)} /></div>
              <div className="space-y-1.5"><Label className="text-xs">Beds</Label><Input type="number" min={1} value={beds} onChange={(e) => setBeds(e.target.value)} /></div>
              <div className="space-y-1.5"><Label className="text-xs">Bedrooms</Label><Input type="number" min={1} value={bedrooms} onChange={(e) => setBedrooms(e.target.value)} /></div>
              <div className="space-y-1.5"><Label className="text-xs">Baths</Label><Input type="number" min={1} value={baths} onChange={(e) => setBaths(e.target.value)} /></div>
            </div>

            <div className="space-y-2">
              <Label>Amenities</Label>
              <div className="flex flex-wrap gap-2">
                {AMENITY_OPTIONS.map((a) => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => toggleAmenity(a)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${amenities.includes(a) ? "bg-primary text-primary-foreground border-primary" : "bg-muted/50 border-transparent"}`}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button className="w-full h-12 rounded-xl font-bold" onClick={handleCreate} disabled={isSaving}>
              {isSaving ? <Loader2 className="animate-spin mr-2 w-4 h-4" /> : null} Publish Listing
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <CameraView open={isCameraOpen} onOpenChange={setIsCameraOpen} onUsePhoto={setPhoto} title="Take a photo of your place" />
    </>
  );
}
