import React, { useEffect, useRef, useState } from "react";
import { auth, db } from "../firebase.js";
import { RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";
import { ref, set, serverTimestamp } from "firebase/database";

export default function AuthForm() {
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [step, setStep] = useState(0); // 0 = enter phone, 1 = enter code
  const [msg, setMsg] = useState("");
  const [code, setCode] = useState("");
  const confirmationRef = useRef(null);
  const recaptchaId = "recaptcha-container";

  useEffect(() => {
    // cleanup recaptcha when component unmounts
    return () => {
      if (window.recaptchaVerifier) {
        try {
          window.recaptchaVerifier.clear();
        } catch (e) {
          /* ignore */
        }
        window.recaptchaVerifier = null;
      }
    };
  }, []);

  const normalize = (p) => (p || "").replace(/\s+/g, "").replace(/^\+/, "");

  const sendOtp = async () => {
    setMsg("");
    console.log("Debug: auth object:", auth);
    if (!auth) {
      setMsg(
        "Firebase auth initialized nahi hua. Pehle firebase.js check karo.",
      );
      console.error("Auth is undefined — check src/firebase.js exports.");
      return;
    }
    if (!phone) {
      setMsg("Phone number daalo");
      return;
    }

    // show visible reCAPTCHA to avoid hidden/invisible issues during debugging
    try {
      // clear existing if any
      if (window.recaptchaVerifier) {
        try {
          window.recaptchaVerifier.clear();
        } catch {}
        window.recaptchaVerifier = null;
      }

      // create visible captcha so you can see it and confirm it's loaded
      window.recaptchaVerifier = new RecaptchaVerifier(
        recaptchaId,
        { size: "normal" },
        auth,
      );
      await window.recaptchaVerifier.render(); // ensure widget renders

      const phoneFormatted = "+" + normalize(phone);
      console.log("Attempting signInWithPhoneNumber for:", phoneFormatted);

      const confirmationResult = await signInWithPhoneNumber(
        auth,
        phoneFormatted,
        window.recaptchaVerifier,
      );
      confirmationRef.current = confirmationResult;
      setStep(1);
      setMsg("OTP bhej diya gaya. SMS check karo (ya use test number code).");
      // store temporary display name
      localStorage.setItem("displayName", name || phoneFormatted);
    } catch (err) {
      console.error("sendOtp error:", err);
      // helpful error messages
      if (err && err.code === "auth/invalid-phone-number")
        setMsg("Phone number invalid.");
      else if (err && err.code === "auth/too-many-requests")
        setMsg("Too many attempts — try later.");
      else
        setMsg(
          "OTP send error: " + (err && err.message ? err.message : String(err)),
        );
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
      // normalize phone as DB key
      const phoneKey = (user.phoneNumber || "")
        .replace(/\s+/g, "")
        .replace(/^\+/, "");
      const displayName =
        localStorage.getItem("displayName") || name || phoneKey;
      // write user record to DB
      await set(ref(db, "users/" + phoneKey), {
        phone: phoneKey,
        name: displayName,
        online: true,
        lastSeen: serverTimestamp(),
      });
      setMsg("Verified & logged in");
      // auth state change will be handled by onAuthStateChanged in App.jsx
    } catch (err) {
      console.error("verifyCode error:", err);
      setMsg(
        "Invalid code: " + (err && err.message ? err.message : String(err)),
      );
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
            so you don't need actual SMS.
          </p>
        </>
      )}

      {step === 1 && (
        <>
          <p className="muted">
            OTP bhej diya gaya. SMS ka code daal kar verify karein.
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
