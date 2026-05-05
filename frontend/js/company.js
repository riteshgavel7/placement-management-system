// ======================
// COMPANY AUTH SYSTEM
// ======================

const API_BASE = "http://localhost:3000/api";
let userEmail = "";

// -------------------- REGISTER ----------------------//

const registerForm = document.getElementById("registerForm");

if (registerForm) {
  registerForm.addEventListener("submit", async function (e) {
    e.preventDefault();

    const name = document.getElementById("name")?.value;
    const email = document.getElementById("email")?.value;
    const password = document.getElementById("password")?.value;
    const companyName = document.getElementById("companyName")?.value;
    const location = document.getElementById("location")?.value;
    const website = document.getElementById("website")?.value;
    const description = document.getElementById("description")?.value;

    try {
      const res = await fetch(`${API_BASE}/company/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          password,
          companyName,
          location,
          website,
          description
        })
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || "Registration failed");
        return;
      }

      alert("Registration successful!");
      window.location.href = "company-login.html";

    } catch (error) {
      console.log(error);
      alert("Server error!");
    }
  });
}


// ---------------------- LOGIN ----------------------//

const loginForm = document.getElementById("companyLoginForm");

if (loginForm) {
  loginForm.addEventListener("submit", async function (e) {
    e.preventDefault();

    const email = document.getElementById("email")?.value;
    const password = document.getElementById("password")?.value;
    const rememberMe = document.getElementById("check")?.checked;

    try {
      const res = await fetch(`${API_BASE}/company/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || "Login failed");
        return;
      }

      if (rememberMe) {
        localStorage.setItem("companyToken", data.token);
        localStorage.setItem("company", JSON.stringify(data.user));
      } else {
        sessionStorage.setItem("companyToken", data.token);
        sessionStorage.setItem("company", JSON.stringify(data.user));
      }

      window.location.href = "company-dashboard.html";

    } catch (error) {
      console.log(error);
      alert("Server not responding!");
    }
  });
}


// ---------------------------- GET TOKEN HELPER ---------------------------//


function getCompanyToken() {
  return (
    localStorage.getItem("companyToken") ||
    sessionStorage.getItem("companyToken")
  );
}

const getHeaders = () => ({
  "Authorization": `Bearer ${getCompanyToken()}`,
  "Content-Type": "application/json"
});


// 1. LOAD ALL JOBS
async function loadJobs() {
  const container = document.getElementById("jobsContainer");
  if (!container) return;

  const currentHeaders = getHeaders();

  try {
    const res = await fetch(`${API_BASE}/jobs/all`, { headers: currentHeaders });
    const data = await res.json();

    if (!data.jobs || data.jobs.length === 0) {
      container.innerHTML = "<p>No jobs found.</p>";
      return;
    }

    container.innerHTML = "";

    data.jobs.forEach(job => {
      const div = document.createElement("div");
      div.style = "border:1px solid #ddd; padding:15px; margin-bottom:15px; border-radius:8px; background:#fff;";

      div.innerHTML = `
        <h3 style="margin:0; color:#007BFF;">${job.title}</h3>
        <div style="display:grid; grid-template-columns:1fr 1fr; font-size:13px; margin:10px 0;">
          <span>📍 ${job.location}</span>
          <span>💰 ${job.package} LPA</span>
          <span>🎓 CGPA: ${job.minCGPA}</span>
          <span>📅 ${new Date(job.deadline).toLocaleDateString()}</span>
        </div>

        <p style="font-size:12px; color:#555;">📝 ${job.description}</p>

        <div style="display:flex; gap:10px;">
          <button onclick="openApplicants('${job._id}')">👥 Applicants</button>
          <button onclick="openAnalysis('${job._id}')">📊 Analyze</button>
        </div>
      `;

      container.appendChild(div);
    });

  } catch (err) {
    console.error(err);
    container.innerHTML = "<p>Server Error</p>";
  }
}


// ================= FIXED NAVIGATION =================
window.openApplicants = (jobId) => {
  localStorage.setItem("selectedJobId", jobId);
  localStorage.setItem("source", "company");
  window.location.href = "applicants.html";
};

window.openAnalysis = (jobId) => {
  localStorage.setItem("selectedJobId", jobId);
  localStorage.setItem("returnTo", "company-dashboard");
  window.location.href = "analysis.html";
};


// ================= VIEW APPLICANTS =================
window.viewApplicants = async (jobId) => {
  const container = document.getElementById("applicantsContainer");
  container.innerHTML = "<p>Loading...</p>";

  try {
    const res = await fetch(`${API_BASE}/jobs/${jobId}/applicants`, {
      headers: getHeaders()
    });

    const data = await res.json();

    if (!data.applicants?.length)
      return container.innerHTML = "<p>No applicants.</p>";

    container.innerHTML =
      `<h3>Applicants</h3>` +
      data.applicants.map(app => `
        <div style="border-left:4px solid #007BFF; padding:10px; background:#f9f9f9; margin-bottom:8px;">
          <b>${app.student.name}</b> | Score: ${app.score || 0}% | Status: ${app.status}
        </div>
      `).join("");

  } catch (err) {
    container.innerHTML = "<p>Error loading applicants</p>";
  }
};


// ================= ANALYZE JOB =================
window.analyzeJob = async (jobId) => {
  const container = document.getElementById("analysisResult");
  container.innerHTML = "Loading...";

  const token = getCompanyToken();

  try {
    const res = await fetch(`${API_BASE}/analytics/${jobId}`, {
      headers: { "Authorization": `Bearer ${token}` }
    });

    const data = await res.json();

    if (!res.ok) {
      container.innerHTML = data.message;
      return;
    }

    container.innerHTML = `
      <div>
        <h3>${data.jobTitle}</h3>
        <p>Total: ${data.totalApplicants}</p>
        <p>Selected: ${data.selected}</p>
        <p>Rejected: ${data.rejected}</p>
      </div>
    `;

  } catch (err) {
    container.innerHTML = "Error";
  }
};


// ================= STEP 1: SEND OTP =================
const emailForm = document.getElementById("emailForm");
const otpForm = document.getElementById("otpForm");

if (emailForm) {
  emailForm.addEventListener("submit", async function (e) {
    e.preventDefault();

    userEmail = document.getElementById("email").value;
    const submitBtn = e.target.querySelector("button");

    try {
      submitBtn.innerText = "Sending...";
      submitBtn.disabled = true;

      const res = await fetch(`${API_BASE}/company/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: userEmail })
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || "Error sending OTP");
        submitBtn.innerText = "Send OTP";
        submitBtn.disabled = false;
        return;
      }

      alert("OTP sent successfully to your email!");
      
      // Email form chhupao aur OTP form dikhao
      emailForm.style.display = "none";
      otpForm.style.display = "block";

    } catch (error) {
      console.error(error);
      alert("Server not responding!");
      submitBtn.innerText = "Send OTP";
      submitBtn.disabled = false;
    }
  });
}

// ================= STEP 2: RESET PASSWORD =================
if (otpForm) {
  otpForm.addEventListener("submit", async function (e) {
    e.preventDefault();

    const otp = document.getElementById("otp").value;
    const password = document.getElementById("newPassword").value;
    const submitBtn = e.target.querySelector("button");

    try {
      submitBtn.innerText = "Resetting...";
      submitBtn.disabled = true;

      const res = await fetch(`${API_BASE}/company/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
            email: userEmail, // Pehle step se save kiya hua email
            otp, 
            password 
        })
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || "Reset failed");
        submitBtn.innerText = "Reset Password";
        submitBtn.disabled = false;
        return;
      }

      alert("Password reset successful! Redirecting to login...");
      window.location.href = "company-login.html";

    } catch (error) {
      console.error(error);
      alert("Something went wrong!");
      submitBtn.innerText = "Reset Password";
      submitBtn.disabled = false;
    }
  });
}


// ================= LOGOUT =================
window.logout = () => {
  localStorage.clear();
  sessionStorage.clear();
  window.location.href = "company-login.html";
};

document.addEventListener("DOMContentLoaded", loadJobs);

// ================= CREATE JOB =================

const createJobForm = document.getElementById("createJobForm");

if (createJobForm) {
  createJobForm.addEventListener("submit", async function (e) {
    e.preventDefault();

    const submitBtn = e.target.querySelector(".submit-btn");

   
    const title = document.getElementById("title").value;
    const companyName = document.getElementById("companyName").value;
    const location = document.getElementById("location").value;
    const minCGPA = document.getElementById("minCGPA").value;
    const package = document.getElementById("package").value;
    const description = document.getElementById("description").value;
    const deadline = document.getElementById("deadline").value;

    
    const departmentValue = document.getElementById("department").value;
    const department = [departmentValue]; 

    try {
      
      submitBtn.innerText = "Posting...";
      submitBtn.disabled = true;

      const res = await fetch(`${API_BASE}/jobs/create`, {
        method: "POST",
        headers: getHeaders(), 
        body: JSON.stringify({
          title,
          companyName,
          location,
          minCGPA,
          department, 
          package,
          description,
          deadline
        })
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || "Failed to create job");
        submitBtn.innerText = "Post Job";
        submitBtn.disabled = false;
        return;
      }

      alert("Job posted successfully!");
      window.location.href = "company-dashboard.html";

    } catch (error) {
      console.error("Create Job Error:", error);
      alert("Server error while creating job!");
      submitBtn.innerText = "Post Job";
      submitBtn.disabled = false;
    }
  });
}