const express = require("express");
const cors = require("cors");
const app = express();
const connectionDB = require("./config/connectionDB");
const getResume = require("./routes/getResume");
const authRoutes = require("./routes/authRoutes");
const jobRoutes = require("./routes/jobRoutes");

// 1. Enable CORS for frontend communication (Vite on port 5173, etc.)
app.use(cors());

// 2. Request body parsing middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 3. Connect to MongoDB if not already initiated
const mongoose = require("mongoose");
if (mongoose.connection.readyState === 0) {
  connectionDB().catch(() => {});
}

// 4. Health & Status check endpoint
app.get("/health", (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? "connected" : "connecting";
  res.json({
    status: "ok",
    service: "CareerAI Backend API",
    database: dbStatus,
    timestamp: new Date().toISOString(),
  });
});

// 5. Mount Auth Routes (/auth/login, /auth/register, etc.)
app.use("/auth", authRoutes);

// 6. Mount Resume Routes (with convenient aliases)
app.use("/uploadResume", getResume);
app.use("/resume", getResume);

// 7. Mount Job Routes (/jobs, /jobs/:id, /jobs/:id/match, /jobs/:id/apply)
app.use("/jobs", jobRoutes);

// 8. 404 Not Found Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Resource not found.`,
  });
});

// 9. Standardized Global Error Handler (Sanitizes internal database details)
app.use((err, req, res, next) => {
  console.error("Global Error Handler caught:", err);

  const rawMsg = String(err?.message || err || "");
  const isDbIssue =
    err?.name === "MongooseError" ||
    err?.name === "MongoServerSelectionError" ||
    err?.name === "MongoNetworkError" ||
    rawMsg.includes("buffering timed out") ||
    rawMsg.includes("ECONNREFUSED") ||
    rawMsg.includes("querySrv");

  const sanitizedMessage = isDbIssue
    ? "Database service is temporarily unavailable. Please try again shortly."
    : (err?.status && err?.status < 500 ? rawMsg : "An unexpected server error occurred. Please try again shortly.");

  res.status(err?.status || (isDbIssue ? 503 : 500)).json({
    success: false,
    message: sanitizedMessage,
  });
});


module.exports = app;