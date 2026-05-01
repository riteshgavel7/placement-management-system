exports.sendMail = async (to, subject, text) => {
  try {
    const transporter = nodemailer.createTransport({
      // smtp.gmail.com ka use karein lekin port 587 ke saath
      host: "smtp.gmail.com",
      port: 587,
      secure: false, // 587 ke liye hamesha false
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      },
      tls: {
        // Render ke network par handshake issues se bachne ke liye
        rejectUnauthorized: false,
        minVersion: "TLSv1.2"
      },
      family: 4 // IPv4 ko force karne ke liye
    });

    const info = await transporter.sendMail({
      from: `"Placement Portal" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text
    });

    console.log("✅ Email sent successfully: " + info.messageId);
    return info;
  } catch (error) {
    console.error("🔥 OTP ERROR:", error);
    throw new Error("Email service failed");
  }
};