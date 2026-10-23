const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
require("dotenv").config();
const connectionDB = require("./src/config/connectionDB");
const app = require("./src/app");

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    await connectionDB();
  } catch (err) {
    console.error("Warning: DB connection initialization encountered error:", err.message);
  }

  app.listen(PORT, () => {
    console.log(`🚀 CareerAI Backend server is running on http://localhost:${PORT}`);
  });
}

startServer();