const router = require('express').Router();
const Job = require('../models/job.model');
const ExcelJS = require('exceljs');
const { auth } = require('../middlewares/auth.middleware');

// Analytics Data Fetch
router.get('/:jobId', auth, async (req, res) => {
  try {
    const job = await Job.findById(req.params.jobId);
    if (!job) return res.status(404).json({ message: "Job not found" });

    const userId = req.user.id || req.user._id; 
    const isOwner = job.postedBy.some(id => id.toString() === userId.toString());
    
    // ✅ Sabse safe check: Case insensitive (hod/HOD dono chalenge)
    const userRole = req.user.role.toLowerCase();
    const hasAccess = userRole === "admin" || userRole === "hod" || isOwner;

    if (!hasAccess) {
      return res.status(403).json({ message: "Access Denied! Permission nahi hai." });
    }

    const selectedList = job.applicants.filter(a => a.status === "selected");
    const rejectedList = job.applicants.filter(a => a.status === "rejected");

    res.json({
      jobTitle: job.title,
      totalApplicants: job.applicants.length,
      selected: selectedList.length,
      rejected: rejectedList.length,
      selectedList,
      rejectedList
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Excel Export (HOD ke liye fix kiya gaya)
router.get('/:jobId/excel', auth, async (req, res) => {
  try {
    const job = await Job.findById(req.params.jobId).populate('applicants.student', 'name email mobile');
    if (!job) return res.status(404).json({ message: "Job not found" });

    const userId = req.user.id || req.user._id;
    const isOwner = job.postedBy.some(id => id.toString() === userId.toString());

    // ✅ Excel mein bhi HOD ko permission di gayi
    const userRole = req.user.role.toLowerCase();
    const hasAccess = userRole === "admin" || userRole === "hod" || isOwner;

    if (!hasAccess) {
      return res.status(403).json({ message: "Access Denied! Excel download allowed nahi hai." });
    }

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Results');

    ws.addRow(["Name", "Email", "Mobile", "Score", "Status"]);

    job.applicants.forEach(a => {
      ws.addRow([
        a.student?.name || "N/A",
        a.student?.email || "N/A",
        a.student?.mobile || "N/A", 
        a.score || 0,
        a.status || "pending"
      ]);
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${job.title}_results.xlsx`);

    await wb.xlsx.write(res);
    res.end();
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;