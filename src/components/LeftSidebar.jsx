import React, { useEffect, useState } from "react";
import { db } from "../firebase.js";
import {
  ref,
  onValue,
  query,
  orderByChild,
  equalTo,
  get,
} from "firebase/database";

export default function LeftSidebar({ me, onSelectRoom, onLogout }) {
  const [conversations, setConversations] = useState([]); // {roomId, peer, lastText, lastTs}
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!me) return;
    const urRef = ref(db, "userRooms/" + me.phone);
    const unsub = onValue(urRef, (snap) => {
      const data = snap.val() || {};
      const items = Object.keys(data).map((rid) => ({
        roomId: rid,
        ...data[rid],
      }));
      // sort by lastTs desc
      items.sort((a, b) => (b.lastTs || 0) - (a.lastTs || 0));
      setConversations(items);
    });
    return () => unsub();
  }, [me]);

  const startChat = async (target) => {
    if (!target) return;
    const phone = target.replace(/\s+/g, "").replace(/^\+/, "");
    const u1 = me.phone;
    const u2 = phone;
    if (u1 === u2) return;
    const roomId = [u1, u2].sort().join("_");
    // ensure both userRooms entries exist (update lastTs)
    const ts = Date.now();
    await Promise.all([
      ref(db, "userRooms/" + me.phone + "/" + roomId).update?.({
        lastTs: ts,
      }) ||
        set(ref(db, "userRooms/" + me.phone + "/" + roomId), { lastTs: ts }),
      set(ref(db, "userRooms/" + phone + "/" + roomId), { lastTs: ts }).catch(
        () => {},
      ),
    ]);
    // fetch peer name if exists
    const peerSnap = await get(ref(db, "users/" + phone));
    const peer = peerSnap.exists() ? peerSnap.val().name : phone;
    onSelectRoom(roomId, peer);
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-top">
        <div>
          <strong>{me.name}</strong>
          <div className="muted">You: {me.phone}</div>
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
      </div>

      <div className="conversations card">
        <h4>Chats</h4>
        {conversations.length === 0 && (
          <p className="muted small">No chats yet</p>
        )}
        {conversations.map((c) => (
          <div
            key={c.roomId}
            className="conv-item"
            onClick={() => onSelectRoom(c.roomId, c.peer || "Unknown")}
          >
            <div className="conv-title">
              {c.peer || c.roomId.split("_").find((x) => x !== me.phone)}
            </div>
            <div className="muted small">
              {c.lastText ? c.lastText.slice(0, 40) : ""}
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}
