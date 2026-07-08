"use client";

import { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useAuth } from "@/contexts/auth-provider";
import { publishPresence, clearPresence, subscribeToPresence, type Presence } from "@/lib/presence";
import { subscribeToUserProfile, type UserProfile } from "@/lib/users";
import { Switch } from "@/components/ui/switch";
import { Ghost } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const DEFAULT_CENTER: [number, number] = [25.2048, 55.2708]; // Dubai

function markerIcon(color: string) {
  return L.divIcon({
    className: "",
    html: `<div style="width:16px;height:16px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 0 6px rgba(0,0,0,0.4)"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
}

function Recenter({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center);
  }, [center, map]);
  return null;
}

export default function VibesMap() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [myProfile, setMyProfile] = useState<UserProfile | null>(null);
  const [ghostMode, setGhostMode] = useState(false);
  const [myPosition, setMyPosition] = useState<[number, number] | null>(null);
  const [others, setOthers] = useState<Presence[]>([]);
  const watchIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (!user) return;
    return subscribeToUserProfile(user.uid, setMyProfile);
  }, [user]);

  useEffect(() => subscribeToPresence(setOthers), []);

  useEffect(() => {
    if (!user || !myProfile || ghostMode) return;
    if (!navigator.geolocation) {
      toast({ variant: "destructive", title: "Location unsupported", description: "Your browser doesn't support geolocation." });
      return;
    }

    const id = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setMyPosition([latitude, longitude]);
        publishPresence(
          { uid: user.uid, handle: myProfile.handle, displayName: myProfile.displayName, photoURL: myProfile.photoURL },
          latitude,
          longitude
        ).catch(() => {});
      },
      () => {
        toast({ variant: "destructive", title: "Location unavailable", description: "Enable location access to appear on the Vibes Map." });
      },
      { enableHighAccuracy: true, maximumAge: 30_000 }
    );
    watchIdRef.current = id;

    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, [user, myProfile, ghostMode, toast]);

  const handleGhostToggle = async (checked: boolean) => {
    setGhostMode(checked);
    if (checked && user) {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
      await clearPresence(user.uid).catch(() => {});
      setMyPosition(null);
      toast({ title: "Ghost Mode on", description: "Your location is hidden - nobody can see you on the map." });
    } else {
      toast({ title: "Ghost Mode off", description: "You're visible on the Vibes Map again." });
    }
  };

  const center = myPosition || DEFAULT_CENTER;
  const visibleOthers = others.filter((o) => o.uid !== user?.uid);

  return (
    <div className="h-[70vh] rounded-2xl overflow-hidden relative border border-white/10">
      <div className="absolute top-4 right-4 z-[1000] flex items-center gap-2 bg-black/60 backdrop-blur-md rounded-full px-4 py-2 border border-white/10">
        <Ghost className={cn("w-4 h-4", ghostMode ? "text-purple-400" : "text-white/50")} />
        <span className="text-xs font-bold text-white">Ghost Mode</span>
        <Switch checked={ghostMode} onCheckedChange={handleGhostToggle} />
      </div>

      <MapContainer center={center} zoom={13} scrollWheelZoom style={{ height: "100%", width: "100%" }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Recenter center={center} />
        {!ghostMode && myPosition && (
          <Marker position={myPosition} icon={markerIcon("#7C3AED")}>
            <Popup>You</Popup>
          </Marker>
        )}
        {visibleOthers.map((p) => (
          <Marker key={p.uid} position={[p.lat, p.lng]} icon={markerIcon("#22D3EE")}>
            <Popup>
              <div className="font-bold">{p.displayName}</div>
              <div className="text-xs text-muted-foreground">@{p.handle}</div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {ghostMode && (
        <div className="absolute inset-x-0 bottom-4 flex justify-center z-[1000] pointer-events-none">
          <div className="bg-black/60 backdrop-blur-md rounded-full px-4 py-2 border border-white/10 text-xs text-white/70 flex items-center gap-2">
            <Ghost className="w-3.5 h-3.5" /> You're invisible - nobody can see your location.
          </div>
        </div>
      )}
    </div>
  );
}
