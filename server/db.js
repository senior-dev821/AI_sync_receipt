import fs from "fs";
import path from "path";
import Database from "better-sqlite3";

const dataDir = path.resolve(process.cwd(), "data");
const dbPath = path.join(dataDir, "receipts.db");

export const initDb = () => {
  fs.mkdirSync(dataDir, { recursive: true });

  const db = new Database(dbPath);

  db.exec(`
    CREATE TABLE IF NOT EXISTS receipts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vendor TEXT NOT NULL,
      amount REAL NOT NULL,
      date TEXT NOT NULL,
      tax REAL NOT NULL,
      status TEXT NOT NULL,
      category TEXT NOT NULL,
      location TEXT NOT NULL,
      time TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS ai_calls (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      model TEXT NOT NULL,
      input_type TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      filename TEXT,
      status TEXT NOT NULL,
      error TEXT,
      duration_ms INTEGER NOT NULL,
      created_at TEXT NOT NULL
    );
  `);

  return db;
};
