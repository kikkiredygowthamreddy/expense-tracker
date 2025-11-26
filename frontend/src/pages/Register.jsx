// src/pages/Register.jsx
import React, { useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase";
import { useNavigate, Link } from "react-router-dom";

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const nav = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setMessage("");
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      setMessage("✅ Account created! Redirecting...");
      setTimeout(() => nav("/dashboard"), 900);
    } catch (err) {
      setMessage("❌ " + err.message);
    }
  };

  return (
    <div className="app-fullscreen">
      <div style={{
        width: "100%",
        maxWidth: 420,
        padding: "30px",
        background: "rgba(255,255,255,0.12)",
        borderRadius: "10px",
        boxShadow: "0px 6px 20px rgba(0,0,0,0.18)",
        textAlign: "center",
        color: "inherit"
      }}>
        <h2>Create account</h2>
        <form onSubmit={handleRegister}>
          <input required type="email" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
          <br/><br/>
          <input required type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} />
          <br/><br/>
          <button type="submit">Sign up</button>
        </form>
        <p style={{ color: message.startsWith("❌") ? "crimson" : "lightgreen" }}>{message}</p>
        <p>Already have an account? <Link to="/">Login</Link></p>
      </div>
    </div>
  );
}
