import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
  where,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { firestore } from "@/lib/firebase-config";

export type Product = {
  id: string;
  ownerUid: string;
  ownerHandle: string;
  title: string;
  description: string;
  category: string;
  price: number;
  image: string;
  createdAt: Timestamp | null;
};

const productsRef = collection(firestore, "products");

/** All partner-listed products, newest first, for the Shop marketplace. */
export function subscribeToProducts(onChange: (products: Product[]) => void) {
  const q = query(productsRef, orderBy("createdAt", "desc"));
  return onSnapshot(q, (snap) => {
    onChange(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Product, "id">) })));
  });
}

/**
 * A single partner's own listings, for the Partner Dashboard. Sorted
 * client-side (rather than an orderBy in the query) to avoid requiring a
 * composite Firestore index for `where(ownerUid) + orderBy(createdAt)`.
 */
export function subscribeToMyProducts(uid: string, onChange: (products: Product[]) => void) {
  const q = query(productsRef, where("ownerUid", "==", uid));
  return onSnapshot(q, (snap) => {
    const products = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Product, "id">) }));
    products.sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0));
    onChange(products);
  });
}

export async function createProduct(input: {
  ownerUid: string;
  ownerHandle: string;
  title: string;
  description: string;
  category: string;
  price: number;
  image: string;
}): Promise<string> {
  const docRef = await addDoc(productsRef, { ...input, createdAt: serverTimestamp() });
  return docRef.id;
}

export async function deleteProduct(productId: string): Promise<void> {
  await deleteDoc(doc(firestore, "products", productId));
}
