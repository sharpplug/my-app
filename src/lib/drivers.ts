import { doc, setDoc, onSnapshot, serverTimestamp, Timestamp } from "firebase/firestore";
import { firestore } from "@/lib/firebase-config";

export type DriverService = "taxi" | "courier" | "tow";

export type DriverProfile = {
  ownerUid: string;
  ownerHandle: string;
  ownerName: string;
  services: DriverService[];
  vehicleMake: string;
  vehicleModel: string;
  plateNumber: string;
  region: string;
  status: "active";
  createdAt: Timestamp | null;
  ratingSum?: number;
  ratingCount?: number;
};

const driverDocRef = (uid: string) => doc(firestore, "drivers", uid);

/** One profile per driver (doc ID == their uid) - the Partner Dashboard's
 * Skip Driver Console reads/writes this directly. */
export function subscribeToMyDriverProfile(uid: string, onChange: (profile: DriverProfile | null) => void) {
  return onSnapshot(driverDocRef(uid), (snap) => {
    onChange(snap.exists() ? (snap.data() as DriverProfile) : null);
  });
}

export async function registerDriver(input: {
  ownerUid: string;
  ownerHandle: string;
  ownerName: string;
  services: DriverService[];
  vehicleMake: string;
  vehicleModel: string;
  plateNumber: string;
  region: string;
}): Promise<void> {
  await setDoc(driverDocRef(input.ownerUid), {
    ...input,
    status: "active",
    createdAt: serverTimestamp(),
  });
}
