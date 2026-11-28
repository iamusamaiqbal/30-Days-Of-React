import { initializeAuth, indexedDBLocalPersistence, browserLocalPersistence, connectAuthEmulator } from "firebase/auth";
import { app, usingEmulators } from "./firebase";

/* Sign-in lives in its own module so visitors to the shop never download it; only /admin loads it.
   No popup/redirect resolver: the admin uses email and password, so no third-party sign-in frames load. */
export const auth = initializeAuth(app, { persistence: [indexedDBLocalPersistence, browserLocalPersistence] });
if (usingEmulators) connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
