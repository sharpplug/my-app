
// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getFunctions } from "firebase/functions";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";

// Your web app's Firebase configuration.
// This is public and safe to be exposed on the client side.
const firebaseConfig = {
  apiKey: "AIzaSyBN7mcIPcKNNzmFYiV0lxdXkqs936rIYXs",
  authDomain: "moood-85d1s.firebaseapp.com",
  projectId: "moood-85d1s",
  storageBucket: "moood-85d1s.firebasestorage.app",
  messagingSenderId: "163787019871",
  appId: "1:163787019871:web:1f575731604af7d37c2dea",
};

// Initialize Firebase safely for both server and client
let app: FirebaseApp;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

const auth = getAuth(app);
const firestore = getFirestore(app);
const storage = getStorage(app);
const functions = getFunctions(app);

// App Check attaches a per-request attestation token (verified by a
// reCAPTCHA v3 challenge run silently in the background) to every
// Firestore/Cloud Functions call, so Firebase can reject traffic that
// didn't come from this real app - it only initializes in the browser
// (ReCaptchaV3Provider needs `window`) and only once a real site key is
// configured. Until NEXT_PUBLIC_RECAPTCHA_SITE_KEY is set (create one at
// https://console.firebase.google.com/project/moood-85d1s/appcheck), this
// is a no-op and the app works exactly as it does today - it does not
// start rejecting requests on its own. Cloud Functions' own enforcement
// (functions/src/index.ts's ENFORCE_APP_CHECK) is a separate flag that
// should stay off until this is confirmed working end-to-end.
const recaptchaSiteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
if (typeof window !== "undefined" && recaptchaSiteKey) {
  initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider(recaptchaSiteKey),
    isTokenAutoRefreshEnabled: true,
  });
}

export { app, auth, firestore, storage, functions };
