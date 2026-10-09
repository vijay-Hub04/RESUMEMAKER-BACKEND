const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "careerai_jwt_super_secret_2026_key";

/**
 * Middleware: Optional authentication
 * If valid Bearer token is provided, attaches decoded user to req.user.
 * If no token or token is invalid, continues as unauthenticated guest (req.user = null).
 */
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    req.user = null;
    return next();
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { userId, email, ... }
  } catch (err) {
    req.user = null;
  }
  next();
};

/**
 * Middleware: Required authentication
 * Blocks request with 401 if valid token is not present.
 */
const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Authentication required. Please sign in.",
    });
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired session token. Please sign in again.",
    });
  }
};

module.exports = {
  optionalAuth,
  requireAuth,
};
