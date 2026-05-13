const adminLoginForm = document.getElementById("adminLoginForm");
const BASE_URL = "http://localhost:3000";
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

// ================== LOGOUT LOGIC (ADDED FIX) ==================
window.logout = function() {
    if(confirm("Are you sure you want to logout?")) {
        localStorage.removeItem("adminToken");
        localStorage.removeItem("adminName");
        window.location.replace("admin-login.html");
    }
};

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
    const isLoginPage = document.getElementById("adminLoginForm") !== null;
    const isDashboardPage = document.getElementById("statsSection") !== null;
    const token = getAdminToken();

    if (isDashboardPage && !token) {
        window.location.replace("admin-login.html");
        return;
    }

    if (isLoginPage && token) {
        window.location.replace("admin-dashboard.html");
        return;
    }

    if (isDashboardPage && token) {
        showSection('statsSection');
        fetchDashboardStats();
    }
});

// ================= SECTION SWITCH =================
window.showSection = function(sectionId) {
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
    if (sectionId === 'noticesSection') fetchNotices();
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
window.fetchPendingStudents = async function() {
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
window.updateStudent = async function(id, action) {
    const res = await fetch(`${API_ADMIN}/approve-student/${id}`, {
        method: "PATCH",
        headers: getAdminHeaders(),
        body: JSON.stringify({ action })
    });
    if(res.ok) fetchPendingStudents();
}

window.updateCompany = async function(id, action) {
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

// ================= FETCH ALL NOTICES =================
async function fetchNotices() {
    try {
        const res = await fetch(`${API_ADMIN}/notices`, { headers: getAdminHeaders() });
        const notices = await res.json();
        const tbody = document.getElementById("noticeTableBody");
        
        if (!tbody) return;
        if (!notices || notices.length === 0) {
            tbody.innerHTML = "<tr><td colspan='5'>No active notices found.</td></tr>";
            return;
        }

        tbody.innerHTML = notices.map(n => `
            <tr>
                <td><b>${n.title}</b></td>
                <td>${n.Description || "General"}</td>
                <td>${new Date(n.createdAt).toLocaleDateString()}</td>
                <td>${n.pdfPath ? `<a href="http://localhost:3000${n.pdfPath}" target="_blank" style="color: #3498db;">📄 View PDF</a>` : "No PDF"}</td>
                <td><button onclick="deleteNotice('${n._id}')" style="background:#e74c3c; color:white; border:none; padding:5px 10px; border-radius:3px; cursor:pointer;">🗑️ Delete</button></td>
            </tr>
        `).join('');
    } catch (err) { console.error("Notice Fetch Error:", err); }
}

// ================= DELETE NOTICE =================
window.deleteNotice = async (id) => {
    if (!confirm("Are you sure you want to delete this notice?")) return;
    try {
        const res = await fetch(`${API_ADMIN}/delete-notice/${id}`, {
            method: "DELETE",
            headers: getAdminHeaders()
        });
        const data = await res.json();
        alert(data.message);
        if (res.ok) fetchNotices(); 
    } catch (err) { alert("Error deleting notice."); }
};

// ================= FETCH JOBS & NAVIGATION (ADDED FIX) =================
window.viewApplicants = function(jobId) {
    window.location.href = `applicants.html?id=${jobId}`;
};

window.openAnalysis = function(jobId) {
    window.location.href = `analysis.html?id=${jobId}`;
};

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
    
    const loader = document.getElementById("aiLoader");
    if (loader) loader.style.display = "flex";

    try {
        const res = await fetch(`${API_BASE}/ai/bulk/${jobId}`, { method: "POST", headers: getAdminHeaders() });
        const data = await res.json();
        
        if (loader) loader.style.display = "none"; 
        alert(data.success ? `Processed: ${data.totalProcessed}` : data.message);
        window.location.reload();
    } catch (err) {
        if (loader) loader.style.display = "none"; 
        alert("Something went wrong during AI screening.");
    }
};

// ================== EXPORT ==================
window.exportData = async function() {
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

window.toggleHodForm = () => {
    const box = document.getElementById("addHodFormBox");
    if (box) {
        box.style.display = box.style.display === "none" ? "block" : "none";
    }
};

document.getElementById("createHodForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const newHodData = {
        name: document.getElementById("hodName").value,
        email: document.getElementById("hodEmail").value,
        password: document.getElementById("hodPassword").value,
        department: document.getElementById("hodDept").value
    };

    try {
        const res = await fetch(`${API_ADMIN}/create-hod`, {
            method: "POST",
            headers: getAdminHeaders(),
            body: JSON.stringify(newHodData)
        });
        const data = await res.json();
        
        alert(data.message || "HOD Created successfully!");
        
        if (res.ok) {
            document.getElementById("createHodForm").reset(); 
            fetchHODs(); 
        }
    } catch (err) { 
        console.error("HOD Create Error:", err);
        alert("Error creating HOD"); 
    }
});

window.deleteHOD = async (id) => {
    if (!confirm("Are you sure you want to permanently delete this HOD account?")) return;
    try {
        const res = await fetch(`${API_ADMIN}/delete-hod/${id}`, {
            method: "DELETE",
            headers: getAdminHeaders()
        });
        const data = await res.json();
        alert(data.message || "HOD deleted!");
        if (res.ok) fetchHODs(); 
    } catch (err) { 
        console.error("HOD Delete Error:", err);
        alert("Error deleting HOD"); 
    }
};

window.editHOD = async (id, oldName, oldDept, oldEmail) => {
    const newName = prompt("Update HOD Name:", oldName);
    if (newName === null) return;
    const newDept = prompt("Update Department (e.g., CSIT, Mechanical, Civil, Commerce):", oldDept);
    if (newDept === null) return;
    const newPassword = prompt("Set New Password (leave blank if you don't want to change it):", "");

    const updateData = { name: newName, department: newDept };
    if (newPassword && newPassword.trim() !== "") {
        updateData.password = newPassword;
    }

    try {
        const res = await fetch(`${API_ADMIN}/update-hod/${id}`, {
            method: "PATCH",
            headers: getAdminHeaders(),
            body: JSON.stringify(updateData)
        });
        const data = await res.json();
        alert(data.message || "HOD details updated!");
        if (res.ok) fetchHODs();
    } catch (err) { alert("Failed to update HOD details."); }
};

// ================== STUDENT MANAGEMENT (UPDATE SECTION) ==================
window.fetchAdminStudents = async function() {
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

window.loadAdminModal = async function(id) {
    currentStudentId = id;
    try {
        const res = await fetch(`${API_URL}/student-detail/${id}`, { headers: getAdminHeaders() });
        let response = await res.json();
        let s = response.data ? response.data : (Array.isArray(response) ? response.find(st => st._id === id) : response);

        if (!s) return alert("Record not found.");

        const safeSet = (elementId, value) => {
            const el = document.getElementById(elementId);
            if (el) el.value = (value !== undefined && value !== null) ? value : "";
        };

        safeSet('editName', s.name);
        safeSet('editEmail', s.email);
        safeSet('editMobile', s.mobile);
        safeSet('editRoll', s.rollNo);
        safeSet('editEnroll', s.enrollmentNo);
        safeSet('editDept', s.department);
        safeSet('editCourse', s.course);
        safeSet('editBatch', s.batch);
        safeSet('editMarks', s.twelfthMarks);
        safeSet('editGender', s.gender);
        safeSet('editPassingYear', s.twelfthPassingYear);
        safeSet('editPaymentId', s.paymentId || "N/A");
        safeSet('editHodCount', s.hodEditCount);
        safeSet('editStatus', (s.status || 'PENDING').toUpperCase());
        
        const emailVerEl = document.getElementById('editIsVerified');
        if (emailVerEl) emailVerEl.value = s.isVerified ? "true" : "false";

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

        const vResume = document.getElementById('viewResumeBtn');
        const vPic = document.getElementById('viewPicBtn');
        
        if (vResume) {
            if (s.resume && s.resume.includes("http")) {
                vResume.href = s.resume;
                vResume.style.display = 'inline-block';
                vResume.innerHTML = "📄 View Resume";
            } else { vResume.style.display = 'none'; }
        }

        if (vPic) {
            if (s.profilePicture && s.profilePicture.includes("http")) {
                vPic.href = s.profilePicture;
                vPic.style.display = 'inline-block';
                vPic.innerHTML = "🖼️ View Photo";
            } else { vPic.style.display = 'none'; }
        }

        document.getElementById('editModal').style.display = 'block';
    } catch (err) { alert("Error loading student details."); }
}

window.closeModal = function() {
    document.getElementById('editModal').style.display = 'none';
    document.getElementById('updatePicInput').value = "";
    document.getElementById('updateResumeInput').value = "";
};

window.saveAdminEdit = async function() {
    const action = document.getElementById('adminAction').value;
    const formData = new FormData();
    
    formData.append('name', document.getElementById('editName').value);
    formData.append('mobile', document.getElementById('editMobile').value);
    formData.append('rollNo', document.getElementById('editRoll').value);
    formData.append('enrollmentNo', document.getElementById('editEnroll').value);
    formData.append('course', document.getElementById('editCourse').value);
    formData.append('batch', document.getElementById('editBatch').value);
    formData.append('twelfthMarks', document.getElementById('editMarks').value);
    formData.append('hodEditCount', parseInt(document.getElementById('editHodCount').value) || 0);
    formData.append('isVerified', document.getElementById('editIsVerified').value === 'true');
    formData.append('department', document.getElementById('editDept').value); 
    formData.append('twelfthPassingYear', document.getElementById('editPassingYear').value);
    formData.append('gender', document.getElementById('editGender').value);

    if (action === 'approve') {
        formData.append('status', 'verified');
        formData.append('isAdminApproved', true);
    } else if (action === 'reject') {
        formData.append('status', 'rejected');
        formData.append('isAdminApproved', false);
    }

    const picFile = document.getElementById('updatePicInput').files[0];
    const resumeFile = document.getElementById('updateResumeInput').files[0];
    if (picFile) formData.append('profilePicture', picFile);
    if (resumeFile) formData.append('resume', resumeFile);

    try {
        const headers = getAdminHeaders();
        delete headers['Content-Type'];

        const res = await fetch(`${API_URL}/update-details/${currentStudentId}`, {
            method: "PATCH",
            headers: headers,
            body: formData 
        });

        const data = await res.json();
        if (res.ok) { 
            alert("Record Updated Successfully! ✅"); 
            closeModal();
            fetchAdminStudents();
        } else { alert("Error: " + data.message); }
    } catch (err) { alert("Failed to communicate with server."); }
};