const Job = require("../models/job.model");
const Student = require("../models/student.model");


// ======================
// CREATE JOB
// ======================
const createJob = async (req, res) => {
  try {
    const job = await Job.create({
      title: req.body.title,
      companyName: req.body.companyName, 
      location: req.body.location,
      minCGPA: req.body.minCGPA,
      department: req.body.department,
      package: req.body.package,
      description: req.body.description,
      deadline: req.body.deadline,
      postedBy: [req.user.id],
      isActive: true,
    });

    res.status(201).json({
      message: "Job created successfully",
      job,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error creating job",
      error: error.message,
    });
  }
};


// ======================
// APPLY JOB
// ======================
const applyJob = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { jobId } = req.body;

    if (!jobId) {
      return res.status(400).json({ message: "jobId required" });
    }

    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }

    if (!job.isActive) {
      return res.status(400).json({ message: "Job closed" });
    }
    if (new Date() > new Date(job.deadline)) {
      return res.status(400).json({ message: "Deadline over" });
    }

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    const alreadyApplied = job.applicants.some(
      (a) => a.student.toString() === studentId
    );

    if (alreadyApplied) {
      return res.status(400).json({ message: "Already applied" });
    }


    job.applicants.push({
      student: studentId,
      status: "pending",
    });

    await job.save();

    return res.status(200).json({
      message: "Applied successfully",
    });

  } catch (error) {
    return res.status(500).json({
      message: "Error applying job",
      error: error.message,
    });
  }
};


// ======================
// GET ALL JOBS
// ======================

const mongoose = require("mongoose");

const getAllJobs = async (req, res) => {
  try {
    const { role, id, department } = req.user;
    let query = {};

   
    if (role === "company") {
      query = { postedBy: new mongoose.Types.ObjectId(id) };
    } 
    
    else if (role === "student" || role === "HOD") {
      if (!department) {
        return res.status(400).json({ success: false, message: "Student department not found in token" });
      }
      const departmentRegex = new RegExp(`^${department}$`, "i");
      query = { 
    department: { $in: [departmentRegex] } 
      };
    } 
    
    else if (role === "admin") {
      query = {};
    }

    const jobs = await Job.find(query).sort({ createdAt: -1 });

    return res.status(200).json({ 
      success: true, 
      count: jobs.length,
      jobs: jobs || [] 
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};



// ======================
// GET APPLICANTS
// ======================
const getApplicants = async (req, res) => {
  try {
    const job = await Job.findById(req.params.jobId).populate(
      "applicants.student",
      "name email mobile resume profilePicture"
    );

    if (!job) return res.status(404).json({ message: "Job not found" });

    // ✅ Roles fetch karo
    const userRole = req.user.role.toLowerCase();
    const userId = req.user.id || req.user._id;
    const isOwner = job.postedBy.map(id => id.toString()).includes(userId.toString());

    // 🔥 MAIN FIX: HOD ko yahan allow karo
    if (userRole !== "admin" && userRole !== "hod" && !isOwner) {
      return res.status(403).json({ message: "Access Denied: Permission not available" });
    }

    res.status(200).json({
      job: { id: job._id, title: job.title, companyName: job.companyName },
      applicants: job.applicants,
    });
  } catch (error) {
    res.status(500).json({ message: "Error", error: error.message });
  }
};

// ======================
// UPDATE STATUS
// ======================
/*const updateStatus = async (req, res) => {
  try {
    const { jobId, studentId, status } = req.body;

    const allowed = ["pending", "selected", "rejected"];

    if (!allowed.includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    if (!jobId || !studentId) {
      return res.status(400).json({ message: "jobId and studentId required" });
    }

    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }

    const applicant = job.applicants.find(
      (a) => a?.student && a.student.toString() === studentId
    );

    if (!applicant) {
      return res.status(404).json({ message: "Applicant not found" });
    }

    applicant.status = status;

    await job.save();

    return res.status(200).json({
      message: "Status updated",
    });

  } catch (error) {
    return res.status(500).json({
      message: "Error updating status",
      error: error.message,
    });
  }
};  */


//======================
// GET APPLIED JOBS
// ======================
const getAppliedJobs = async (req, res) => {
  try {
    const studentId = req.user.id;

    const jobs = await Job.find({
      "applicants.student": studentId
    });

    const result = jobs.map((job) => {
      const application = job.applicants.find(
        (a) => a.student.toString() === studentId
      );

      return {
        jobId: job._id,
        title: job.title,
        companyName: job.companyName,
        package: job.package,
        location: job.location,
        status: application ? application.status : null,
      };
    });

    return res.status(200).json({
      count: result.length,
      jobs: result,
    });

  } catch (error) {
    return res.status(500).json({
      message: "Error fetching applied jobs",
      error: error.message,
    });
  }
};



// ======================
// EXPORT
// ======================
module.exports = {
  createJob,
  applyJob,
  getAllJobs,
  getApplicants,
  getAppliedJobs,
};