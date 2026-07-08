import {
  doc,
  collection,
  getDoc,
  setDoc,
  runTransaction,
  onSnapshot,
  serverTimestamp,
  query,
  orderBy,
  limit,
  Timestamp,
} from "firebase/firestore";
import { firestore } from "@/lib/firebase-config";

export const TRANSACTION_FEE_PERCENT = 0.005;
/** How many local-currency units one MOOOD token is worth when swapping. */
export const MOOOD_TOKEN_RATE = 2;
const SIGNUP_BONUS_TOKENS = 100;

export type Wallet = {
  uid: string;
  balance: number;
  tokenBalance: number;
};

export type WalletTransaction = {
  id: string;
  type: "send" | "receive" | "topup" | "swap" | "gift-sent" | "gift-received" | "purchase";
  amount: number;
  fee?: number;
  recipient?: string;
  sender?: string;
  rail?: string;
  direction?: "cashToToken" | "tokenToCash";
  giftName?: string;
  item?: string;
  createdAt: Timestamp | null;
};

/** Platform's cut of a virtual gift; the rest goes straight to the streamer. */
export const GIFT_PLATFORM_FEE_PERCENT = 0.2;

const walletRef = (uid: string) => doc(firestore, "wallets", uid);
const transactionsRef = (uid: string) =>
  collection(firestore, "wallets", uid, "transactions");

export async function ensureWallet(uid: string): Promise<void> {
  const ref = walletRef(uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      uid,
      balance: 0,
      tokenBalance: SIGNUP_BONUS_TOKENS,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }
}

export function subscribeToWallet(
  uid: string,
  onChange: (wallet: Wallet) => void
) {
  return onSnapshot(walletRef(uid), (snap) => {
    const data = snap.data();
    onChange({
      uid,
      balance: data?.balance ?? 0,
      tokenBalance: data?.tokenBalance ?? 0,
    });
  });
}

export function subscribeToTransactions(
  uid: string,
  onChange: (transactions: WalletTransaction[]) => void
) {
  const q = query(transactionsRef(uid), orderBy("createdAt", "desc"), limit(20));
  return onSnapshot(q, (snap) => {
    onChange(
      snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<WalletTransaction, "id">) }))
    );
  });
}

export async function sendFunds(
  sender: { uid: string; handle: string },
  recipient: { uid: string; handle: string },
  amount: number
) {
  if (amount <= 0) throw new Error("Amount must be greater than zero.");
  if (recipient.uid === sender.uid) throw new Error("You can't send money to yourself.");

  const fee = amount * TRANSACTION_FEE_PERCENT;
  const total = amount + fee;

  await runTransaction(firestore, async (tx) => {
    const senderRef = walletRef(sender.uid);
    const recipientRef = walletRef(recipient.uid);

    // Firestore transactions require all reads before any writes.
    const [senderSnap, recipientSnap] = await Promise.all([tx.get(senderRef), tx.get(recipientRef)]);

    const senderBalance = senderSnap.data()?.balance ?? 0;
    if (total > senderBalance) {
      throw new Error("Insufficient funds.");
    }
    if (!recipientSnap.exists()) {
      throw new Error("Recipient wallet not found.");
    }
    const recipientBalance = recipientSnap.data()?.balance ?? 0;

    tx.update(senderRef, { balance: senderBalance - total, updatedAt: serverTimestamp() });
    tx.update(recipientRef, { balance: recipientBalance + amount, updatedAt: serverTimestamp() });

    tx.set(doc(transactionsRef(sender.uid)), {
      type: "send",
      amount,
      fee,
      recipient: recipient.handle,
      createdAt: serverTimestamp(),
    });
    tx.set(doc(transactionsRef(recipient.uid)), {
      type: "receive",
      amount,
      sender: sender.handle,
      createdAt: serverTimestamp(),
    });
  });
}

export async function sendGift(
  viewer: { uid: string; handle: string },
  streamer: { uid: string; handle: string },
  giftName: string,
  price: number
) {
  if (price <= 0) throw new Error("Invalid gift.");
  if (streamer.uid === viewer.uid) throw new Error("You can't gift yourself.");

  const streamerShare = price * (1 - GIFT_PLATFORM_FEE_PERCENT);

  await runTransaction(firestore, async (tx) => {
    const viewerRef = walletRef(viewer.uid);
    const streamerRef = walletRef(streamer.uid);

    const [viewerSnap, streamerSnap] = await Promise.all([tx.get(viewerRef), tx.get(streamerRef)]);

    const viewerBalance = viewerSnap.data()?.balance ?? 0;
    if (price > viewerBalance) {
      throw new Error("Insufficient funds.");
    }
    if (!streamerSnap.exists()) {
      throw new Error("Streamer wallet not found.");
    }
    const streamerBalance = streamerSnap.data()?.balance ?? 0;

    tx.update(viewerRef, { balance: viewerBalance - price, updatedAt: serverTimestamp() });
    tx.update(streamerRef, { balance: streamerBalance + streamerShare, updatedAt: serverTimestamp() });

    tx.set(doc(transactionsRef(viewer.uid)), {
      type: "gift-sent",
      amount: price,
      giftName,
      recipient: streamer.handle,
      createdAt: serverTimestamp(),
    });
    tx.set(doc(transactionsRef(streamer.uid)), {
      type: "gift-received",
      amount: streamerShare,
      giftName,
      sender: viewer.handle,
      createdAt: serverTimestamp(),
    });
  });
}

export async function spendFunds(uid: string, item: string, amount: number) {
  if (amount <= 0) throw new Error("Amount must be greater than zero.");

  await runTransaction(firestore, async (tx) => {
    const ref = walletRef(uid);
    const snap = await tx.get(ref);
    const balance = snap.data()?.balance ?? 0;
    if (amount > balance) {
      throw new Error("Insufficient funds.");
    }
    tx.update(ref, { balance: balance - amount, updatedAt: serverTimestamp() });
    tx.set(doc(transactionsRef(uid)), {
      type: "purchase",
      amount,
      item,
      createdAt: serverTimestamp(),
    });
  });
}

export async function topUpFunds(uid: string, amount: number, rail: string) {
  if (amount <= 0) throw new Error("Amount must be greater than zero.");

  await runTransaction(firestore, async (tx) => {
    const ref = walletRef(uid);
    const snap = await tx.get(ref);
    const balance = snap.data()?.balance ?? 0;
    tx.update(ref, { balance: balance + amount, updatedAt: serverTimestamp() });
    tx.set(doc(transactionsRef(uid)), {
      type: "topup",
      amount,
      rail,
      createdAt: serverTimestamp(),
    });
  });
}

export async function swapAssets(
  uid: string,
  direction: "cashToToken" | "tokenToCash",
  amount: number
) {
  if (amount <= 0) throw new Error("Amount must be greater than zero.");

  await runTransaction(firestore, async (tx) => {
    const ref = walletRef(uid);
    const snap = await tx.get(ref);
    const balance = snap.data()?.balance ?? 0;
    const tokenBalance = snap.data()?.tokenBalance ?? 0;

    let newBalance = balance;
    let newTokenBalance = tokenBalance;

    if (direction === "cashToToken") {
      if (amount > balance) throw new Error("Insufficient funds.");
      newBalance -= amount;
      newTokenBalance += amount / MOOOD_TOKEN_RATE;
    } else {
      if (amount > tokenBalance) throw new Error("Insufficient MOOOD tokens.");
      newTokenBalance -= amount;
      newBalance += amount * MOOOD_TOKEN_RATE;
    }

    tx.update(ref, {
      balance: newBalance,
      tokenBalance: newTokenBalance,
      updatedAt: serverTimestamp(),
    });
    tx.set(doc(transactionsRef(uid)), {
      type: "swap",
      direction,
      amount,
      createdAt: serverTimestamp(),
    });
  });
}
