const Job = require("../models/job.model");
const Student = require("../models/student.model");
const axios = require("axios");
const nodemailer = require("nodemailer");
const { extractText } = require("../services/resume.service");
const { analyzeResume } = require("../services/groq.service");

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const sendEmail = require("../services/resent.service");

exports.aiShortlist = async (req, res) => {
  try {
    const { jobId } = req.params;
    const job = await Job.findById(jobId).populate('applicants.student');
    
    if (!job) return res.status(404).json({ message: "Job not found" });
    if (req.user.role !== "admin") return res.status(403).json({ message: "Admin access required" });

    const results = [];
    const BATCH_SIZE = 5; 
    const pendingApplicants = job.applicants.filter(app => app.status === 'pending' && app.student?.resume);

    for (let i = 0; i < pendingApplicants.length; i += BATCH_SIZE) {
      const batch = pendingApplicants.slice(i, i + BATCH_SIZE);
      
      await Promise.all(batch.map(async (applicant) => {
        try {
          const response = await axios.get(applicant.student.resume, { responseType: 'arraybuffer', timeout: 10000 });
          const resumeText = await extractText(new Uint8Array(response.data)); 
          const aiResult = await analyzeResume(resumeText, job, applicant.student);
          
          const score = aiResult.score || 0;
          const finalStatus = score >= 65 ? "selected" : "rejected";
          
          // AI ka detailed reason yahan capture ho raha hai
          const rejectionReason = finalStatus === "rejected" ? (aiResult.reason || "ATS score below threshold") : null;

          const appIndex = job.applicants.findIndex(a => a._id.toString() === applicant._id.toString());
          if (appIndex !== -1) {
            job.applicants[appIndex].status = finalStatus;
            job.applicants[appIndex].score = score;
          }

          await Student.updateOne(
            { _id: applicant.student._id, "appliedJobs.job": jobId },
            { $set: { "appliedJobs.$.status": finalStatus } }
          );

          await exports.sendNotificationEmail(applicant.student, job, score, finalStatus, rejectionReason);
          results.push({ name: applicant.student.name, score, status: finalStatus });

        } catch (err) {
          console.error(`❌ Error with ${applicant.student.name}:`, err.message);
          results.push({ name: applicant.student.name, status: "failed", error: err.message });
        }
      }));

      if (i + BATCH_SIZE < pendingApplicants.length) await sleep(2000); 
    }

    job.markModified('applicants');
    await job.save();
    res.json({ success: true, totalProcessed: results.length, results });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.sendNotificationEmail = async (student, job, score, status, rejectionReason = "") => {
    try {
        const isSelected = status === "selected";
        
        // Professional Design Templates
        const interviewTemplate = `
            <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
                <div style="background-color: #1a73e8; padding: 20px; text-align: center; color: white;">
                    <h1 style="margin: 0; font-size: 24px;">Interview Invitation</h1>
                </div>
                <div style="padding: 30px; line-height: 1.6;">
                    <p>Dear <strong>${student.name}</strong>,</p>
                    <p>Congratulations! Your ATS score is <strong>${score}/100</strong>. You've been shortlisted for the <strong>${job.title}</strong> role at <strong>${job.companyName}</strong>.</p>
                    <div style="background-color: #f8f9fa; padding: 15px; border-left: 4px solid #1a73e8; margin: 20px 0;">
                        <p style="margin: 0;"><strong>Position:</strong> ${job.title}</p>
                        <p style="margin: 0;"><strong>Package:</strong> ${job.package} LPA</p>
                    </div>
                    <p>Our HR team will contact you soon for scheduling. Please check your student portal for updates.</p>
                    <p style="font-size: 12px; color: #777; margin-top: 30px;">Best Regards,<br>Placement Cell</p>
                </div>
            </div>`;

        const rejectionTemplate = `
            <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
                <div style="background-color: #d93025; padding: 20px; text-align: center; color: white;">
                    <h1 style="margin: 0; font-size: 24px;">Application Update</h1>
                </div>
                <div style="padding: 30px; line-height: 1.6;">
                    <p>Dear <strong>${student.name}</strong>,</p>
                    <p>Thank you for your interest in the <strong>${job.title}</strong> position at <strong>${job.companyName}</strong>.</p>
                    <p>After AI-based screening, we regret to inform you that we won't be moving forward with your application.</p>
                    <div style="background-color: #fce8e6; padding: 15px; border-left: 4px solid #d93025; margin: 20px 0;">
                        <p style="margin: 0; color: #b00020;"><strong>Feedback:</strong> ${rejectionReason}</p>
                    </div>
                    <p style="font-size: 14px; background-color: #f8f9fa; padding: 10px;">
                        <i>Note: If you have relevant proof of qualifications, contact your HOD for manual verification.</i>
                    </p>
                    <p style="margin-top: 30px; font-size: 12px; color: #777;">Best Regards,<br>Placement Cell</p>
                </div>
            </div>`;

        await sendEmail(
  student.email,
  isSelected ? "📢 Interview Shortlist Invitation" : "Update on your Application",
  isSelected ? interviewTemplate : rejectionTemplate
);
    } catch (e) {
        console.log("❌ Email Error:", e.message);
    }
};