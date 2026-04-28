const express = require("express");
const router = express.Router();

// Middlewares
const { auth, isAdminOrHOD } = require("../middlewares/auth.middleware");
const upload = require("../middlewares/upload.middleware"); 

// Controllers
const { 
    adminLogin, addNotice, getAllNotices, deleteNotice,
    getPendingStudents, approveStudent, getPendingCompanies,
    approveCompany, getStats, exportWholeSystemData, getStudentsByRole
} = require("../controllers/admin.controller");

const { 
    createHOD, getAllHODs, updateHOD, deleteHOD,
    HODlogin, updateStudentData, getStudentForHOD
} = require('../controllers/hod.controller');

// --- Public Routes ---
router.post("/login", adminLogin);
router.post('/hod-login', HODlogin);

// --- Notices Routes ---
router.post("/add-notice", auth, isAdminOrHOD, addNotice);
router.get("/notices",  getAllNotices);
router.delete("/delete-notice/:id", auth, isAdminOrHOD, deleteNotice);

//Approve company
router.get("/pending-companies", getPendingCompanies);
router.patch("/approve-company/:id", approveCompany);

// Approve students
router.get("/pending-students",  getPendingStudents);
router.patch("/approve-student/:id", approveStudent);

// Stats & Export
router.get("/stats", getStats);
router.get('/export-all-data',auth, exportWholeSystemData);

// HOD Management
router.post('/create-hod', createHOD); 
router.get('/get-all-hods', getAllHODs);
router.patch('/update-hod/:id', updateHOD);
router.delete('/delete-hod/:id', deleteHOD);

// --- Student Data Access (FIXED HERE) ---

// 🚨 1. UPDATE DETAILS: Yahan zaroori tha Multer middleware
router.patch('/update-details/:id', 
    auth, 
    isAdminOrHOD, 
    upload.fields([
        { name: "resume", maxCount: 1 },
        { name: "profilePicture", maxCount: 1 }
    ]), 
    updateStudentData
);


router.get('/student-detail/:id', auth, isAdminOrHOD, getStudentForHOD);
router.get('/students-dashboard-data', auth, isAdminOrHOD, getStudentsByRole);

module.exports = router;