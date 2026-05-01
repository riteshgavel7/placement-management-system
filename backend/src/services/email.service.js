const nodemailer = require("nodemailer");

exports.sendMail = async (to, subject, text) => {
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false, 
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    },
    family: 4 
  });

  await transporter.sendMail({
    from: `"Placement Portal" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    text
  });
};