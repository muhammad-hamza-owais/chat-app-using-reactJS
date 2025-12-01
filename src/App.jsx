import React, { useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import {
  ref,
  set,
  serverTimestamp,
  onDisconnect,
  get,
} from "firebase/database";
import { auth, db } from "./firebase.js";
import AuthForm from "./components/AuthForm.jsx";
import LeftSidebar from "./components/LeftSidebar.jsx";
import ChatRoom from "./components/ChatRoom.jsx";

export default function App() {
  const [me, setMe] = useState(null); // { phone, name, uid }
  const [activeRoom, setActiveRoom] = useState(null); // { roomId, peer }

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user && user.phoneNumber) {
        const phoneKey = user.phoneNumber
          .replace(/\s+/g, "")
          .replace(/^\+/, "");
        // fetch stored name if exists
        const snap = await get(ref(db, "users/" + phoneKey));
        const stored = snap.exists() ? snap.val() : null;
        const name =
          stored?.name || localStorage.getItem("displayName") || phoneKey;
        const meObj = { phone: phoneKey, name, uid: user.uid };
        setMe(meObj);
        localStorage.setItem("me", JSON.stringify(meObj));

        // presence write and onDisconnect
        const userRef = ref(db, "users/" + phoneKey);
        const onlineRef = ref(db, "users/" + phoneKey + "/online");
        const lastSeenRef = ref(db, "users/" + phoneKey + "/lastSeen");
        onDisconnect(onlineRef).set(false);
        onDisconnect(lastSeenRef).set(serverTimestamp());
        await set(userRef, {
          phone: phoneKey,
          name,
          online: true,
          lastSeen: serverTimestamp(),
        });
        await set(onlineRef, true);
      } else {
        setMe(null);
        setActiveRoom(null);
      }
    });
    return () => unsub();
  }, []);

  const handleLogout = async () => {
    if (me) {
      try {
        await set(ref(db, "users/" + me.phone + "/online"), false);
      } catch {}
    }
    await signOut(auth);
    localStorage.removeItem("me");
    setMe(null);
    setActiveRoom(null);
  };

  return (
    <div className="app-shell">
      {!me && <AuthForm />}
      {me && (
        <>
          <LeftSidebar
            me={me}
            onSelectRoom={(roomId, peer) => setActiveRoom({ roomId, peer })}
            onLogout={handleLogout}
          />
          <ChatRoom me={me} activeRoom={activeRoom} />
        </>
      )}
    </div>
  );
}
