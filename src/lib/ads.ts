import { useEffect, useState } from "react";
import { collection, query, where, orderBy, onSnapshot, Timestamp } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { firestore, functions } from "@/lib/firebase-config";

export type AdTargetType = "product" | "stay" | "event" | "driver" | "external";

export type Ad = {
  id: string;
  ownerUid: string;
  ownerHandle: string;
  title: string;
  description: string;
  image: string | null;
  targetType: AdTargetType;
  targetId: string | null;
  linkPath: string;
  durationDays: number;
  cost: number;
  createdAt: Timestamp | null;
  expiresAt: Timestamp | null;
};

const adsRef = collection(firestore, "ads");

/**
 * Active promotions - "active" is defined purely by expiresAt being in the
 * future rather than a status flag, so an ad simply stops being returned
 * (and disappears from the UI) once its paid duration runs out. There's no
 * scheduled Cloud Function deleting expired docs; the query below plus a
 * periodic re-render (callers should re-run this on an interval, e.g. the
 * existing 60s clock tick pattern used elsewhere) is what makes an ad
 * visually disappear promptly rather than lingering until next page load.
 */
export function subscribeToActiveAds(onChange: (ads: Ad[]) => void) {
  const q = query(adsRef, where("expiresAt", ">", Timestamp.now()), orderBy("expiresAt", "desc"));
  return onSnapshot(q, (snap) => {
    onChange(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Ad, "id">) })));
  });
}

/**
 * Same data as subscribeToActiveAds, but also re-filters on a 30s tick so
 * an ad actually disappears from whatever's rendering it once its paid
 * duration runs out, instead of lingering because the underlying snapshot
 * only updates when a document changes on the server (not when time
 * passes).
 */
export function useActiveAds(): Ad[] {
  const [ads, setAds] = useState<Ad[]>([]);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => subscribeToActiveAds(setAds), []);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(interval);
  }, []);

  return ads.filter((ad) => (ad.expiresAt?.toMillis() ?? 0) > now);
}

export async function purchaseAd(input: {
  title: string;
  description?: string;
  image?: string;
  targetType: AdTargetType;
  targetId?: string;
  linkPath: string;
  durationDays: number;
}): Promise<{ ok: true; adId: string }> {
  const call = httpsCallable(functions, "purchaseAd");
  const result = await call(input);
  return result.data as { ok: true; adId: string };
}
