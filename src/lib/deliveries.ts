import {
  doc,
  collection,
  onSnapshot,
  query,
  where,
  setDoc,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { firestore, functions } from "@/lib/firebase-config";

/**
 * UNIDEL - campus delivery between two named points on one university
 * (src/lib/campuses.ts). A student posts a job, a student runner claims it,
 * and the fee is held by the platform until the drop-off is confirmed.
 *
 * Every state change below is a Cloud Function rather than a client write,
 * for the same reason wallets are (src/lib/wallet.ts): a delivery holds
 * real money from the moment it's created. firestore.rules makes
 * deliveries/* read-only from the client, so nothing here can move a job to
 * "delivered" - or release the escrow - by writing a document directly.
 */

export type DeliveryStatus = "open" | "accepted" | "picked_up" | "delivered" | "cancelled";

export type Delivery = {
  id: string;
  customerUid: string;
  customerHandle: string;
  campusId: string;
  pickupPointId: string;
  dropoffPointId: string;
  itemDescription: string;
  notes?: string;
  express: boolean;
  /** What the customer paid, computed server-side from the campus. */
  fee: number;
  /** What the runner receives on completion (fee minus UNIDEL's cut). */
  runnerShare: number;
  status: DeliveryStatus;
  runnerUid?: string | null;
  runnerHandle?: string | null;
  createdAt: Timestamp | null;
  acceptedAt?: Timestamp | null;
  pickedUpAt?: Timestamp | null;
  deliveredAt?: Timestamp | null;
  cancelledAt?: Timestamp | null;
};

export type RunnerMode = "foot" | "bike" | "scooter";

export type RunnerProfile = {
  ownerUid: string;
  ownerHandle: string;
  ownerName: string;
  campusId: string;
  mode: RunnerMode;
  status: "active";
  createdAt: Timestamp | null;
  ratingSum?: number;
  ratingCount?: number;
};

const deliveriesRef = collection(firestore, "deliveries");
const runnerDocRef = (uid: string) => doc(firestore, "runners", uid);

const withId = (d: { id: string; data: () => unknown }) =>
  ({ id: d.id, ...(d.data() as Omit<Delivery, "id">) } as Delivery);

/** Newest first. Sorted here rather than with an orderBy so the queries
 * below stay on equality-only filters, which Firestore serves without a
 * composite index - the same trade-off subscribeToMyProducts makes. */
const newestFirst = (deliveries: Delivery[]) =>
  deliveries.sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0));

/** The job board: everything still unclaimed on one campus. Express jobs
 * sort above standard ones - that ordering is the whole thing the express
 * surcharge buys, so it has to hold here and not just in the order form's
 * description of it. */
export function subscribeToOpenDeliveries(
  campusId: string,
  onChange: (deliveries: Delivery[]) => void
) {
  const q = query(deliveriesRef, where("campusId", "==", campusId), where("status", "==", "open"));
  return onSnapshot(q, (snap) =>
    onChange(
      newestFirst(snap.docs.map(withId)).sort(
        (a, b) => Number(b.express) - Number(a.express)
      )
    )
  );
}

/** Deliveries this user asked for. */
export function subscribeToMyDeliveries(uid: string, onChange: (deliveries: Delivery[]) => void) {
  const q = query(deliveriesRef, where("customerUid", "==", uid));
  return onSnapshot(q, (snap) => onChange(newestFirst(snap.docs.map(withId))));
}

/** Deliveries this user is running, past and present. */
export function subscribeToMyRunnerJobs(uid: string, onChange: (deliveries: Delivery[]) => void) {
  const q = query(deliveriesRef, where("runnerUid", "==", uid));
  return onSnapshot(q, (snap) => onChange(newestFirst(snap.docs.map(withId))));
}

/**
 * The four-digit code the customer reads out to the runner at the door.
 * It lives in a subcollection instead of on the delivery itself because the
 * job board is readable by every signed-in user - a code sitting on the
 * parent document would be visible to the very person it's meant to check.
 * firestore.rules only lets the customer read this.
 */
export function subscribeToDropoffCode(deliveryId: string, onChange: (code: string | null) => void) {
  return onSnapshot(doc(firestore, "deliveries", deliveryId, "secret", "code"), (snap) => {
    onChange((snap.data()?.code as string) ?? null);
  });
}

export function subscribeToMyRunnerProfile(
  uid: string,
  onChange: (profile: RunnerProfile | null) => void
) {
  return onSnapshot(runnerDocRef(uid), (snap) => {
    onChange(snap.exists() ? (snap.data() as RunnerProfile) : null);
  });
}

/**
 * Signing up to run deliveries is a free client write, like listing a
 * product - it moves no money on its own, and the checks that matter
 * (is this really you, are you registered on this campus) are re-applied
 * server-side by acceptDelivery. Note this deliberately has no `partner`
 * role requirement the way drivers do: UNIDEL runners are students, not
 * registered businesses.
 */
export async function registerRunner(input: {
  ownerUid: string;
  ownerHandle: string;
  ownerName: string;
  campusId: string;
  mode: RunnerMode;
}): Promise<void> {
  await setDoc(
    runnerDocRef(input.ownerUid),
    { ...input, status: "active", createdAt: serverTimestamp() },
    { merge: true }
  );
}

export async function createDelivery(input: {
  campusId: string;
  pickupPointId: string;
  dropoffPointId: string;
  itemDescription: string;
  notes?: string;
  express: boolean;
}): Promise<{ deliveryId: string; fee: number }> {
  const call = httpsCallable(functions, "createDelivery");
  const result = await call(input);
  return result.data as { deliveryId: string; fee: number };
}

/** Claim an open job. Whoever's call lands first wins; the loser gets a
 * "already taken" error rather than a silently shared job. */
export async function acceptDelivery(deliveryId: string): Promise<void> {
  await httpsCallable(functions, "acceptDelivery")({ deliveryId });
}

export async function markDeliveryPickedUp(deliveryId: string): Promise<void> {
  await httpsCallable(functions, "markDeliveryPickedUp")({ deliveryId });
}

/** Releases the escrow to the runner - only with the customer's code. */
export async function completeDelivery(deliveryId: string, code: string): Promise<void> {
  await httpsCallable(functions, "completeDelivery")({ deliveryId, code });
}

/** Customer-side cancel, refunded in full. Only possible before pickup. */
export async function cancelDelivery(deliveryId: string): Promise<void> {
  await httpsCallable(functions, "cancelDelivery")({ deliveryId });
}
