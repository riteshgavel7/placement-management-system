const jwt = require("jsonwebtoken");

// ======================
// 1. AUTH VERIFY (Common for all)
// ======================
const auth = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1] || req.query.token;
    if (!token) return res.status(401).json({ message: "No token, access denied" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; 
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

// ======================
// 2. ONLY COMPANY / ADMIN
// ======================
const isCompany = (req, res, next) => {
  if (!req.user || !["company", "admin"].includes(req.user.role)) {
    return res.status(403).json({ message: "Access Denied: Only Company/Admin" });
  }
  next();
};

// ======================
// 3. ONLY STUDENT
// ======================
const isStudent = (req, res, next) => {
  if (!req.user || req.user.role !== "student") {
    return res.status(403).json({ message: "Access Denied: Students only" });
  }
  next();
};

// ======================
// 4. ADMIN OR HOD (🔥 Ye Zaroori Hai)
// ======================
const isAdminOrHOD = (req, res, next) => {
  if (!req.user || !["admin", "HOD"].includes(req.user.role)) {
    return res.status(403).json({ message: "Forbidden: Admin or HOD access only" });
  }
  next();
};

module.exports = {
  auth,
  isCompany,
  isStudent,
  isAdminOrHOD
};