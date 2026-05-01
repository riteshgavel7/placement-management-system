const adminLoginForm = document.getElementById("adminLoginForm");
const BASE_URL = "https://placement-management-system-etjs.onrender.com";
const API_ADMIN = `${BASE_URL}/api/admin`;
const API_BASE = `${BASE_URL}/api`;
const API_URL = `${BASE_URL}/api/admin`;

let currentStudentId = null;
const getAdminToken = () => localStorage.getItem("adminToken");

function getAdminHeaders() {
    return {
        "Authorization": `Bearer ${getAdminToken()}`,
        "Content-Type": "application/json"
    };
}

// ================== 1. Login Logic ==================
if (adminLoginForm) {
    adminLoginForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const email = document.getElementById("adminEmail").value;
        const password = document.getElementById("adminPassword").value;

        try {
            const res = await fetch(`${API_ADMIN}/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password }),
            });
            const data = await res.json();
            if (res.ok) {
                alert("Admin Login Successful!");
                localStorage.setItem("adminToken", data.token);
                localStorage.setItem("adminName", data.admin.username);
                window.location.href = "admin-dashboard.html";
            } else {
                alert(data.message || "Invalid Credentials");
            }
        } catch (error) { alert("Internal server error. Please try again later."); }
    });
}

// ================= DASHBOARD LOAD & SECURITY =================
document.addEventListener("DOMContentLoaded", () => {
    // Check elements instead of URL to prevent wrong-password loops
    const isLoginPage = document.getElementById("adminLoginForm") !== null;
    const isDashboardPage = document.getElementById("statsSection") !== null;
    const token = getAdminToken();

    // 1. Agar user Dashboard par hai par Token nahi hai (Direct URL access)
    if (isDashboardPage && !token) {
        window.location.replace("admin-login.html");
        return;
    }

    // 2. Agar user Login Page par hai aur pehle se Token hai (Already logged in)
    if (isLoginPage && token) {
        window.location.replace("admin-dashboard.html");
        return;
    }

    // 3. Agar user Dashboard par hai aur Token bhi sahi hai -> Tabhi data load karo
    if (isDashboardPage && token) {
        showSection('statsSection');
        fetchDashboardStats();
    }
});

// ================= SECTION SWITCH =================
function showSection(sectionId) {
    const ids = ['statsSection', 'approvalSection', 'companySection', 'noticesSection', 'jobs', 'hodSection', 'updateSection'];
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = (id === sectionId) ? "block" : "none";
    });

    if (sectionId === 'statsSection') fetchDashboardStats();
    if (sectionId === 'approvalSection') fetchPendingStudents();
    if (sectionId === 'updateSection') fetchAdminStudents(); 
    if (sectionId === 'companySection') fetchPendingCompanies();
    if (sectionId === 'jobs') loadJobs();
    if (sectionId === 'hodSection') fetchHODs();
}

// ================= DASHBOARD STATS =================
async function fetchDashboardStats() {
    try {
        const res = await fetch(`${API_ADMIN}/stats`, { headers: getAdminHeaders() });
        const data = await res.json();
        if (data.stats) {
            document.getElementById("countStudents").innerText = data.stats.totalStudents || 0;
            document.getElementById("countPending").innerText = data.stats.pendingStudents || 0;
            document.getElementById("countCompanies").innerText = data.stats.totalCompanies || 0;
            document.getElementById("countPlaced").innerText = data.stats.placedStudents || 0;
            if (data.chartData) { renderBarChart(data.chartData); renderPieChart(data.chartData); }
        }
    } catch (err) { console.error(err); }
}

// ================= CHART RENDERING =================
let barChartInstance = null;
function renderBarChart(chartData) {
    const canvas = document.getElementById("barChart");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (barChartInstance) barChartInstance.destroy();
    barChartInstance = new Chart(ctx, {
        type: "bar",
        data: {
            labels: chartData.map(d => d.department),
            datasets: [{ label: "Students", data: chartData.map(d => d.count), backgroundColor: "#3498db" }]
        }
    });
}

let pieChartInstance = null;
function renderPieChart(chartData) {
    const canvas = document.getElementById("pieChart");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (pieChartInstance) pieChartInstance.destroy();
    pieChartInstance = new Chart(ctx, {
        type: "pie",
        data: {
            labels: chartData.map(d => d.department),
            datasets: [{ data: chartData.map(d => d.count), backgroundColor: ["#3498db", "#2ecc71", "#f1c40f", "#e74c3c", "#9b59b6"] }]
        }
    });
}

// ================= STUDENTS (PENDING) =================
async function fetchPendingStudents() {
    try {
        const dept = document.getElementById("deptFilter")?.value;
        let url = `${API_ADMIN}/pending-students`;
        if (dept) url += `?department=${dept}`;
        const res = await fetch(url, { headers: getAdminHeaders() });
        const students = await res.json();
        const tbody = document.getElementById("pendingTableBody");
        if (!students || students.length === 0) {
            tbody.innerHTML = "<tr><td colspan='7'>No pending students</td></tr>";
            return;
        }
        tbody.innerHTML = students.map(s => `
            <tr>
                <td>${s.name}</td><td>${s.rollNo}</td><td>${s.enrollmentNo}</td>
                <td>${s.email}</td><td>${s.mobile}</td><td>${s.department}</td>
                <td><button onclick="updateStudent('${s._id}','approve')">Approve</button>
                <button onclick="updateStudent('${s._id}','reject')">Reject</button></td>
            </tr>
        `).join('');
    } catch (err) { console.error(err); }
}

// ================= COMPANIES =================
async function fetchPendingCompanies() {
    try {
        const res = await fetch(`${API_ADMIN}/pending-companies`, { headers: getAdminHeaders() });
        const companies = await res.json();
        const tbody = document.getElementById("companyTableBody");
        if (!companies || companies.length === 0) {
            tbody.innerHTML = "<tr><td colspan='5'>No pending companies</td></tr>";
            return;
        }
        tbody.innerHTML = companies.map(c => `
            <tr>
                <td>${c.companyName}</td><td>${c.email}</td><td>${c.location}</td>
                <td>${c.website}</td><td><button onclick="updateCompany('${c._id}','approve')">Approve</button>
                <button onclick="updateCompany('${c._id}','reject')">Reject</button></td>
            </tr>
        `).join('');
    } catch (err) { console.error(err); }
}

// ================= UPDATE ACTIONS =================
async function updateStudent(id, action) {
    const res = await fetch(`${API_ADMIN}/approve-student/${id}`, {
        method: "PATCH",
        headers: getAdminHeaders(),
        body: JSON.stringify({ action })
    });
    if(res.ok) fetchPendingStudents();
}

async function updateCompany(id, action) {
    const res = await fetch(`${API_ADMIN}/approve-company/${id}`, {
        method: "PATCH",
        headers: getAdminHeaders(),
        body: JSON.stringify({ action })
    });
    if(res.ok) fetchPendingCompanies();
}

// ================= POST NOTICE =================
document.getElementById("noticeForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append("title", document.getElementById("noticeTitle").value);
    formData.append("description", document.getElementById("noticeDesc").value);
    formData.append("category", "General");
    const file = document.getElementById("noticePdf").files[0];
    if (file) formData.append("noticePdf", file);
    const res = await fetch(`${API_ADMIN}/add-notice`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${getAdminToken()}` },
        body: formData
    });
    const data = await res.json();
    alert(data.message);
});

// ================= FETCH JOBS =================
async function loadJobs() {
    const tbody = document.getElementById("jobTableBody");
    if (!tbody) return;
    try {
        const res = await fetch(`${API_BASE}/jobs/all`, { headers: getAdminHeaders() });
        const data = await res.json();
        const jobs = data.jobs || [];
        if (jobs.length === 0) { tbody.innerHTML = "<tr><td colspan='5'>No jobs found</td></tr>"; return; }
        tbody.innerHTML = jobs.map(job => `
            <tr>
                <td>${job.title || "-"}</td><td>${job.companyName || "-"}</td>
                <td>${job.applicants?.length || 0}</td><td>Pending</td>
                <td><button onclick="viewApplicants('${job._id}')">VIEW APPLICANTS</button>
                <button onclick="runAIScan('${job._id}')">RUN AI SCAN</button>
                <button onclick="openAnalysis('${job._id}')">📊 ANALYZE</button></td>
            </tr>
        `).join('');
    } catch (err) { tbody.innerHTML = "<tr><td colspan='5'>Error loading jobs</td></tr>"; }
}

// ================= AI & ANALYTICS =================

window.runAIScan = async (jobId) => {
    if (!confirm("Admin: Start AI Scan?")) return;
    const res = await fetch(`${API_BASE}/ai/bulk/${jobId}`, { method: "POST", headers: getAdminHeaders() });
    const data = await res.json();
    alert(data.success ? `Processed: ${data.totalProcessed}` : data.message);
};

window.viewApplicants = (jobId) => { localStorage.setItem("selectedJobId", jobId); localStorage.setItem("source", "admin"); window.location.href = "applicants.html"; };
window.openAnalysis = (jobId) => { localStorage.setItem("selectedJobId", jobId); window.location.href = "analysis.html"; };

// ================== EXPORT ==================
async function exportData() {
    const token = getAdminToken();
    if (!token) return alert("Session expired. Please log in again to continue.");
    const btn = document.querySelector(".submit-btn");
    const originalText = btn?.innerHTML;
    try {
        if(btn) { btn.innerText = "⏳ Processing..."; btn.disabled = true; }
        const res = await fetch(`${API_ADMIN}/export-all-data`, { method: "GET", headers: getAdminHeaders() });
        if (!res.ok) throw new Error("Server error");
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `GGV_Full_Report_${new Date().toISOString().split('T')[0]}.xlsx`;
        document.body.appendChild(a); a.click(); window.URL.revokeObjectURL(url);
    } catch (err) { alert("Export Error: " + err.message); }
    finally { if(btn) { btn.innerHTML = originalText; btn.disabled = false; } }
}

// ================== HOD MANAGEMENT ==================
async function fetchHODs() {
    try {
        const res = await fetch(`${API_ADMIN}/get-all-hods`, { headers: getAdminHeaders() });
        const hods = await res.json();
        const tbody = document.getElementById('hodTableBody');
        if(!tbody) return;
        if (hods.length === 0) { tbody.innerHTML = "<tr><td colspan='4'>No HODs found</td></tr>"; return; }
        tbody.innerHTML = hods.map(hod => `
            <tr>
                <td>${hod.name}</td><td>${hod.department}</td><td>${hod.email}</td>
                <td><button onclick="editHOD('${hod._id}', '${hod.name}', '${hod.department}', '${hod.email}')">✏️ Edit</button>
                <button onclick="deleteHOD('${hod._id}')">🗑️ Delete</button></td>
            </tr>
        `).join('');
    } catch (err) { console.error(err); }
}

// ================== STUDENT MANAGEMENT (UPDATE SECTION) ==================
async function fetchAdminStudents() {
    try {
        const res = await fetch(`${API_ADMIN}/students-dashboard-data`, { headers: getAdminHeaders() });
        const data = await res.json();
        const students = Array.isArray(data) ? data : (data.students || []);
        const tbody = document.getElementById('adminUpdateTableBody');
        if (!tbody) return;
        if (students.length === 0) { tbody.innerHTML = `<tr><td colspan="5">No students found.</td></tr>`; return; }
        tbody.innerHTML = students.map(s => {
            const safeAvatar = s.profilePicture && s.profilePicture.startsWith("http") ? s.profilePicture : `https://ui-avatars.com/api/?name=${encodeURIComponent(s.name || 'Student')}&background=random`;
            return `
            <tr>
                <td><div style="display:flex; align-items:center; gap:10px;"><img src="${safeAvatar}" style="width:35px; height:35px; border-radius:50%; object-fit:cover;"><b>${s.name || 'N/A'}</b>
                <span style="display:none;">${s.email || ''} ${s.enrollmentNo || ''}</span></div></td>
                <td>${s.rollNo || 'N/A'}</td><td>${s.department || 'N/A'}</td>
                <td><span class="status-badge ${s.status || 'pending'}">${(s.status || 'PENDING').toUpperCase()}</span></td>
                <td><button class="btn-edit" onclick="loadAdminModal('${s._id}')">🛡️ Review</button></td>
            </tr>`
        }).join('');
    } catch (err) { console.error("Admin Fetch Error:", err); }
}

// 🛡️ LOAD ADMIN MODAL LOGIC
window.loadAdminModal = async function(id) {
    currentStudentId = id;
    try {
        const res = await fetch(`${API_URL}/student-detail/${id}`, { headers: getAdminHeaders() });
        let response = await res.json();
        
        // Exact Postman response extraction
        let s = response.data ? response.data : (Array.isArray(response) ? response.find(st => st._id === id) : response);

        if (!s) return alert("Record not found. The requested student data is unavailable.");

        // Bulletproof safeSet (Fixes the issue with 0 or floating point numbers getting erased)
        const safeSet = (elementId, value) => {
            const el = document.getElementById(elementId);
            if (el) {
                el.value = (value !== undefined && value !== null) ? value : "";
            }
        };

        // --- 1-to-1 Mapping from Postman to Screen ---
        safeSet('editName', s.name);
        safeSet('editEmail', s.email);
        safeSet('editMobile', s.mobile);
        safeSet('editRoll', s.rollNo);
        safeSet('editEnroll', s.enrollmentNo);
        safeSet('editDept', s.department || "N/A");
        safeSet('editCourse', s.course);
        safeSet('editBatch', s.batch);
        safeSet('editMarks', s.twelfthMarks);
        safeSet('editPassingYear', s.twelfthPassingYear);
        safeSet('editGender', s.gender || "Male");
        safeSet('editStatus', s.status ? s.status.toUpperCase() : "PENDING");
        
        // NAYA: HOD Edit Count map kiya
        safeSet('editHodCount', s.hodEditCount !== undefined ? s.hodEditCount : "0");
        
        // --- Status Mapping with Colors ---
        const payEl = document.getElementById('editPaymentStatus');
        if (payEl) {
            payEl.value = s.isPaid ? "PAID ✅" : "UNPAID ❌";
            payEl.style.color = s.isPaid ? "#27ae60" : "#e74c3c";
        }

        const appEl = document.getElementById('editAdminApproval');
        if (appEl) {
            appEl.value = s.isAdminApproved ? "APPROVED ✅" : "PENDING ❌";
            appEl.style.color = s.isAdminApproved ? "#27ae60" : "#e74c3c";
        }

        // NAYA: Email Verified Status map kiya
        const emailVerEl = document.getElementById('editIsVerified');
        if (emailVerEl) {
            emailVerEl.value = s.isVerified ? "VERIFIED ✅" : "NOT VERIFIED ❌";
            emailVerEl.style.color = s.isVerified ? "#27ae60" : "#e74c3c";
        }

        // --- Documents (Photo button hide logic fixed) ---
        const vResume = document.getElementById('viewResumeBtn');
        const vPic = document.getElementById('viewPicBtn');
        
        if (vResume) {
            if (typeof s.resume === 'string' && s.resume.startsWith("http")) {
                vResume.href = s.resume;
                vResume.style.display = 'inline-block';
            } else {
                vResume.style.display = 'none';
            }
        }

        if (vPic) {
            if (typeof s.profilePicture === 'string' && s.profilePicture.startsWith("http")) {
                vPic.href = s.profilePicture;
                vPic.style.display = 'inline-block';
            } else {
                vPic.style.display = 'none'; // Photo na hone par button gayab
            }
        }

        document.getElementById('editModal').style.display = 'block';
    } catch (err) { 
        console.error("Load Error Details:", err);
       alert("Synchronisation error. Unable to retrieve record details.");
    }
}

window.saveAdminEdit = async function() {
    const action = document.getElementById('adminAction').value;
    const updateData = {
        name: document.getElementById('editName').value,
        mobile: document.getElementById('editMobile').value,
        rollNo: document.getElementById('editRoll').value,
        enrollmentNo: document.getElementById('editEnroll').value,
        course: document.getElementById('editCourse').value,
        batch: document.getElementById('editBatch').value,
        twelfthMarks: document.getElementById('editMarks').value,
        twelfthPassingYear: document.getElementById('editPassingYear').value,
        gender: document.getElementById('editGender').value,
        hodEditCount: parseInt(document.getElementById('editHodCount').value) || 0
    };

    if (action === 'approve') updateData.status = 'verified';
    else if (action === 'reject') updateData.status = 'rejected';

    try {
        const res = await fetch(`${API_URL}/update-details/${currentStudentId}`, {
            method: "PATCH",
            headers: getAdminHeaders(),
            body: JSON.stringify(updateData)
        });
        if (res.ok) { 
            alert("Updated successfully! ✅"); 
            document.getElementById('editModal').style.display = 'none'; 
            fetchAdminStudents(); 
        } else { 
            const d = await res.json(); 
            alert("Error: " + d.message); 
        }
    } catch (err) { alert("Network error. Unable to communicate with the server."); }
}

function filterUpdateTable() {
    const filter = document.getElementById("adminStudentSearch").value.toLowerCase();
    const rows = document.querySelectorAll("#adminUpdateTableBody tr");

    rows.forEach(row => {
        // textContent hidden data (Enrollment/Email) ko bhi read kar leta hai
        const text = row.textContent.toLowerCase(); 
        row.style.display = text.includes(filter) ? "" : "none";
    });
}

window.closeModal = () => { document.getElementById('editModal').style.display = 'none'; };
function logout() { 
    if (confirm("Are you sure you want to terminate the current session?")) { 
        localStorage.clear(); 
        window.location.replace("admin-login.html"); // Updated here
    } 
}