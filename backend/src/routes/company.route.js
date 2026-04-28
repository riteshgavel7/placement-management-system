const express = require("express");
const router = express.Router();

const companyController = require("../controllers/company.controller");

const {
  registerCompany,
  loginCompany,
  sendOTP,
  resetPassword,
} = require("../controllers/company.controller");

router.post("/register", registerCompany);
router.post("/login", loginCompany);
router.post("/send-otp", sendOTP);
router.post("/reset-password", resetPassword);

module.exports = router;