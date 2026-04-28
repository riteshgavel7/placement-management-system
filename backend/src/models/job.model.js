const mongoose = require("mongoose");

const jobSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    companyName: { type: String, required: true, trim: true },
    location: { type: String, default: "Not specified" },
    minCGPA: { type: Number, default: 0 },
    department: { type: [String], default: [] },
    package: { type: Number, default: 0 },
    description: { type: String, default: "" },

    postedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Company", 
      },
    ],

    applicants: [
      {
        student: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Student",
          required: true,
        },
        status: {
          type: String,
          enum: ["pending", "selected", "rejected"],
          default: "pending",
        },
        score: { type: Number, default: 0 },
        appliedAt: { type: Date, default: Date.now },
      },
    ],

    deadline: { type: Date, default: null },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Job", jobSchema);