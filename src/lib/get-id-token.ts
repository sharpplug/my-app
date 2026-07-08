import { auth } from "@/lib/firebase-config";

/** Fetches a fresh ID token for the signed-in user, to authenticate a Server Action call. */
export async function getIdToken(): Promise<string> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("You must be signed in.");
  }
  return user.getIdToken();
}
