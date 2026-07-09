import { collection, query, orderBy, limit, onSnapshot, Timestamp } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { firestore, functions } from "@/lib/firebase-config";

export type RatableEntityType = "stay" | "event" | "driver";

export type Review = {
  id: string;
  authorUid: string;
  authorHandle: string;
  rating: number;
  comment: string | null;
  createdAt: Timestamp | null;
};

const COLLECTION_BY_TYPE: Record<RatableEntityType, string> = {
  stay: "stays",
  event: "events",
  driver: "drivers",
};

/** Average rating + count, computed client-side from an entity's own
 * ratingSum/ratingCount fields (kept up to date server-side by
 * submitRating - see functions/src/index.ts). */
export function averageRating(entity: { ratingSum?: number; ratingCount?: number } | undefined | null): { average: number; count: number } {
  const count = entity?.ratingCount ?? 0;
  const sum = entity?.ratingSum ?? 0;
  return { average: count > 0 ? sum / count : 0, count };
}

export function subscribeToReviews(entityType: RatableEntityType, entityId: string, onChange: (reviews: Review[]) => void) {
  const q = query(
    collection(firestore, COLLECTION_BY_TYPE[entityType], entityId, "reviews"),
    orderBy("createdAt", "desc"),
    limit(20)
  );
  return onSnapshot(q, (snap) => {
    onChange(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Review, "id">) })));
  });
}

/** Only succeeds if the caller has an actual completed transaction
 * referencing this entity (a stay booking, a ticket, a ride) - see
 * submitRating's eligibility check in functions/src/index.ts. Submitting
 * again for the same entity updates your existing rating instead of
 * adding a second one. */
export async function submitRating(
  entityType: RatableEntityType,
  entityId: string,
  rating: number,
  comment?: string
): Promise<void> {
  const call = httpsCallable(functions, "submitRating");
  await call({ entityType, entityId, rating, comment });
}
