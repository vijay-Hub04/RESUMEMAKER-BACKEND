const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Resume = require("../models/Resume");

// Helper to format resume data for frontend consumption
const formatResumeResponse = (resumeDoc) => {
  if (!resumeDoc) return null;
  return {
    id: resumeDoc._id,
    _id: resumeDoc._id,
    fileName: resumeDoc.originalName,
    originalName: resumeDoc.originalName,
    fileSize: resumeDoc.fileSize,
    mimeType: resumeDoc.mimeType,
    fileType: resumeDoc.mimeType,
    uploadedAt: resumeDoc.updatedAt || resumeDoc.createdAt,
    userId: resumeDoc.userId,
    atsScore: resumeDoc.atsScore,
    atsResult: resumeDoc.atsResult,
    downloadUrl: `/uploadResume/${resumeDoc._id}/download`,
    viewUrl: `/uploadResume/${resumeDoc._id}/view`,
    storedInMongo: true,
  };
};

// JWT secret key (falls back to secure default if not set in .env)
const JWT_SECRET = process.env.JWT_SECRET || "careerai_jwt_super_secret_2026_key";

// Standard email regex format validator
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


const mongoose = require("mongoose");

// Sanitize internal errors so raw database details/syntax never leak to client
const sanitizeAuthError = (error, defaultMsg = "An unexpected error occurred. Please try again.") => {
  if (!error) return defaultMsg;
  const msg = String(error.message || error);

  // Mongoose buffering, connection timeouts, network issues
  if (
    msg.includes("buffering timed out") ||
    msg.includes("findOne") ||
    msg.includes("timed out") ||
    msg.includes("MongoServerSelectionError") ||
    msg.includes("MongoNetworkError") ||
    msg.includes("failed to connect") ||
    msg.includes("ECONNREFUSED") ||
    msg.includes("querySrv") ||
    error.name === "MongooseError" ||
    error.name === "MongoServerSelectionError" ||
    error.name === "MongoNetworkError"
  ) {
    return "Database service is temporarily unavailable. Please try again shortly.";
  }

  // Duplicate key (email already in use)
  if (error.code === 11000 || msg.includes("E11000") || msg.includes("duplicate key")) {
    return "An account with this email address already exists. Please sign in.";
  }

  // Credential mismatch
  if (msg.includes("Invalid email or password") || msg.includes("credentials")) {
    return "Invalid email or password. Please verify your credentials.";
  }

  // Known validation messages
  if (
    msg.includes("Full name is required") ||
    msg.includes("Email address is required") ||
    msg.includes("valid email") ||
    msg.includes("at least 6 characters")
  ) {
    return msg;
  }

  return defaultMsg;
};

const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Check DB readiness to fail-fast cleanly instead of buffering for 10 seconds
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        message: "Database service is initializing. Please try again in a few moments.",
      });
    }

    // 1. Check required fields
    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Full name is required.",
      });
    }

    if (!email || !email.trim()) {
      return res.status(400).json({
        success: false,
        message: "Email address is required.",
      });
    }

    // 2. Validate email format
    const normalizedEmail = email.trim().toLowerCase();
    if (!EMAIL_REGEX.test(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address.",
      });
    }

    // 3. Validate password strength
    if (!password || password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long.",
      });
    }

    // 4. Check if user already exists
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "A user with this email address already exists. Please sign in.",
      });
    }

    // 5. Hash password securely using bcrypt
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 6. Generate UUID string explicitly for _id
    const userUuid = crypto.randomUUID();

    // 7. Create new user document in MongoDB "users" collection
    const newUser = new User({
      _id: userUuid, // Using UUID instead of MongoDB ObjectId
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(
        name.trim()
      )}&background=6366f1&color=fff&bold=true`,
      title: "Job Candidate",
      location: "Remote",
    });

    await newUser.save();

    // 8. Link guest resume if resumeId is provided or an unassigned resume exists
    let userResume = null;
    const candidateResumeId = req.body.resumeId;
    if (candidateResumeId && mongoose.isValidObjectId(candidateResumeId)) {
      userResume = await Resume.findOne({ _id: candidateResumeId, userId: null });
      if (userResume) {
        userResume.userId = newUser._id;
        await userResume.save();
      }
    }
    if (!userResume) {
      // Adopt unlinked resume uploaded recently (within 2 hours)
      const recentUnassigned = await Resume.findOne({ userId: null }).sort({ updatedAt: -1 });
      if (recentUnassigned && (Date.now() - new Date(recentUnassigned.createdAt).getTime() < 7200000)) {
        recentUnassigned.userId = newUser._id;
        await recentUnassigned.save();
        userResume = recentUnassigned;
      }
    }
    const resumeData = formatResumeResponse(userResume);

    // 9. Generate JWT token
    const token = jwt.sign(
      { userId: newUser._id, email: newUser.email },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    const userResponse = {
      id: newUser._id,
      _id: newUser._id,
      name: newUser.name,
      email: newUser.email,
      avatar: newUser.avatar,
      title: newUser.title,
      location: newUser.location,
      createdAt: newUser.createdAt,
    };

    return res.status(201).json({
      success: true,
      message: "Account created successfully!",
      user: userResponse,
      resume: resumeData,
      token,
    });
  } catch (error) {
    console.error("Register Error:", error);
    const safeMsg = sanitizeAuthError(error, "Unable to create account. Please try again.");
    const statusCode = safeMsg.includes("Database") ? 503 : 500;
    return res.status(statusCode).json({
      success: false,
      message: safeMsg,
    });
  }
};



const loginUser = async (req, res) => {
  try {
    const { email, password, resumeId } = req.body;

    // Check DB readiness to fail-fast cleanly instead of buffering for 10 seconds
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        message: "Database service is initializing. Please try again in a few moments.",
      });
    }

    // 1. Check required inputs
    if (!email || !email.trim()) {
      return res.status(400).json({
        success: false,
        message: "Email address is required.",
      });
    }

    if (!password) {
      return res.status(400).json({
        success: false,
        message: "Password is required.",
      });
    }

    // 2. Validate email format
    const normalizedEmail = email.trim().toLowerCase();
    if (!EMAIL_REGEX.test(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address.",
      });
    }

    // 3. Find user in MongoDB users collection
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password. Please verify your credentials.",
      });
    }

    // 4. Verify password with bcrypt
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password. Please verify your credentials.",
      });
    }

    // 5. Generate JWT token
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    const userResponse = {
      id: user._id,
      _id: user._id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      title: user.title,
      location: user.location,
      createdAt: user.createdAt,
    };

    // 6. Connect candidate's resume: check if new guest resume was uploaded before login
    let existingResume = null;
    if (resumeId && mongoose.isValidObjectId(resumeId)) {
      const guestResume = await Resume.findOne({ _id: resumeId, userId: null });
      if (guestResume) {
        guestResume.userId = user._id;
        await guestResume.save();
        existingResume = guestResume;
      }
    }

    if (!existingResume) {
      existingResume = await Resume.findOne({ userId: user._id }).sort({ updatedAt: -1 });
    }

    if (!existingResume) {
      const recentUnassigned = await Resume.findOne({ userId: null }).sort({ updatedAt: -1 });
      if (recentUnassigned && (Date.now() - new Date(recentUnassigned.createdAt).getTime() < 7200000)) {
        recentUnassigned.userId = user._id;
        await recentUnassigned.save();
        existingResume = recentUnassigned;
      }
    }

    const resumeData = formatResumeResponse(existingResume);

    return res.status(200).json({
      success: true,
      message: "Signed in successfully!",
      user: userResponse,
      resume: resumeData,
      token,
    });
  } catch (error) {
    console.error("Login Error:", error);
    const safeMsg = sanitizeAuthError(error, "Unable to sign in. Please try again.");
    const statusCode = safeMsg.includes("Database") ? 503 : 500;
    return res.status(statusCode).json({
      success: false,
      message: safeMsg,
    });
  }
};



const getMe = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "No authentication token provided.",
      });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    const existingResume = await Resume.findOne({ userId: user._id }).sort({ updatedAt: -1 });
    const resumeData = formatResumeResponse(existingResume);

    return res.status(200).json({
      success: true,
      user: {
        id: user._id,
        _id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        title: user.title,
        location: user.location,
        createdAt: user.createdAt,
      },
      resume: resumeData,
    });
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token.",
    });
  }
};

const updateProfile = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required to update profile.",
      });
    }

    const { name, title, location } = req.body;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    if (name && name.trim()) user.name = name.trim();
    if (title !== undefined) user.title = title.trim();
    if (location !== undefined) user.location = location.trim();

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully!",
      user: {
        id: user._id,
        _id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        title: user.title,
        location: user.location,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error("Profile update error:", error);
    const safeMsg = sanitizeAuthError(error, "Unable to update profile. Please try again.");
    return res.status(500).json({
      success: false,
      message: safeMsg,
    });
  }
};

module.exports = {
  registerUser,
  loginUser,
  getMe,
  updateProfile,
};

