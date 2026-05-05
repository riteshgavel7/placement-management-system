const nodemailer = require("nodemailer");


const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587, // Changed from 25 to 587 (Standard for TLS)
    secure: false, 
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    },
    tls: {
      rejectUnauthorized: false
    }
});


const sendEmail = async (email, subject, html) => {
    const mailOptions = {
        from: `"Placement Cell" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: subject,
        html: html
    };

    return await transporter.sendMail(mailOptions);
};


module.exports = sendEmail;