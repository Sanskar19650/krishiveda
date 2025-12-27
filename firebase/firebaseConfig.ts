// src/firebase/firebaseConfig.ts

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAnalytics, isSupported } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyBTCUt035Xdzp-v1IV8lwzEX0kay9XWL3w",
  authDomain: "krishivedah.firebaseapp.com",
  projectId: "krishivedah",
  storageBucket: "krishivedah.appspot.com", // ✅ CORRECT
  messagingSenderId: "539077779558",
  appId: "1:539077779558:web:84cd68c23e4a07eb7f4da7",
  measurementId: "G-HNPX6L6V8P",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Analytics (safe check for SSR/dev)
export let analytics: any = null;
isSupported().then((supported) => {
  if (supported) analytics = getAnalytics(app);
});

export default app;
