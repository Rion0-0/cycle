import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "ここに入れる",
  authDomain: "ここに入れる",
  projectId: "ここに入れる",
  storageBucket: "ここに入れる",
  messagingSenderId: "ここに入れる",
  appId: "ここに入れる"
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
