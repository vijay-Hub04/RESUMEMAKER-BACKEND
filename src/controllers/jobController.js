const Resume = require("../models/Resume");
const Application = require("../models/Application");
const { searchLiveJobs, getLiveJobById } = require("../services/jobSearchService");
const { calculateJobMatch } = require("../utils/jobMatcher");

/**
 * Helper to retrieve candidate's active resume
 */
async function getCandidateResume(req) {
  const userId = req.user?.userId;
  const resumeId = req.query.resumeId || req.headers["x-resume-id"];

  let resume = null;
  if (userId) {
    resume = await Resume.findOne({ userId }).sort({ updatedAt: -1 }).select("+parsedText");
    if (!resume) {
      // If user uploaded before logging in, adopt the most recent unassigned resume
      resume = await Resume.findOne({ userId: null }).sort({ updatedAt: -1 }).select("+parsedText");
      if (resume) {
        resume.userId = userId;
        await resume.save();
      }
    }
  }
  if (!resume && resumeId) {
    const mongoose = require("mongoose");
    if (mongoose.isValidObjectId(resumeId)) {
      resume = await Resume.findById(resumeId).select("+parsedText");
    }
  }
  return resume;
}

/**
 * GET /jobs
 * Search live jobs and rank by candidate's resume match score
 */
const getAllJobs = async (req, res) => {
  try {
    const { search, company, location, type, experience } = req.query;

    // 1. Fetch candidate's active resume if available
    const resume = await getCandidateResume(req);
    const candidateSkills = resume?.atsResult?.skillsAnalysis?.topFoundSkills || [];

    // 2. Fetch live real jobs
    const jobs = await searchLiveJobs({
      search,
      company,
      location,
      type,
      experience,
      candidateSkills,
    });

    // 3. Calculate match score for each job against candidate's resume
    const jobsWithMatch = jobs.map((job) => {
      const match = calculateJobMatch(resume, job);
      return {
        ...job,
        matchScore: match.matchScore,
        matchLevel: match.matchLevel,
        matchingSkills: match.matchingSkills,
        missingSkills: match.missingSkills,
        matchSummary: match.matchSummary,
      };
    });

    // 4. Sort jobs with highest match scores first if candidate resume is present
    if (resume) {
      jobsWithMatch.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
    }

    // 5. If user is authenticated, check which jobs they've already applied to
    let appliedJobIds = [];
    if (req.user?.userId) {
      const applications = await Application.find({ userId: req.user.userId }).select("jobId");
      appliedJobIds = applications.map((a) => a.jobId);
    }

    const finalJobs = jobsWithMatch.map((job) => ({
      ...job,
      hasApplied: appliedJobIds.includes(job.id),
    }));

    return res.status(200).json({
      success: true,
      count: finalJobs.length,
      candidateResume: resume
        ? {
            id: resume._id,
            fileName: resume.originalName,
            atsScore: resume.atsScore,
            detectedSkillsCount: candidateSkills.length,
          }
        : null,
      data: finalJobs,
    });
  } catch (error) {
    console.error("Error fetching live jobs:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve live job listings.",
      error: error.message,
    });
  }
};

/**
 * GET /jobs/:id
 * Retrieve single job details with tailored ATS match breakdown
 */
const getJobById = async (req, res) => {
  try {
    const { id } = req.params;
    const job = await getLiveJobById(id);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job listing not found.",
      });
    }

    const resume = await getCandidateResume(req);
    const match = calculateJobMatch(resume, job);

    let hasApplied = false;
    if (req.user?.userId) {
      const existingApp = await Application.findOne({
        userId: req.user.userId,
        jobId: job.id,
      });
      hasApplied = !!existingApp;
    }

    return res.status(200).json({
      success: true,
      data: {
        ...job,
        hasApplied,
        matchScore: match.matchScore,
        matchLevel: match.matchLevel,
        matchingSkills: match.matchingSkills,
        missingSkills: match.missingSkills,
        matchSummary: match.matchSummary,
      },
    });
  } catch (error) {
    console.error("Error retrieving job by ID:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve job details.",
      error: error.message,
    });
  }
};

/**
 * POST /jobs/:id/match
 * Deep ATS comparison between candidate resume and a specific job
 */
const matchJob = async (req, res) => {
  try {
    const { id } = req.params;
    const job = await getLiveJobById(id);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job listing not found.",
      });
    }

    const resume = await getCandidateResume(req);
    const match = calculateJobMatch(resume, job);

    return res.status(200).json({
      success: true,
      data: {
        jobId: job.id,
        jobTitle: job.title,
        company: job.company,
        ...match,
      },
    });
  } catch (error) {
    console.error("Error matching job:", error);
    return res.status(500).json({
      success: false,
      message: "Error calculating ATS job match.",
      error: error.message,
    });
  }
};

/**
 * POST /jobs/:id/apply
 * Apply to job with candidate's active resume (Authentication Required)
 */
const applyToJob = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "You must be signed in to submit a job application.",
      });
    }

    const { id } = req.params;
    const job = await getLiveJobById(id);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job posting not found to apply.",
      });
    }

    // Retrieve active resume (with automatic guest-to-account linking)
    const resume = await getCandidateResume(req);
    const match = calculateJobMatch(resume, job);

    // Save or update application record in MongoDB
    const application = await Application.findOneAndUpdate(
      { userId, jobId: job.id },
      {
        userId,
        jobId: job.id,
        jobTitle: job.title,
        company: job.company,
        resumeId: resume?._id || null,
        matchScore: match.matchScore || null,
        status: "applied",
        applyUrl: job.applyUrl || job.linkedinSearchUrl,
        notes: req.body.notes || "",
      },
      { upsert: true, new: true }
    );

    return res.status(200).json({
      success: true,
      message: `Successfully applied to ${job.title} at ${job.company}!`,
      data: {
        applicationId: application._id,
        jobId: job.id,
        jobTitle: job.title,
        company: job.company,
        matchScore: application.matchScore,
        status: application.status,
        applyUrl: job.applyUrl,
        linkedinUrl: job.linkedinSearchUrl,
        naukriUrl: job.naukriSearchUrl,
        appliedAt: application.updatedAt || application.createdAt,
      },
    });
  } catch (error) {
    console.error("Error applying to job:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to submit job application.",
      error: error.message,
    });
  }
};

/**
 * GET /jobs/applied/me
 * Get all jobs applied by the current user
 */
const getMyApplications = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const applications = await Application.find({ userId }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: applications.length,
      data: applications,
    });
  } catch (error) {
    console.error("Error fetching user applications:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch user applications.",
      error: error.message,
    });
  }
};

module.exports = {
  getAllJobs,
  getJobById,
  matchJob,
  applyToJob,
  getMyApplications,
};
