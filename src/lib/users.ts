import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  runTransaction,
  onSnapshot,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
} from "firebase/firestore";
import type { User } from "firebase/auth";
import { firestore } from "@/lib/firebase-config";

export type UserRole = "user" | "partner";

export type UserProfile = {
  uid: string;
  handle: string;
  displayName: string;
  photoURL: string | null;
  role: UserRole;
};

const usersRef = (uid: string) => doc(firestore, "users", uid);
const handleRef = (handle: string) => doc(firestore, "handles", handle);

function normalizeHandle(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/^@/, "")
    .replace(/[^a-z0-9_]/g, "");
}

function candidateHandles(user: User): string[] {
  const base = normalizeHandle(
    user.displayName?.replace(/\s+/g, "") || user.email?.split("@")[0] || "user"
  ) || "user";

  const candidates = [base];
  for (let i = 0; i < 5; i++) {
    candidates.push(`${base}${Math.floor(1000 + Math.random() * 9000)}`);
  }
  return candidates;
}

/**
 * Creates a users/{uid} profile + a handles/{handle} reservation the first
 * time we see this account. Handles are reserved via a transaction so two
 * accounts can never claim the same one; if the preferred handle is taken
 * we fall back to a randomized suffix.
 */
export async function ensureUserProfile(user: User): Promise<void> {
  const profileSnap = await getDoc(usersRef(user.uid));
  if (profileSnap.exists()) return;

  const displayName = user.displayName || user.email?.split("@")[0] || "Moood User";

  for (const handle of candidateHandles(user)) {
    try {
      await runTransaction(firestore, async (tx) => {
        const existingHandle = await tx.get(handleRef(handle));
        if (existingHandle.exists()) {
          throw new Error("HANDLE_TAKEN");
        }
        tx.set(handleRef(handle), { uid: user.uid });
        tx.set(usersRef(user.uid), {
          uid: user.uid,
          handle,
          displayName,
          photoURL: user.photoURL || null,
          role: "user",
        });
      });
      return;
    } catch (err) {
      if (err instanceof Error && err.message === "HANDLE_TAKEN") continue;
      throw err;
    }
  }

  throw new Error("Could not reserve a unique handle after multiple attempts.");
}

export function subscribeToUserProfile(uid: string, onChange: (profile: UserProfile | null) => void) {
  return onSnapshot(usersRef(uid), (snap) => {
    onChange(snap.exists() ? (snap.data() as UserProfile) : null);
  });
}

/**
 * Self-serve upgrade to a Partner account. There's no approval workflow
 * behind this yet (no backend to review applications), so this is a
 * deliberate, explicit action rather than every user silently seeing
 * partner tools by default - it closes the "everyone sees fake partner
 * data" gap without overbuilding an approvals system nobody asked for yet.
 */
export async function becomePartner(uid: string): Promise<void> {
  await updateDoc(usersRef(uid), { role: "partner" });
}

export async function findUserByHandle(rawHandle: string): Promise<UserProfile | null> {
  const handle = normalizeHandle(rawHandle);
  if (!handle) return null;

  const handleSnap = await getDoc(handleRef(handle));
  if (!handleSnap.exists()) return null;

  const uid = handleSnap.data().uid as string;
  const profileSnap = await getDoc(usersRef(uid));
  if (!profileSnap.exists()) return null;

  return profileSnap.data() as UserProfile;
}

export async function searchUsersByHandle(prefix: string, excludeUid?: string): Promise<UserProfile[]> {
  const normalized = normalizeHandle(prefix);
  if (!normalized) return [];

  const q = query(
    collection(firestore, "users"),
    orderBy("handle"),
    where("handle", ">=", normalized),
    where("handle", "<=", normalized + ""),
    limit(8)
  );

  const snap = await getDocs(q);
  return snap.docs
    .map((d) => d.data() as UserProfile)
    .filter((u) => u.uid !== excludeUid);
}
