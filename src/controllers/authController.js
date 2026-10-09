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
    downloadUrl: `/uploadResume/${resumeDoc._id}/download`,
    viewUrl: `/uploadResume/${resumeDoc._id}/view`,
    storedInMongo: true,
  };
};

// JWT secret key (falls back to secure default if not set in .env)
const JWT_SECRET = process.env.JWT_SECRET || "careerai_jwt_super_secret_2026_key";

// Standard email regex format validator
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

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

    // 8. Generate JWT token
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
      token,
    });
  } catch (error) {
    console.error("Register Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Server error while registering user.",
    });
  }
};


const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

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
    console.log("token", token)

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

    // Check if this user has an uploaded resume in MongoDB
    const existingResume = await Resume.findOne({ userId: user._id }).sort({ updatedAt: -1 });
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
    return res.status(500).json({
      success: false,
      message: error.message || "Server error while signing in.",
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

module.exports = {
  registerUser,
  loginUser,
  getMe,
};
