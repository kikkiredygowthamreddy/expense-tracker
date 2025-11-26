// backend/db.js
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

let db;

function getPaths() {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const dbPath = path.join(__dirname, "db.sqlite");
  return { __dirname, dbPath };
}

export function initDb() {
  if (db) return db;

  const { dbPath } = getPaths();
  db = new Database(dbPath);
  db.pragma("journal_mode = WAL");

  db.prepare(`
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      date TEXT NOT NULL,
      category TEXT NOT NULL,
      amount REAL NOT NULL,
      description TEXT,
      created_at TEXT NOT NULL
    )
  `).run();

  console.log("✅ SQLite ready at", dbPath);
  return db;
}

function getDb() {
  return db || initDb();
}

// -----------------------------------------------------
// Basic operations
// -----------------------------------------------------

export function addTransaction(uid, payload) {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO transactions (user_id, date, category, amount, description, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const createdAt = new Date().toISOString();
  const result = stmt.run(
    uid,
    payload.date,
    payload.category.trim(),
    Number(payload.amount),
    payload.description ? payload.description.trim() : null,
    createdAt
  );

  return db.prepare(`SELECT * FROM transactions WHERE id = ?`).get(
    result.lastInsertRowid
  );
}

export function deleteTransaction(uid, id) {
  const db = getDb();
  db.prepare(`DELETE FROM transactions WHERE id = ? AND user_id = ?`).run(
    id,
    uid
  );
}

export function fetchUserTransactionsRows(uid, startDate = null, endDate = null) {
  const db = getDb();
  if (startDate && endDate) {
    return db
      .prepare(
        `SELECT * FROM transactions
         WHERE user_id = ?
           AND date >= ?
           AND date <= ?
         ORDER BY date ASC, id ASC`
      )
      .all(uid, startDate, endDate);
  }

  return db
    .prepare(
      `SELECT * FROM transactions
       WHERE user_id = ?
       ORDER BY date DESC, id DESC`
    )
    .all(uid);
}

// -----------------------------------------------------
// Monthly summary helper used by /summary
// -----------------------------------------------------
export function fetchSummary(uid, month) {
  const db = getDb();

  const [y, m] = month.split("-");
  const year = Number(y);
  const monthNum = Number(m);
  const lastDay = new Date(year, monthNum, 0).getDate();

  const start = `${month}-01`;
  const end = `${month}-${String(lastDay).padStart(2, "0")}`;

  const rows = db
    .prepare(
      `SELECT category, amount
       FROM transactions
       WHERE user_id = ?
         AND date >= ?
         AND date <= ?`
    )
    .all(uid, start, end);

  const totalsByCategory = {};
  let total = 0;

  for (const r of rows) {
    const cat = r.category || "Other";
    const amt = Number(r.amount) || 0;
    totalsByCategory[cat] = (totalsByCategory[cat] || 0) + amt;
    total += amt;
  }

  return {
    totalsByCategory,
    total,
    count: rows.length,
    range: { start, end },
  };
}
