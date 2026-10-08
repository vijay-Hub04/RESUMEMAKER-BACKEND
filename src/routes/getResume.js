const express = require("express");
const router = express.Router();
const {
  upload,
  postresume,
  getAllResumes,
  getResumeById,
  downloadResume,
  deleteResume,
} = require("../controllers/resumes");

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

// POST /uploadResume - Upload and store resume directly in MongoDB
router.post("/", handleUpload, postresume);
router.post("/upload", handleUpload, postresume);

// GET /uploadResume - Get list of all uploaded resumes
router.get("/", getAllResumes);

// GET /uploadResume/:id - Get resume metadata by ID
router.get("/:id", getResumeById);

// GET /uploadResume/:id/download or /view - Stream PDF/DOC binary directly from MongoDB
router.get("/:id/download", downloadResume);
router.get("/:id/view", downloadResume);

// DELETE /uploadResume/:id - Delete resume from MongoDB
router.delete("/:id", deleteResume);

module.exports = router;