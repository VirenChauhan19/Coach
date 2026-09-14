// Firebase web app, client-side SDK, loaded lazily.
//
// These values are the public Firebase web config (safe to ship to the browser;
// access is enforced by Firebase security rules, not by hiding this key). Used
// here only for Analytics, the app's own auth/data run on the Next.js server.
//
// `firebase/app` is deliberately NOT imported at the top level. A static import
// here would pull the SDK into the first-load JavaScript of every single page,
// because the analytics component runs in the root layout. Behind the dynamic
// import below it becomes its own chunk that loads after the page is
// interactive, so a phone on cell data isn't parsing the Firebase SDK before it
// can show anything. The `import type` is erased at compile time and costs
// nothing.
import type { FirebaseApp } from "firebase/app";

const firebaseConfig = {
  apiKey: "AIzaSyC0vTez4WPws-eNZW62UpSu__ubj70zFak",
  authDomain: "scadxctf-7271a.firebaseapp.com",
  projectId: "scadxctf-7271a",
  storageBucket: "scadxctf-7271a.firebasestorage.app",
  messagingSenderId: "645653631554",
  appId: "1:645653631554:web:1e5e83edbacc1c6e0fd3db",
  measurementId: "G-85LRCHR0R1",
};

let appPromise: Promise<FirebaseApp> | null = null;

/** Resolves the shared Firebase app, initializing it (and fetching the SDK) once. */
export function getFirebaseApp(): Promise<FirebaseApp> {
  if (!appPromise) {
    appPromise = import("firebase/app").then(
      ({ initializeApp, getApps, getApp }) =>
        getApps().length ? getApp() : initializeApp(firebaseConfig)
    );
  }
  return appPromise;
}
