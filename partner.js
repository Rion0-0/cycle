import { initializeApp } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-app.js";
import { getFirestore, doc, onSnapshot } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyA8eQWqxpxfMG8LEQgssRzcMJbn93JA5zg",
  authDomain: "cycle-counter.firebaseapp.com",
  projectId: "cycle-counter",
  storageBucket: "cycle-counter.firebasestorage.app",
  messagingSenderId: "466749972992",
  appId: "1:466749972992:web:80de09778ad7926c28aee5"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let current = new Date();
current.setDate(1);

let shared = {
  periodStarts: [],
  periodLengths: {},
  symptoms: {},
  watchData: {},
  updatedAt: null
};

function pad(n){ return String(n).padStart(2, "0"); }

function toKey(d){
  return `${d.getFullYear()}-${pad(d.getMonth
