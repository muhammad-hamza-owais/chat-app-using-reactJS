// src/components/ChatRoom.jsx
import React, { useEffect, useRef, useState } from "react";
import { db, storage } from "../firebase.js";
import {
  ref,
  onChildAdded,
  push,
  serverTimestamp,
  update,
} from "firebase/database";
import { ref as sRef, uploadBytes, getDownloadURL } from "firebase/storage";

export default function ChatRoom({ me, activeRoom }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [recording, setRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const endRef = useRef();

  useEffect(() => {
    setMessages([]);
    if (!activeRoom) return;
    const messagesRef = ref(db, "rooms/" + activeRoom.roomId + "/messages");
    const cb = (snap) => {
      const data = snap.val();
      setMessages((prev) => [...prev, data]);
      // update lastText for userRooms
      const payloadLast = {
        lastText: data.text
          ? data.text.slice(0, 100)
          : data.audioURL
            ? "[Voice]"
            : "",
        lastTs: Date.now(),
        peer: activeRoom.peer,
      };
      update(
        ref(db, "userRooms/" + me.phone + "/" + activeRoom.roomId),
        payloadLast,
      ).catch(() => {});
      const otherPhone = activeRoom.roomId
        .split("_")
        .find((x) => x !== me.phone);
      update(
        ref(db, "userRooms/" + otherPhone + "/" + activeRoom.roomId),
        payloadLast,
      ).catch(() => {});
    };
    onChildAdded(messagesRef, cb);
    // no explicit detach here — OK for demo
  }, [activeRoom, me.phone]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendText = async (e) => {
    e?.preventDefault();
    if (!text.trim() || !activeRoom) return;
    const mRef = ref(db, "rooms/" + activeRoom.roomId + "/messages");
    const payload = {
      userPhone: me.phone,
      userName: me.name,
      text: text.trim(),
      ts: serverTimestamp(),
    };
    await push(mRef, payload);
    setText("");
  };

  const startRecording = async () => {
    // if storage not available, disallow recording
    if (!storage) {
      alert("Voice messages ke liye Firebase Storage enable karo pehle.");
      return;
    }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert("Mic not supported");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      chunksRef.current = [];
      mediaRecorderRef.current.ondataavailable = (e) =>
        chunksRef.current.push(e.data);
      mediaRecorderRef.current.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const filename = `${activeRoom.roomId}/${Date.now()}.webm`;
        const sref = sRef(storage, filename);
        try {
          await uploadBytes(sref, blob);
          const url = await getDownloadURL(sref);
          const mRef = ref(db, "rooms/" + activeRoom.roomId + "/messages");
          const payload = {
            userPhone: me.phone,
            userName: me.name,
            audioURL: url,
            ts: serverTimestamp(),
          };
          await push(mRef, payload);
        } catch (err) {
          console.error("upload error:", err);
          alert("Voice upload failed: " + (err?.message || err));
        }
      };
      mediaRecorderRef.current.start();
      setRecording(true);
    } catch (err) {
      console.error("recording error:", err);
      alert("Recording start error: " + (err?.message || err));
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  };

  if (!activeRoom)
    return (
      <div className="chat-panel card">
        <p className="muted">Select/Start a chat</p>
      </div>
    );

  return (
    <div className="chat-panel">
      <div className="chat-header card">
        <h3>Chat with: {activeRoom.peer}</h3>
      </div>
      <div className="messages card">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`message ${m.userPhone === me.phone ? "self" : "other"}`}
          >
            <div className="msg-meta">
              <strong>{m.userName}</strong>{" "}
              <span className="muted small">
                {m.ts ? new Date(m.ts).toLocaleTimeString() : ""}
              </span>
            </div>
            {m.text && <div>{m.text}</div>}
            {m.audioURL && <audio controls src={m.audioURL}></audio>}
          </div>
        ))}
        <div ref={endRef}></div>
      </div>

      <form className="room-form" onSubmit={sendText}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a message..."
        />
        <button type="submit">Send</button>
        {!recording ? (
          <button type="button" onClick={startRecording}>
            Record
          </button>
        ) : (
          <button type="button" onClick={stopRecording}>
            Stop
          </button>
        )}
      </form>
    </div>
  );
}
