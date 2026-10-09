const multer = require("multer");
const Resume = require("../models/Resume");

// Configure Multer to store uploaded file in memory as a Buffer
const storage = multer.memoryStorage();

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];

    const hasValidExt = file.originalname.match(/\.(pdf|doc|docx)$/i);

    if (allowedMimeTypes.includes(file.mimetype) || hasValidExt) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file format. Only PDF, DOC, and DOCX files are allowed."));
    }
  },
});


const postresume = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No resume file provided. Please attach a PDF or DOC/DOCX file.",
      });
    }

    // Extract userId from authenticated token (req.user) or request body
    const userId = req.user?.userId || req.body.userId || null;
    let resume = null;

    if (userId) {
      // Check if this registered user already has an active resume stored
      resume = await Resume.findOne({ userId });

      if (resume) {
        // Replace existing resume data in MongoDB
        resume.originalName = req.file.originalname;
        resume.mimeType = req.file.mimetype || "application/pdf";
        resume.fileSize = req.file.size;
        resume.fileBuffer = req.file.buffer;
        resume.status = "uploaded";
        if (req.body.candidateName) resume.candidateInfo.name = req.body.candidateName;
        if (req.body.candidateEmail) resume.candidateInfo.email = req.body.candidateEmail;
        if (req.body.candidatePhone) resume.candidateInfo.phone = req.body.candidatePhone;
        await resume.save();
      } else {
        // Create new resume for this user
        resume = await Resume.create({
          userId,
          originalName: req.file.originalname,
          mimeType: req.file.mimetype || "application/pdf",
          fileSize: req.file.size,
          fileBuffer: req.file.buffer,
          candidateInfo: {
            name: req.body.candidateName || "",
            email: req.body.candidateEmail || "",
            phone: req.body.candidatePhone || "",
          },
          status: "uploaded",
        });
      }
    } else {
      // Guest upload without account
      resume = await Resume.create({
        userId: null,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype || "application/pdf",
        fileSize: req.file.size,
        fileBuffer: req.file.buffer,
        candidateInfo: {
          name: req.body.candidateName || "",
          email: req.body.candidateEmail || "",
          phone: req.body.candidatePhone || "",
        },
        status: "uploaded",
      });
    }

    return res.status(201).json({
      success: true,
      message: "Resume successfully uploaded and stored in MongoDB!",
      data: {
        id: resume._id,
        _id: resume._id,
        fileName: resume.originalName,
        originalName: resume.originalName,
        fileSize: resume.fileSize,
        mimeType: resume.mimeType,
        fileType: resume.mimeType,
        uploadedAt: resume.updatedAt || resume.createdAt,
        userId: resume.userId,
        atsScore: resume.atsScore,
        downloadUrl: `/uploadResume/${resume._id}/download`,
        viewUrl: `/uploadResume/${resume._id}/view`,
        storedInMongo: true,
      },
    });
  } catch (error) {
    console.error("Error saving resume to MongoDB:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while saving resume to MongoDB.",
      error: error.message,
    });
  }
};

const getAllResumes = async (req, res) => {
  try {
    const resumes = await Resume.find().sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: resumes.length,
      data: resumes,
    });
  } catch (error) {
    console.error("Error retrieving resumes:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve resumes.",
      error: error.message,
    });
  }
};


const getResumeById = async (req, res) => {
  try {
    const resume = await Resume.findById(req.params.id);

    if (!resume) {
      return res.status(404).json({
        success: false,
        message: "Resume not found with the specified ID.",
      });
    }

    return res.status(200).json({
      success: true,
      data: resume,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error fetching resume.",
      error: error.message,
    });
  }
};


const downloadResume = async (req, res) => {
  try {
    const resume = await Resume.findById(req.params.id).select("+fileBuffer");

    if (!resume || !resume.fileBuffer) {
      return res.status(404).json({
        success: false,
        message: "Resume file binary not found.",
      });
    }

    // Set appropriate headers to view or download file
    res.setHeader("Content-Type", resume.mimeType || "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${encodeURIComponent(resume.originalName)}"`
    );
    res.setHeader("Content-Length", resume.fileSize);

    return res.send(resume.fileBuffer);
  } catch (error) {
    console.error("Error streaming resume file:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to download resume file.",
      error: error.message,
    });
  }
};


const deleteResume = async (req, res) => {
  try {
    const resume = await Resume.findByIdAndDelete(req.params.id);

    if (!resume) {
      return res.status(404).json({
        success: false,
        message: "Resume not found to delete.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Resume successfully deleted from MongoDB.",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to delete resume.",
      error: error.message,
    });
  }
};

/**
 * GET /uploadResume/my-resume
 * Retrieves active resume associated with the authenticated user
 */
const getMyResume = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required to fetch user resume.",
      });
    }

    const resume = await Resume.findOne({ userId }).sort({ updatedAt: -1 });

    if (!resume) {
      return res.status(200).json({
        success: true,
        data: null,
        message: "No resume found for this user in MongoDB.",
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        id: resume._id,
        _id: resume._id,
        fileName: resume.originalName,
        originalName: resume.originalName,
        fileSize: resume.fileSize,
        mimeType: resume.mimeType,
        fileType: resume.mimeType,
        uploadedAt: resume.updatedAt || resume.createdAt,
        userId: resume.userId,
        atsScore: resume.atsScore,
        downloadUrl: `/uploadResume/${resume._id}/download`,
        viewUrl: `/uploadResume/${resume._id}/view`,
        storedInMongo: true,
      },
    });
  } catch (error) {
    console.error("Error retrieving user resume:", error);
    return res.status(500).json({
      success: false,
      message: "Server error retrieving user resume.",
      error: error.message,
    });
  }
};

module.exports = {
  upload,
  postresume,
  getAllResumes,
  getResumeById,
  getMyResume,
  downloadResume,
  deleteResume,
};
