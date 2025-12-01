import React, { useEffect, useRef, useState } from "react";
import { db, storage } from "../firebase.js";
import {
  ref,
  onChildAdded,
  push,
  serverTimestamp,
  update,
  get,
} from "firebase/database";
import { ref as sRef, uploadBytes, getDownloadURL } from "firebase/storage";

export default function ChatRoom({ me, activeRoom }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [recording, setRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const listRef = useRef();

  useEffect(() => {
    setMessages([]);
    if (!activeRoom) return;
    const messagesRef = ref(db, "rooms/" + activeRoom.roomId + "/messages");
    const cb = (snap) => {
      const data = snap.val();
      setMessages((prev) => [...prev, data]);
      // update userRooms lastText + lastTs for both participants
      try {
        update(ref(db, "userRooms/" + me.phone + "/" + activeRoom.roomId), {
          lastText: data.text || (data.audioURL ? "[Voice]" : ""),
          lastTs: Date.now(),
        });
      } catch {}
    };
    onChildAdded(messagesRef, cb);
    return () => {}; // firebase onChildAdded returns nothing for unsub; it's okay in this code
  }, [activeRoom]);

  useEffect(() => {
    listRef.current?.scrollIntoView({ behavior: "smooth" });
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
    // update userRooms for both sides
    await update(ref(db, "userRooms/" + me.phone + "/" + activeRoom.roomId), {
      lastText: payload.text,
      lastTs: Date.now(),
    }).catch(() => {});
    const otherPhone = activeRoom.roomId.split("_").find((x) => x !== me.phone);
    await update(ref(db, "userRooms/" + otherPhone + "/" + activeRoom.roomId), {
      lastText: payload.text,
      lastTs: Date.now(),
    }).catch(() => {});
    setText("");
  };

  // Voice recording
  const startRecording = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert("Mic not supported");
      return;
    }
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorderRef.current = new MediaRecorder(stream);
    chunksRef.current = [];
    mediaRecorderRef.current.ondataavailable = (e) =>
      chunksRef.current.push(e.data);
    mediaRecorderRef.current.onstop = async () => {
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      // upload to storage
      const filename = `${activeRoom.roomId}/${Date.now()}.webm`;
      const storageRef = sRef(storage, filename);
      await uploadBytes(storageRef, blob);
      const url = await getDownloadURL(storageRef);
      const mRef = ref(db, "rooms/" + activeRoom.roomId + "/messages");
      const payload = {
        userPhone: me.phone,
        userName: me.name,
        audioURL: url,
        ts: serverTimestamp(),
      };
      await push(mRef, payload);
      // update userRooms
      await update(ref(db, "userRooms/" + me.phone + "/" + activeRoom.roomId), {
        lastText: "[Voice]",
        lastTs: Date.now(),
      }).catch(() => {});
      const otherPhone = activeRoom.roomId
        .split("_")
        .find((x) => x !== me.phone);
      await update(
        ref(db, "userRooms/" + otherPhone + "/" + activeRoom.roomId),
        { lastText: "[Voice]", lastTs: Date.now() },
      ).catch(() => {});
    };
    mediaRecorderRef.current.start();
    setRecording(true);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  };

  if (!activeRoom) {
    return (
      <div className="chat-panel card">
        <p className="muted">Select/Start a chat to begin</p>
      </div>
    );
  }

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
                {new Date(
                  m.ts?.toString?.() || Date.now(),
                ).toLocaleTimeString()}
              </span>
            </div>
            {m.text && <div>{m.text}</div>}
            {m.audioURL && (
              <div>
                <audio controls src={m.audioURL}></audio>
              </div>
            )}
          </div>
        ))}
        <div ref={listRef}></div>
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
