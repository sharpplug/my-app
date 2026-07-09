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

export type HostedStay = {
  id: string;
  hostUid: string;
  hostHandle: string;
  hostName: string;
  hostAvatar: string;
  title: string;
  location: string;
  type: string;
  pricePerNight: number;
  guests: number;
  bedrooms: number;
  beds: number;
  baths: number;
  amenities: string[];
  images: string[];
  lat: number;
  lng: number;
  createdAt: Timestamp | null;
  ratingSum?: number;
  ratingCount?: number;
};

const staysRef = collection(firestore, "stays");

/** All host-listed stays, newest first, for the Stays marketplace. */
export function subscribeToStays(onChange: (stays: HostedStay[]) => void) {
  const q = query(staysRef, orderBy("createdAt", "desc"));
  return onSnapshot(q, (snap) => {
    onChange(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<HostedStay, "id">) })));
  });
}

/** A single host's own listings, for the Partner Dashboard - sorted
 * client-side to avoid needing a composite index (see products.ts). */
export function subscribeToMyStays(uid: string, onChange: (stays: HostedStay[]) => void) {
  const q = query(staysRef, where("hostUid", "==", uid));
  return onSnapshot(q, (snap) => {
    const stays = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<HostedStay, "id">) }));
    stays.sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0));
    onChange(stays);
  });
}

export async function createStay(input: {
  hostUid: string;
  hostHandle: string;
  hostName: string;
  hostAvatar: string;
  title: string;
  location: string;
  type: string;
  pricePerNight: number;
  guests: number;
  bedrooms: number;
  beds: number;
  baths: number;
  amenities: string[];
  images: string[];
  lat: number;
  lng: number;
}): Promise<string> {
  const docRef = await addDoc(staysRef, { ...input, createdAt: serverTimestamp() });
  return docRef.id;
}

export async function deleteStay(stayId: string): Promise<void> {
  await deleteDoc(doc(firestore, "stays", stayId));
}
