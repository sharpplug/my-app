import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
  where,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { firestore } from "@/lib/firebase-config";

export type HostedEvent = {
  id: string;
  organizerUid: string;
  organizerHandle: string;
  title: string;
  date: string;
  location: string;
  priceValue: number;
  category: string;
  badge: string;
  image: string;
  description: string;
  lat: number;
  lng: number;
  createdAt: Timestamp | null;
  ratingSum?: number;
  ratingCount?: number;
};

const eventsRef = collection(firestore, "events");

/** All partner-created events, newest first, for the Links > Events tab. */
export function subscribeToEvents(onChange: (events: HostedEvent[]) => void) {
  const q = query(eventsRef, orderBy("createdAt", "desc"));
  return onSnapshot(q, (snap) => {
    onChange(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<HostedEvent, "id">) })));
  });
}

/** A single organizer's own events, for the Partner Dashboard - sorted
 * client-side to avoid needing a composite index (see products.ts). */
export function subscribeToMyEvents(uid: string, onChange: (events: HostedEvent[]) => void) {
  const q = query(eventsRef, where("organizerUid", "==", uid));
  return onSnapshot(q, (snap) => {
    const events = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<HostedEvent, "id">) }));
    events.sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0));
    onChange(events);
  });
}

export async function createEvent(input: {
  organizerUid: string;
  organizerHandle: string;
  title: string;
  date: string;
  location: string;
  priceValue: number;
  category: string;
  badge: string;
  image: string;
  description: string;
  lat: number;
  lng: number;
}): Promise<string> {
  const docRef = await addDoc(eventsRef, { ...input, createdAt: serverTimestamp() });
  return docRef.id;
}

export async function deleteEvent(eventId: string): Promise<void> {
  await deleteDoc(doc(firestore, "events", eventId));
}
