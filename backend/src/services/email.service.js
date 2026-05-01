exports.sendMail = async (to, subject, text) => {
  try {
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true, 
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      },
      family: 4 
    });

    const info = await transporter.sendMail({
      from: `"Placement Portal" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text
    });
    
    console.log("Email sent: " + info.messageId);
    return info;
  } catch (error) {
    console.error("Nodemailer Error: ", error);
    throw new Error("Email service failed");
  }
};