import { initializeApp } from "firebase/app";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";
import { initializeFirestore, connectFirestoreEmulator } from "firebase/firestore/lite";

/* The Firebase web config is public by design: access is controlled by firestore.rules and App Check. */
export const firebaseConfig = {
  apiKey: "AIzaSyDXQxPznonxlvpTAS1Q10BW1Jw6djA2BwQ",
  authDomain: "brownique-art.firebaseapp.com",
  projectId: "brownique-art",
  storageBucket: "brownique-art.firebasestorage.app",
  messagingSenderId: "403299530700",
  appId: "1:403299530700:web:d57028121127a28fc80f69",
};

/* The studio owner: always an admin and the only account that can change the team. Must match firestore.rules. */
export const OWNER_UID = "nSHXZzEjzrRZHyMMKeZJLOzuwLv1";

export const usingEmulators = import.meta.env.VITE_USE_EMULATORS === "true";

/* Emulators run against a "demo-" project id, which can never touch the live project. */
export const app = initializeApp(usingEmulators ? { ...firebaseConfig, projectId: "demo-mocha-muse" } : firebaseConfig);

/* App Check: only this website (verified by reCAPTCHA v3) gets tokens to call Firestore and Auth. */
const siteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY;
if (!usingEmulators && siteKey) {
  initializeAppCheck(app, { provider: new ReCaptchaV3Provider(siteKey), isTokenAutoRefreshEnabled: true });
}

export const db = initializeFirestore(app, {});
if (usingEmulators) connectFirestoreEmulator(db, "127.0.0.1", 8080);
