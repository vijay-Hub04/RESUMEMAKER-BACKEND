const express = require("express");
const cors = require("cors");
const app = express();
const connectionDB = require("./config/connectionDB");
const getResume = require("./routes/getResume");
const authRoutes = require("./routes/authRoutes");

// 1. Enable CORS for frontend communication (Vite on port 5173, etc.)
app.use(cors());

// 2. Request body parsing middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 3. Connect to MongoDB
connectionDB();

// 4. Mount Auth Routes (/auth/login, /auth/register, etc.)
app.use("/auth", authRoutes);


// 5. Mount Resume Routes (with convenient aliases)
app.use("/uploadResume", getResume);
// app.use("/api/resume", getResume);
// app.use("/resume", getResume);
// app.use("/api/uploadResume", getResume);

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