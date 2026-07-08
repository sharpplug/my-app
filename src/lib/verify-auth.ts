import { jwtVerify, createRemoteJWKSet } from "jose";

const PROJECT_ID = "moood-85d1s";
const ISSUER = `https://securetoken.google.com/${PROJECT_ID}`;

// Firebase ID tokens are standard signed JWTs; verifying the signature only
// needs Google's public keys, not a service account, so this works without
// pulling in the full firebase-admin SDK.
const JWKS = createRemoteJWKSet(
  new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com")
);

/**
 * Verifies a Firebase Auth ID token sent up from the client and returns the
 * caller's uid. Throws if the token is missing, expired, or doesn't belong
 * to this Firebase project.
 */
export async function requireAuth(idToken: string | undefined | null): Promise<string> {
  if (!idToken) {
    throw new Error("Sign in required.");
  }

  try {
    const { payload } = await jwtVerify(idToken, JWKS, {
      issuer: ISSUER,
      audience: PROJECT_ID,
    });
    if (typeof payload.sub !== "string" || !payload.sub) {
      throw new Error("Invalid token subject.");
    }
    return payload.sub;
  } catch {
    throw new Error("Sign in required.");
  }
}
