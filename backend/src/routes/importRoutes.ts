import { Router, Request, Response } from "express";
import multer from "multer";
import { parseCSVBuffer } from "../services/csvService";
import { processCSVWithAI } from "../services/aiService";
import { ParsedResult } from "../types/crm";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (
      file.mimetype === "text/csv" ||
      file.mimetype === "application/vnd.ms-excel" ||
      file.originalname.toLowerCase().endsWith(".csv")
    ) {
      cb(null, true);
    } else {
      cb(new Error("Only CSV files are allowed"));
    }
  },
});

/** POST /api/import/preview */
router.post("/preview", upload.single("file"), async (req: Request, res: Response) => {
  try {
    if (!req.file) { res.status(400).json({ error: "No file uploaded" }); return; }
    const parsed = parseCSVBuffer(req.file.buffer);
    res.json({
      headers: parsed.headers,
      rows: parsed.rows.slice(0, 200),
      totalRows: parsed.totalRows,
      previewRows: Math.min(parsed.rows.length, 200),
    });
  } catch (error: unknown) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Failed to parse CSV" });
  }
});

/** POST /api/import/process */
router.post("/process", upload.single("file"), async (req: Request, res: Response) => {
  try {
    if (!req.file) { res.status(400).json({ error: "No file uploaded" }); return; }
    if (!process.env.MISTRAL_API_KEY) {
      res.status(500).json({ error: "AI service not configured. Please set MISTRAL_API_KEY." });
      return;
    }
    const parsed = parseCSVBuffer(req.file.buffer);
    if (parsed.rows.length === 0) {
      res.json({ success: [], skipped: [], totalImported: 0, totalSkipped: 0 } as ParsedResult);
      return;
    }
    const batchResult = await processCSVWithAI(parsed.headers, parsed.rows);
    res.json({
      success: batchResult.records,
      skipped: batchResult.skipped,
      totalImported: batchResult.records.length,
      totalSkipped: batchResult.skipped.length,
    } as ParsedResult);
  } catch (error: unknown) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Processing failed" });
  }
});

/** POST /api/import/process-stream — SSE streaming */
router.post("/process-stream", upload.single("file"), async (req: Request, res: Response) => {
  if (!req.file) { res.status(400).json({ error: "No file uploaded" }); return; }
  if (!process.env.MISTRAL_API_KEY) {
    res.status(500).json({ error: "AI service not configured." });
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const send = (event: string, data: unknown) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  try {
    const parsed = parseCSVBuffer(req.file.buffer);
    send("start", { totalRows: parsed.rows.length });

    const batchResult = await processCSVWithAI(
      parsed.headers,
      parsed.rows,
      (processed, total) => {
        send("progress", { processed, total, percent: Math.round((processed / total) * 100) });
      }
    );

    send("complete", {
      success: batchResult.records,
      skipped: batchResult.skipped,
      totalImported: batchResult.records.length,
      totalSkipped: batchResult.skipped.length,
    });
    res.end();
  } catch (error: unknown) {
    send("error", { message: error instanceof Error ? error.message : "Processing failed" });
    res.end();
  }
});

/** GET /api/import/health */
router.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

export default router;
