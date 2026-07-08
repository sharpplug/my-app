
// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getFunctions } from "firebase/functions";

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

export { app, auth, firestore, storage, functions };
