// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyBzNRGongnhdxtBZYkNm9aXUCoftyWNYek",
  authDomain: "realtime-chatapp-a7302.firebaseapp.com",
  databaseURL: "https://realtime-chatapp-a7302-default-rtdb.firebaseio.com",
  projectId: "realtime-chatapp-a7302",
  storageBucket: "realtime-chatapp-a7302.firebasestorage.app",
  messagingSenderId: "608665539969",
  appId: "1:608665539969:web:ad7f89fa83b72447f1c480",
};

const app = initializeApp(firebaseConfig);

// exports — make sure these names match everywhere
export const auth = getAuth(app);
export const db = getDatabase(app);

// storage may fail if not enabled; export but handle failures where used
export let storage;
try {
  storage = getStorage(app);
} catch (e) {
  // if storage not enabled this will still allow app to run
  console.warn("Firebase storage init failed:", e?.message || e);
  storage = null;
}
