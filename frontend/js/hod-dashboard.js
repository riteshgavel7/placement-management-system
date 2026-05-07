const BASE_URL = "http://localhost:3000";
const API_URL = `${BASE_URL}/api/admin`;
const API_JOB = `${BASE_URL}/api/jobs/all`;

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
        
        if (!res.ok) throw new Error("Student details not found");
        
        const response = await res.json();
        
        // 🚀 CRITICAL FIX: Backend response handle karna
        // Agar response { success: true, data: {...} } hai ya direct student object hai
        let s = response.data ? response.data : (Array.isArray(response) ? response[0] : response);

        if (!s) {
            console.error("Student object is null or undefined");
            return alert("Error: Student record is empty!");
        }

        console.log("Fetched Student Data:", s); // Debugging ke liye

        // Safe Mapping Function
        const setVal = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.value = (val !== undefined && val !== null) ? val : "";
        };

        // --- Basic Info Mapping ---
        setVal('editName', s.name);
        setVal('editEmail', s.email);
        setVal('editMobile', s.mobile);
        setVal('editGender', s.gender || "Male");
        setVal('editRoll', s.rollNo);
        setVal('editEnroll', s.enrollmentNo);
        setVal('editCourse', s.course);
        setVal('editBatch', s.batch);
        setVal('editMarks', s.twelfthMarks);
        setVal('editYear', s.twelfthPassingYear);
        
        // Status & Payment
        setVal('editIsPaid', s.isPaid ? "💰 Paid" : "⚠️ Unpaid");
        setVal('editStatus', (s.status || "pending").toUpperCase());
        
        // Dropdowns
        const verSelect = document.getElementById('editIsVerified');
        if(verSelect) verSelect.value = s.isVerified ? "true" : "false";

        // HOD Special Fields
        setVal('hodEditCountDisplay', `${s.hodEditCount || 0} / 2 Used`);
        setVal('hodDeptDisplay', s.department || "N/A");
        setVal('hodPaymentId', s.paymentId || "No Record Found");

        // Documents View Logic
        const viewResumeBtn = document.getElementById('viewResumeBtn');
        const viewPicBtn = document.getElementById('viewPicBtn');
        
        if (viewResumeBtn) {
            if (s.resume && s.resume.startsWith("http")) {
                viewResumeBtn.href = s.resume;
                viewResumeBtn.style.display = 'inline-block';
            } else {
                viewResumeBtn.style.display = 'none';
            }
        }
        
        if (viewPicBtn) {
            if (s.profilePicture && s.profilePicture.startsWith("http")) {
                viewPicBtn.href = s.profilePicture;
                viewPicBtn.style.display = 'inline-block';
            } else {
                viewPicBtn.style.display = 'none';
            }
        }

        document.getElementById('editModal').style.display = 'block';
    } catch (err) { 
        console.error("Modal Load Error:", err);
        alert("Fetch Error: Data is missing or server is not responding."); 
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
    if (resumeFile && resumeFile.size > 1024 * 1024) {
    return alert("Resume file is too large (Max 1MB)");
    }
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