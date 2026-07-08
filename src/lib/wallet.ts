import {
  doc,
  collection,
  onSnapshot,
  query,
  orderBy,
  limit,
  Timestamp,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { firestore, functions } from "@/lib/firebase-config";

export const TRANSACTION_FEE_PERCENT = 0.005;
/** How many local-currency units one MOOOD token is worth when swapping. */
export const MOOOD_TOKEN_RATE = 2;

/** Platform's cut of a virtual gift; the rest goes straight to the streamer. */
export const GIFT_PLATFORM_FEE_PERCENT = 0.2;

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

const walletRef = (uid: string) => doc(firestore, "wallets", uid);
const transactionsRef = (uid: string) =>
  collection(firestore, "wallets", uid, "transactions");

// All balance mutations below run server-side (functions/src/index.ts) via
// the Admin SDK - firestore.rules makes wallets/* read-only from the
// client, so these are thin wrappers around Cloud Functions rather than
// direct Firestore writes. Reads stay client-side (rules still allow the
// owner to read their own wallet/transactions).

export async function ensureWallet(uid: string): Promise<void> {
  await httpsCallable(functions, "ensureWallet")();
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
  const call = httpsCallable(functions, "sendFunds");
  await call({ recipientUid: recipient.uid, amount });
}

export async function sendGift(
  viewer: { uid: string; handle: string },
  streamer: { uid: string; handle: string },
  giftName: string,
  price: number
) {
  const call = httpsCallable(functions, "sendGift");
  await call({ streamerUid: streamer.uid, giftName, price });
}

export async function spendFunds(uid: string, item: string, amount: number) {
  const call = httpsCallable(functions, "spendFunds");
  await call({ item, amount });
}

export async function topUpFunds(uid: string, amount: number, rail: string) {
  const call = httpsCallable(functions, "topUpFunds");
  await call({ amount, rail });
}

export async function swapAssets(
  uid: string,
  direction: "cashToToken" | "tokenToCash",
  amount: number
) {
  const call = httpsCallable(functions, "swapAssets");
  await call({ direction, amount });
}
