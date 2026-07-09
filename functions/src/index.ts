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
import { getFirestore, FieldValue, Transaction } from "firebase-admin/firestore";
import { onCall, onRequest, HttpsError } from "firebase-functions/v2/https";

initializeApp();
const db = getFirestore();

const TRANSACTION_FEE_PERCENT = 0.005;
const MOOOD_TOKEN_RATE = 2;
const GIFT_PLATFORM_FEE_PERCENT = 0.2;
const SIGNUP_BONUS_TOKENS = 100;
const MARKETPLACE_FEE_PERCENT = 0.1;

const walletRef = (uid: string) => db.collection("wallets").doc(uid);
const transactionsRef = (uid: string) => walletRef(uid).collection("transactions");
const userRef = (uid: string) => db.collection("users").doc(uid);
const topupIntentRef = (id: string) => db.collection("topupIntents").doc(id);
const productRef = (id: string) => db.collection("products").doc(id);
const withdrawalIntentRef = (id: string) => db.collection("withdrawalIntents").doc(id);

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

async function requireHandle(uid: string): Promise<string> {
  const snap = await userRef(uid).get();
  const handle = snap.data()?.handle;
  if (!handle) {
    throw new HttpsError("failed-precondition", "User profile not found.");
  }
  return handle;
}

async function getWalletBalances(tx: Transaction, uid: string) {
  const snap = await tx.get(walletRef(uid));
  return {
    exists: snap.exists,
    balance: (snap.data()?.balance as number) ?? 0,
    tokenBalance: (snap.data()?.tokenBalance as number) ?? 0,
  };
}

export const ensureWallet = onCall(async (request) => {
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

export const sendFunds = onCall(async (request) => {
  const senderUid = requireAuth(request);
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
  });

  return { ok: true };
});

export const sendGift = onCall(async (request) => {
  const viewerUid = requireAuth(request);
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
  });

  return { ok: true };
});

export const spendFunds = onCall(async (request) => {
  const uid = requireAuth(request);
  const { item, amount, productId } = (request.data ?? {}) as { item?: string; amount?: number; productId?: string };

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
    });

    return { ok: true };
  }

  if (typeof item !== "string" || !item) {
    throw new HttpsError("invalid-argument", "item is required.");
  }
  if (typeof amount !== "number" || !(amount > 0)) {
    throw new HttpsError("invalid-argument", "amount must be a positive number.");
  }

  // NOTE: `amount` is trusted from the caller for this legacy path because
  // Events/Stays/Skip/Shop's curated catalog are still static arrays in the
  // frontend with no server-side record to check against - unlike the real
  // `products` catalog above, there's no seller here to credit either
  // (these are all "sold by Moood" platform items). Migrating each of these
  // to a real, server-priced catalog (the way `products` now works) closes
  // this the same way the wallet migration closed client-writable balances.

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
  });
}

export const initiateTopUp = onCall(async (request) => {
  const uid = requireAuth(request);
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
export const topUpWebhook = onRequest(async (req, res) => {
  const secret = process.env.PAYMENT_WEBHOOK_SECRET;
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

export const simulateTopUpConfirmation = onCall(async (request) => {
  const uid = requireAuth(request);
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

export const swapAssets = onCall(async (request) => {
  const uid = requireAuth(request);
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
export const initiateWithdrawal = onCall(async (request) => {
  const uid = requireAuth(request);
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
export const payoutWebhook = onRequest(async (req, res) => {
  const secret = process.env.PAYMENT_WEBHOOK_SECRET;
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
    await withdrawalIntentRef(intentId)
      .update({ status: "completed", completedAt: FieldValue.serverTimestamp() })
      .catch(() => {});
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
  });
}

export const simulateWithdrawalConfirmation = onCall(async (request) => {
  const uid = requireAuth(request);
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
  if (snap.data()?.status === "pending") {
    await snap.ref.update({ status: "completed", completedAt: FieldValue.serverTimestamp() });
  }

  return { ok: true };
});
