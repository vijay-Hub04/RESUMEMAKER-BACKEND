const express = require("express");
const cors = require("cors");
const app = express();

const connectionDB = require("./config/connectionDB");
const getResume = require("./routes/getResume");

// 1. Enable CORS for frontend communication (Vite on port 5173, etc.)
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// 2. Request body parsing middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 3. Connect to MongoDB
connectionDB();

// 4. Health-check root endpoint
app.get("/", (req, res) => {
  res.json({
    status: "online",
    message: "CareerAI Backend API is running successfully!",
    endpoints: {
      uploadResume: "POST /uploadResume",
      getAllResumes: "GET /uploadResume",
      getResumeById: "GET /uploadResume/:id",
      downloadResume: "GET /uploadResume/:id/download",
    },
  });
});

// 5. Mount Resume Routes
app.use("/uploadResume", getResume);
app.use("/api/resume", getResume); // Useful alias

// 6. 404 Not Found Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found.`,
  });
});

// 7. Global Error Handler
app.use((err, req, res, next) => {
  console.error("Global Error:", err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal server error occurred.",
  });
});

module.exports = app;