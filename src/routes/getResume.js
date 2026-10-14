const express = require("express");
const router = express.Router();
const {
  upload,
  postresume,
  getAllResumes,
  getResumeById,
  getMyResume,
  analyzeResumeATS,
  downloadResume,
  deleteResume,
} = require("../controllers/resumes");
const { optionalAuth, requireAuth } = require("../middlewares/authMiddleware");

// Custom middleware to support both field names ('resume' or 'file')
const handleUpload = (req, res, next) => {
  const uploadMiddleware = upload.fields([
    { name: "resume", maxCount: 1 },
    { name: "file", maxCount: 1 },
  ]);

  uploadMiddleware(req, res, (err) => {
    if (err) {
      return res.status(400).json({
        success: false,
        message: err.message || "File upload error",
      });
    }

    // Normalize req.file from either 'resume' or 'file' field
    if (req.files) {
      if (req.files.resume && req.files.resume[0]) {
        req.file = req.files.resume[0];
      } else if (req.files.file && req.files.file[0]) {
        req.file = req.files.file[0];
      }
    }

    next();
  });
};

// POST /uploadResume - Upload and store resume directly in MongoDB (supports both guest and authenticated users)
router.post("/", optionalAuth, handleUpload, postresume);
router.post("/upload", optionalAuth, handleUpload, postresume);

// GET /uploadResume/my-resume - Get active resume for logged in user (MUST be before /:id)
router.get("/my-resume", requireAuth, getMyResume);

// POST /uploadResume/my-resume/analyze - Analyze logged-in user's active resume
router.post("/my-resume/analyze", requireAuth, analyzeResumeATS);

// POST /uploadResume/analyze-general & /analyze - Analyze resume from payload or session
router.post("/analyze-general", optionalAuth, analyzeResumeATS);
router.post("/analyze", optionalAuth, analyzeResumeATS);

// GET /uploadResume - Get list of all uploaded resumes
router.get("/", getAllResumes);

// POST /uploadResume/:id/analyze - Calculate ATS score from stored binary buffer in MongoDB
router.post("/:id/analyze", optionalAuth, analyzeResumeATS);

// GET /uploadResume/:id - Get resume metadata by ID
router.get("/:id", getResumeById);

// GET /uploadResume/:id/download or /view - Stream PDF/DOC binary directly from MongoDB
router.get("/:id/download", downloadResume);
router.get("/:id/view", downloadResume);

// DELETE /uploadResume/:id - Delete resume from MongoDB
router.delete("/:id", deleteResume);

module.exports = router;