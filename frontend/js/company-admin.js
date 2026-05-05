const BASE_URL = "http://localhost:3000";
const API_ADMIN = `${BASE_URL}/api/admin`;

window.fetchPendingCompanies = async function() {
    console.log("Company fetcher started...");
    const token = localStorage.getItem("adminToken"); 
    const tbody = document.getElementById("companyTableBody");

    if (!tbody) return;

    try {
        const res = await fetch(`${API_ADMIN}/pending-companies`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        const companies = await res.json();

        if (!companies || companies.length === 0) {
            tbody.innerHTML = "<tr><td colspan='5' align='center'>No pending company registration requests found.</td></tr>";
            return;
        }

        tbody.innerHTML = companies.map(c => `
            <tr>
                <td><b>${c.companyName}</b></td>
                <td>${c.email}</td>
                <td>${c.location}</td>
                <td><a href="${c.website}" target="_blank">Visit Site</a></td>
                <td>
                    <button class="btn-approve" onclick="updateCompanyStatus('${c._id}', 'approve')">Approve</button>
                    <button class="btn-reject" onclick="updateCompanyStatus('${c._id}', 'reject')">Reject</button>
                </td>
            </tr>`).join('');
    } catch (err) { 
        console.error("Fetch Error:", err); 
        tbody.innerHTML = "<tr><td colspan='5' align='center' style='color:red;'>Failed to load data.</td></tr>";
    }
};

window.updateCompanyStatus = async function(id, action) {
    const displayAction = action === 'approve' ? 'Approve' : 'Reject';
    
    if (!confirm(`Are you sure you want to ${displayAction} this company?`)) return;

    const token = localStorage.getItem("adminToken");
    
    try {
        const res = await fetch(`${API_ADMIN}/approve-company/${id}`, {
            method: "PATCH",
            headers: { 
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ action: action.toLowerCase() })
        });

        if (res.ok) {
            alert(`Company ${displayAction}d successfully! ✅`);
            fetchPendingCompanies(); 
        } else {
            const errorData = await res.json();
            alert(errorData.message || "Operation failed. Unable to update company status.");
        }
    } catch (err) {
        console.error("Update Error:", err);
        alert("Internal Server Error. Please contact the technical support team.");
    }
};