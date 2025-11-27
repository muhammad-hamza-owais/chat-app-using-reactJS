import React, { useState } from "react";
import { ref, query, orderByChild, equalTo, get } from "firebase/database";
import { db } from "../firebase.js";

export default function SearchBar({ user, onOpenRoom }) {
  const [target, setTarget] = useState("");
  const [msg, setMsg] = useState("");

  const handleSearch = async () => {
    setMsg("");
    if (!target) {
      setMsg("Email pehle likho.");
      return;
    }
    if (!user) {
      setMsg("Login karo pehle.");
      return;
    }
    const t = target.trim().toLowerCase();
    if (t === user.email) {
      setMsg("Khud se chat nahi kar sakte.");
      return;
    }

    const q = query(ref(db, "users"), orderByChild("email"), equalTo(t));
    try {
      const snap = await get(q);
      if (!snap.exists()) {
        setMsg("");
        const inviteBtn = window.confirm(
          "User nahi mila. Invite bhejna chahte ho?",
        );
        if (inviteBtn) {
          window.location.href = `mailto:${t}?subject=${encodeURIComponent("Join my chat app")}&body=${encodeURIComponent("Join and verify your email to chat.")}`;
        }
        return;
      }
      const users = snap.val();
      const keys = Object.keys(users);
      const otherUid = keys[0];
      const otherData = users[otherUid];
      const otherEmailStored = (otherData.email || "").toLowerCase();
      const isOnline = !!otherData.online;
      const u1 = user.uid;
      const u2 = otherUid;
      const roomId = [u1, u2].sort().join("_");
      onOpenRoom(roomId, otherEmailStored);
    } catch (err) {
      setMsg("Search error: " + err.message);
      console.error(err);
    }
  };

  return (
    <div className="card search-area">
      <input
        value={target}
        onChange={(e) => setTarget(e.target.value)}
        placeholder="Jiski chat karni ho uski email likho"
      />
      <div className="row">
        <button onClick={handleSearch}>Search</button>
        <p className="muted">{msg}</p>
      </div>
    </div>
  );
}
