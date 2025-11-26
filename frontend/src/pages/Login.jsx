// src/pages/Login.jsx
import React, { useState, useEffect } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase";
import { useNavigate, Link } from "react-router-dom";
import "../index.css";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [user, setUser] = useState(null);
  const [entering, setEntering] = useState(true);
  const nav = useNavigate();

  useEffect(() => {
    // hide the gradient while the login page is visible
    document.body.classList.add("no-gradient");
    // start slide-in animation on next frame
    requestAnimationFrame(() => {
      setEntering(false);
    });
    return () => {
      document.body.classList.remove("no-gradient");
    };
  }, []);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(u => {
      setUser(u);
      if (u) nav("/dashboard");
    });
    return () => unsub();
  }, [nav]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setMessage("");
    try {
      await signInWithEmailAndPassword(auth, email, password);
      setMessage("Logged in!");
    } catch (err) {
      setMessage("❌ " + err.message);
    }
  };

  return (
    <div className={`app-fullscreen ${entering ? "slide-in-right-init" : ""}`}>
      <div
        style={{
          width: "100%",
          maxWidth: "480px",
          padding: "40px",
          borderRadius: "18px",
          background: "rgba(255,255,255,0.14)",
          backdropFilter: "blur(14px)",
          textAlign: "center",
          boxShadow: "0 10px 32px rgba(0,0,0,0.22)",
          zIndex: 2,
          position: "relative",
        }}
      >
        <h2 style={{ marginBottom: 25, fontSize: "28px" }}>Login</h2>

        <form
          onSubmit={handleLogin}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "16px",
            marginBottom: "10px"
          }}
        >
          <input
            required
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            style={{
              padding: "14px",
              fontSize: "16px",
              borderRadius: "8px",
              border: "1px solid rgba(0,0,0,0.12)",
              background: "rgba(255,255,255,0.95)"
            }}
          />

          <input
            required
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            style={{
              padding: "14px",
              fontSize: "16px",
              borderRadius: "8px",
              border: "1px solid rgba(0,0,0,0.12)",
              background: "rgba(255,255,255,0.95)"
            }}
          />

          <button
            type="submit"
            className="glass-btn primary"
            style={{
              padding: "14px 20px",
              fontSize: "17px",
              fontWeight: "600",
              width: "100%",
              borderRadius: "8px",
            }}
          >
            Login
          </button>
        </form>

        <p style={{ marginTop: 10 }}>
          No account? <Link to="/register">Sign up</Link>
        </p>

        <p style={{ marginTop: 10, color: "white", fontSize: "14px" }}>{message}</p>
      </div>
    </div>
  );
}
