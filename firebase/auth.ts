// src/firebase/auth.ts

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { auth } from "./firebaseConfig";

// Register
export const registerUser = (email: string, password: string) => {
  return createUserWithEmailAndPassword(auth, email, password);
};

// Login
export const loginUser = (email: string, password: string) => {
  return signInWithEmailAndPassword(auth, email, password);
};

// Logout
export const logoutUser = () => {
  return signOut(auth);
};
