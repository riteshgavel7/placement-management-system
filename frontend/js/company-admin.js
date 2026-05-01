const API_ADMIN_COMP = "http://localhost:3000/api/admin";


window.fetchPendingCompanies = async function() {
    console.log("Company fetcher started...");
    const token = localStorage.getItem("adminToken");
    const tbody = document.getElementById("companyTableBody");

    try {
        const res = await fetch(`${API_ADMIN}/pending-companies`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        const companies = await res.json();

        if (!tbody) return;
        if (companies.length === 0) {
            tbody.innerHTML = "<tr><td colspan='5' align='center'>No pending company registration requests found..</td></tr>";
            return;
        }

        tbody.innerHTML = companies.map(c => `
            <tr>
                <td><b>${c.companyName}</b></td>
                <td>${c.email}</td>
                <td>${c.location}</td>
                <td><a href="${c.website}" target="_blank">Visit</a></td>
                <td>
                    <button class="btn-approve" onclick="updateCompanyStatus('${c._id}', 'approve')">Approve</button>
                    <button class="btn-reject" onclick="updateCompanyStatus('${c._id}', 'reject')">Reject</button>
                </td>
            </tr>`).join('');
    } catch (err) { console.error(err); }
};

// 2. Approve ya Reject logic
window.updateCompanyStatus = async function(id, action) {
    if (!confirm(`Are you sure you want to ${action}?`)) return;

    const token = localStorage.getItem("adminToken");
    try {
        const res = await fetch(`${API_ADMIN_COMP}/approve-company/${id}`, {
            method: "PATCH",
            headers: { 
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ action })
        });

        if (res.ok) {
            alert(`Company ${action}ed successfully!`);
            fetchPendingCompanies(); // Refresh table
        } else {
            alert("Operation failed. Unable to update company status.");
        }
    } catch (err) {
        alert("Internal Server Error. Please contact the technical support team.");
    }
}