import React, { useEffect, useState } from "react";
import AuthForm from "./components/AuthForm.jsx";
import LeftSidebar from "./components/LeftSidebar.jsx";
import ChatRoom from "./components/ChatRoom.jsx";
import { ref, set, serverTimestamp, onDisconnect } from "firebase/database";
import { db } from "./firebase.js";

export default function App() {
  const [me, setMe] = useState(null); // {phone, name}
  const [activeRoom, setActiveRoom] = useState(null); // { roomId, peer }

  useEffect(() => {
    // optional: restore login from localStorage
    const raw = localStorage.getItem("me");
    if (raw) {
      try {
        setMe(JSON.parse(raw));
      } catch {}
    }
  }, []);

  useEffect(() => {
    if (!me) return;
    // write presence to /users/{phone}
    const p = ref(db, "users/" + me.phone);
    const onlineRef = ref(db, "users/" + me.phone + "/online");
    const lastSeenRef = ref(db, "users/" + me.phone + "/lastSeen");
    onDisconnect(onlineRef).set(false);
    onDisconnect(lastSeenRef).set(serverTimestamp());
    set(p, {
      phone: me.phone,
      name: me.name,
      online: true,
      lastSeen: serverTimestamp(),
    }).catch(console.error);
  }, [me]);

  const handleLogin = (user) => {
    setMe(user);
    localStorage.setItem("me", JSON.stringify(user));
  };

  const handleLogout = () => {
    if (me) {
      set(ref(db, "users/" + me.phone + "/online"), false).catch(() => {});
    }
    localStorage.removeItem("me");
    setMe(null);
    setActiveRoom(null);
  };

  return (
    <div className="app-shell">
      {!me && <AuthForm onLogin={handleLogin} />}
      {me && (
        <>
          <LeftSidebar
            me={me}
            onSelectRoom={(room, peer) => {
              setActiveRoom({ roomId: room, peer });
            }}
            onLogout={handleLogout}
          />
          <ChatRoom me={me} activeRoom={activeRoom} />
        </>
      )}
    </div>
  );
}
