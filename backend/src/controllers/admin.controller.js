const Admin = require("../models/admin.model");
const Notice = require("../models/notice.model");
const Student = require("../models/student.model");
const Company = require("../models/compony.model");
const Job = require("../models/job.model");
const ExcelJS = require("exceljs");
const Application = require("../models/application.model");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const fs = require("fs");




// -----------------------------MULTER CONFIGURATION (File Storage Logic) --------------------------//

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = "src/uploads/notices/";
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + "-" + file.originalname);
    }
});

const upload = multer({ 
    storage: storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype === "application/pdf") {
            cb(null, true);
        } else {
            cb(new Error("Sirf PDF files allowed hain!"), false);
        }
    }
}).single("noticePdf"); 


// ------------------------------------ ADMIN LOGIN -----------------------------------//

const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    const admin = await Admin.findOne({ email });
    if (!admin) return res.status(404).json({ message: "Admin not found" });

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid Credentials" });

    const token = jwt.sign({ id: admin._id, role: "admin" }, process.env.JWT_SECRET, { expiresIn: "1d" });

    res.json({
      message: "Admin Welcome! Login Success",
      token,
      admin: { username: admin.username, email: admin.email, role: admin.role }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


// ------------------- 1. Naya Notice  ----------------------//

const addNotice = (req, res) => {
    upload(req, res, async (err) => {
        if (err) return res.status(400).json({ message: err.message });

        try {
            const { title, description, category } = req.body;
            
            const newNotice = new Notice({ 
                title, 
                description, 
                category,
                pdfPath: req.file ? `/uploads/notices/${req.file.filename}` : null 
            });

            await newNotice.save();
            res.status(201).json({ message: "Notice posted successfully " });
        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    });
};


// ------------------- 2. Saare Notices fetch karna ----------------------//
const getAllNotices = async (req, res) => {
    try {
        const notices = await Notice.find().sort({ createdAt: -1 });
        res.json(notices);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};


// ------------------- 3. Notice Delete karna ----------------------//
const deleteNotice = async (req, res) => {
    try {
        await Notice.findByIdAndDelete(req.params.id);
        res.json({ message: "Notice deleted!" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// get pending students 
const getPendingStudents = async (req, res) => {
    try {
        const { department } = req.query;
        let filter = { 
            status: { $in: ["pending", "verifiedbyhod"] } 
        };
        
        if (department) filter.department = department;

        const students = await Student.find(filter).select("-password").sort({ createdAt: -1 });
        res.json(students);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// ------------------- 2. Approve ya Reject logic  ----------------------//
const approveStudent = async (req, res) => {
    try {
        const { id } = req.params;
        const { action } = req.body;

        console.log(`Backend Request -> ID: ${id}, Action: ${action}`);

        let updateData = {};
        if (action === 'approve') {
            updateData = { isVerified: true, status: 'approved' };
        } else if (action === 'reject') {
            updateData = { isVerified: false, status: 'rejected' };
        } else {
            return res.status(400).json({ message: "Invalid Action" });
        }

        // Structure bilkul same hai, bas option badla hai warning ke liye
        const student = await Student.findByIdAndUpdate(
            id, 
            { $set: updateData }, 
            { 
                returnDocument: 'after', 
                runValidators: true 
            } 
        );

        if (!student) {
            console.log("Student not found in database");
            return res.status(404).json({ message: "Student not found" });
        }

        console.log("Database Updated Successfully:", student.status);

        res.json({ 
            message: `Student successfully ${updateData.status}!`, 
            status: updateData.status 
        });
    } catch (err) {
        console.error("Controller Error:", err.message);
        res.status(500).json({ message: err.message });
    }
};

// ==================== GET PENDING COMPANIES =====================//

const getPendingCompanies = async (req, res) => {
    try {
        // Ab Node ko pata hai ki 'Company' kya hai
        const companies = await Company.find({ isVerified: false });
        res.json(companies);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

const approveCompany = async (req, res) => {
    try {
        const { id } = req.params;
        const { action } = req.body; 

        const isVerified = action === 'approve';
        
        const company = await Company.findByIdAndUpdate(
            id, 
            { isVerified }, 
            { returnDocument: 'after' } 
        );

        res.json({ message: `Company ${isVerified ? 'Approved' : 'Rejected'}!` });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// ============================== DASHBOARD STATS ==================================//
const getStats = async (req, res) => {
    try {
        const [studentStats, totalCompanies] = await Promise.all([
            Student.aggregate([
                {
                    $group: {
                        _id: null,
                        totalStudents: { $sum: 1 },
                        pendingStudents: {
                            $sum: { $cond: [{ $eq: ["$isVerified", false] }, 1, 0] }
                        },
                        placedStudents: {
                            $sum: { $cond: [{ $eq: ["$status", "placed"] }, 1, 0] }
                        }
                    }
                },
                {
                    $project: { _id: 0 } // 🔥 remove _id
                }
            ]),
            Company.countDocuments()
        ]);

        const chartData = await Student.aggregate([
            
            {
                $group: {
                    _id: { $ifNull: ["$department", "Unknown"] }, 
                    count: { $sum: 1 }
                }
            },
             {
        $project: {
            _id: 0,
            department: "$_id",
            count: 1
        }
    }
        ]);
       
      

        const stats = studentStats[0] || {
            totalStudents: 0,
            pendingStudents: 0,
            placedStudents: 0
        };

        res.json({
            stats: {
                ...stats,
                totalCompanies
            },
            chartData           
        });

    } catch (err) {
        res.status(500).json({ message: "Server Error" });
    }
};


// ====================== EXPORT ALL DATA (Excel Report) ======================

const exportWholeSystemData = async (req, res) => {
    try {
        if (req.user.role !== "admin") {
            return res.status(403).json({ message: "Admin access required" });
        }

        const jobs = await Job.find();
        const wb = new ExcelJS.Workbook();
        const ws = wb.addWorksheet('Placement Summary');

       
        ws.addRow([
            "Job Title", 
            "Company", 
            "Package (LPA)", 
            "Min CGPA", 
            "Total Applied", 
            "Selected", 
            "Rejected", 
            "Pending"
        ]);
        
       
        const headerRow = ws.getRow(1);
        headerRow.font = { bold: true };
        headerRow.alignment = { horizontal: 'left' };

        jobs.forEach(job => {
            const total = job.applicants.length;
            const selected = job.applicants.filter(a => a.status === "selected").length;
            const rejected = job.applicants.filter(a => a.status === "rejected").length;
            const pending = total - (selected + rejected);

            const row = ws.addRow([
                job.title || "N/A",
                job.companyName || "N/A",
                job.package || 0,       
                job.minCGPA || 0,      
                total,
                selected,
                rejected,
                pending
            ]);

            
            row.eachCell((cell) => {
                cell.alignment = { horizontal: 'left' };
            });
        });

        
        ws.columns.forEach(column => { column.width = 20; });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=GGV_Placement_Report.xlsx');

        await wb.xlsx.write(res);
        res.end();

    } catch (err) {
        console.error("Export Error:", err);
        res.status(500).json({ message: "Server error" });
    }
};
 // ====================== GET STUDENTS BY ROLE (Admin/HOD) ======================
 
const getStudentsByRole = async (req, res) => {
    try {
        const { role, department } = req.user; 
        let query = {};

       
        if (role === 'admin') {
            query = {}; 
        } else if (role === 'HOD') {
            query = { department: department }; 
        } else {
            return res.status(403).json({ message: "Access Denied!" });
        }

       
        const students = await Student.find(query)
            .select('-password -otp -otpExpire -profilePicture -__v');

        res.status(200).json(students);
    } catch (err) {
        res.status(500).json({ message: "Server Error: " + err.message });
    }
};


module.exports = { adminLogin, addNotice, getAllNotices, deleteNotice, getPendingStudents, approveStudent, getPendingCompanies, approveCompany, getStats, exportWholeSystemData,getStudentsByRole };