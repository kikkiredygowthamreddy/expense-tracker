// backend/server.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import admin from "firebase-admin";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { body, query, validationResult } from "express-validator";

import {
  initDb,
  fetchUserTransactionsRows,
  fetchSummary,
  addTransaction,
  deleteTransaction,
} from "./db.js";
import { wrapAsync } from "./utils.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// -----------------------------------------------------
// Paths
// -----------------------------------------------------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// -----------------------------------------------------
// DB init
// -----------------------------------------------------
initDb(); // creates db.sqlite + transactions table if needed

// -----------------------------------------------------
// Middleware
// -----------------------------------------------------
app.use(cors());          // you can restrict origin later for prod
app.use(express.json());

// -----------------------------------------------------
// Firebase Admin init (dev-friendly)
// -----------------------------------------------------
let firebaseInitialized = false;
const serviceKeyPath = path.join(__dirname, "serviceAccountKey.json");

if (fs.existsSync(serviceKeyPath)) {
  try {
    const serviceAccount = JSON.parse(
      fs.readFileSync(serviceKeyPath, "utf8")
    );
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    firebaseInitialized = true;
    console.log("✅ Firebase Admin initialized");
  } catch (err) {
    console.warn("⚠️ Failed to init Firebase Admin:", err.message);
  }
} else {
  console.warn(
    "⚠️ serviceAccountKey.json not found — using DEV header x-user-id when Firebase is not available."
  );
}

// -----------------------------------------------------
// Auth middleware
//   - If Firebase initialized: expects Authorization: Bearer <idToken>
//   - Otherwise (dev mode): use x-user-id header
// -----------------------------------------------------
async function authMiddleware(req, res, next) {
  try {
    if (firebaseInitialized) {
      const authHeader = req.headers.authorization || "";
      if (!authHeader.startsWith("Bearer ")) {
        return res
          .status(401)
          .json({ ok: false, error: "Missing Authorization Bearer token" });
      }
      const idToken = authHeader.split("Bearer ")[1];
      const decoded = await admin.auth().verifyIdToken(idToken);
      req.uid = decoded.uid;
      return next();
    }

    // DEV fallback (no firebase)
    if (process.env.NODE_ENV === "production") {
      return res
        .status(401)
        .json({ ok: false, error: "Auth not configured in production" });
    }
    const uid = req.headers["x-user-id"];
    if (!uid) {
      return res
        .status(401)
        .json({ ok: false, error: "Missing x-user-id header (dev mode)" });
    }
    req.uid = String(uid);
    next();
  } catch (err) {
    console.error("authMiddleware error:", err);
    return res.status(401).json({ ok: false, error: "Invalid auth" });
  }
}

// -----------------------------------------------------
// Validation helper
// -----------------------------------------------------
function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res
      .status(400)
      .json({ ok: false, error: "Validation failed", details: errors.array() });
  }
  next();
}

// -----------------------------------------------------
// Routes
// -----------------------------------------------------

// health check
app.get("/", (req, res) => {
  res.json({ ok: true, message: "Backend is running ✔" });
});

// CREATE transaction
app.post(
  "/transactions",
  authMiddleware,
  [
    body("date").isISO8601().withMessage("date must be YYYY-MM-DD"),
    body("category").isString().trim().isLength({ min: 1, max: 150 }),
    body("amount").isNumeric(),
    body("description").optional().isString().isLength({ max: 1000 }),
  ],
  validate,
  wrapAsync(async (req, res) => {
    const tx = addTransaction(req.uid, req.body);
    return res.status(201).json({ ok: true, transaction: tx });
  })
);

// READ transactions (all, optionally could add filters later)
app.get(
  "/transactions",
  authMiddleware,
  wrapAsync((req, res) => {
    const rows = fetchUserTransactionsRows(req.uid);
    return res.json({ ok: true, transactions: rows });
  })
);

// DELETE transaction
app.delete(
  "/transactions/:id",
  authMiddleware,
  wrapAsync((req, res) => {
    const id = Number(req.params.id);
    deleteTransaction(req.uid, id);
    return res.json({ ok: true });
  })
);

// SUMMARY route (Express 5 SAFE)
//   GET /summary?month=YYYY-MM
app.get(
  "/summary",
  authMiddleware,
  [
    query("month")
      .optional()
      .matches(/^\d{4}-\d{2}$/)
      .withMessage("month must be YYYY-MM"),
  ],
  validate,
  wrapAsync((req, res) => {
    let month = req.query.month;

    // default → previous month
    if (!month) {
      const now = new Date();
      now.setMonth(now.getMonth() - 1);
      month = `${now.getFullYear()}-${String(
        now.getMonth() + 1
      ).padStart(2, "0")}`;
    }

    const summary = fetchSummary(req.uid, month);
    return res.json({ ok: true, month, ...summary });
  })
);

// -----------------------------------------------------
// Global error handler
// -----------------------------------------------------
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  if (res.headersSent) return next(err);
  res
    .status(err.status || 500)
    .json({ ok: false, error: err.message || "Internal Server Error" });
});

// -----------------------------------------------------
// START SERVER
// -----------------------------------------------------
app.listen(PORT, () =>
  console.log(`✅ Backend running on http://localhost:${PORT}`)
);
