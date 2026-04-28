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
app.use(helmet());

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
  })
);

/* MIDDLEWARE */
app.use(cors({ origin: "*" }));


/* FRONTEND  */
app.use(express.static(path.join(__dirname, "../frontend")));

/* UPLOADS */
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

/* API ROUTES */

app.use("/api/ai", aiRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/company", companyRoutes);
app.use("/api/analytics", Analytics);
app.use("/api/admin", adminRoutes);
app.use('/api/payment', paymentRoutes);

/* DEFAULT ROUTE  */
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/index.html"));
});

/* ERROR HANDLER */
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    message: "Something went wrong!",
    error: err.message,
  });
});


module.exports = app;