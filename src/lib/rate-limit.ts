// Lightweight per-server-instance rate limiter for the AI Server Actions.
//
// This is intentionally in-memory rather than Firestore/Redis-backed: the
// Server Actions run with the Firebase *client* SDK (no service account is
// configured), which has no authenticated session outside the browser, so it
// can't write to a shared rate-limit store from here without opening up
// Firestore rules in a way that lets a client reset its own limits. An
// in-memory bucket still stops rapid-fire abuse within a single running
// instance; it just doesn't share state across horizontally-scaled
// instances. If this app scales beyond one instance, replace this with a
// Firebase Admin SDK + Firestore/Redis-backed limiter.

type Bucket = { count: number; windowStart: number };

const buckets = new Map<string, Bucket>();

export function enforceRateLimit(
  uid: string,
  flowKey: string,
  opts?: { max?: number; windowMs?: number }
): void {
  const max = opts?.max ?? 10;
  const windowMs = opts?.windowMs ?? 60_000;
  const key = `${uid}:${flowKey}`;
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || now - existing.windowStart >= windowMs) {
    buckets.set(key, { count: 1, windowStart: now });
    return;
  }

  if (existing.count >= max) {
    const retryInSeconds = Math.ceil((windowMs - (now - existing.windowStart)) / 1000);
    throw new Error(`You're doing that a lot - please try again in ${retryInSeconds}s.`);
  }

  existing.count += 1;
}
