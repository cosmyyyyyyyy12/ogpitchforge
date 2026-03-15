import type { FirebaseApp } from "firebase/app";
import type { Auth } from "firebase/auth";

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Module-level cache — only populated client-side
let _app: FirebaseApp | null = null;
let _auth: Auth | null = null;

/**
 * Returns the Firebase Auth instance.
 * ALL Firebase initialization is deferred here so NOTHING runs during SSR.
 * Call this only from event handlers, useEffect, or other client-only code paths.
 */
export function getClientAuth(): Auth {
    // Hard guard: never run on the server
    if (typeof window === "undefined") {
        throw new Error("getClientAuth() must only be called client-side.");
    }

    if (!_app) {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { initializeApp, getApps, getApp } = require("firebase/app");
        _app = getApps().length > 0 ? getApp() : (initializeApp(firebaseConfig) as FirebaseApp);
    }

    if (!_auth) {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { getAuth } = require("firebase/auth");
        _auth = getAuth(_app) as Auth;
    }

    return _auth as Auth;
}
