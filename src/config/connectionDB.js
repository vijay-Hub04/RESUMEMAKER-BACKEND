const mongoose = require("mongoose");
require("dotenv").config();

function sanitizeMongoUrl(url) {
  let cleaned = (url || "").trim().replace(/^["']|["']$/g, "").trim();
  // Safely auto-encode special characters like '@' in password if unencoded
  const match = cleaned.match(/^(mongodb(?:\+srv)?:\/\/)([^:]+):(.+)@([^\/@]+)(\/.*)?$/);
  if (match) {
    const [, protocol, username, rawPassword, host, rest = ""] = match;
    const encodedPassword = encodeURIComponent(decodeURIComponent(rawPassword));
    cleaned = `${protocol}${username}:${encodedPassword}@${host}${rest}`;
  }
  return cleaned;
}

async function connectionDB() {
  const rawUrl = process.env.MONGO_URL || "mongodb://127.0.0.1:27017/resumemaker";
  const mongoUrl = sanitizeMongoUrl(rawUrl);

  try {
    console.log("⏳ Connecting to MongoDB Atlas...");
    await mongoose.connect(mongoUrl, {
      serverSelectionTimeoutMS: 8000,
    });
    console.log(`✅ Successfully connected to MongoDB database: "${mongoose.connection.name}"`);
  } catch (err) {
    console.error("❌ MongoDB connection error:", err.message);
    // If auth failed and user has local default instance without auth, try local fallback
    if (mongoUrl.includes("@")) {
      try {
        console.log("⏳ Attempting connection with local unauthenticated fallback...");
        await mongoose.connect("mongodb://127.0.0.1:27017/resumemaker", {
          serverSelectionTimeoutMS: 3000,
        });
        console.log(`✅ Successfully connected to MongoDB via local fallback: "${mongoose.connection.name}"`);
        return;
      } catch (fallbackErr) {
        console.error("❌ Fallback connection also failed:", fallbackErr.message);
      }
    }
    console.log(
      "💡 Tip: Ensure MongoDB is running (e.g., in MongoDB Compass or as a local service)."
    );
  }
}

module.exports = connectionDB;
