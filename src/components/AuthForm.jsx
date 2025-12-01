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
  const recaptchaRefId = "recaptcha-container";

  useEffect(() => {
    // cleanup recaptcha if any
    return () => {
      if (window.recaptchaVerifier) {
        try {
          window.recaptchaVerifier.clear();
        } catch {}
      }
    };
  }, []);

  const normalize = (p) => p.replace(/\s+/g, "").replace(/^\+/, "");

  const sendOtp = async () => {
    setMsg("");
    if (!phone) {
      setMsg("Phone number daalain");
      return;
    }
    const phoneFormatted = "+" + normalize(phone);
    try {
      // setup recaptcha (invisible)
      window.recaptchaVerifier = new RecaptchaVerifier(
        recaptchaRefId,
        { size: "invisible" },
        auth,
      );
      const confirmationResult = await signInWithPhoneNumber(
        auth,
        phoneFormatted,
        window.recaptchaVerifier,
      );
      confirmationRef.current = confirmationResult;
      setStep(1);
      setMsg("OTP bhej diya gaya. SMS check karo.");
      // store temp name for after verification
      localStorage.setItem("displayName", name || phoneFormatted);
    } catch (err) {
      console.error(err);
      setMsg("OTP send error: " + err.message);
    }
  };

  const verifyCode = async () => {
    setMsg("");
    if (!code || !confirmationRef.current) {
      setMsg("Code daalain");
      return;
    }
    try {
      const result = await confirmationRef.current.confirm(code);
      const user = result.user;
      const phoneKey = user.phoneNumber.replace(/\s+/g, "").replace(/^\+/, "");
      const displayName =
        localStorage.getItem("displayName") || name || phoneKey;
      // write user record
      await set(ref(db, "users/" + phoneKey), {
        phone: phoneKey,
        name: displayName,
        online: true,
        lastSeen: serverTimestamp(),
      });
      setMsg("Verified & logged in");
      // auth state change in App will handle rest
    } catch (err) {
      console.error(err);
      setMsg("Invalid code: " + err.message);
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
          <div id="recaptcha-container"></div>
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
