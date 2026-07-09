import { collection, doc, updateDoc, onSnapshot, query, orderBy, limit, Timestamp } from "firebase/firestore";
import { firestore } from "@/lib/firebase-config";

export type AppNotification = {
  id: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: Timestamp | null;
};

const notificationsRef = (uid: string) => collection(firestore, "notifications", uid, "items");

/**
 * The one place events from every vertical (a gift, a sale, a top-up, a
 * withdrawal, a P2P transfer) become visible outside the page they
 * happened on - see functions/src/index.ts's notify() for the writers.
 */
export function subscribeToNotifications(uid: string, onChange: (notifications: AppNotification[]) => void) {
  const q = query(notificationsRef(uid), orderBy("createdAt", "desc"), limit(30));
  return onSnapshot(q, (snap) => {
    onChange(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<AppNotification, "id">) })));
  });
}

export async function markNotificationRead(uid: string, notificationId: string): Promise<void> {
  await updateDoc(doc(firestore, "notifications", uid, "items", notificationId), { read: true });
}
