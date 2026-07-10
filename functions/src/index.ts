/**
 * Wallet Cloud Functions.
 *
 * This is the ONLY code allowed to change a wallet's balance/tokenBalance.
 * firestore.rules makes wallets/{uid} and its transactions subcollection
 * read-only from the client - every mutation below runs with the Admin SDK,
 * which bypasses security rules entirely, so a client can no longer write
 * an arbitrary balance to its own (or anyone else's) wallet document.
 *
 * `onCall` verifies the caller's Firebase Auth ID token before invoking the
 * handler and populates `request.auth.uid` with the verified uid - we never
 * trust a client-supplied uid for "who is calling this."
 */

import { createHmac, timingSafeEqual } from "crypto";
import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue, Timestamp, Transaction } from "firebase-admin/firestore";
import { onCall, onRequest, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";

initializeApp();
const db = getFirestore();

// Secret Manager-backed rather than a plain env var - set it with
// `firebase functions:secrets:set PAYMENT_WEBHOOK_SECRET` once a real
// payment aggregator is connected. Cloud Functions injects it at
// invocation time only for functions that list it in `secrets: [...]`
// below; it's never checked into source or config files.
const paymentWebhookSecret = defineSecret("PAYMENT_WEBHOOK_SECRET");

// App Check is Firebase's equivalent of a firewall in front of these
// functions - it rejects calls that don't carry a valid attestation token
// proving the request came from this app's real client (not a script or a
// replayed request), before the handler ever runs. It stays off
// (enforceAppCheck: false) until the client is verified to be sending
// tokens (see src/lib/firebase-config.ts's NEXT_PUBLIC_RECAPTCHA_SITE_KEY),
// because flipping this on without a working client integration would
// reject every legitimate call too. Set APP_CHECK_ENFORCE=true (via
// `firebase functions:config:set` or the Cloud Run env var) once App Check
// is registered in the Firebase Console and traffic in its dashboard shows
// verified requests from real clients.
const ENFORCE_APP_CHECK = process.env.APP_CHECK_ENFORCE === "true";

const TRANSACTION_FEE_PERCENT = 0.005;
const MOOOD_TOKEN_RATE = 2;
const GIFT_PLATFORM_FEE_PERCENT = 0.2;
const SIGNUP_BONUS_TOKENS = 100;
const MARKETPLACE_FEE_PERCENT = 0.1;
const HOST_FEE_PERCENT = 0.12;
const EVENT_FEE_PERCENT = 0.1;
const DRIVER_FEE_PERCENT = 0.15;
const AD_PRICE_PER_DAY = 20;
const AD_MAX_DAYS = 14;

export type AdTier = "basic" | "featured" | "premium";

// Real payment tiers for purchaseAd - price, cross-vertical reach, and
// verification stars are all computed server-side from `tier` so a client
// can never buy premium-grade reach at basic-grade price.
const AD_TIER_MULTIPLIER: Record<AdTier, number> = { basic: 1, featured: 1.75, premium: 3 };
const AD_TIER_STARS: Record<AdTier, number> = { basic: 1, featured: 2, premium: 3 };
const HOME_VERTICAL_BY_TARGET: Record<string, string> = {
  product: "shop",
  stay: "stays",
  event: "events",
  driver: "skip",
  external: "vibes",
};

/** Basic only reaches the vertical its target naturally belongs to (a
 * product ad shows in Shop, a driver ad shows in Skip, ...). Featured adds
 * the Vibes feed on top of that. Premium runs everywhere - every vertical,
 * regardless of target type - which is the real benefit buyers are paying
 * the 3x rate for. */
function verticalsForTier(tier: AdTier, targetType: string): string[] {
  const home = HOME_VERTICAL_BY_TARGET[targetType] ?? "vibes";
  if (tier === "basic") return [home];
  if (tier === "featured") return Array.from(new Set([home, "vibes"]));
  return ["vibes", "shop", "events", "stays", "skip", "messages"];
}

const walletRef = (uid: string) => db.collection("wallets").doc(uid);
const transactionsRef = (uid: string) => walletRef(uid).collection("transactions");
const userRef = (uid: string) => db.collection("users").doc(uid);
const topupIntentRef = (id: string) => db.collection("topupIntents").doc(id);
const productRef = (id: string) => db.collection("products").doc(id);
const stayRef = (id: string) => db.collection("stays").doc(id);
const eventRef = (id: string) => db.collection("events").doc(id);
const driversCol = () => db.collection("drivers");
const adsCol = () => db.collection("ads");
const withdrawalIntentRef = (id: string) => db.collection("withdrawalIntents").doc(id);
const notificationsRef = (uid: string) => db.collection("notifications").doc(uid).collection("items");

/** Maps a rating/review entity type to its Firestore collection - shared
 * by submitRating below. */
const RATED_COLLECTION: Record<"stay" | "event" | "driver", string> = {
  stay: "stays",
  event: "events",
  driver: "drivers",
};

/**
 * Every vertical writes its own "something happened to your account"
 * events here instead of nowhere - this is the glue that makes a gift, a
 * sale, a top-up, or a withdrawal visible outside the one page you
 * happened to be on when it occurred. See src/components/notification-bell.tsx
 * for the client side.
 */
function notify(tx: Transaction, uid: string, title: string, body: string): void {
  tx.set(notificationsRef(uid).doc(), {
    title,
    body,
    read: false,
    createdAt: FieldValue.serverTimestamp(),
  });
}

/** Same as notify(), for the few call sites (webhooks) that aren't already inside a transaction. */
async function notifyDirect(uid: string, title: string, body: string): Promise<void> {
  await notificationsRef(uid).add({
    title,
    body,
    read: false,
    createdAt: FieldValue.serverTimestamp(),
  });
}

// Every mobile money / bank rail surfaced across the app's four regions
// (AE, KE, UG, ZA - see src/components/wallet-tab.tsx), mapped to the kind
// of confirmation it needs. Card rails always take this path too, they're
// just not tied to a specific country. This is UI/flow metadata only - it
// does not grant any special trust, initiateTopUp treats every rail the
// same way (open a pending intent, credit nothing until confirmed).
type TopUpMethod = "mobile_money" | "card" | "bank";

const RAIL_METHODS: Record<string, TopUpMethod> = {
  "M-Pesa": "mobile_money", // Kenya (Safaricom)
  "MTN Mobile Money": "mobile_money", // Uganda
  "Airtel Money": "mobile_money", // Kenya + Uganda
  "SnapScan": "mobile_money", // South Africa (QR wallet)
  "Ozow EFT": "bank", // South Africa (instant EFT)
  "Wio Bank": "bank", // UAE (digital bank)
  "Traditional Bank": "bank",
  "Debit / Credit Card": "card",
};

function requireAuth(request: { auth?: { uid: string } | null }): string {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Sign in required.");
  }
  return request.auth.uid;
}

const rateLimitRef = (key: string) => db.collection("rateLimits").doc(key);

/**
 * Distributed rate limiting for every wallet-mutating function - these
 * move real money, so unlike a slow AI flow, a burst of automated calls is
 * both a cost risk and an abuse vector (e.g. hammering sendFunds/spendFunds
 * to drain fees or explore error messages for account enumeration).
 * Firestore-backed rather than in-memory since Cloud Functions scale
 * horizontally by default - each invocation could land on a different
 * instance.
 */
async function enforceRateLimit(uid: string, flowKey: string, max: number, windowMs: number): Promise<void> {
  const key = `${uid}_${flowKey}`;
  await db.runTransaction(async (tx) => {
    const ref = rateLimitRef(key);
    const snap = await tx.get(ref);
    const now = Date.now();
    const data = snap.data() as { count: number; windowStart: number } | undefined;

    if (!data || now - data.windowStart >= windowMs) {
      tx.set(ref, { count: 1, windowStart: now });
      return;
    }
    if (data.count >= max) {
      const retryInSeconds = Math.ceil((windowMs - (now - data.windowStart)) / 1000);
      throw new HttpsError("resource-exhausted", `You're doing that a lot - please try again in ${retryInSeconds}s.`);
    }
    tx.update(ref, { count: data.count + 1 });
  });
}

async function requireHandle(uid: string): Promise<string> {
  const snap = await userRef(uid).get();
  const existing = snap.data()?.handle;
  if (existing) {
    return existing;
  }

  // The v2 (moud) client creates users/{uid} without a handle field, so
  // instead of failing every money-moving call for those accounts, derive
  // a handle from the profile's name/email, reserve it in /handles (same
  // uniqueness contract the v1 client used), and persist it - both
  // codebases then converge on the same identity field.
  const data = snap.data() ?? {};
  const base =
    String(data.displayName || data.email || "user")
      .split("@")[0]
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, "")
      .slice(0, 20) || "user";

  const candidates = [base];
  for (let i = 0; i < 5; i++) {
    candidates.push(`${base}${Math.floor(1000 + Math.random() * 9000)}`);
  }

  for (const candidate of candidates) {
    try {
      await db.runTransaction(async (tx) => {
        const handleDoc = db.collection("handles").doc(candidate);
        const handleSnap = await tx.get(handleDoc);
        if (handleSnap.exists) {
          throw new HttpsError("already-exists", "HANDLE_TAKEN");
        }
        tx.set(handleDoc, { uid });
        tx.set(userRef(uid), { uid, handle: candidate }, { merge: true });
      });
      return candidate;
    } catch (err) {
      if (err instanceof HttpsError && err.message === "HANDLE_TAKEN") {
        continue;
      }
      throw err;
    }
  }
  throw new HttpsError("internal", "Could not reserve a unique handle.");
}

async function getWalletBalances(tx: Transaction, uid: string) {
  const snap = await tx.get(walletRef(uid));
  return {
    exists: snap.exists,
    balance: (snap.data()?.balance as number) ?? 0,
    tokenBalance: (snap.data()?.tokenBalance as number) ?? 0,
  };
}

export const ensureWallet = onCall({ enforceAppCheck: ENFORCE_APP_CHECK }, async (request) => {
  const uid = requireAuth(request);

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(walletRef(uid));
    if (snap.exists) return;
    tx.set(walletRef(uid), {
      uid,
      balance: 0,
      tokenBalance: SIGNUP_BONUS_TOKENS,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  });

  return { ok: true };
});

export const sendFunds = onCall({ enforceAppCheck: ENFORCE_APP_CHECK }, async (request) => {
  const senderUid = requireAuth(request);
  await enforceRateLimit(senderUid, "sendFunds", 10, 60_000);
  const { recipientUid, amount } = (request.data ?? {}) as { recipientUid?: string; amount?: number };

  if (typeof recipientUid !== "string" || !recipientUid) {
    throw new HttpsError("invalid-argument", "recipientUid is required.");
  }
  if (typeof amount !== "number" || !(amount > 0)) {
    throw new HttpsError("invalid-argument", "amount must be a positive number.");
  }
  if (recipientUid === senderUid) {
    throw new HttpsError("failed-precondition", "You can't send money to yourself.");
  }

  const [senderHandle, recipientHandle] = await Promise.all([
    requireHandle(senderUid),
    requireHandle(recipientUid),
  ]);

  const fee = amount * TRANSACTION_FEE_PERCENT;
  const total = amount + fee;

  await db.runTransaction(async (tx) => {
    const sender = await getWalletBalances(tx, senderUid);
    const recipient = await getWalletBalances(tx, recipientUid);

    if (total > sender.balance) {
      throw new HttpsError("failed-precondition", "Insufficient funds.");
    }
    if (!recipient.exists) {
      throw new HttpsError("not-found", "Recipient wallet not found.");
    }

    tx.update(walletRef(senderUid), { balance: sender.balance - total, updatedAt: FieldValue.serverTimestamp() });
    tx.update(walletRef(recipientUid), { balance: recipient.balance + amount, updatedAt: FieldValue.serverTimestamp() });

    tx.set(transactionsRef(senderUid).doc(), {
      type: "send",
      amount,
      fee,
      recipient: recipientHandle,
      createdAt: FieldValue.serverTimestamp(),
    });
    tx.set(transactionsRef(recipientUid).doc(), {
      type: "receive",
      amount,
      sender: senderHandle,
      createdAt: FieldValue.serverTimestamp(),
    });
    notify(tx, recipientUid, "Money Received", `@${senderHandle} sent you ${amount.toFixed(2)}.`);
  });

  return { ok: true };
});

export const sendGift = onCall({ enforceAppCheck: ENFORCE_APP_CHECK }, async (request) => {
  const viewerUid = requireAuth(request);
  await enforceRateLimit(viewerUid, "sendGift", 30, 60_000);
  const { streamerUid, giftName, price } = (request.data ?? {}) as {
    streamerUid?: string;
    giftName?: string;
    price?: number;
  };

  if (typeof streamerUid !== "string" || !streamerUid) {
    throw new HttpsError("invalid-argument", "streamerUid is required.");
  }
  if (typeof giftName !== "string" || !giftName) {
    throw new HttpsError("invalid-argument", "giftName is required.");
  }
  if (typeof price !== "number" || !(price > 0)) {
    throw new HttpsError("invalid-argument", "price must be a positive number.");
  }
  if (streamerUid === viewerUid) {
    throw new HttpsError("failed-precondition", "You can't gift yourself.");
  }

  const [viewerHandle, streamerHandle] = await Promise.all([
    requireHandle(viewerUid),
    requireHandle(streamerUid),
  ]);

  const streamerShare = price * (1 - GIFT_PLATFORM_FEE_PERCENT);

  await db.runTransaction(async (tx) => {
    const viewer = await getWalletBalances(tx, viewerUid);
    const streamer = await getWalletBalances(tx, streamerUid);

    if (price > viewer.balance) {
      throw new HttpsError("failed-precondition", "Insufficient funds.");
    }
    if (!streamer.exists) {
      throw new HttpsError("not-found", "Streamer wallet not found.");
    }

    tx.update(walletRef(viewerUid), { balance: viewer.balance - price, updatedAt: FieldValue.serverTimestamp() });
    tx.update(walletRef(streamerUid), { balance: streamer.balance + streamerShare, updatedAt: FieldValue.serverTimestamp() });

    tx.set(transactionsRef(viewerUid).doc(), {
      type: "gift-sent",
      amount: price,
      giftName,
      recipient: streamerHandle,
      createdAt: FieldValue.serverTimestamp(),
    });
    tx.set(transactionsRef(streamerUid).doc(), {
      type: "gift-received",
      amount: streamerShare,
      giftName,
      sender: viewerHandle,
      createdAt: FieldValue.serverTimestamp(),
    });
    notify(tx, streamerUid, "Gift Received", `@${viewerHandle} sent you a ${giftName}!`);
  });

  return { ok: true };
});

export const spendFunds = onCall({ enforceAppCheck: ENFORCE_APP_CHECK }, async (request) => {
  const uid = requireAuth(request);
  await enforceRateLimit(uid, "spendFunds", 30, 60_000);
  const { item, amount, productId, stayId, eventId, checkIn, checkOut, rideService } = (request.data ?? {}) as {
    item?: string;
    amount?: number;
    productId?: string;
    stayId?: string;
    checkIn?: string;
    checkOut?: string;
    eventId?: string;
    rideService?: { region?: string; serviceType?: string };
  };

  // Real marketplace listings (functions/src/index.ts's products collection,
  // created via the Partner Dashboard's Create Listing flow) have an
  // authoritative price and a real seller on file, so this path looks both
  // up server-side instead of trusting the client - the client-supplied
  // `amount`/`item` are ignored entirely here, they're only used below for
  // the legacy static-catalog path (Shop's curated items, Events, Stays,
  // Skip) where no server-side catalog exists yet.
  if (typeof productId === "string" && productId) {
    await db.runTransaction(async (tx) => {
      const productSnap = await tx.get(productRef(productId));
      if (!productSnap.exists) {
        throw new HttpsError("not-found", "Listing not found.");
      }
      const product = productSnap.data() as { ownerUid: string; title: string; price: number };
      if (product.ownerUid === uid) {
        throw new HttpsError("failed-precondition", "You can't buy your own listing.");
      }

      const buyer = await getWalletBalances(tx, uid);
      if (product.price > buyer.balance) {
        throw new HttpsError("failed-precondition", "Insufficient funds.");
      }
      const seller = await getWalletBalances(tx, product.ownerUid);
      if (!seller.exists) {
        throw new HttpsError("not-found", "Seller wallet not found.");
      }
      const sellerShare = product.price * (1 - MARKETPLACE_FEE_PERCENT);

      tx.update(walletRef(uid), { balance: buyer.balance - product.price, updatedAt: FieldValue.serverTimestamp() });
      tx.update(walletRef(product.ownerUid), { balance: seller.balance + sellerShare, updatedAt: FieldValue.serverTimestamp() });
      tx.set(transactionsRef(uid).doc(), {
        type: "purchase",
        amount: product.price,
        item: product.title,
        createdAt: FieldValue.serverTimestamp(),
      });
      tx.set(transactionsRef(product.ownerUid).doc(), {
        type: "sale",
        amount: sellerShare,
        item: product.title,
        createdAt: FieldValue.serverTimestamp(),
      });
      notify(tx, product.ownerUid, "You Made a Sale!", `"${product.title}" sold for ${sellerShare.toFixed(2)}.`);
    });

    return { ok: true };
  }

  // Real stays (src/lib/stays.ts, created via the Partner Dashboard's
  // "Become a Host" flow) work like real products above, except the total
  // depends on how many nights the buyer picked - so the server computes
  // that from checkIn/checkOut itself rather than trusting a client-sent
  // total, while still trusting the stay's own pricePerNight from Firestore.
  if (typeof stayId === "string" && stayId) {
    if (typeof checkIn !== "string" || typeof checkOut !== "string") {
      throw new HttpsError("invalid-argument", "checkIn and checkOut are required.");
    }
    const nights = Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86_400_000);
    if (!(nights > 0)) {
      throw new HttpsError("invalid-argument", "checkOut must be after checkIn.");
    }

    await db.runTransaction(async (tx) => {
      const staySnap = await tx.get(stayRef(stayId));
      if (!staySnap.exists) {
        throw new HttpsError("not-found", "Stay not found.");
      }
      const stay = staySnap.data() as { hostUid: string; title: string; pricePerNight: number };
      if (stay.hostUid === uid) {
        throw new HttpsError("failed-precondition", "You can't book your own listing.");
      }

      const total = nights * stay.pricePerNight;
      const buyer = await getWalletBalances(tx, uid);
      if (total > buyer.balance) {
        throw new HttpsError("failed-precondition", "Insufficient funds.");
      }
      const host = await getWalletBalances(tx, stay.hostUid);
      if (!host.exists) {
        throw new HttpsError("not-found", "Host wallet not found.");
      }
      const hostShare = total * (1 - HOST_FEE_PERCENT);
      const label = `${stay.title} (${nights} night${nights > 1 ? "s" : ""})`;

      tx.update(walletRef(uid), { balance: buyer.balance - total, updatedAt: FieldValue.serverTimestamp() });
      tx.update(walletRef(stay.hostUid), { balance: host.balance + hostShare, updatedAt: FieldValue.serverTimestamp() });
      tx.set(transactionsRef(uid).doc(), {
        type: "purchase",
        amount: total,
        item: label,
        stayId,
        createdAt: FieldValue.serverTimestamp(),
      });
      tx.set(transactionsRef(stay.hostUid).doc(), {
        type: "sale",
        amount: hostShare,
        item: stay.title,
        createdAt: FieldValue.serverTimestamp(),
      });
      notify(tx, stay.hostUid, "Your Stay Was Booked!", `${label} - you earned ${hostShare.toFixed(2)}.`);
    });

    return { ok: true };
  }

  // Real events (src/lib/events.ts, created via the Partner Dashboard's
  // "Create Event" flow) work exactly like real products - fixed price, no
  // date-range math needed.
  if (typeof eventId === "string" && eventId) {
    await db.runTransaction(async (tx) => {
      const eventSnap = await tx.get(eventRef(eventId));
      if (!eventSnap.exists) {
        throw new HttpsError("not-found", "Event not found.");
      }
      const eventDoc = eventSnap.data() as { organizerUid: string; title: string; priceValue: number };
      if (eventDoc.organizerUid === uid) {
        throw new HttpsError("failed-precondition", "You can't book your own event.");
      }
      if (!(eventDoc.priceValue > 0)) {
        return; // Free event - nothing to charge or credit.
      }

      const buyer = await getWalletBalances(tx, uid);
      if (eventDoc.priceValue > buyer.balance) {
        throw new HttpsError("failed-precondition", "Insufficient funds.");
      }
      const organizer = await getWalletBalances(tx, eventDoc.organizerUid);
      if (!organizer.exists) {
        throw new HttpsError("not-found", "Organizer wallet not found.");
      }
      const organizerShare = eventDoc.priceValue * (1 - EVENT_FEE_PERCENT);

      tx.update(walletRef(uid), { balance: buyer.balance - eventDoc.priceValue, updatedAt: FieldValue.serverTimestamp() });
      tx.update(walletRef(eventDoc.organizerUid), { balance: organizer.balance + organizerShare, updatedAt: FieldValue.serverTimestamp() });
      tx.set(transactionsRef(uid).doc(), {
        type: "purchase",
        amount: eventDoc.priceValue,
        item: eventDoc.title,
        eventId,
        createdAt: FieldValue.serverTimestamp(),
      });
      tx.set(transactionsRef(eventDoc.organizerUid).doc(), {
        type: "sale",
        amount: organizerShare,
        item: eventDoc.title,
        createdAt: FieldValue.serverTimestamp(),
      });
      notify(tx, eventDoc.organizerUid, "Ticket Sold!", `Someone booked "${eventDoc.title}" - you earned ${organizerShare.toFixed(2)}.`);
    });

    return { ok: true };
  }

  // Skip rides/deliveries with a registered driver available in the same
  // region offering the requested service (src/lib/drivers.ts, the
  // Partner Dashboard's Driver Console) credit that driver directly,
  // instead of the fare just disappearing into the platform. The fare
  // itself is still client-trusted (same as the rest of Skip's static
  // catalog - see the NOTE below), only the driver match + payout is new.
  // Deliberately a plain region+status equality query (no array-contains
  // combined with it) so it doesn't need a composite Firestore index -
  // the services match is filtered in code instead.
  if (rideService && typeof rideService.region === "string" && typeof rideService.serviceType === "string") {
    if (typeof item !== "string" || !item) {
      throw new HttpsError("invalid-argument", "item is required.");
    }
    if (typeof amount !== "number" || !(amount > 0)) {
      throw new HttpsError("invalid-argument", "amount must be a positive number.");
    }
    const { region, serviceType } = rideService;

    let matchedDriver: { uid: string; handle: string; name: string } | null = null;

    // Match a driver OUTSIDE the money transaction. Dispatch is inherently
    // best-effort (a driver could go offline between match and pay - we
    // re-check their wallet inside the tx), so it doesn't need
    // transactional isolation, and keeping the query out of the
    // transaction avoids every concurrent ride in a region contending on
    // the same driver-doc read locks.
    //
    // SCALE: pick a RANDOM eligible driver rather than always the first
    // one. With `.find()`, every concurrent ride in a region that matches
    // the same service picked the same top-of-query driver and all wrote
    // that one driver's wallet document - and Firestore caps sustained
    // writes to a single document at ~1/sec, so a busy region collapsed
    // into serialized retries on one doc. Randomizing spreads the writes
    // across the whole active pool (and is fairer dispatch). A true
    // ride-hailing dispatcher would use a real queue; this removes the
    // pathological single-doc hotspot without that infrastructure.
    const candidates = await driversCol()
      .where("region", "==", region)
      .where("status", "==", "active")
      .limit(20)
      .get();
    const eligible = candidates.docs.filter((d) => {
      const services = d.data().services as string[] | undefined;
      return d.id !== uid && Array.isArray(services) && services.includes(serviceType);
    });
    const chosen = eligible.length > 0 ? eligible[Math.floor(Math.random() * eligible.length)] : null;

    await db.runTransaction(async (tx) => {
      const wallet = await getWalletBalances(tx, uid);
      if (amount > wallet.balance) {
        throw new HttpsError("failed-precondition", "Insufficient funds.");
      }

      tx.update(walletRef(uid), { balance: wallet.balance - amount, updatedAt: FieldValue.serverTimestamp() });
      tx.set(transactionsRef(uid).doc(), {
        type: "purchase",
        amount,
        item,
        driverUid: chosen?.id ?? null,
        createdAt: FieldValue.serverTimestamp(),
      });

      if (chosen) {
        const driver = chosen.data() as { ownerHandle: string; ownerName: string };
        const driverWallet = await getWalletBalances(tx, chosen.id);
        if (driverWallet.exists) {
          const driverShare = amount * (1 - DRIVER_FEE_PERCENT);
          tx.update(walletRef(chosen.id), { balance: driverWallet.balance + driverShare, updatedAt: FieldValue.serverTimestamp() });
          tx.set(transactionsRef(chosen.id).doc(), {
            type: "driver-earning",
            amount: driverShare,
            item,
            createdAt: FieldValue.serverTimestamp(),
          });
          notify(tx, chosen.id, "New Ride Earning", `You earned ${driverShare.toFixed(2)} for "${item}".`);
          matchedDriver = { uid: chosen.id, handle: driver.ownerHandle, name: driver.ownerName };
        }
      }
    });

    return { ok: true, driver: matchedDriver };
  }

  if (typeof item !== "string" || !item) {
    throw new HttpsError("invalid-argument", "item is required.");
  }
  if (typeof amount !== "number" || !(amount > 0)) {
    throw new HttpsError("invalid-argument", "amount must be a positive number.");
  }

  // NOTE: `amount` is trusted from the caller for this final fallback path -
  // it's what's left once productId/stayId/eventId/rideService have all
  // been ruled out: Shop's own curated catalog, Skip fares with no driver
  // match, and any ride with no rideService info at all. These stay "sold
  // by Moood" with no real seller/driver to credit, on a static price the
  // frontend made up rather than a server-side record. Migrating each of
  // these to a real, server-priced catalog (the way products/stays/events
  // now work) closes this the same way the wallet migration closed
  // client-writable balances.

  await db.runTransaction(async (tx) => {
    const wallet = await getWalletBalances(tx, uid);
    if (amount > wallet.balance) {
      throw new HttpsError("failed-precondition", "Insufficient funds.");
    }
    tx.update(walletRef(uid), { balance: wallet.balance - amount, updatedAt: FieldValue.serverTimestamp() });
    tx.set(transactionsRef(uid).doc(), {
      type: "purchase",
      amount,
      item,
      createdAt: FieldValue.serverTimestamp(),
    });
  });

  return { ok: true };
});

/**
 * Top-ups (bringing outside money - card, mobile money, bank - into the
 * Moood wallet) are a two-step, intent + confirmation flow instead of a
 * single trusted call, because unlike spendFunds/sendFunds this is the one
 * place new money enters the system rather than moving between wallets we
 * already control:
 *
 *   1. initiateTopUp opens a `topupIntents/{id}` doc with status "pending"
 *      and the SERVER-recorded amount/rail. No balance changes yet.
 *   2. Something must independently confirm the money actually arrived
 *      before the wallet is credited - either the real payment provider's
 *      webhook (topUpWebhook, production path) or, until a live aggregator
 *      account exists, simulateTopUpConfirmation (demo path, see its own
 *      comment below).
 *
 * completeTopUpIntent is shared by both confirmation paths and is
 * idempotent (re-confirming an already-completed intent is a no-op), since
 * webhooks can retry and a flaky client connection could call the demo
 * endpoint twice.
 */
async function completeTopUpIntent(intentId: string): Promise<void> {
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(topupIntentRef(intentId));
    if (!snap.exists) {
      throw new HttpsError("not-found", "Top-up intent not found.");
    }
    const intent = snap.data() as { uid: string; amount: number; rail: string; status: string };
    if (intent.status !== "pending") {
      return; // Already completed or failed - nothing to do.
    }

    const wallet = await getWalletBalances(tx, intent.uid);
    tx.update(walletRef(intent.uid), {
      balance: wallet.balance + intent.amount,
      updatedAt: FieldValue.serverTimestamp(),
    });
    tx.set(transactionsRef(intent.uid).doc(), {
      type: "topup",
      amount: intent.amount,
      rail: intent.rail,
      createdAt: FieldValue.serverTimestamp(),
    });
    tx.update(snap.ref, { status: "completed", completedAt: FieldValue.serverTimestamp() });
    notify(tx, intent.uid, "Top-Up Complete", `${intent.amount.toFixed(2)} added via ${intent.rail}.`);
  });
}

export const initiateTopUp = onCall({ enforceAppCheck: ENFORCE_APP_CHECK }, async (request) => {
  const uid = requireAuth(request);
  await enforceRateLimit(uid, "initiateTopUp", 5, 60_000);
  const { amount, rail, phone } = (request.data ?? {}) as { amount?: number; rail?: string; phone?: string };

  if (typeof amount !== "number" || !(amount > 0)) {
    throw new HttpsError("invalid-argument", "amount must be a positive number.");
  }
  if (typeof rail !== "string" || !rail) {
    throw new HttpsError("invalid-argument", "rail is required.");
  }

  const method = RAIL_METHODS[rail] ?? "card";
  if (method === "mobile_money" && (typeof phone !== "string" || phone.trim().length < 7)) {
    throw new HttpsError("invalid-argument", "A valid mobile money phone number is required for this rail.");
  }

  const intent = topupIntentRef(db.collection("topupIntents").doc().id);
  await intent.set({
    uid,
    amount,
    rail,
    method,
    phone: phone ?? null,
    status: "pending",
    createdAt: FieldValue.serverTimestamp(),
  });

  return { intentId: intent.id, method };
});

/**
 * Production webhook contract for a real regional payment aggregator
 * (e.g. Flutterwave or Paystack for M-Pesa/MTN/Airtel Money + cards across
 * KE/UG/ZA, Checkout.com/Telr for AE cards/Wio Bank). Nothing in this app
 * calls this yet - it exists so wiring up a live provider later means
 * pointing their dashboard at this URL and setting PAYMENT_WEBHOOK_SECRET,
 * not writing new wallet-crediting logic.
 *
 * The signature check is mandatory: this endpoint has no Firebase Auth
 * context (the caller is the payment provider's server, not a Moood user),
 * so an unsigned or wrongly-signed request is indistinguishable from an
 * attacker POSTing a fake "payment succeeded" event.
 */
export const topUpWebhook = onRequest({ secrets: [paymentWebhookSecret] }, async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).send("Method not allowed.");
    return;
  }
  const secret = paymentWebhookSecret.value();
  const signature = req.get("X-Webhook-Signature");

  if (!secret) {
    res.status(503).send("Webhook not configured.");
    return;
  }
  if (!signature || !req.rawBody || !verifySignature(req.rawBody, signature, secret)) {
    res.status(401).send("Invalid signature.");
    return;
  }

  const { intentId, status } = (req.body ?? {}) as { intentId?: string; status?: string };
  if (typeof intentId !== "string" || !intentId) {
    res.status(400).send("Missing intentId.");
    return;
  }

  if (status !== "successful") {
    await topupIntentRef(intentId)
      .update({ status: "failed", completedAt: FieldValue.serverTimestamp() })
      .catch(() => {});
    res.status(200).send("ok");
    return;
  }

  await completeTopUpIntent(intentId);
  res.status(200).send("ok");
});

function verifySignature(rawBody: Buffer, signatureHeader: string, secret: string): boolean {
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const expectedBuf = Buffer.from(expected, "utf8");
  const providedBuf = Buffer.from(signatureHeader, "utf8");
  if (expectedBuf.length !== providedBuf.length) return false;
  return timingSafeEqual(expectedBuf, providedBuf);
}

export const simulateTopUpConfirmation = onCall({ enforceAppCheck: ENFORCE_APP_CHECK }, async (request) => {
  const uid = requireAuth(request);
  await enforceRateLimit(uid, "simulateTopUpConfirmation", 10, 60_000);
  const { intentId } = (request.data ?? {}) as { intentId?: string };

  if (typeof intentId !== "string" || !intentId) {
    throw new HttpsError("invalid-argument", "intentId is required.");
  }

  // DEMO STAND-IN, NOT PRODUCTION-SAFE: no live payment aggregator is
  // connected yet (see topUpWebhook above), so there is no real webhook to
  // confirm a top-up ever happened. This lets the app demo the full
  // card/mobile-money/bank top-up flow end-to-end without a payment
  // account. It only lets a user confirm their OWN pending intent, so it
  // can't be used to credit someone else's wallet - but it still means a
  // signed-in user can mint themselves funds by calling this directly
  // without having actually paid anything, exactly like the old
  // client-trusted topUpFunds did. Delete this function once topUpWebhook
  // is receiving real events from a live aggregator.
  const snap = await topupIntentRef(intentId).get();
  if (!snap.exists || snap.data()?.uid !== uid) {
    throw new HttpsError("not-found", "Top-up intent not found.");
  }

  await completeTopUpIntent(intentId);
  return { ok: true };
});

export const swapAssets = onCall({ enforceAppCheck: ENFORCE_APP_CHECK }, async (request) => {
  const uid = requireAuth(request);
  await enforceRateLimit(uid, "swapAssets", 15, 60_000);
  const { direction, amount } = (request.data ?? {}) as {
    direction?: "cashToToken" | "tokenToCash";
    amount?: number;
  };

  if (direction !== "cashToToken" && direction !== "tokenToCash") {
    throw new HttpsError("invalid-argument", "direction must be 'cashToToken' or 'tokenToCash'.");
  }
  if (typeof amount !== "number" || !(amount > 0)) {
    throw new HttpsError("invalid-argument", "amount must be a positive number.");
  }

  await db.runTransaction(async (tx) => {
    const wallet = await getWalletBalances(tx, uid);
    let newBalance = wallet.balance;
    let newTokenBalance = wallet.tokenBalance;

    if (direction === "cashToToken") {
      if (amount > wallet.balance) {
        throw new HttpsError("failed-precondition", "Insufficient funds.");
      }
      newBalance -= amount;
      newTokenBalance += amount / MOOOD_TOKEN_RATE;
    } else {
      if (amount > wallet.tokenBalance) {
        throw new HttpsError("failed-precondition", "Insufficient MOOOD tokens.");
      }
      newTokenBalance -= amount;
      newBalance += amount * MOOOD_TOKEN_RATE;
    }

    tx.update(walletRef(uid), {
      balance: newBalance,
      tokenBalance: newTokenBalance,
      updatedAt: FieldValue.serverTimestamp(),
    });
    tx.set(transactionsRef(uid).doc(), {
      type: "swap",
      direction,
      amount,
      createdAt: FieldValue.serverTimestamp(),
    });
  });

  return { ok: true };
});

/**
 * Withdrawals (moving wallet balance back out to a real card/mobile money/
 * bank account) are the mirror image of top-ups, with one difference: we
 * already trust the balance being withdrawn (it's real Moood-internal
 * value, same as spendFunds/sendFunds), so the wallet is debited immediately
 * rather than waiting on a payout confirmation. What's still unconfirmed is
 * whether the aggregator's payout to the user's phone/bank/card actually
 * lands - if it fails, refundFailedWithdrawal puts the money back.
 */
export const initiateWithdrawal = onCall({ enforceAppCheck: ENFORCE_APP_CHECK }, async (request) => {
  const uid = requireAuth(request);
  await enforceRateLimit(uid, "initiateWithdrawal", 5, 60_000);
  const { amount, rail, phone } = (request.data ?? {}) as { amount?: number; rail?: string; phone?: string };

  if (typeof amount !== "number" || !(amount > 0)) {
    throw new HttpsError("invalid-argument", "amount must be a positive number.");
  }
  if (typeof rail !== "string" || !rail) {
    throw new HttpsError("invalid-argument", "rail is required.");
  }
  const method = RAIL_METHODS[rail] ?? "card";
  if (method === "mobile_money" && (typeof phone !== "string" || phone.trim().length < 7)) {
    throw new HttpsError("invalid-argument", "A valid mobile money phone number is required for this rail.");
  }

  const intent = withdrawalIntentRef(db.collection("withdrawalIntents").doc().id);

  await db.runTransaction(async (tx) => {
    const wallet = await getWalletBalances(tx, uid);
    if (amount > wallet.balance) {
      throw new HttpsError("failed-precondition", "Insufficient funds.");
    }
    tx.update(walletRef(uid), { balance: wallet.balance - amount, updatedAt: FieldValue.serverTimestamp() });
    tx.set(transactionsRef(uid).doc(), {
      type: "withdrawal",
      amount,
      rail,
      createdAt: FieldValue.serverTimestamp(),
    });
    tx.set(intent, {
      uid,
      amount,
      rail,
      method,
      phone: phone ?? null,
      status: "pending",
      createdAt: FieldValue.serverTimestamp(),
    });
  });

  return { intentId: intent.id, method };
});

/**
 * Production webhook contract for the payout side of a real aggregator -
 * same signature-verification requirement as topUpWebhook, since this is
 * also an unauthenticated server-to-server callback.
 */
export const payoutWebhook = onRequest({ secrets: [paymentWebhookSecret] }, async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).send("Method not allowed.");
    return;
  }
  const secret = paymentWebhookSecret.value();
  const signature = req.get("X-Webhook-Signature");

  if (!secret) {
    res.status(503).send("Webhook not configured.");
    return;
  }
  if (!signature || !req.rawBody || !verifySignature(req.rawBody, signature, secret)) {
    res.status(401).send("Invalid signature.");
    return;
  }

  const { intentId, status } = (req.body ?? {}) as { intentId?: string; status?: string };
  if (typeof intentId !== "string" || !intentId) {
    res.status(400).send("Missing intentId.");
    return;
  }

  if (status === "successful") {
    const snap = await withdrawalIntentRef(intentId).get();
    await withdrawalIntentRef(intentId)
      .update({ status: "completed", completedAt: FieldValue.serverTimestamp() })
      .catch(() => {});
    const intent = snap.data() as { uid: string; amount: number; rail: string } | undefined;
    if (intent) {
      await notifyDirect(intent.uid, "Withdrawal Sent", `${intent.amount.toFixed(2)} is on its way to ${intent.rail}.`);
    }
    res.status(200).send("ok");
    return;
  }

  await refundFailedWithdrawal(intentId);
  res.status(200).send("ok");
});

async function refundFailedWithdrawal(intentId: string): Promise<void> {
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(withdrawalIntentRef(intentId));
    if (!snap.exists) return;
    const intent = snap.data() as { uid: string; amount: number; rail: string; status: string };
    if (intent.status !== "pending") return; // Already resolved - don't refund twice.

    const wallet = await getWalletBalances(tx, intent.uid);
    tx.update(walletRef(intent.uid), { balance: wallet.balance + intent.amount, updatedAt: FieldValue.serverTimestamp() });
    tx.set(transactionsRef(intent.uid).doc(), {
      type: "receive",
      amount: intent.amount,
      sender: "Moood (failed withdrawal refund)",
      createdAt: FieldValue.serverTimestamp(),
    });
    tx.update(snap.ref, { status: "failed", completedAt: FieldValue.serverTimestamp() });
    notify(tx, intent.uid, "Withdrawal Failed", `${intent.amount.toFixed(2)} to ${intent.rail} didn't go through - it's been refunded to your wallet.`);
  });
}

export const simulateWithdrawalConfirmation = onCall({ enforceAppCheck: ENFORCE_APP_CHECK }, async (request) => {
  const uid = requireAuth(request);
  await enforceRateLimit(uid, "simulateWithdrawalConfirmation", 10, 60_000);
  const { intentId } = (request.data ?? {}) as { intentId?: string };

  if (typeof intentId !== "string" || !intentId) {
    throw new HttpsError("invalid-argument", "intentId is required.");
  }

  // DEMO STAND-IN, NOT PRODUCTION-SAFE - see simulateTopUpConfirmation above
  // for the full explanation. This just marks a withdrawal "paid out"
  // without a real aggregator ever moving money. Delete once payoutWebhook
  // is receiving real events.
  const snap = await withdrawalIntentRef(intentId).get();
  if (!snap.exists || snap.data()?.uid !== uid) {
    throw new HttpsError("not-found", "Withdrawal not found.");
  }
  const intent = snap.data() as { amount: number; rail: string; status: string };
  if (intent.status === "pending") {
    await snap.ref.update({ status: "completed", completedAt: FieldValue.serverTimestamp() });
    await notifyDirect(uid, "Withdrawal Sent", `${intent.amount.toFixed(2)} is on its way to ${intent.rail}.`);
  }

  return { ok: true };
});

/**
 * Star ratings for Skip drivers, Stays, and Events. Gated on actually
 * having transacted with the thing being rated - the buyer-side purchase
 * transaction now carries a stayId/eventId/driverUid (see the productId/
 * stayId/eventId/rideService branches of spendFunds above), so this just
 * checks for at least one matching transaction rather than trusting the
 * client's word that a booking happened. One review per user per entity
 * (the review doc ID is the rater's own uid), so resubmitting updates
 * their existing rating instead of inflating the count.
 */
export const submitRating = onCall({ enforceAppCheck: ENFORCE_APP_CHECK }, async (request) => {
  const uid = requireAuth(request);
  await enforceRateLimit(uid, "submitRating", 20, 60_000);
  const { entityType, entityId, rating, comment } = (request.data ?? {}) as {
    entityType?: "stay" | "event" | "driver";
    entityId?: string;
    rating?: number;
    comment?: string;
  };

  if (entityType !== "stay" && entityType !== "event" && entityType !== "driver") {
    throw new HttpsError("invalid-argument", "entityType must be 'stay', 'event', or 'driver'.");
  }
  if (typeof entityId !== "string" || !entityId) {
    throw new HttpsError("invalid-argument", "entityId is required.");
  }
  if (typeof rating !== "number" || !Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new HttpsError("invalid-argument", "rating must be a whole number from 1 to 5.");
  }
  if (comment !== undefined && (typeof comment !== "string" || comment.length > 500)) {
    throw new HttpsError("invalid-argument", "comment must be 500 characters or fewer.");
  }

  const fieldName = entityType === "stay" ? "stayId" : entityType === "event" ? "eventId" : "driverUid";
  const eligible = await transactionsRef(uid).where(fieldName, "==", entityId).limit(1).get();
  if (eligible.empty) {
    throw new HttpsError("failed-precondition", "You can only rate something you've actually booked or ridden with.");
  }

  const handle = await requireHandle(uid);
  const entityDocRef = db.collection(RATED_COLLECTION[entityType]).doc(entityId);
  const reviewRef = entityDocRef.collection("reviews").doc(uid);

  await db.runTransaction(async (tx) => {
    const [entitySnap, reviewSnap] = await Promise.all([tx.get(entityDocRef), tx.get(reviewRef)]);
    if (!entitySnap.exists) {
      throw new HttpsError("not-found", "Listing not found.");
    }
    const data = entitySnap.data() as { ratingSum?: number; ratingCount?: number };
    const previousRating = reviewSnap.exists ? (reviewSnap.data()?.rating as number | undefined) : undefined;

    let ratingSum = data.ratingSum ?? 0;
    let ratingCount = data.ratingCount ?? 0;
    if (previousRating !== undefined) {
      ratingSum = ratingSum - previousRating + rating;
    } else {
      ratingSum += rating;
      ratingCount += 1;
    }

    tx.set(reviewRef, {
      authorUid: uid,
      authorHandle: handle,
      rating,
      comment: comment ?? null,
      createdAt: FieldValue.serverTimestamp(),
    });
    tx.update(entityDocRef, { ratingSum, ratingCount });
  });

  return { ok: true };
});

/**
 * Paid, time-boxed in-app promotion ("Ads" - Partner Dashboard's "Promote"
 * flow). Buying an ad slot is a straight platform-revenue purchase (no
 * seller to credit, same pattern as Skip fares with no driver match) -
 * `durationDays` sets a server-computed price and expiresAt, both ignoring
 * whatever the client might send, so a promotion can't be bought cheaper
 * or made to run longer than paid for. There's no scheduled cleanup job
 * for expired ads; src/lib/ads.ts's subscribeToActiveAds filters
 * `expiresAt > now` instead, so an expired ad simply stops being queried/
 * rendered rather than needing to be deleted.
 */
// Monthly account tiers (the v2 client's Packages tab). Server-side price
// list - the client's displayed prices are cosmetic; this map is what
// actually gets charged, and firestore.rules blocks clients from writing
// tier/tierExpiresAt themselves, so paying here is the ONLY way to hold a
// paid tier. "Free" is always settable at no charge (downgrade/expiry).
const ACCOUNT_TIER_PRICES: Record<string, number> = {
  Starter: 3,
  Pro: 7,
  Elite: 10,
  Merchant: 10,
  Enterprise: 15,
  Mkuu: 20,
};
const TIER_DURATION_MS = 30 * 24 * 60 * 60 * 1000;

export const purchaseTier = onCall({ enforceAppCheck: ENFORCE_APP_CHECK }, async (request) => {
  const uid = requireAuth(request);
  await enforceRateLimit(uid, "purchaseTier", 10, 60_000);
  const { tierName } = (request.data ?? {}) as { tierName?: string };

  if (tierName === "Free") {
    await userRef(uid).set({ tier: "Free", tierExpiresAt: null }, { merge: true });
    return { ok: true, tier: "Free", expiresAt: null };
  }

  if (typeof tierName !== "string" || !(tierName in ACCOUNT_TIER_PRICES)) {
    throw new HttpsError("invalid-argument", "Unknown tier.");
  }

  const price = ACCOUNT_TIER_PRICES[tierName];
  const expiresAt = Timestamp.fromMillis(Date.now() + TIER_DURATION_MS);

  await db.runTransaction(async (tx) => {
    const wallet = await getWalletBalances(tx, uid);
    if (price > wallet.balance) {
      throw new HttpsError("failed-precondition", "Insufficient funds.");
    }
    tx.update(walletRef(uid), { balance: wallet.balance - price, updatedAt: FieldValue.serverTimestamp() });
    tx.set(transactionsRef(uid).doc(), {
      type: "purchase",
      amount: price,
      item: `${tierName} Tier (30 days)`,
      createdAt: FieldValue.serverTimestamp(),
    });
    tx.set(userRef(uid), { tier: tierName, tierExpiresAt: expiresAt }, { merge: true });
    notify(tx, uid, "Tier Activated!", `You're now on the ${tierName} tier for 30 days.`);
  });

  return { ok: true, tier: tierName, expiresAt: expiresAt.toMillis() };
});

export const purchaseAd = onCall({ enforceAppCheck: ENFORCE_APP_CHECK }, async (request) => {
  const uid = requireAuth(request);
  await enforceRateLimit(uid, "purchaseAd", 5, 60_000);
  const { title, description, image, targetType, targetId, linkPath, durationDays, tier, interestTags } = (request.data ?? {}) as {
    title?: string;
    description?: string;
    image?: string;
    targetType?: "product" | "stay" | "event" | "driver" | "external";
    targetId?: string;
    linkPath?: string;
    durationDays?: number;
    tier?: AdTier;
    interestTags?: string[];
  };

  if (typeof title !== "string" || !title.trim()) {
    throw new HttpsError("invalid-argument", "title is required.");
  }
  if (typeof linkPath !== "string" || !linkPath.startsWith("/")) {
    throw new HttpsError("invalid-argument", "linkPath must be an in-app path starting with '/'.");
  }
  if (typeof durationDays !== "number" || !Number.isInteger(durationDays) || durationDays < 1 || durationDays > AD_MAX_DAYS) {
    throw new HttpsError("invalid-argument", `durationDays must be a whole number from 1 to ${AD_MAX_DAYS}.`);
  }
  if (tier !== "basic" && tier !== "featured" && tier !== "premium") {
    throw new HttpsError("invalid-argument", "tier must be 'basic', 'featured', or 'premium'.");
  }

  const safeTargetType = targetType ?? "external";
  const safeInterestTags = Array.isArray(interestTags)
    ? interestTags.filter((t): t is string => typeof t === "string").slice(0, 15)
    : [];
  const verticals = verticalsForTier(tier, safeTargetType);
  const stars = AD_TIER_STARS[tier];
  const cost = Math.round(durationDays * AD_PRICE_PER_DAY * AD_TIER_MULTIPLIER[tier]);
  const handle = await requireHandle(uid);
  const adRef = adsCol().doc();

  await db.runTransaction(async (tx) => {
    const wallet = await getWalletBalances(tx, uid);
    if (cost > wallet.balance) {
      throw new HttpsError("failed-precondition", "Insufficient funds.");
    }

    tx.update(walletRef(uid), { balance: wallet.balance - cost, updatedAt: FieldValue.serverTimestamp() });
    tx.set(transactionsRef(uid).doc(), {
      type: "purchase",
      amount: cost,
      item: `Ad: ${title} (${tier}, ${durationDays}d)`,
      createdAt: FieldValue.serverTimestamp(),
    });
    tx.set(adRef, {
      ownerUid: uid,
      ownerHandle: handle,
      title: title.trim(),
      description: (description ?? "").trim(),
      image: image ?? null,
      targetType: safeTargetType,
      targetId: targetId ?? null,
      linkPath,
      durationDays,
      tier,
      stars,
      verticals,
      interestTags: safeInterestTags,
      cost,
      // Random [0,1) shard so the client can pull a *random window* of
      // active ads instead of always the same top-N-by-expiry. This is
      // what lets the display scale to millions of concurrent ads and
      // still give every ad impressions (fair rotation) - see
      // subscribeToActiveAds in src/lib/ads.ts.
      bucket: Math.random(),
      createdAt: FieldValue.serverTimestamp(),
      expiresAt: Timestamp.fromMillis(Date.now() + durationDays * 86_400_000),
    });
    notify(
      tx,
      uid,
      "Your Ad Is Live!",
      `"${title}" is now running as a ${tier} promotion across ${verticals.length} vertical${verticals.length > 1 ? "s" : ""} for ${durationDays} day${durationDays > 1 ? "s" : ""}.`
    );
  });

  return { ok: true, adId: adRef.id };
});
