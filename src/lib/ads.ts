import { useEffect, useMemo, useState } from "react";
import { collection, query, where, orderBy, onSnapshot, Timestamp } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { firestore, functions } from "@/lib/firebase-config";

export type AdTargetType = "product" | "stay" | "event" | "driver" | "external";
export type AdTier = "basic" | "featured" | "premium";
export type AdVertical = "vibes" | "shop" | "events" | "stays" | "skip" | "messages";

/**
 * Real payment tiers for the Promote flow (src/components/promote-dialog.tsx).
 * pricePerDay/stars/verticals are purely descriptive here for display - the
 * actual price, reach, and stars are always recomputed server-side in
 * purchaseAd (functions/src/index.ts) so a client can't buy premium-grade
 * reach at basic-grade price.
 */
export const AD_PRICE_PER_DAY = 20;
export const TIER_INFO: Record<AdTier, { label: string; stars: number; pricePerDay: number; benefits: string[] }> = {
  basic: {
    label: "Basic",
    stars: 1,
    pricePerDay: AD_PRICE_PER_DAY,
    benefits: ["Runs in its home vertical (Shop, Links, or Skip)", "1 verification star"],
  },
  featured: {
    label: "Featured",
    stars: 2,
    pricePerDay: Math.round(AD_PRICE_PER_DAY * 1.75),
    benefits: ["Runs in its home vertical + the Vibes feed", "Boosted ranking for users who share your audience's interests", "2 verification stars"],
  },
  premium: {
    label: "Premium",
    stars: 3,
    pricePerDay: AD_PRICE_PER_DAY * 3,
    benefits: ["Runs everywhere - Vibes, Shop, Links, Skip & Messages", "Top-of-feed priority placement", "Interest-matched viewers see it first", "3 verification stars + Verified Partner badge"],
  },
};

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
  tier: AdTier;
  stars: number;
  verticals: AdVertical[];
  interestTags: string[];
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
 * Ads for one specific vertical (Vibes, Shop, Links/Events, Links/Stays,
 * Skip, Messages), ranked so an ad matching the viewer's own interests (see
 * src/lib/interests.ts) shows first, then by tier (premium > featured >
 * basic), then by recency. Also re-filters on a 30s tick so an ad actually
 * disappears once its paid duration runs out, instead of lingering because
 * the underlying snapshot only updates when a document changes on the
 * server (not when time passes).
 */
export function useActiveAds(vertical: AdVertical, userInterests: string[] = []): Ad[] {
  const [ads, setAds] = useState<Ad[]>([]);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => subscribeToActiveAds(setAds), []);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(interval);
  }, []);

  const interestsKey = userInterests.join(",");

  return useMemo(() => {
    const interestSet = new Set(userInterests);
    return ads
      .filter((ad) => (ad.expiresAt?.toMillis() ?? 0) > now && ad.verticals?.includes(vertical))
      .sort((a, b) => {
        const aMatch = a.interestTags?.some((t) => interestSet.has(t)) ? 1 : 0;
        const bMatch = b.interestTags?.some((t) => interestSet.has(t)) ? 1 : 0;
        if (aMatch !== bMatch) return bMatch - aMatch;
        if (a.stars !== b.stars) return b.stars - a.stars;
        return (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ads, now, vertical, interestsKey]);
}

export async function purchaseAd(input: {
  title: string;
  description?: string;
  image?: string;
  targetType: AdTargetType;
  targetId?: string;
  linkPath: string;
  durationDays: number;
  tier: AdTier;
  interestTags?: string[];
}): Promise<{ ok: true; adId: string }> {
  const call = httpsCallable(functions, "purchaseAd");
  const result = await call(input);
  return result.data as { ok: true; adId: string };
}
