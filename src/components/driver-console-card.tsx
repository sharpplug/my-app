"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Car, Package, Truck, Loader2, ShieldCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-provider";
import { useRegional } from "@/contexts/language-provider";
import { subscribeToMyDriverProfile, registerDriver, type DriverProfile, type DriverService } from "@/lib/drivers";
import { type UserProfile } from "@/lib/users";
import { cn } from "@/lib/utils";

const SERVICE_OPTIONS: { value: DriverService; label: string; icon: React.ElementType }[] = [
  { value: "taxi", label: "Taxi / Rides", icon: Car },
  { value: "courier", label: "Courier / Delivery", icon: Package },
  { value: "tow", label: "Tow / Roadside", icon: Truck },
];

export default function DriverConsoleCard({ profile }: { profile: UserProfile | null }) {
  const { user } = useAuth();
  const { region } = useRegional();
  const { toast } = useToast();
  const [driverProfile, setDriverProfile] = useState<DriverProfile | null | undefined>(undefined);
  const [isEditing, setIsEditing] = useState(false);
  const [services, setServices] = useState<DriverService[]>([]);
  const [vehicleMake, setVehicleMake] = useState("");
  const [vehicleModel, setVehicleModel] = useState("");
  const [plateNumber, setPlateNumber] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    return subscribeToMyDriverProfile(user.uid, setDriverProfile);
  }, [user]);

  useEffect(() => {
    if (driverProfile) {
      setServices(driverProfile.services);
      setVehicleMake(driverProfile.vehicleMake);
      setVehicleModel(driverProfile.vehicleModel);
      setPlateNumber(driverProfile.plateNumber);
    }
  }, [driverProfile]);

  const toggleService = (service: DriverService) => {
    setServices((prev) => (prev.includes(service) ? prev.filter((s) => s !== service) : [...prev, service]));
  };

  const handleRegister = async () => {
    if (!user || !profile) return;
    if (services.length === 0 || !vehicleMake.trim() || !vehicleModel.trim() || !plateNumber.trim()) {
      toast({ variant: "destructive", title: "Missing details", description: "Pick at least one service and fill in your vehicle details." });
      return;
    }
    setIsSaving(true);
    try {
      await registerDriver({
        ownerUid: user.uid,
        ownerHandle: profile.handle,
        ownerName: profile.displayName,
        services,
        vehicleMake: vehicleMake.trim(),
        vehicleModel: vehicleModel.trim(),
        plateNumber: plateNumber.trim().toUpperCase(),
        region,
      });
      toast({ title: driverProfile ? "Driver Profile Updated" : "You're Live on Skip!", description: "Riders in your region can now be matched to you." });
      setIsEditing(false);
    } catch (err) {
      toast({ variant: "destructive", title: "Couldn't save", description: err instanceof Error ? err.message : "Please try again." });
    } finally {
      setIsSaving(false);
    }
  };

  if (driverProfile === undefined) return null;

  const showForm = !driverProfile || isEditing;

  return (
    <Card className="border-white/10 bg-card/50 backdrop-blur-xl">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-bold flex items-center gap-2"><Car className="w-4 h-4 text-primary" /> Skip Driver Console</CardTitle>
        <CardDescription className="text-xs">Register your vehicle to earn from taxi rides, courier deliveries, or tow/roadside jobs booked through Skip - just like listing a product on Shop.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!showForm && driverProfile ? (
          <div className="p-4 rounded-2xl bg-background/50 border border-white/5 space-y-3">
            <div className="flex items-center justify-between">
              <Badge className="bg-green-500/20 text-green-500 border-0 gap-1"><ShieldCheck className="w-3 h-3" /> Active on Skip</Badge>
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setIsEditing(true)}>Edit</Button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {driverProfile.services.map((s) => {
                const opt = SERVICE_OPTIONS.find((o) => o.value === s);
                return <Badge key={s} variant="outline" className="text-[10px] gap-1">{opt && <opt.icon className="w-3 h-3" />} {opt?.label ?? s}</Badge>;
              })}
            </div>
            <p className="text-xs text-muted-foreground">{driverProfile.vehicleMake} {driverProfile.vehicleModel} • {driverProfile.plateNumber}</p>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Services You Offer</Label>
              <div className="grid grid-cols-3 gap-2">
                {SERVICE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => toggleService(opt.value)}
                    className={cn(
                      "flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center transition-colors",
                      services.includes(opt.value) ? "border-primary bg-primary/10" : "border-white/10 bg-background/50 hover:border-white/20"
                    )}
                  >
                    <opt.icon className="w-4 h-4" />
                    <span className="text-[10px] font-bold leading-tight">{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Vehicle Make</Label>
                <Input value={vehicleMake} onChange={(e) => setVehicleMake(e.target.value)} placeholder="Toyota" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Model</Label>
                <Input value={vehicleModel} onChange={(e) => setVehicleModel(e.target.value)} placeholder="Hiace" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Plate Number</Label>
              <Input value={plateNumber} onChange={(e) => setPlateNumber(e.target.value)} placeholder="KBA 452X" />
            </div>
          </>
        )}
      </CardContent>
      {showForm && (
        <CardFooter className="gap-2">
          {driverProfile && (
            <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setIsEditing(false)}>Cancel</Button>
          )}
          <Button className="flex-1 rounded-xl font-bold gap-2" onClick={handleRegister} disabled={isSaving}>
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Car className="w-4 h-4" />}
            {driverProfile ? "Save Changes" : "Register as a Driver"}
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
