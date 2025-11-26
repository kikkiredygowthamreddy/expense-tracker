// src/components/Navbar.jsx
import React from "react";
import { NavLink, Link } from "react-router-dom";

export default function Navbar({ theme = "light", onToggleTheme }) {
  return (
    <header className="app-navbar">
      {/* Brand / logo */}
      <Link to="/" className="brand">
        ExpenseTracker
      </Link>

      {/* Simple nav links */}
      <nav className="navbar-links">
        <NavLink
          to="/"
          end
          className={({ isActive }) => (isActive ? "active" : "")}
        >
          Home
        </NavLink>

        <NavLink
          to="/login"
          className={({ isActive }) => (isActive ? "active" : "")}
        >
          Login
        </NavLink>

        <NavLink
          to="/register"
          className={({ isActive }) => (isActive ? "active" : "")}
        >
          Register
        </NavLink>

        <NavLink
          to="/dashboard"
          className={({ isActive }) => (isActive ? "active" : "")}
        >
          Dashboard
        </NavLink>
      </nav>

      {/* Theme toggle switch */}
      <div
        className="theme-toggle"
        onClick={onToggleTheme}
        aria-label="Toggle theme"
        role="button"
      >
        <div
          className={
            "toggle-knob " + (theme === "light" ? "on" : "off")
          }
        />
      </div>
    </header>
  );
}
