import React, { useState } from "react";
import { db } from "../firebase.js";
import { ref, set, serverTimestamp } from "firebase/database";

export default function AuthForm({ onLogin }) {
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [msg, setMsg] = useState("");

  const doLogin = async () => {
    const p = (phone || "").trim();
    const n = (name || "").trim() || p;
    if (!p) {
      setMsg("Phone number daalain");
      return;
    }
    // simple format normalize: remove spaces + plus
    const phoneKey = p.replace(/\s+/g, "").replace(/^\+/, "");
    const user = { phone: phoneKey, name: n };
    try {
      await set(ref(db, "users/" + phoneKey), {
        phone: phoneKey,
        name: n,
        online: true,
        lastSeen: serverTimestamp(),
      });
      onLogin(user);
    } catch (err) {
      console.error(err);
      setMsg("Login error: " + err.message);
    }
  };

  return (
    <div className="auth-card card">
      <h2>Login with phone</h2>
      <input
        placeholder="Phone (e.g. 92300...)"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
      />
      <input
        placeholder="Display name (optional)"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <div className="row">
        <button onClick={doLogin}>Continue</button>
      </div>
      <p className="muted">{msg}</p>
      <p className="muted small">
        Note: For testing this demo uses simple phone login (no SMS). For
        production use Firebase Phone Auth.
      </p>
    </div>
  );
}
