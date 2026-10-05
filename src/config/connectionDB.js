const mongoose = require("mongoose");
require("dotenv").config();

async function connectionDB() {
  const mongoUrl = (process.env.MONGO_URL || "mongodb://127.0.0.1:27017/resumemaker").trim();

  try {
    console.log("⏳ Connecting to MongoDB...");
    await mongoose.connect(mongoUrl, {
      serverSelectionTimeoutMS: 5000, // Timeout fast instead of hanging 30s if not started
    });
    console.log(`✅ Successfully connected to MongoDB database: "${mongoose.connection.name}"`);
  } catch (err) {
    console.error("❌ MongoDB connection error:", err.message);
    console.log(
      "💡 Tip: Ensure MongoDB is running (e.g., in MongoDB Compass or as a local service). " +
        "If your local MongoDB does not require authentication, set MONGO_URL=mongodb://127.0.0.1:27017/resumemaker in .env"
    );
  }
}

module.exports = connectionDB;
