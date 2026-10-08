const express = require("express");
const router = express.Router();
const {
  registerUser,
  loginUser,
  getMe,
} = require("../controllers/authController");

// POST /auth/register - Register new user with UUID into MongoDB users collection
router.post("/register", registerUser);

// POST /auth/login - Authenticate user credentials & issue token
router.post("/login", loginUser);

// GET /auth/me - Fetch current logged-in user profile
router.get("/me", getMe);

module.exports = router;
