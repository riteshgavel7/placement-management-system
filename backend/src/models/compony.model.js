const mongoose = require("mongoose");

const companySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },

    email: { type: String, required: true, unique: true },

    password: { type: String, required: true ,select: true},

    companyName: { type: String },

    location: { type: String },

    website: { type: String },

    description: { type: String },
 
       otp: String,
    otpExpiry: Date,

    role: {
      type: String,
      default: "company",
    },
    status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'], 
    default: 'pending',
},

    isVerified: {
      type: Boolean,
      default: false,
    },
  
  },
  { timestamps: true }
);

module.exports = mongoose.model("Company", companySchema);