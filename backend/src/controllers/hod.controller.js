const HOD = require('../models/HOD.model');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const Student = require('../models/student.model');
const imagekit = require("../services/upload.service");



// --- HOD MANAGEMENT CONTROLLER ---



// 1. Create HOD
const createHOD = async (req, res) => {
    try {
        const { name, email, password, department } = req.body;
        const existingHOD = await HOD.findOne({ email });
        if (existingHOD) return res.status(400).json({ message: "HOD already exists!" });

        const hashedPassword = await bcrypt.hash(password, 10);
        const newHOD = new HOD({ name, email, password: hashedPassword, department });

        await newHOD.save();
        res.status(201).json({ message: "HOD Created successfully!" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// 2. Get All HODs (List dikhane ke liye)
const getAllHODs = async (req, res) => {
    try {
        const hods = await HOD.find().select('-password'); 
        res.json(hods);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// 3. Update HOD

const updateHOD = async (req, res) => {
    try {
        const { id } = req.params;
        let data = req.body;

        
        if (data.password) data.password = await bcrypt.hash(data.password, 10);
        else delete data.password;

        const updatedHOD = await HOD.findByIdAndUpdate(id, data, { returnDocument: 'after' });

        if (!updatedHOD) return res.status(404).json({ message: "HOD not found!" });
        res.json({ message: "HOD Updated!", data: updatedHOD });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// 4. Delete HOD
const deleteHOD = async (req, res) => {
    try {
        const { id } = req.params;
        const deletedHOD = await HOD.findByIdAndDelete(id);

        if (!deletedHOD) return res.status(404).json({ message: "HOD not found!" });
        res.json({ message: "HOD account deleted!" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
// 5. HOD Login
    const HODlogin = async (req, res) => {
    try {
        const { email, password } = req.body;

        // 1. Check if HOD exists
        const hod = await HOD.findOne({ email });
        if (!hod) {
            return res.status(404).json({ message: "HOD not found" });
        }

        // 2. Compare Password
        const isMatch = await bcrypt.compare(password, hod.password);
        if (!isMatch) {
            return res.status(401).json({ message: "Invalid password" });
        }

        // 3. Create JWT Token
        const token = jwt.sign(
            { id: hod._id, role: 'HOD', department: hod.department },
            process.env.JWT_SECRET,
            { expiresIn: '1d' } // 1 din tak login rahega
        );

            res.status(200).json({
            success: true,
            message: `Welcome back, ${hod.name}!`,
            token,
            hod: {
            id: hod._id,
            name: hod.name,
            email: hod.email,
            department: hod.department,
            role: 'HOD' 
    }
});

    } catch (err) {
        console.error("HOD Login Error:", err);
        res.status(500).json({ message: "Server error: " + err.message });
    }
};



const updateStudentData = async (req, res) => {
    try {
        const { id } = req.params;
        const { role } = req.user; 
        
        // 1. Pehle Student ko dhundo
        const student = await Student.findById(id);
        if (!student) return res.status(404).json({ message: "Student not found" });

        // 2. Data handle karo (Body se text lo)
        let updates = { ...req.body }; 
        const currentEnrollment = updates.enrollmentNo || student.enrollmentNo;

        // 3. 🚀 PEHLE FILE UPLOAD (Priority 1)
        if (req.files) {
            // Check Resume
            if (req.files.resume && req.files.resume.length > 0) {
                const resumeUpload = await imagekit.upload({ 
                    file: req.files.resume[0].buffer, 
                    fileName: `RES_${currentEnrollment}_${Date.now()}.pdf`, 
                    folder: "/resumes" 
                });
                // Yahan manual text ko link se replace kar rahe hain
                updates.resume = resumeUpload.url; 
            }
            
            // Check Photo
            if (req.files.profilePicture && req.files.profilePicture.length > 0) {
                const profileUpload = await imagekit.upload({ 
                    file: req.files.profilePicture[0].buffer, 
                    fileName: `PIC_${currentEnrollment}_${Date.now()}.jpg`, 
                    folder: "/profilePictures" 
                });
                updates.profilePicture = profileUpload.url; 
            }
        }

        // 4. Role based data update
        if (role === 'HOD') {
            if (student.hodEditCount >= 2) return res.status(403).json({ message: "Limit exceeded" });

            const allowedFields = ['name', 'mobile', 'rollNo', 'enrollmentNo', 'twelfthMarks', 'twelfthPassingYear', 'gender','isVerified'];

            // Text fields update
            allowedFields.forEach(field => {
                if (updates[field] !== undefined && updates[field] !== "") {
                    
                    
                    if (field === 'isVerified') {
                        student[field] = (updates[field] === 'true' || updates[field] === true);
                    } else {
                        student[field] = updates[field];
                    }
                    
                }
            });

            if (updates.resume && updates.resume.startsWith("http")) {
                student.resume = updates.resume;
            }
            if (updates.profilePicture && updates.profilePicture.startsWith("http")) {
                student.profilePicture = updates.profilePicture;
            }

            student.status = 'verifiedbyhod';
            student.hodEditCount += 1; 
        } 
        else if (role === 'admin') {
            Object.assign(student, updates);
        }

        // 5. Save & Response
        await student.save();
        
        const result = student.toObject();
        delete result.password; // Security

        res.status(200).json({ success: true, message: "Updated!", data: result });

    } catch (err) {
        console.error("Backend Error:", err);
        res.status(500).json({ message: "Update fail: " + err.message });
    }
};

// --- GET FULL DETAILS (HOD & ADMIN) ---
const getStudentForHOD = async (req, res) => {
    try {
        let filter = {}; 

        if (req.user.role === 'HOD') {
            filter.department = req.user.department; 
        } 
        
        const students = await Student.find(filter)
            .select("-password -otp -otpExpire")
            .sort({ createdAt: -1 });

        res.status(200).json(students);

    } catch (err) {
        res.status(500).json({ 
            success: false,
            message: "Data fetch fail: " + err.message 
        });
    }
};


module.exports = { createHOD, getAllHODs, updateHOD, deleteHOD, HODlogin, updateStudentData, getStudentForHOD };