import { initializeApp } from "firebase/app";
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
export const db = getDatabase(app);
export const storage = getStorage(app);
