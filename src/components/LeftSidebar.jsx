import React, { useEffect, useState } from "react";
import { db } from "../firebase.js";
import { ref, onValue, get, set, update } from "firebase/database";

export default function LeftSidebar({ me, onSelectRoom, onLogout }) {
  const [conversations, setConversations] = useState([]);
  const [search, setSearch] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (!me) return;
    const urRef = ref(db, "userRooms/" + me.phone);
    const unsub = onValue(urRef, (snap) => {
      const val = snap.val() || {};
      const list = Object.keys(val).map((k) => ({ roomId: k, ...val[k] }));
      list.sort((a, b) => (b.lastTs || 0) - (a.lastTs || 0));
      setConversations(list);
    });
    return () => unsub();
  }, [me]);

  const normalize = (p) => p.replace(/\s+/g, "").replace(/^\+/, "");
  const startChat = async (target) => {
    setMsg("");
    const phoneKey = normalize(target);
    if (!phoneKey) {
      setMsg("Phone likho pehle");
      return;
    }
    if (phoneKey === me.phone) {
      setMsg("Apne aap se chat nahi kar sakte");
      return;
    }
    const roomId = [me.phone, phoneKey].sort().join("_");
    const ts = Date.now();
    // ensure userRooms entries exist
    await set(ref(db, "userRooms/" + me.phone + "/" + roomId), {
      peer: phoneKey,
      lastText: "",
      lastTs: ts,
    }).catch(() => {});
    await set(ref(db, "userRooms/" + phoneKey + "/" + roomId), {
      peer: me.phone,
      lastText: "",
      lastTs: ts,
    }).catch(() => {});
    // try to fetch peer name
    const snap = await get(ref(db, "users/" + phoneKey));
    const peerName = snap.exists() ? snap.val().name : phoneKey;
    onSelectRoom(roomId, peerName);
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-top card">
        <div>
          <strong>{me.name}</strong>
          <div className="muted small">You: {me.phone}</div>
        </div>
        <div>
          <button className="danger" onClick={onLogout}>
            Logout
          </button>
        </div>
      </div>

      <div className="card search-card">
        <input
          placeholder="Type phone to start chat"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="row">
          <button onClick={() => startChat(search)}>Start / Search</button>
        </div>
        <p className="muted small">{msg}</p>
      </div>

      <div className="card conversations">
        <h4>Chats</h4>
        {conversations.length === 0 && (
          <p className="muted small">No chats yet</p>
        )}
        {conversations.map((c) => (
          <div
            key={c.roomId}
            className="conv-item"
            onClick={() =>
              onSelectRoom(
                c.roomId,
                c.peer || c.roomId.split("_").find((x) => x !== me.phone),
              )
            }
          >
            <div className="conv-title">{c.peer}</div>
            <div className="muted small">{c.lastText || ""}</div>
          </div>
        ))}
      </div>
    </aside>
  );
}
