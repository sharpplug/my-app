import { getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

// Distributed, Firestore-backed rate limiter for the AI Server Actions.
//
// This used to be an in-memory-per-instance bucket, which only worked
// because apphosting.yaml pinned maxInstances to 1. Now that mass
// deployment means running more than one instance, throttling has to be
// shared across them - so this uses the Admin SDK via Application Default
// Credentials, which Firebase App Hosting/Cloud Run provide automatically
// (no service account key to check in or configure). If Firestore is
// unreachable for infra reasons (most notably: no ADC available, e.g.
// running `next dev` locally without `gcloud auth application-default
// login`), this falls back to the same in-memory bucket as before rather
// than either blocking every request or allowing unlimited ones.
let db: FirebaseFirestore.Firestore | null = null;
try {
  const app = getApps()[0] ?? initializeApp();
  db = getFirestore(app);
} catch {
  db = null;
}

type Bucket = { count: number; windowStart: number };
const memoryBuckets = new Map<string, Bucket>();

function enforceInMemory(key: string, max: number, windowMs: number): void {
  const now = Date.now();
  const existing = memoryBuckets.get(key);

  if (!existing || now - existing.windowStart >= windowMs) {
    memoryBuckets.set(key, { count: 1, windowStart: now });
    return;
  }
  if (existing.count >= max) {
    const retryInSeconds = Math.ceil((windowMs - (now - existing.windowStart)) / 1000);
    throw new Error(`You're doing that a lot - please try again in ${retryInSeconds}s.`);
  }
  existing.count += 1;
}

async function enforceDistributed(key: string, max: number, windowMs: number): Promise<void> {
  if (!db) throw new Error("RATE_LIMIT_BACKEND_UNAVAILABLE");

  const ref = db.collection("rateLimits").doc(key);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const now = Date.now();
    const data = snap.data() as { count: number; windowStart: number } | undefined;

    if (!data || now - data.windowStart >= windowMs) {
      tx.set(ref, { count: 1, windowStart: now });
      return;
    }
    if (data.count >= max) {
      const retryInSeconds = Math.ceil((windowMs - (now - data.windowStart)) / 1000);
      throw new Error(`RATE_LIMITED:You're doing that a lot - please try again in ${retryInSeconds}s.`);
    }
    tx.update(ref, { count: data.count + 1 });
  });
}

export async function enforceRateLimit(
  uid: string,
  flowKey: string,
  opts?: { max?: number; windowMs?: number }
): Promise<void> {
  const max = opts?.max ?? 10;
  const windowMs = opts?.windowMs ?? 60_000;
  const key = `${uid}_${flowKey}`;

  try {
    await enforceDistributed(key, max, windowMs);
  } catch (err) {
    if (err instanceof Error && err.message.startsWith("RATE_LIMITED:")) {
      throw new Error(err.message.slice("RATE_LIMITED:".length));
    }
    // Any other failure (no ADC locally, Firestore transiently
    // unreachable) - fall back to per-instance in-memory enforcement
    // rather than letting every request through unthrottled.
    enforceInMemory(key, max, windowMs);
  }
}
