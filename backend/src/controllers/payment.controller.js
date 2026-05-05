const razorpay = require('../config/razorpay');
const crypto = require('crypto');
const Student = require('../models/student.model');
const mongoose = require('mongoose'); // Validation ke liye

// 1. Order Create 
const createOrder = async (req, res) => {
    try {
        const { email, enrollmentNo, rollNo } = req.body;
        const amount = 50; 

        const existingStudent = await Student.findOne({ 
            $or: [
                { email: email?.trim().toLowerCase() }, 
                { enrollmentNo: enrollmentNo?.trim().toUpperCase() }, 
                { rollNo: rollNo }
            ],
            isPaid: true 
        });
        
        if (existingStudent) return res.status(400).json({ message: "Student already exists" });

        if (amount === 0) {
            return res.status(200).json({ 
                isFree: true, 
                amount: 0, 
                id: `free_${Date.now()}`,
                message: "Free registration" 
            });
        }

        const order = await razorpay.orders.create({
            amount: amount * 100, 
            currency: "INR",
            receipt: `rcpt_${Date.now()}`
        }); 

        res.status(200).json({ ...order, isFree: false });

    } catch (err) {
        console.error("Order Error:", err);
        res.status(500).json({ message: "Payment initialization failed." });
    }
};
// 2. Verify & Update DB
const verifyPayment = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, userId } = req.body;

        // 🛡️ ID Validation
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ message: "Invalid User ID format!" });
        }

        // 🛡️ Signature Verification
        const shasum = crypto.createHmac('sha256', process.env.RAZORPAY_SECRET)
                             .update(`${razorpay_order_id}|${razorpay_payment_id}`)
                             .digest('hex');

        if (shasum !== razorpay_signature) {
            return res.status(400).json({ status: "failure", message: "Invalid Signature (Possible Fraud)" });
        }

        // 🚀 SUCCESS: Update Student Profile
        const updatedStudent = await Student.findByIdAndUpdate(
            userId, 
            { 
                isPaid: true, 
                paymentId: razorpay_payment_id,
                // status: 'paid' // Agar tum status tracking kar rahe ho
            },
            { new: true }
        );

        if (!updatedStudent) {
            return res.status(404).json({ message: "Student record not found in DB!" });
        }

        return res.status(200).json({ 
            status: "success", 
            message: "Payment Verified & Profile Updated ✅",
            data: updatedStudent 
        });

    } catch (err) {
        console.error("Verification Error:", err);
        res.status(500).json({ message: "Internal Server Error during verification." });
    }
};

module.exports = { createOrder, verifyPayment };