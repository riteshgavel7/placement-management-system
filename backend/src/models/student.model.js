const mongoose = require("mongoose");

const studentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true }, 
  password: { type: String, required: true },
  mobile: { type: String , required: true },
  enrollmentNo: { type: String, required: true }, 
  rollNo: { type: String, required: true },
  department: { type: String, required: true }, 
  batch: { type: String, required: true },     
  course: { type: String, required: true },    
  isVerified: { type: Boolean, default: false },
  twelfthMarks: { type: Number },
  twelfthPassingYear: { type: String },
  gender: { type: String, enum: ['Male', 'Female', 'Other'] },
  isPaid: { type: Boolean, default: false }, 
  paymentId: { type: String ,default: null }, 
  status: {
    type: String,
    enum: ['pending', 'verifiedbyhod', 'approved', 'rejected', 'placed'], 
    default: 'pending'
},
  resume: { type: String, required: true },
  profilePicture: { type: String, required: true },

  otp: { type: String },
  otpExpire: { type: Date },

  hodEditCount: { type: Number, default: 0 },
  isAdminApproved: { type: Boolean, default: false },
});


studentSchema.index({ email: 1 }, { unique: true, partialFilterExpression: { isPaid: true } });
studentSchema.index({ enrollmentNo: 1 }, { unique: true, partialFilterExpression: { isPaid: true } });

module.exports = mongoose.model("Student", studentSchema);