import { Router, Request, Response } from "express";
import multer from "multer";
import { parseCSVBuffer } from "../services/csvService";
import { processCSVWithAI } from "../services/aiService";
import { ParsedResult } from "../types/crm";

const router = Router();

// Use memory storage — no files on disk
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
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

/**
 * POST /api/import/preview
 * Upload CSV and return raw preview data (no AI processing)
 */
router.post(
  "/preview",
  upload.single("file"),
  async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        res.status(400).json({ error: "No file uploaded" });
        return;
      }

      const parsed = parseCSVBuffer(req.file.buffer);

      res.json({
        headers: parsed.headers,
        rows: parsed.rows.slice(0, 200), // Limit preview to 200 rows
        totalRows: parsed.totalRows,
        previewRows: Math.min(parsed.rows.length, 200),
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to parse CSV";
      res.status(400).json({ error: message });
    }
  }
);

/**
 * POST /api/import/process
 * Upload CSV, run AI extraction, return CRM records
 */
router.post(
  "/process",
  upload.single("file"),
  async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        res.status(400).json({ error: "No file uploaded" });
        return;
      }

      if (!process.env.GROQ_API_KEY) {
        res.status(500).json({ error: "AI service not configured. Please set GROQ_API_KEY." });
        return;
      }

      const parsed = parseCSVBuffer(req.file.buffer);

      if (parsed.rows.length === 0) {
        res.json({
          success: [],
          skipped: [],
          totalImported: 0,
          totalSkipped: 0,
        } as ParsedResult);
        return;
      }

      const batchResult = await processCSVWithAI(parsed.headers, parsed.rows);

      const result: ParsedResult = {
        success: batchResult.records,
        skipped: batchResult.skipped,
        totalImported: batchResult.records.length,
        totalSkipped: batchResult.skipped.length,
      };

      res.json(result);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Processing failed";
      res.status(500).json({ error: message });
    }
  }
);

/**
 * GET /api/import/health
 */
router.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

export default router;
