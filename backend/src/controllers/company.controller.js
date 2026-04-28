const Company = require("../models/compony.model");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const Application = require("../models/application.model");

// ======================
// REGISTER COMPANY
// ======================
exports.registerCompany = async (req, res) => {
  try {
    const { name, email, password, companyName, location, website, description } = req.body;

    // check duplicate email
    const existing = await Company.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: "Email already registered" });
    }

    // hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const company = await Company.create({
      name,
      email,
      password: hashedPassword,
      companyName,
      location,
      website,
      description,
    });

    res.status(201).json({
      message: "Company registered successfully",
      company,
    });

  } catch (error) {
    res.status(500).json({
      message: "Error registering company",
      error: error.message,
    });
  }
};

// ======================
// LOGIN COMPANY 
// ======================
exports.loginCompany = async (req, res) => {
  try {
    const { email, password } = req.body;

    const company = await Company.findOne({ email });
    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    }

    //  1. Sabse pehle Approval Check karein
    if (company.isVerified === false) {
      return res.status(403).json({ 
        message: "Your account is pending admin approval. Please contact GGV Placement Cell." 
      });
    }

    // 2. Phir password match karein
    const match = await bcrypt.compare(password, company.password);
    if (!match) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: company._id, role: "company" },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    company.password = undefined; 

    res.status(200).json({
      message: "Login successful",
      token,
      company,
    });

  } catch (error) {
    res.status(500).json({
      message: "Error logging in",
      error: error.message,
    });
  }
};

// ====================== SEND OTP   ======================
exports.sendOTP = async (req, res) => {
  try {
    const { email } = req.body;

    const company = await Company.findOne({ email });

    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    }

   
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    company.otp = otp;
    company.otpExpirey = Date.now() + 5 * 60 * 1000; // 5 min
    await company.save();

    
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    await transporter.sendMail({
      to: email,
      subject: "Company OTP Verification",
      html: `<h2>Your OTP is: ${otp}</h2>`
    });

    res.status(200).json({
      message: "OTP sent successfully"
    });

  } catch (error) {
    res.status(500).json({
      message: "Error sending OTP",
      error: error.message,
    });
  }
};

// ====================== RESET PASSWORD  ======================
exports.resetPassword = async (req, res) => {
  try {
    const { email, otp, password } = req.body;

    const company = await Company.findOne({ email });

    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    }

    // OTP match check
    if (company.otp !== otp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    //  expiry check
    if (company.otpExpire < Date.now()) {
      return res.status(400).json({ message: "OTP expired" });
    }

    //  hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    company.password = hashedPassword;

    //  clear OTP
    company.otp = undefined;
    company.otpExpire = undefined;

    await company.save();

    res.status(200).json({
      message: "Password reset successful"
    });

  } catch (error) {
    res.status(500).json({
      message: "Error resetting password",
      error: error.message,
    });
  }
};



const getAnalytics = async (req, res) => {
    try {
        const Application = require('../models/application.model');
        const apps = await Application.find().populate('student', 'name cgpa');
        res.json({
            selected: apps.filter(a => a.status === 'Selected'),
            rejected: apps.filter(a => a.status === 'Rejected')
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};


