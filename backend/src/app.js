const express = require("express");
const cors = require("cors");
const path = require("path");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const Analytics = require("./routes/analytics.route");
const studentRoutes = require("./routes/student.route");
const jobRoutes = require("./routes/job.route");
const companyRoutes = require("./routes/company.route");
const aiRoutes = require("./routes/ai.route");
const adminRoutes = require("./routes/admin.route");
const paymentRoutes = require('./routes/payment.route');

const app = express();

app.use(express.json());
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        "default-src": ["'self'"],
        "img-src": ["'self'", "data:", "https://placement-management-system-etjs.onrender.com", "https://placement-management-system-tau.vercel.app"],
        "connect-src": ["'self'", "https://placement-management-system-etjs.onrender.com"],
        "script-src": ["'self'", "'unsafe-inline'"],
        "style-src": ["'self'", "'unsafe-inline'"],
      },
    },
  })
);

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
  })
);

app.use(cors({ 
  origin: "https://placement-management-system-tau.vercel.app", 
  credentials: true 
}));

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use("/api/ai", aiRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/company", companyRoutes);
app.use("/api/analytics", Analytics);
app.use("/api/admin", adminRoutes);
app.use('/api/payment', paymentRoutes);

app.get("/", (req, res) => {
  res.json({ 
    status: "success",
    message: "Placement Management System API is live... 🚀" 
  });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    message: "Something went wrong!",
    error: err.message,
  });
});

module.exports = app;