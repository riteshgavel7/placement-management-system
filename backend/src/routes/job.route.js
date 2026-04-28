const express = require("express");
const router = express.Router();

const { auth, isCompany,isStudent, isAdminOrHOD } = require("../middlewares/auth.middleware");


const jobController = require("../controllers/job.controller");

// company create job
router.post("/create", auth, isCompany, jobController.createJob);

// student apply
router.post("/apply", auth, isStudent, jobController.applyJob);

// all jobs
router.get("/all", auth, jobController.getAllJobs);

// company view applicants
router.get("/:jobId/applicants", auth, jobController.getApplicants);

// company update status
//router.patch("/status", auth, isCompany, jobController.updateStatus);

// student get applied jobs
router.get("/applied", auth, isStudent, jobController.getAppliedJobs);

module.exports = router;