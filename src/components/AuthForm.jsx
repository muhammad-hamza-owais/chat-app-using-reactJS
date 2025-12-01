// src/components/AuthForm.jsx
import React, { useEffect, useRef, useState } from "react";
import { auth, db } from "../firebase.js";
import { RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";
import { ref, set, serverTimestamp } from "firebase/database";

export default function AuthForm() {
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [step, setStep] = useState(0);
  const [msg, setMsg] = useState("");
  const [code, setCode] = useState("");
  const confirmationRef = useRef(null);
  const recaptchaId = "recaptcha-container";

  useEffect(() => {
    return () => {
      if (window.recaptchaVerifier) {
        try {
          window.recaptchaVerifier.clear();
        } catch (e) {}
        window.recaptchaVerifier = null;
      }
    };
  }, []);

  const normalize = (p) => (p || "").replace(/\s+/g, "").replace(/^\+/, "");

  const sendOtp = async () => {
    setMsg("");
    // sanity checks
    if (!auth) {
      setMsg("Firebase auth initialize nahi hua — src/firebase.js check karo.");
      console.error("auth is undefined:", auth);
      return;
    }
    if (!phone) {
      setMsg("Phone number daalo");
      return;
    }

    const phoneFormatted = "+" + normalize(phone);

    try {
      // For local debugging: if you added Test Phone numbers in Firebase Console,
      // you can optionally disable app verification for testing.
      // But we try reCAPTCHA first (visible) — more reliable in many setups.
      if (window.recaptchaVerifier) {
        try {
          window.recaptchaVerifier.clear();
        } catch (e) {}
        window.recaptchaVerifier = null;
      }

      window.recaptchaVerifier = new RecaptchaVerifier(
        recaptchaId,
        { size: "normal" },
        auth,
      );
      await window.recaptchaVerifier.render();

      console.log("Sending OTP to:", phoneFormatted);
      const confirmationResult = await signInWithPhoneNumber(
        auth,
        phoneFormatted,
        window.recaptchaVerifier,
      );
      confirmationRef.current = confirmationResult;
      setStep(1);
      setMsg(
        "OTP bhej diya gaya. Agar aapne Firebase Console mein Test Number add kiya hai to test code use karen.",
      );
      localStorage.setItem("displayName", name || phoneFormatted);
    } catch (err) {
      console.error("sendOtp error:", err);
      // helpful messages
      if (err?.code === "auth/invalid-phone-number")
        setMsg("Phone number invalid.");
      else if (err?.code === "auth/too-many-requests")
        setMsg("Bahut zyada requests. Thodi der baad try karo.");
      else if (err?.message && err.message.includes("reCAPTCHA"))
        setMsg("reCAPTCHA load issue — console dekho.");
      else setMsg("OTP send error: " + (err?.message || String(err)));
    }
  };

  const verifyCode = async () => {
    setMsg("");
    if (!code || !confirmationRef.current) {
      setMsg("Code daalo");
      return;
    }
    try {
      const result = await confirmationRef.current.confirm(code);
      const user = result.user;
      const phoneKey = (user.phoneNumber || "")
        .replace(/\s+/g, "")
        .replace(/^\+/, "");
      const displayName =
        localStorage.getItem("displayName") || name || phoneKey;
      // write user record
      await set(ref(db, "users/" + phoneKey), {
        phone: phoneKey,
        name: displayName,
        online: true,
        lastSeen: serverTimestamp(),
      });
      setMsg("Verified aur logged in ho gaye ho.");
      // onAuthStateChanged in App.jsx will pick up the authenticated user
    } catch (err) {
      console.error("verifyCode error:", err);
      setMsg("Invalid code: " + (err?.message || String(err)));
    }
  };

  return (
    <div className="auth-card card">
      <h2>Login / Verify (Phone)</h2>

      {step === 0 && (
        <>
          <input
            placeholder="Phone (e.g. +923001234567)"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <input
            placeholder="Display name (optional)"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <div className="row">
            <button onClick={sendOtp}>Send OTP</button>
          </div>
          <p className="muted">{msg}</p>
          <div id={recaptchaId} style={{ marginTop: 12 }}></div>
          <p className="muted small">
            Tip: For local testing add a Test Phone Number in Firebase Console
            (Auth → Sign-in method → Phone → Test numbers).
          </p>
        </>
      )}

      {step === 1 && (
        <>
          <p className="muted">
            OTP bheja gaya. SMS ka code daal kar verify karein.
          </p>
          <input
            placeholder="Enter OTP"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
          <div className="row">
            <button onClick={verifyCode}>Verify Code</button>
          </div>
          <p className="muted">{msg}</p>
        </>
      )}
    </div>
  );
}
