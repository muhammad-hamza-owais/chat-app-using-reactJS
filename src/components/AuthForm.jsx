// src/components/AuthForm.jsx
import React, { useState, useEffect } from "react";
import { auth } from "../firebase";
import { RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";

const AuthForm = () => {
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  // Initialize Recaptcha **ONE TIME ONLY**
  useEffect(() => {
    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(
        auth,
        "recaptcha-container",
        {
          size: "invisible",
        },
      );
    }
  }, []);

  // Send OTP
  const sendOTP = async () => {
    setMsg("");
    setLoading(true);

    if (!phone) {
      setMsg("Phone number required");
      setLoading(false);
      return;
    }

    try {
      const appVerifier = window.recaptchaVerifier;
      const result = await signInWithPhoneNumber(auth, phone, appVerifier);
      setConfirmationResult(result);
      setMsg("OTP sent successfully!");
    } catch (error) {
      console.log("OTP send error:", error);
      setMsg(error.message);
    }

    setLoading(false);
  };

  // Verify OTP
  const verifyOTP = async () => {
    setMsg("");
    setLoading(true);

    if (!otp || !confirmationResult) {
      setMsg("Enter OTP");
      setLoading(false);
      return;
    }

    try {
      await confirmationResult.confirm(otp);
      setMsg("Login Successful!");
    } catch (error) {
      console.log("OTP verify error:", error);
      setMsg("Invalid OTP");
    }

    setLoading(false);
  };

  return (
    <div style={{ width: "300px", margin: "auto", marginTop: "50px" }}>
      <h2>Phone Login</h2>

      {/* PHONE INPUT */}
      <input
        type="text"
        placeholder="+92xxxxxxxxxx"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        style={{ width: "100%", padding: "10px", marginBottom: "10px" }}
      />

      {/* Send OTP Button */}
      <button
        onClick={sendOTP}
        disabled={loading}
        style={{ width: "100%", padding: "10px" }}
      >
        {loading ? "Sending..." : "Send OTP"}
      </button>

      {/* OTP INPUT */}
      {confirmationResult && (
        <>
          <input
            type="text"
            placeholder="Enter OTP"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            style={{
              width: "100%",
              padding: "10px",
              marginTop: "10px",
              marginBottom: "10px",
            }}
          />

          {/* Verify OTP Button */}
          <button
            onClick={verifyOTP}
            disabled={loading}
            style={{ width: "100%", padding: "10px" }}
          >
            {loading ? "Verifying..." : "Verify OTP"}
          </button>
        </>
      )}

      {/* RECPTCHA DIV */}
      <div id="recaptcha-container"></div>

      {/* MESSAGE */}
      {msg && (
        <p style={{ marginTop: "10px", color: "blue", fontWeight: "bold" }}>
          {msg}
        </p>
      )}
    </div>
  );
};

export default AuthForm;
