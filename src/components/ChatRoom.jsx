import React, { useEffect, useRef, useState } from "react";
import {
  ref,
  onChildAdded,
  push,
  serverTimestamp,
  off,
} from "firebase/database";
import { db } from "../firebase.js";

export default function ChatRoom({ roomId, myUser, peerEmail }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const endRef = useRef();

  useEffect(() => {
    if (!roomId) return;
    setMessages([]);
    const messagesRef = ref(db, "rooms/" + roomId + "/messages");
    const cb = (snap) => {
      const data = snap.val();
      setMessages((prev) => [...prev, data]);
    };
    onChildAdded(messagesRef, cb);
    return () => off(messagesRef, "child_added", cb);
  }, [roomId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    const messagesRef = ref(db, "rooms/" + roomId + "/messages");
    await push(messagesRef, {
      userUid: myUser.uid,
      userEmail: myUser.email,
      text: text.trim(),
      ts: serverTimestamp(),
    });
    setText("");
  };

  return (
    <div className="card chat-area">
      <h3>Chat with: {peerEmail}</h3>
      <div className="messages">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`message ${m.userUid === myUser.uid ? "self" : "other"}`}
          >
            <strong>{m.userEmail}:</strong> {m.text}
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <form className="room-form" onSubmit={handleSend}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Apna paigham..."
        />
        <button type="submit">Send</button>
      </form>
    </div>
  );
}
