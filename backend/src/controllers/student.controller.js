const Student = require("../models/student.model");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const imagekit = require("../services/upload.service");
const nodemailer = require("nodemailer");
const crypto = require('crypto');

// ======================
// REGISTER
// ======================

const registerStudent = async (req, res) => {
  try {
    if (!req.files || !req.files.resume || !req.files.profilePicture) {
      return res.status(400).json({ message: "Resume aur Profile Picture dono zaroori hain!" });
    }

    const { 
      name, email, password, mobile, enrollmentNo, rollNo, 
      department, batch, course,
      twelfthMarks, twelfthPassingYear, gender, 
      razorpay_order_id, razorpay_payment_id, razorpay_signature,
      payment_mode // <--- Frontend se ye flag pakda
    } = req.body;

    // --- STEP 1: PAYMENT VERIFICATION (Only if NOT Free) ---
    if (payment_mode !== "FREE") {
        const hmac = crypto.createHmac('sha256', process.env.RAZORPAY_SECRET);
        hmac.update(razorpay_order_id + "|" + razorpay_payment_id);
        const generated_signature = hmac.digest('hex');

        if (generated_signature !== razorpay_signature) {
          return res.status(400).json({ message: "Payment verification failed! Fraud detected." });
        }
    } else {
        console.log("Free Registration Flow: Skipping signature check.");
    }

    // --- STEP 2: DUPLICATE CHECK ---
    const paidExist = await Student.findOne({ 
      $or: [{ email }, { enrollmentNo }],
      isPaid: true 
    });

    if (paidExist) {
      return res.status(400).json({ message: "Bhai, ye Enrollment ya Email pehle se Registered aur Paid hai!" });
    }

    // --- STEP 3: KACHRA SAAF KARO ---
    await Student.deleteMany({ 
      $or: [{ email }, { enrollmentNo }], 
      isPaid: false 
    });

    // --- STEP 4: FILE UPLOAD ---
    const resumeFile = req.files.resume[0];
    const profilePicFile = req.files.profilePicture[0];
    
    const [resumeUpload, profileUpload] = await Promise.all([
      imagekit.upload({ 
        file: resumeFile.buffer, 
        fileName: `RES_${enrollmentNo}_${Date.now()}`, 
        folder: "/resumes" 
      }),
      imagekit.upload({ 
        file: profilePicFile.buffer, 
        fileName: `PIC_${enrollmentNo}_${Date.now()}`, 
        folder: "/profilePictures" 
      })
    ]);

    // --- STEP 5: FINAL SAVE ---
    const hash = await bcrypt.hash(password, 10);

    const student = new Student({
      name, email, password: hash, mobile, enrollmentNo, rollNo,
      department, batch, course,
      twelfthMarks, twelfthPassingYear, gender,
      resume: resumeUpload.url,
      profilePicture: profileUpload.url,
      isVerified: false, 
      status: 'pending',
      isPaid: true,                
      paymentId: payment_mode === "FREE" ? "FREE_REGISTRATION" : razorpay_payment_id
    });

    await student.save(); 

    res.status(201).json({
      success: true,
      message: "Registration Successful! Admin verification ka intezar karein.",
      studentId: student._id
    });

  } catch (err) {
    console.error("🔥 REGISTRATION ERROR:", err);
    res.status(500).json({ message: "Registration fail ho gayi: " + err.message });
  }
};

// ======================
// LOGIN
// ======================
const loginStudent = async (req, res) => {
  try {
    const { email, password } = req.body;

    const student = await Student.findOne({ email });
    if (!student) {
      return res.status(404).json({ message: "User not found" });
    }

    const match = await bcrypt.compare(password, student.password);
    if (!match) {
      return res.status(400).json({ message: "Invalid password" });
    }

   
    if (!student.isVerified) {
      return res.status(403).json({ 
        message: "Account pending. Admin/Mentor approval ka wait karein." 
      });
    }

    const token = jwt.sign(
      {
        id: student._id,
        role: "student",
        department: student.department
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.json({
      message: "Login success",
      token,
      student,
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};




// ======================
// PROFILE
// ======================
const getProfile = async (req, res) => {
  try {
    // Password aur OTP fields ko minus (-) kar do taaki security bani rahe
    const student = await Student.findById(req.user.id).select("-password -otp -otpExpire");

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    // Aap chaho toh status ko clean karke bhi bhej sakte ho
    res.json({ 
        success: true,
        student 
    });

  } catch (err) {
    res.status(500).json({ message: "Profile load error: " + err.message });
  }
};



// ======================
//----------OTP---------//
// ======================

const sendOTP = async (req, res) => {
  try {
    const { email, type } = req.body; 

    if (!email || !type) {
        return res.status(400).json({ message: "Email aur Type dono bhejo bhai!" });
    }

    const student = await Student.findOne({ email });

    // --- CASE 1: FORGET PASSWORD ---
    if (type === "forget") {
      if (!student) {
        return res.status(404).json({ message: "Bhai, ye email registered hi nahi hai. Pehle register karo!" });
      }
    }
    
    // --- CASE 2: REGISTRATION ---
    if (type === "register") {
      // Agar banda pehle se paid member hai, toh dobara register nahi karne denge
      if (student && student.isPaid) {
        return res.status(400).json({ message: "Ye email pehle se registered aur paid hai. Direct login karo." });
      }
      // Note: Agar student exists but isPaid: false hai, toh hum OTP bhejenge (Purana kachra saaf ho jayega register API mein)
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
 if (type === "forget" && student) {
  student.otp = otp;
  student.otpExpire = Date.now() + 5 * 60 * 1000; 
  await student.save();
}
    // NODEMAILER SETUP
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS // 
      }
    });

    await transporter.sendMail({
      from: `"AITS Placement Portal" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: type === "register" ? "Registration OTP - AITS" : "Reset Password OTP - AITS",
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd;">
          <h2>AITS Placement Portal</h2>
          <p>Aapka <b>${type === "register" ? "Registration" : "Password Reset"}</b> OTP niche diya gaya hai:</p>
          <h1 style="color: #007bff;">${otp}</h1>
          <p>Ye OTP 5 minutes ke liye valid hai.</p>
        </div>
      `
    });

   
    res.json({ message: "OTP sent to email", tempOtp: otp }); 

  } catch (err) {
    console.log("🔥 OTP ERROR:", err);
   
    if (err.code === 'EAUTH') {
        return res.status(500).json({ message: "Gmail Auth Fail: App Password check karo .env mein!" });
    }
    return res.status(500).json({ message: err.message });
  }
};
// ======================
// VERIFY OTP 
// ======================
const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const student = await Student.findOne({ email });

    if (!student) {
      return res.status(404).json({ message: "User not found" });
    }

    if (student.otp !== otp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    if (student.otpExpire < Date.now()) {
      return res.status(400).json({ message: "OTP expired" });
    }

    res.json({ message: "OTP verified successfully", success: true });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


// ======================
// RESET PASSWORD WITH OTP
// ======================
const reset = async (req, res) => {
  try {
    const { email, otp, password } = req.body;

    console.log("--- Reset Attempt for:", email, "---");

    const student = await Student.findOne({ email });

    if (!student) {
      return res.status(404).json({ message: "User not found" });
    }

    // 2. OTP Check (Security)
    if (student.otp !== otp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    // 3. Expiry Check
    if (student.otpExpire < Date.now()) {
      return res.status(400).json({ message: "OTP expired" });
    }

    // 4. Password Hash karein
    const hashedPassword = await bcrypt.hash(password, 10);

    
    await Student.findOneAndUpdate(
      { email: email },
      { 
        $set: { password: hashedPassword }, 
        $unset: { otp: 1, otpExpire: 1 } 
      },
      { runValidators: false, new: true } 
    );

    console.log("✅ Password reset successful for:", email);

    res.json({ message: "Password reset successful" });

  } catch (err) {
    console.log("🔥 RESET PASSWORD ERROR:", err);
    return res.status(500).json({
      message: "Reset fail: " + err.message
    });
  }
};

module.exports = {
  registerStudent,
  loginStudent,
  getProfile,
  sendOTP,
  reset,
  verifyOTP,
};