import React, { useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { ref, set, serverTimestamp, onDisconnect } from "firebase/database";
import { auth, db } from "./firebase.js";
import AuthForm from "./components/AuthForm.jsx";
import SearchBar from "./components/SearchBar.jsx";
import ChatRoom from "./components/Chatroom.jsx";

export default function App() {
  const [user, setUser] = useState(null);
  const [currentRoom, setCurrentRoom] = useState(null);
  const [chatWithEmail, setChatWithEmail] = useState("");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u && u.emailVerified) {
        const emailLower = u.email.toLowerCase();
        setUser({ uid: u.uid, email: emailLower, rawEmail: u.email });

        const userBaseRef = ref(db, "users/" + u.uid);
        const onlineRef = ref(db, "users/" + u.uid + "/online");
        const lastSeenRef = ref(db, "users/" + u.uid + "/lastSeen");

        try {
          onDisconnect(onlineRef).set(false);
          onDisconnect(lastSeenRef).set(serverTimestamp());
          await set(userBaseRef, {
            email: emailLower,
            online: true,
            lastSeen: serverTimestamp(),
          });
          await set(onlineRef, true);
        } catch (err) {
          console.error("Presence error:", err);
        }
      } else {
        setUser(null);
        setCurrentRoom(null);
      }
    });
    return () => unsub();
  }, []);

  const handleLogout = async () => {
    if (user) {
      await set(ref(db, "users/" + user.uid + "/online"), false);
    }
    await signOut(auth);
    setUser(null);
    setCurrentRoom(null);
  };

  return (
    <div className="app-root">
      {!user && <AuthForm />}
      {user && (
        <>
          <div className="app-header">
            <div>
              You: <strong>{user.rawEmail}</strong>
            </div>
            <div>
              <button className="danger" onClick={handleLogout}>
                Logout
              </button>
            </div>
          </div>

          <SearchBar
            user={user}
            onOpenRoom={(roomId, peerEmail) => {
              setCurrentRoom(roomId);
              setChatWithEmail(peerEmail);
            }}
          />

          {currentRoom && (
            <ChatRoom
              roomId={currentRoom}
              myUser={user}
              peerEmail={chatWithEmail}
            />
          )}
        </>
      )}
    </div>
  );
}
