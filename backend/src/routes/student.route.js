const express = require("express");
const router = express.Router();
const upload = require("../middlewares/upload.middleware");
const { auth } = require("../middlewares/auth.middleware"); 

const {
  registerStudent,
  loginStudent,
  getProfile,
  sendOTP,
  reset,
  verifyOTP,
} = require("../controllers/student.controller");


// REGISTER
router.post(
  "/register",
  upload.fields([
    { name: "resume", maxCount: 1 },
    { name: "profilePicture", maxCount: 1 },
  ]),
  registerStudent
);

// LOGIN
router.post("/login", loginStudent);

// PROFILE 
router.get("/profile", auth, getProfile);

router.post("/send-otp", sendOTP);
router.post("/reset-password", reset);
router.post("/verify-otp", verifyOTP);





module.exports = router;