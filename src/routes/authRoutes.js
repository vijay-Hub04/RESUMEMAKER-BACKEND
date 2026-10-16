const express = require("express");
const router = express.Router();
const {
  registerUser,
  loginUser,
  getMe,
  updateProfile,
} = require("../controllers/authController");
const { requireAuth } = require("../middlewares/authMiddleware");

// POST /auth/register - Register new user with UUID into MongoDB users collection
router.post("/register", registerUser);

// POST /auth/login - Authenticate user credentials & issue token
router.post("/login", loginUser);

// GET /auth/me - Fetch current logged-in user profile
router.get("/me", getMe);

// PUT /auth/profile - Update candidate profile in MongoDB
router.put("/profile", requireAuth, updateProfile);

module.exports = router;

