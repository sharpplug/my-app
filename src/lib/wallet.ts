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
  type:
    | "send"
    | "receive"
    | "topup"
    | "withdrawal"
    | "swap"
    | "gift-sent"
    | "gift-received"
    | "purchase"
    | "sale"
    | "driver-earning"
    // UNIDEL (src/lib/deliveries.ts). Unlike a purchase, a delivery-payment
    // isn't earned by anyone yet - it's held until the drop-off is confirmed,
    // and turns into either a delivery-earning for the runner or a
    // delivery-refund back to the customer.
    | "delivery-payment"
    | "delivery-earning"
    | "delivery-refund";
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

/** How a top-up rail settles - drives which fields the UI collects. */
export type TopUpMethod = "mobile_money" | "card" | "bank";

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

export type SpendFundsOptions = {
  /** Real, partner-listed Shop product (src/lib/products.ts). */
  productId?: string;
  /** Real, host-listed stay (src/lib/stays.ts) - both dates required together. */
  stayId?: string;
  checkIn?: string;
  checkOut?: string;
  /** Real, partner-created event (src/lib/events.ts). */
  eventId?: string;
  /** Skip ride/delivery - matches an active registered driver (src/lib/drivers.ts)
   * in the same region offering this service, and pays them directly. */
  rideService?: { region: string; serviceType: "taxi" | "courier" | "tow" };
};

// Any of the ids/refs in `options` make the Cloud Function look up the
// authoritative price/seller itself and credit them - `item`/`amount` are
// only trusted as-is when none of them are set (Skip fares with no driver
// match, and anything still on Shop's static curated catalog). See the
// NOTE in functions/src/index.ts.
export async function spendFunds(
  uid: string,
  item: string,
  amount: number,
  options?: SpendFundsOptions
): Promise<{ ok: true; driver?: { uid: string; handle: string; name: string } | null }> {
  const call = httpsCallable(functions, "spendFunds");
  const result = await call({ item, amount, ...options });
  return result.data as { ok: true; driver?: { uid: string; handle: string; name: string } | null };
}

// Top-ups are a two-step flow rather than a single trusted call, since this
// is the one place outside money enters the system. initiateTopUp opens a
// pending intent server-side (functions/src/index.ts); the wallet is only
// credited once that intent is confirmed, either by a real payment
// provider's webhook (production) or, until a live aggregator account
// exists, simulateTopUpConfirmation (demo stand-in - see its own comment).
export async function initiateTopUp(
  uid: string,
  amount: number,
  rail: string,
  phone?: string
): Promise<{ intentId: string; method: TopUpMethod }> {
  const call = httpsCallable(functions, "initiateTopUp");
  const result = await call({ amount, rail, phone });
  return result.data as { intentId: string; method: TopUpMethod };
}

export async function simulateTopUpConfirmation(intentId: string): Promise<void> {
  const call = httpsCallable(functions, "simulateTopUpConfirmation");
  await call({ intentId });
}

// Withdrawals are the mirror of top-ups: the wallet is debited immediately
// (it's real, already-trusted internal balance), and confirmation is about
// whether the payout to the outside rail actually landed - see
// functions/src/index.ts for the full explanation and the production
// payoutWebhook contract.
export async function initiateWithdrawal(
  amount: number,
  rail: string,
  phone?: string
): Promise<{ intentId: string; method: TopUpMethod }> {
  const call = httpsCallable(functions, "initiateWithdrawal");
  const result = await call({ amount, rail, phone });
  return result.data as { intentId: string; method: TopUpMethod };
}

export async function simulateWithdrawalConfirmation(intentId: string): Promise<void> {
  const call = httpsCallable(functions, "simulateWithdrawalConfirmation");
  await call({ intentId });
}

export async function swapAssets(
  uid: string,
  direction: "cashToToken" | "tokenToCash",
  amount: number
) {
  const call = httpsCallable(functions, "swapAssets");
  await call({ direction, amount });
}
