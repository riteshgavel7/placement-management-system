document.getElementById('hodLoginForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const loginBtn = document.getElementById('hodLoginBtn');
    const email = document.getElementById('hodEmail').value;
    const password = document.getElementById('hodPassword').value;

    loginBtn.innerText = "Authenticating...";
    loginBtn.disabled = true;

    try {
        const response = await fetch('http://localhost:3000/api/admin/hod-login', { 
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();
        console.log("Full Response from Backend:", data); // Isse error pakda jayega

        if (response.ok) {
            // LocalStorage mein save karne se pehle check karein
            if (!data.token || !data.hod) {
                alert("Authentication Error: Account details could not be retrieved. Please contact the administrator.");
                return;
            }

            localStorage.setItem('token', data.token);
            localStorage.setItem('role', data.hod.role); 
            localStorage.setItem('hodDept', data.hod.department);
            localStorage.setItem('hodName', data.hod.name);

            alert(`Welcome ${data.hod.name}!`);
            window.location.href = 'hod-dashboard.html'; 
        } else {
            alert(data.message || "Invalid Credentials");
        }

    } catch (error) {
        console.error("Fetch Error:", error);
        alert("Server connection failed. Check if Backend is running and CORS is enabled.");
    } finally {
        loginBtn.innerText = "Sign In to HOD Panel";
        loginBtn.disabled = false;
    }
});