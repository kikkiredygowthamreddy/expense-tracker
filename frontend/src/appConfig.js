// src/apiConfig.js
// Base URL for your backend (Render).
// - Locally it defaults to http://localhost:5000
// - On Netlify set VITE_API_BASE_URL in env variables.
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";
