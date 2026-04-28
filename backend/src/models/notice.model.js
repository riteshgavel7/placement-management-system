const mongoose = require("mongoose");

const noticeSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    category: { type: String, enum: ['Placement', 'Exam', 'General'], default: 'Placement' },
    pdfPath: { type: String }, 
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Notice", noticeSchema);