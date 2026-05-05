const BASE_URL = "http://localhost:3000";
const API_JOB = `${BASE_URL}/api/jobs/all`;
const API_APPLY = `${BASE_URL}/api/jobs/apply`;





// ================= LOAD JOBS =================
async function loadJobs() {
  const container = document.getElementById("jobsContainer");
  if (!container) return;

  // TOKEN nikaalein (Ye sabse zaroori hai jobs dikhane ke liye)
  const token = localStorage.getItem("token");

  container.innerHTML = "<p>Loading jobs...</p>";

  try {
    // Header mein Authorization bhejna padega kyunki backend restricted hai
    const res = await fetch(API_JOB, {
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });
    
    const data = await res.json();

    console.log("Jobs:", data);

    if (!data.jobs || !Array.isArray(data.jobs)) {
      container.innerHTML = "<p>No jobs found</p>";
      return;
    }

    container.innerHTML = "";

    data.jobs.forEach(job => {
      const div = document.createElement("div");

      // Aapka original structure (Bas branch ko department kar diya hai)
      div.innerHTML = `
        <h3>${job.title || "-"}</h3>
        <p>Company ---> ${job.companyName || job.company || "-"}</p>
        <p>LOCATION ---> ${job.location || "-"}</p>
        <p>PACKAGE ---> ${job.package || job.salary || "-"} LPA</p>

        <p> CGPA ---> ${job.minCGPA || "-"}</p>
        <p> BRANCH ---> ${job.department ? job.department.join(", ") : "-"}</p>
        <p>DESCRIPTION ---> ${job.description || "-"}</p>
        <p>📅 DEADLINE ---> ${job.deadline || "-"}</p>

        <button onclick="applyJob('${job._id}')">Apply</button>
        <hr>
      `;

      container.appendChild(div);
    });

  } catch (err) {
    console.error("Job load error:", err);
    container.innerHTML = "<p>Server error</p>";
  }
}

// ================= APPLY JOB =================
async function applyJob(jobId) {
  const token = localStorage.getItem("token");

  if (!token) {
    alert("Login first");
    return;
  }

  try {
    const res = await fetch(API_APPLY, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ jobId })
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.message || "Apply failed");
      return;
    }

    alert(data.message || "Applied successfully");

  } catch (err) {
    console.error("Apply error:", err);
    alert("Server error");
  }
}


// ================= LOAD APPLIED JOBS =================
async function loadMyApplications() {
  const container = document.getElementById("applicationsContainer");
  if (!container) return;

  const token = localStorage.getItem("token");

  if (!token) {
    alert("Login first");
    window.location.href = "index.html";
    return;
  }

  try {
    const res = await fetch(`${BASE_URL}/api/jobs/applied`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const data = await res.json();

    console.log("Applied Jobs:", data);

    if (!data.jobs || !Array.isArray(data.jobs)) {
      container.innerHTML = "<p>No applications found</p>";
      return;
    }

    container.innerHTML = "";

    const user = JSON.parse(localStorage.getItem("user"));

    data.jobs.forEach(job => {
      const div = document.createElement("div");

      const myApp = job.applicants?.find(
        app => app.student === user?._id
      );

      div.innerHTML = `
    <br><h3>TITLE ---> ${job.title}</h3>
    <p>COMPANY ---> ${job.companyName}</p>
    <p>JOB LOCATION ---> ${job.location}</p>
    <p>JOB PACKAGE ---> ${job.package || job.salary || "-"} LPA</p>
    
    <p>APPLICATION STATUS ---> <b style="color: ${
        job.status === 'selected' ? 'green' : 
        job.status === 'rejected' ? 'red' : 
        'blue' 
    }">
        ${(job.status || "pending").toUpperCase()}
    </b></p>
    <hr>
`;
      container.appendChild(div);
    });

  } catch (err) {
    console.error("Application load error:", err);
    container.innerHTML = "<p>Server error</p>";
  }
}



// ================= AUTO LOAD =================
document.addEventListener("DOMContentLoaded", () => {
  loadJobs();
  loadMyApplications();
});
