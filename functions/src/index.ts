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

import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue, Transaction } from "firebase-admin/firestore";
import { onCall, HttpsError } from "firebase-functions/v2/https";

initializeApp();
const db = getFirestore();

const TRANSACTION_FEE_PERCENT = 0.005;
const MOOOD_TOKEN_RATE = 2;
const GIFT_PLATFORM_FEE_PERCENT = 0.2;
const SIGNUP_BONUS_TOKENS = 100;

const walletRef = (uid: string) => db.collection("wallets").doc(uid);
const transactionsRef = (uid: string) => walletRef(uid).collection("transactions");
const userRef = (uid: string) => db.collection("users").doc(uid);

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
  const { item, amount } = (request.data ?? {}) as { item?: string; amount?: number };

  if (typeof item !== "string" || !item) {
    throw new HttpsError("invalid-argument", "item is required.");
  }
  if (typeof amount !== "number" || !(amount > 0)) {
    throw new HttpsError("invalid-argument", "amount must be a positive number.");
  }

  // NOTE: `amount` is trusted from the caller because there is no real,
  // server-side product catalog yet (shop/events/skip prices are static
  // arrays in the frontend). Once a real catalog exists, look up the
  // authoritative price by item/productId here instead of trusting the
  // client-supplied amount.

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

export const topUpFunds = onCall(async (request) => {
  const uid = requireAuth(request);
  const { amount, rail } = (request.data ?? {}) as { amount?: number; rail?: string };

  if (typeof amount !== "number" || !(amount > 0)) {
    throw new HttpsError("invalid-argument", "amount must be a positive number.");
  }
  if (typeof rail !== "string" || !rail) {
    throw new HttpsError("invalid-argument", "rail is required.");
  }

  // SECURITY NOTE: this credits the caller's own wallet on their say-so -
  // there is no real payment gateway (Stripe/mobile money/card processor)
  // wired in yet to confirm money actually changed hands. Moving this to a
  // Cloud Function stops a client from writing straight to Firestore, but
  // it does NOT make top-ups safe on its own: anyone who calls this
  // function directly can still mint themselves funds. Before this goes
  // live with real money, gate this behind a verified payment webhook
  // (e.g. a Stripe payment_intent.succeeded event, or the regional mobile
  // money provider's callback) instead of trusting the client's `amount`.

  await db.runTransaction(async (tx) => {
    const wallet = await getWalletBalances(tx, uid);
    tx.update(walletRef(uid), { balance: wallet.balance + amount, updatedAt: FieldValue.serverTimestamp() });
    tx.set(transactionsRef(uid).doc(), {
      type: "topup",
      amount,
      rail,
      createdAt: FieldValue.serverTimestamp(),
    });
  });

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
