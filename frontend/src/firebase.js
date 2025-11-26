// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyBzHKQuR3yXqEjkNqFGAw9p2Zflk2awFyM",
  authDomain: "expensetrack-68066.firebaseapp.com",
  projectId: "expensetrack-68066",
  storageBucket: "expensetrack-68066.firebasestorage.app",
  messagingSenderId: "80705368910",
  appId: "1:80705368910:web:fd993262ebc6d5ba56a41f",
  measurementId: "G-JE51PXHN7B"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const analytics = getAnalytics(app);
export default app;
