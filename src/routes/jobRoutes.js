const express = require("express");
const router = express.Router();
const {
  getAllJobs,
  getJobById,
  matchJob,
  applyToJob,
  getMyApplications,
} = require("../controllers/jobController");
const { optionalAuth, requireAuth } = require("../middlewares/authMiddleware");

// GET /jobs/applied/me - User's job application history (Must be before /:id)
router.get("/applied/me", requireAuth, getMyApplications);

// GET /jobs - Live jobs ranked by candidate resume match
router.get("/", optionalAuth, getAllJobs);

// GET /jobs/:id - Single job details with ATS match
router.get("/:id", optionalAuth, getJobById);

// POST /jobs/:id/match - Run deep ATS comparison against candidate resume
router.post("/:id/match", optionalAuth, matchJob);

// POST /jobs/:id/apply - Submit application with resume (Requires login)
router.post("/:id/apply", requireAuth, applyToJob);

module.exports = router;
