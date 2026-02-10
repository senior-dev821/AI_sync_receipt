import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import express from "express";
import OpenAI from "openai";
import path from "path";
import { fileURLToPath } from "url";
import { initDb } from "./db.js";

const app = express();
const isProd = process.env.NODE_ENV === "production";
const port = process.env.PORT || 3001;

app.use(express.json({ limit: "50mb" }));

if (!isProd) {
  app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    next();
  });
}

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const db = initDb();

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.post("/api/extract", async (req, res) => {
  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ error: "Missing OPENAI_API_KEY" });
  }

  const { dataUrl, mimeType, filename } = req.body || {};
  if (!dataUrl || !mimeType) {
    return res.status(400).json({ error: "Missing dataUrl or mimeType" });
  }

  const isPdf = mimeType === "application/pdf" || filename?.toLowerCase().endsWith(".pdf");
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  const startedAt = Date.now();
  const createdAt = new Date().toISOString();

  try {
    const content = [
      {
        type: "input_text",
        text:
          "Extract data from this receipt/invoice. Return JSON with " +
          "vendor (string), amount (number), date (YYYY-MM-DD), tax (number), " +
          "confidence (0-100), category (Materials, Equipment, Labor, Fuel, Other). " +
          "If tax is missing, use 0. If date is missing, leave empty string."
      },
      isPdf
        ? {
            type: "input_file",
            file_data: dataUrl
          }
        : {
            type: "input_image",
            image_url: dataUrl,
            detail: "auto"
          }
    ];

    const response = await client.responses.create({
      model,
      input: [{ role: "user", content }],
      text: {
        format: {
          type: "json_schema",
          name: "receipt_extraction",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              vendor: { type: "string" },
              amount: { type: "number" },
              date: { type: "string" },
              tax: { type: "number" },
              confidence: { type: "number" },
              category: {
                type: "string",
                enum: ["Materials", "Equipment", "Labor", "Fuel", "Other"]
              }
            },
            required: ["vendor", "amount", "date", "tax", "confidence", "category"]
          }
        }
      }
    });

    if (!response.output_text) {
      const durationMs = Date.now() - startedAt;
      db.prepare(
        "INSERT INTO ai_calls (model, input_type, mime_type, filename, status, error, duration_ms, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
      ).run(model, isPdf ? "pdf" : "image", mimeType, filename || null, "error", "Empty model response", durationMs, createdAt);
      return res.status(502).json({ error: "Empty model response" });
    }

    const parsed = JSON.parse(response.output_text);
    const durationMs = Date.now() - startedAt;
    db.prepare(
      "INSERT INTO ai_calls (model, input_type, mime_type, filename, status, error, duration_ms, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    ).run(model, isPdf ? "pdf" : "image", mimeType, filename || null, "success", null, durationMs, createdAt);
    return res.json(parsed);
  } catch (error) {
    console.error("Extraction failed:", error);
    const durationMs = Date.now() - startedAt;
    db.prepare(
      "INSERT INTO ai_calls (model, input_type, mime_type, filename, status, error, duration_ms, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    ).run(model, isPdf ? "pdf" : "image", mimeType, filename || null, "error", String(error?.message || error), durationMs, createdAt);
    return res.status(502).json({ error: "Extraction failed" });
  }
});

app.get("/api/receipts", async (_req, res) => {
  const page = Math.max(parseInt(_req.query.page, 10) || 1, 1);
  const pageSize = Math.min(Math.max(parseInt(_req.query.pageSize, 10) || 25, 1), 100);
  const offset = (page - 1) * pageSize;

  const filters = [];
  const params = [];

  if (_req.query.search) {
    filters.push("(vendor LIKE ? OR category LIKE ? OR location LIKE ?)");
    const term = `%${_req.query.search}%`;
    params.push(term, term, term);
  }
  if (_req.query.status) {
    filters.push("status = ?");
    params.push(_req.query.status);
  }
  if (_req.query.category) {
    filters.push("category = ?");
    params.push(_req.query.category);
  }
  if (_req.query.dateFrom) {
    filters.push("date >= ?");
    params.push(_req.query.dateFrom);
  }
  if (_req.query.dateTo) {
    filters.push("date <= ?");
    params.push(_req.query.dateTo);
  }
  if (_req.query.minAmount) {
    filters.push("amount >= ?");
    params.push(Number(_req.query.minAmount));
  }
  if (_req.query.maxAmount) {
    filters.push("amount <= ?");
    params.push(Number(_req.query.maxAmount));
  }

  const whereClause = filters.length ? `WHERE ${filters.join(" AND ")}` : "";

  const items = db.prepare(
    `SELECT id, vendor, amount, date, tax, status, category, location, time, created_at
     FROM receipts
     ${whereClause}
     ORDER BY id DESC
     LIMIT ? OFFSET ?`
  ).all(...params, pageSize, offset);

  const totalRow = db.prepare(
    `SELECT COUNT(*) AS total FROM receipts ${whereClause}`
  ).get(...params);

  res.json({
    items,
    total: totalRow?.total || 0,
    page,
    pageSize
  });
});

app.post("/api/receipts", async (req, res) => {
  const {
    vendor,
    amount,
    date,
    tax,
    status,
    category,
    location,
    time
  } = req.body || {};

  if (!vendor || !date || amount == null || tax == null || !status || !category || !location || !time) {
    return res.status(400).json({ error: "Missing required receipt fields" });
  }

  const createdAt = new Date().toISOString();
  const result = db.prepare(
    "INSERT INTO receipts (vendor, amount, date, tax, status, category, location, time, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
  ).run(vendor, amount, date, tax, status, category, location, time, createdAt);

  res.json({ id: result.lastInsertRowid });
});

app.get("/api/receipts/export", async (req, res) => {
  const filters = [];
  const params = [];

  if (req.query.search) {
    filters.push("(vendor LIKE ? OR category LIKE ? OR location LIKE ?)");
    const term = `%${req.query.search}%`;
    params.push(term, term, term);
  }
  if (req.query.status) {
    filters.push("status = ?");
    params.push(req.query.status);
  }
  if (req.query.category) {
    filters.push("category = ?");
    params.push(req.query.category);
  }
  if (req.query.dateFrom) {
    filters.push("date >= ?");
    params.push(req.query.dateFrom);
  }
  if (req.query.dateTo) {
    filters.push("date <= ?");
    params.push(req.query.dateTo);
  }
  if (req.query.minAmount) {
    filters.push("amount >= ?");
    params.push(Number(req.query.minAmount));
  }
  if (req.query.maxAmount) {
    filters.push("amount <= ?");
    params.push(Number(req.query.maxAmount));
  }

  const whereClause = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
  const rows = db.prepare(
    `SELECT id, vendor, amount, date, tax, status, category, location, time, created_at
     FROM receipts
     ${whereClause}
     ORDER BY id DESC`
  ).all(...params);

  const header = [
    "id",
    "vendor",
    "amount",
    "date",
    "tax",
    "status",
    "category",
    "location",
    "time",
    "created_at"
  ];

  const escapeCsv = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;
  const lines = [
    header.join(","),
    ...rows.map((row) => header.map((key) => escapeCsv(row[key])).join(","))
  ];

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", "attachment; filename=receipts.csv");
  res.send(lines.join("\n"));
});

app.get("/api/ai-calls", async (req, res) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const pageSize = Math.min(Math.max(parseInt(req.query.pageSize, 10) || 25, 1), 100);
  const offset = (page - 1) * pageSize;

  const items = db.prepare(
    "SELECT id, model, input_type, mime_type, filename, status, error, duration_ms, created_at FROM ai_calls ORDER BY id DESC LIMIT ? OFFSET ?"
  ).all(pageSize, offset);

  const totalRow = db.prepare("SELECT COUNT(*) AS total FROM ai_calls").get();
  const total = totalRow?.total || 0;

  const summary = db.prepare(
    "SELECT SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) AS successCount, SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) AS errorCount, AVG(duration_ms) AS avgDuration FROM ai_calls"
  ).get();

  res.json({
    items,
    total,
    page,
    pageSize,
    summary: {
      successCount: summary?.successCount || 0,
      errorCount: summary?.errorCount || 0,
      avgDuration: summary?.avgDuration ? Math.round(summary.avgDuration) : 0
    }
  });
});

if (isProd) {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const distDir = path.resolve(__dirname, "..", "dist");

  app.use(express.static(distDir));

  app.get("*", (_req, res) => {
    res.sendFile(path.join(distDir, "index.html"));
  });
}

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
