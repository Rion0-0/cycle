import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyA8eQWqxpxfMG8LEQgssRzcMJbn93JA5zg",
  authDomain: "cycle-counter.firebaseapp.com",
  projectId: "cycle-counter",
  storageBucket: "cycle-counter.firebasestorage.app",
  messagingSenderId: "466749972992",
  appId: "1:466749972992:web:80de09778ad7926c28aee5",
  measurementId: "G-PXRL8W1JNZ"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const sharedRef = doc(db, "cycles", "shared");

export {
  db,
  sharedRef,
  setDoc,
  getDoc,
  onSnapshot
};
