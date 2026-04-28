const API_URL = "http://localhost:3000/api/admin";
const API_JOB = "http://localhost:3000/api/jobs/all";
const token = localStorage.getItem("token");
const role = localStorage.getItem("role");
let currentStudentId = null;

// Auth Check
if (!token || localStorage.getItem('role') !== 'HOD') {
    window.location.href = "HOD-login.html";
}

// 1. Fetch Students
async function fetchStudents() {
    try {
        const res = await fetch(`${API_URL}/students-dashboard-data`, {
            headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" }
        });
        if (!res.ok) throw new Error("API Fetch Failed");
        const data = await res.json();
        const students = Array.isArray(data) ? data : (data.students || []);
        renderTable('pendingTableBody', students, true); 
        renderTable('studentTableBody', students, false);
    } catch (err) { console.error("Fetch Error:", err); }
}

function renderTable(id, data, isUpdateSection) {
    const tbody = document.getElementById(id);
    if (!tbody) return;

    if (!data || data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;">No records found.</td></tr>`;
        return;
    }

    tbody.innerHTML = data.map(s => {
        // Status color logic based on JSON 'status' field
        const statusClass = (s.status || 'pending').toLowerCase();
        
        if (isUpdateSection) {
            // CORRECTION SECTION (Page 1)
            return `<tr>
                <td><b>${s.name || 'N/A'}</b></td>
                <td>${s.enrollmentNo || 'N/A'}</td>
                <td>${s.rollNo || 'N/A'}</td>
                <td>
                    <button class="btn-edit" 
                        ${s.hodEditCount >= 2 ? 'disabled style="background:#bdc3c7; cursor:not-allowed;"' : 'style="background:#470fed; color:white;"'} 
                        onclick="loadAndOpenModal('${s._id}')">
                        ${s.hodEditCount >= 2 ? '🔒 Locked' : '📝 Review'}
                    </button>
                </td>
            </tr>`;
        } else {
            // ALL RECORDS SECTION (Page 2)
            return `<tr>
                <td><b>${s.name || ''}</b></td>
                <td>${s.email || ''}</td>
                <td>${s.hodEditCount || 0} / 2 Edits</td>
                <td><span class="status-badge ${statusClass}">${(s.status || 'PENDING').toUpperCase()}</span></td>
                <td>
                    <button class="btn-view" onclick="loadAndOpenModal('${s._id}')" 
                        style="background: #2c3e50; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 13px;">
                        👁️ Full Detail
                    </button>
                </td>
            </tr>`;
        }
    }).join('');
}

// 2. Load Modal Data (Fixed Duplicate & ID Mapping)
window.loadAndOpenModal = async function(id) {
    currentStudentId = id;
    try {
        const res = await fetch(`${API_URL}/student-detail/${id}`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        let s = await res.json();
        
        // Handling Array response from Backend
        if (Array.isArray(s)) {
            s = s.find(student => student._id === id) || s[0];
        }

        // --- Basic Info ---
        document.getElementById('editName').value = s.name || "";
        document.getElementById('editEmail').value = s.email || "";
        document.getElementById('editMobile').value = s.mobile || "";
        document.getElementById('editGender').value = s.gender || "Male";

        // --- Academic ---
        document.getElementById('editRoll').value = s.rollNo || "";
        document.getElementById('editEnroll').value = s.enrollmentNo || "";
        if(document.getElementById('editCourse')) document.getElementById('editCourse').value = s.course || "";
        if(document.getElementById('editBatch')) document.getElementById('editBatch').value = s.batch || "";
        document.getElementById('editMarks').value = s.twelfthMarks || "";
        document.getElementById('editYear').value = s.twelfthPassingYear || "";

        // --- Status ---
        document.getElementById('editIsPaid').value = s.isPaid ? "💰 Paid" : "⚠️ Unpaid";
        document.getElementById('editStatus').value = (s.status || "pending").toUpperCase();
        if(document.getElementById('editPayId')) document.getElementById('editPayId').value = s.paymentId || "N/A";
        if(document.getElementById('editIsVerified')) {
    document.getElementById('editIsVerified').value = s.isVerified.toString(); 
     }
        if(document.getElementById('editAdminApproved')) document.getElementById('editAdminApproved').value = s.isAdminApproved ? "Approved" : "Pending";

        // --- Documents View Logic ---
        const viewResumeBtn = document.getElementById('viewResumeBtn');
        const viewPicBtn = document.getElementById('viewPicBtn');

        if (s.resume && s.resume.startsWith("http")) {
            viewResumeBtn.href = s.resume;
            viewResumeBtn.style.display = 'inline-block';
        } else { viewResumeBtn.style.display = 'none'; }

        if (s.profilePicture && s.profilePicture.startsWith("http")) {
            viewPicBtn.href = s.profilePicture;
            viewPicBtn.style.display = 'inline-block';
        } else { viewPicBtn.style.display = 'none'; }

        document.getElementById('editModal').style.display = 'block';
    } catch (err) { 
        console.error("Fetch error:", err);
        alert("Data fetch error!"); 
    }
}

// 3. Save Edit (Using FormData for Backend Sync)
window.saveEdit = async function() {
    if (!currentStudentId) return alert("Student ID missing!");

    const formData = new FormData();
    
    // Text Data Append
    formData.append("name", document.getElementById('editName').value);
    formData.append("mobile", document.getElementById('editMobile').value);
    formData.append("rollNo", document.getElementById('editRoll').value);
    formData.append("enrollmentNo", document.getElementById('editEnroll').value);
    formData.append("twelfthMarks", Number(document.getElementById('editMarks').value) || 0);
    formData.append("twelfthPassingYear", document.getElementById('editYear').value);
    formData.append("gender", document.getElementById('editGender').value);
    if (document.getElementById('editIsVerified')) {
        formData.append("isVerified", document.getElementById('editIsVerified').value === "true");
    }

    // Physical Files Append
    const resumeFile = document.getElementById('fileResume').files[0];
    const picFile = document.getElementById('filePic').files[0];

    if (resumeFile) formData.append("resume", resumeFile);
    if (picFile) formData.append("profilePicture", picFile);

    try {
        const res = await fetch(`${API_URL}/update-details/${currentStudentId}`, {
            method: "PATCH",
            headers: { "Authorization": `Bearer ${token}` },
            body: formData
        });

        const result = await res.json();
        if (res.ok) {
            alert("✅ Success: Student Data & Files Updated!");
            closeModal();
            // Clear file inputs
            document.getElementById('fileResume').value = "";
            document.getElementById('filePic').value = "";
            await fetchStudents(); 
        } else {
            alert("Update Failed: " + (result.message || "Server Error"));
        }
    } catch (err) { alert("Network Error while saving!"); }
}

// 4. Jobs Section
async function loadJobs() {
    const container = document.getElementById("jobsContainer");
    if (!container) return;
    container.innerHTML = "<p>⏳ Loading departmental jobs...</p>";
    try {
        const res = await fetch(API_JOB, { headers: { "Authorization": `Bearer ${token}` } });
        const data = await res.json();
        const jobs = data.jobs || (Array.isArray(data) ? data : []);
        container.innerHTML = jobs.length === 0 ? "<p>No jobs found.</p>" : jobs.map(job => `
            <div class="job-card" style="border:1px solid #ddd; padding:15px; border-radius:8px; background:#fff; box-shadow:0 2px 4px rgba(0,0,0,0.1); margin-bottom:15px;">
                <h3 style="margin-top:0; color:#2c3e50;">${job.title}</h3>
                <p><b>🏢 Company:</b> ${job.companyName}</p>
                <p>📍 <b>Location:</b> ${job.location || 'N/A'}</p>
                <p>🎓 <b>Min CGPA:</b> ${job.minCGPA}</p>
                <p><b>💰 Package:</b> ${job.package || job.salary} LPA</p>
                <p><b>📅 Deadline:</b> ${new Date(job.deadline).toLocaleDateString()}</p>
                
                <p style="font-size: 14px; color: #040111; background: #f4f7ff; padding: 10px; border-radius: 8px; border: 1px dashed #470fed;">
                    📝 <b>Skills:</b> ${job.description ? job.description.split(',').join(' | ') : 'N/A'}
                </p>

                <div style="display: flex; gap: 10px; margin-top: 15px;">
                    <a href="applicants.html?jobId=${job._id}" style="flex: 1; text-align: center; padding: 8px; background: #27ae60; color: white; text-decoration: none; border-radius: 5px; font-size: 14px; font-weight: bold;">👥 Applicants</a>
                    <a href="analysis.html?jobId=${job._id}" style="flex: 1; text-align: center; padding: 8px; background: #3498db; color: white; text-decoration: none; border-radius: 5px; font-size: 14px; font-weight: bold;">📊 Analysis</a>
                </div>
            </div>
        `).join('');
    } catch (err) { container.innerHTML = "<p>Error loading jobs.</p>"; }
}

// 5. Helpers
window.showSection = (id) => {
    document.querySelectorAll('.section-box').forEach(s => s.style.display = 'none');
    document.getElementById(id).style.display = 'block';
    if (id === 'jobsSection') loadJobs();
}
window.closeModal = () => document.getElementById('editModal').style.display = 'none';
window.logout = () => { if (confirm("Logout?")) { localStorage.clear(); window.location.href = "HOD-login.html"; } }

// 6. Init
document.addEventListener("DOMContentLoaded", () => {
    document.getElementById('hodWelcome').innerText = `Welcome, ${localStorage.getItem('hodName') || 'HOD'}`;
    document.getElementById('deptTag').innerText = localStorage.getItem('hodDept') || 'Dept';
    document.getElementById('deptLabel').innerText = localStorage.getItem('hodDept') || 'Dept';
    fetchStudents();
});