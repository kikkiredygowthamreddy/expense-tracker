// src/components/IntroSidebar.jsx
import React from "react";
import "./intro-sidebar.css";

export default function IntroSidebar({ open, onClose }) {
  return (
    <aside className={`intro-sidebar ${open ? "open" : ""}`} aria-hidden={!open}>
      <div className="intro-sidebar-inner">
        <button className="sidebar-close" onClick={onClose} aria-label="Close info">✕</button>

        <h3>About Expense Tracker</h3>

        <p className="muted" style={{ marginBottom: 14 }}>
          Lightweight tracker to capture expenses, analyze monthly spend and export data.
        </p>

        <section className="sidebar-section">
          <h4>Quick Overview</h4>
          <ul>
            <li>Add/edit/delete expenses</li>
            <li>Filter by month & category</li>
            <li>Dashboard with charts & predictions</li>
            <li>Export CSV / Backup</li>
          </ul>
        </section>

        <section className="sidebar-section">
          <h4>Why use it?</h4>
          <ul>
            <li>Simple and private (SQLite locally or Firebase)</li>
            <li>Minimal, readable UI</li>
            <li>Client-side export & backups</li>
          </ul>
        </section>

        <section className="sidebar-section">
          <h4>Security</h4>
          <p className="muted">Your data stays in your browser / backend. When using Firebase, tokens are verified server-side.</p>
        </section>

        <section className="sidebar-section">
          <h4>Tips</h4>
          <ol>
            <li>Click Get Started → create account → add a few transactions</li>
            <li>Open Export CSV to download your history</li>
            <li>Use the summary page for monthly totals</li>
          </ol>
        </section>

        <div style={{ marginTop: 18, display: "flex", gap: 8 }}>
          <button className="glass-btn" onClick={onClose}>Close</button>
        </div>
      </div>
    </aside>
  );
}
