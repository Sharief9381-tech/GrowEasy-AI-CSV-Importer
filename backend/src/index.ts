import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import importRoutes from "./routes/importRoutes";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({ origin: "*", methods: ["GET", "POST"], allowedHeaders: ["Content-Type"] }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Routes
app.use("/api/import", importRoutes);

// Root
app.get("/", (_req, res) => {
  res.json({
    name: "GrowEasy CSV Importer API",
    version: "1.0.0",
    endpoints: {
      health: "GET /api/import/health",
      preview: "POST /api/import/preview",
      process: "POST /api/import/process",
    },
  });
});

// 404
app.use((_req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// Global error handler
app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error(err.stack);
    res.status(500).json({ error: err.message || "Internal server error" });
  }
);

app.listen(PORT, () => {
  console.log(`🚀 GrowEasy CSV Importer API running on port ${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/api/import/health`);
});

export default app;
