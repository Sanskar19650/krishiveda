// src/firebase/firestore.ts

import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
} from "firebase/firestore";
import { db } from "./firebaseConfig";

// Save user profile
export const saveUserProfile = (uid: string, data: any) => {
  return setDoc(doc(db, "users", uid), data);
};

// Get single user
export const getUserProfile = (uid: string) => {
  return getDoc(doc(db, "users", uid));
};

// Get all users
export const getAllUsers = () => {
  return getDocs(collection(db, "users"));
};

// Add product
export const addProduct = (data: any) => {
  return setDoc(doc(collection(db, "products")), data);
};

// Get all products
export const getAllProducts = () => {
  return getDocs(collection(db, "products"));
};

// Update order status
export const updateOrderStatus = (orderId: string, status: string) => {
  return updateDoc(doc(db, "orders", orderId), { status });
};
