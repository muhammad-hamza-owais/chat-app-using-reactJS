import React, { useState } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
} from "firebase/auth";
import { auth } from "../firebase.js";

export default function AuthForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");

  const handleSignup = async () => {
    setMsg("");
    if (!email || password.length < 6) {
      setMsg("Email dalen aur password kam az kam 6 characters ka ho.");
      return;
    }
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await sendEmailVerification(cred.user);
      setMsg(
        "Account bana diya. Verification email bhej diya gaya. Inbox/spam check karein.",
      );
      await auth.signOut();
    } catch (err) {
      setMsg("Signup error: " + err.message);
      console.error(err);
    }
  };

  const handleLogin = async () => {
    setMsg("");
    if (!email || password.length < 6) {
      setMsg("Email aur password sahi daalen.");
      return;
    }
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      if (!cred.user.emailVerified) {
        setMsg("Email verify nahi hua. Inbox check karein.");
        await auth.signOut();
      } else {
        setMsg("");
      }
    } catch (err) {
      setMsg("Login error: " + err.message);
      console.error(err);
    }
  };

  const handleResend = async () => {
    setMsg("");
    try {
      const user = auth.currentUser;
      if (user) {
        await sendEmailVerification(user);
        setMsg(
          "Verification email dobara bhej diya. Spam folder check karein.",
        );
      } else {
        setMsg("Pehle login karke (even unverified) phir resend karen.");
      }
    } catch (err) {
      setMsg("Resend error: " + err.message);
      console.error(err);
    }
  };

  return (
    <div className="card auth-card">
      <h2>Login / Sign up</h2>
      <input
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        type="email"
        placeholder="Email"
      />
      <input
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        type="password"
        placeholder="Password (min 6)"
      />
      <div className="row">
        <button onClick={handleSignup}>Sign up</button>
        <button onClick={handleLogin}>Log in</button>
        <button className="muted" onClick={handleResend}>
          Resend verification
        </button>
      </div>
      <p className="muted">{msg}</p>
    </div>
  );
}
