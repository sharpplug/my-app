import { doc, setDoc, deleteDoc, onSnapshot, collection, serverTimestamp } from "firebase/firestore";
import { firestore } from "@/lib/firebase-config";

export type Presence = {
  uid: string;
  handle: string;
  displayName: string;
  photoURL: string | null;
  lat: number;
  lng: number;
  updatedAt: { toMillis: () => number } | null;
};

const presenceRef = (uid: string) => doc(firestore, "presence", uid);

/**
 * Publishes the caller's live location. Ghost Mode is enforced by simply
 * never calling this (and clearing any existing doc) rather than writing a
 * "hidden" flag - there's no data to leak if the document doesn't exist, so
 * nobody else can ever see a ghosted user's coordinates.
 */
export async function publishPresence(
  profile: { uid: string; handle: string; displayName: string; photoURL: string | null },
  lat: number,
  lng: number
): Promise<void> {
  await setDoc(presenceRef(profile.uid), {
    uid: profile.uid,
    handle: profile.handle,
    displayName: profile.displayName,
    photoURL: profile.photoURL,
    lat,
    lng,
    updatedAt: serverTimestamp(),
  });
}

export async function clearPresence(uid: string): Promise<void> {
  await deleteDoc(presenceRef(uid));
}

export function subscribeToPresence(onChange: (users: Presence[]) => void) {
  return onSnapshot(collection(firestore, "presence"), (snap) => {
    onChange(snap.docs.map((d) => d.data() as Presence));
  });
}
