const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 25, 
    secure: false, 
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    },
    tls: {
      rejectUnauthorized: false
    },
    family: 4
});