import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  limit,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";
import { firestore } from "@/lib/firebase-config";
import type { UserProfile } from "@/lib/users";

const followingCol = (uid: string) => collection(firestore, "users", uid, "following");
const followingDocRef = (uid: string, targetUid: string) => doc(firestore, "users", uid, "following", targetUid);

export async function followUser(myUid: string, targetUid: string): Promise<void> {
  await setDoc(followingDocRef(myUid, targetUid), { createdAt: serverTimestamp() });
}

export async function unfollowUser(myUid: string, targetUid: string): Promise<void> {
  await deleteDoc(followingDocRef(myUid, targetUid));
}

/** Live list of uids the caller follows - used both to render "Following"
 * state and to exclude already-followed people from suggestions. */
export function subscribeToFollowing(myUid: string, onChange: (followingUids: string[]) => void) {
  return onSnapshot(followingCol(myUid), (snap) => {
    onChange(snap.docs.map((d) => d.id));
  });
}

export type SuggestedUser = UserProfile & { sharedInterests: string[] };

/**
 * Real "Find Friends" discovery (see friends-carousel.tsx's SuggestionCards,
 * previously hardcoded mock data): ranks other users by how many interest
 * tags they share with the caller. A one-shot fetch rather than a live
 * subscription - suggestions don't need to re-rank on every render.
 * Firestore's array-contains-any only accepts up to 10 values, so the query
 * is capped to the caller's first 10 interests.
 */
export async function fetchSuggestedUsers(
  myProfile: UserProfile,
  followingUids: string[],
  max = 10
): Promise<SuggestedUser[]> {
  const interests = (myProfile.interests ?? []).slice(0, 10);
  if (interests.length === 0) return [];

  const q = query(
    collection(firestore, "users"),
    where("interests", "array-contains-any", interests),
    limit(40)
  );
  const snap = await getDocs(q);
  const exclude = new Set([myProfile.uid, ...followingUids]);

  return snap.docs
    .map((d) => d.data() as UserProfile)
    .filter((u) => !exclude.has(u.uid))
    .map((u) => ({ ...u, sharedInterests: (u.interests ?? []).filter((i) => interests.includes(i)) }))
    .sort((a, b) => b.sharedInterests.length - a.sharedInterests.length)
    .slice(0, max);
}
