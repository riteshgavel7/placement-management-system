const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");
const getOtpBtn = document.getElementById("getOtpBtn");
const otpSection = document.getElementById("otpSection");

let serverOtp = "";

const RENDER_URL = "http://localhost:3000";
const API_BASE = `${RENDER_URL}/api/students`;

// ================= LOGIN SECTION =================
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(loginForm));
    try {
      const res = await fetch(`${API_BASE}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (res.ok && json.token) {
        localStorage.setItem("token", json.token);
        window.location.href = "profile.html";
      } else {
        alert(json.message || "Invalid credentials. Please try again.");
      }
    } catch (error) {
      alert("Server is currently unreachable. Please try again later.");
    }
  });
}

// --- DYNAMIC YEAR LIMIT ---
const currentYear = new Date().getFullYear();
const yearInput = document.getElementById('twelfthPassingYear');
if (yearInput) yearInput.max = currentYear;

// ================= STEP 1: OTP REQUEST =======================
if (getOtpBtn) {
    getOtpBtn.onclick = async () => {
        const emailElem = document.getElementById("regEmail");
        const enrollElem = document.getElementById("enrollmentNo");
        const marksElem = document.querySelector('input[name="twelfthMarks"]');
        const yearElem = document.getElementById("twelfthPassingYear");

        if (!emailElem || !enrollElem) return alert("System Error: Required form fields are missing.");
        
        if (yearElem && parseInt(yearElem.value) > currentYear) {
            return alert("Validation Error: 12th Passing Year cannot be in the future.");
        }
        if (marksElem && (parseFloat(marksElem.value) > 100 || parseFloat(marksElem.value) < 0)) {
            return alert("Validation Error: Percentage must be between 0 and 100.");
        }
       const files = document.querySelectorAll('input[type="file"]');

       for (let fileInput of files) {
         if (fileInput.files.length > 0) {
        const fileSize = fileInput.files[0].size; 
        
        
        if (fileSize > 1024 * 1024) { 
            alert(`Validation Error: The file "${fileInput.name}" exceeds the 1MB limit. Please upload a smaller file.`); 
            return;
        }
    }
}

        getOtpBtn.innerText = "Processing...";
        getOtpBtn.disabled = true;

        try {
            const res = await fetch(`${API_BASE}/send-otp`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: emailElem.value, enrollmentNo: enrollElem.value, type: "register" }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.message || "Failed to send OTP.");

            serverOtp = data.tempOtp;
            alert("Verification OTP has been sent to your registered email.");
            if (otpSection) otpSection.style.display = "block";
            getOtpBtn.style.display = "none";

        } catch (err) {
            alert("Error: " + err.message);
            getOtpBtn.innerText = "Get OTP to Register";
            getOtpBtn.disabled = false;
        }
    };
}

// ================= STEP 2: REGISTER & PAYMENT FLOW =======================
if (registerForm) {
    registerForm.onsubmit = async (e) => {
        e.preventDefault();
        const userOtp = document.getElementById("regOtp")?.value || "";

        if (userOtp !== serverOtp) {
            return alert("Invalid OTP. Please verify the code sent to your email.");
        }

        try {
            const orderRes = await fetch(`${RENDER_URL}/api/payment/create-order`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: document.getElementById("regEmail").value,
                    enrollmentNo: document.getElementById("enrollmentNo").value,
                    rollNo: document.getElementById("rollNo").value
                })
            });

            const order = await orderRes.json();
            if (!orderRes.ok) return alert(order.message);

            if (order.isFree || order.amount === 0) {
                alert("Free registration eligibility confirmed. Processing details...");
                return handleFinalRegistration(null);
            }

            const options = {
                key: "rzp_test_Sh0enw3UAfHi0P",
                amount: order.amount,
                currency: "INR",
                name: "Placement Portal",
                order_id: order.id,
                handler: (res) => handleFinalRegistration(res),
                modal: { ondismiss: () => alert("Transaction cancelled by user.") },
                theme: { color: "#1a1a1a" }
            };

            new window.Razorpay(options).open();
        } catch (err) { alert("Transaction Error: " + err.message); }
    };
}

// ================= STEP 3: FINAL SUBMISSION =======================
async function handleFinalRegistration(response) {
    const formData = new FormData(registerForm);

    if (response) {
        formData.append("razorpay_payment_id", response.razorpay_payment_id);
        formData.append("razorpay_order_id", response.razorpay_order_id);
        formData.append("razorpay_signature", response.razorpay_signature);
        formData.append("payment_mode", "PAID");
    } else {
        formData.append("payment_mode", "FREE");
        formData.append("razorpay_payment_id", "FREE_REG_ID");
        formData.append("razorpay_order_id", "FREE_ORDER_ID");
        formData.append("razorpay_signature", "FREE_SIGNATURE");
    }

    try {
        const finalRes = await fetch(`${API_BASE}/register`, {
            method: "POST",
            body: formData
        });

        if (finalRes.ok) {
            alert("Registration successful! Your digital receipt is being generated.");
            generateReceipt(formData, response ? response.razorpay_payment_id : "FREE_REGISTRATION");
            setTimeout(() => window.location.href = "home.html", 3000);
        } else {
            const finalData = await finalRes.json();
            alert("Registration Error: " + finalData.message);
        }
    } catch (err) { alert("Submission Error: " + err.message); }
}


// ================= FINAL PDF RECEIPT GENERATOR =======================
async function generateReceipt(formData, paymentId) {
    console.log("Initializing PDF Generation...");

    // 1. Library Access Logic (Handling Modern Namespace)
    const lib = window.jspdf;
    
    if (!lib || !lib.jsPDF) {
        console.error("jsPDF not found. Retrying once...");
        // Agar library load hone mein thoda waqt le rahi hai
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    if (!window.jspdf || !window.jspdf.jsPDF) {
        alert("Registration Successful!. Please check your internet or refresh.");
        return;
    }

    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const date = new Date().toLocaleDateString('en-GB');

        // --- Design: Header ---
        doc.setFillColor(26, 26, 26); // Dark Gray
        doc.rect(0, 0, 210, 40, 'F');
        
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22);
        doc.text("PLACEMENT PORTAL", 105, 20, { align: "center" });
        
        doc.setFontSize(10);
        doc.text("Official Registration Confirmation Receipt", 105, 30, { align: "center" });

        // --- Data Preparation ---
        const tableData = [
            ['Student Name', formData.get("name") || 'N/A'],
            ['Enrollment No', formData.get("enrollmentNo") || 'N/A'],
            ['Roll Number', formData.get("rollNo") || 'N/A'],
            ['Department', formData.get("department") || 'N/A'],
            ['Transaction ID', paymentId || 'N/A'],
            ['Date of Issue', date],
            ['Payment Status', formData.get("payment_mode") || 'SUCCESS']
        ];

        // --- Table Logic (AutoTable) ---
        if (typeof doc.autoTable === 'function') {
            doc.autoTable({
                startY: 50,
                head: [['Field', 'Description']],
                body: tableData,
                theme: 'grid',
                headStyles: { fillColor: [40, 40, 40], textColor: [255, 255, 255] },
                styles: { fontSize: 10, cellPadding: 5 },
                alternateRowStyles: { fillColor: [245, 245, 245] },
                margin: { left: 15, right: 15 }
            });
        } else {
            // Fallback: Agar AutoTable plugin load nahi hua toh simple text
            doc.setTextColor(0, 0, 0);
            let y = 60;
            tableData.forEach(item => {
                doc.text(`${item[0]}: ${item[1]}`, 20, y);
                y += 10;
            });
        }

        // --- Footer ---
        const finalY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 20 : 150;
        doc.setFontSize(9);
        doc.setTextColor(100);
        doc.text("This is a computer-generated receipt and does not require a physical signature.", 105, finalY, { align: "center" });

        // --- Save PDF ---
        const fileName = `Receipt_${formData.get("enrollmentNo") || 'Student'}.pdf`;
        doc.save(fileName);
        console.log("PDF Saved Successfully: " + fileName);

    } catch (err) {
        console.error("Critical PDF Logic Error:", err);
        alert("Registration Success! Receipt generation failed. Please check your internet or refresh.");
    }
}

// ================= PASSWORD RECOVERY =================
const emailForm = document.getElementById("emailForm");
const otpForm = document.getElementById("otpForm");

if (emailForm) {
  emailForm.onsubmit = async (e) => { 
    e.preventDefault();
    const emailElem = document.getElementById("email");
    try {
      const res = await fetch(`${API_BASE}/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailElem.value, type: "forget" }),
      });
      const data = await res.json();
      if (res.ok) {
        alert("A recovery OTP has been sent to your email.");
        serverOtp = data.tempOtp; 
        localStorage.setItem("resetEmail", emailElem.value);
        emailForm.style.display = "none";
        if (otpForm) otpForm.style.display = "block";
      } else {
        alert(data.message || "Failed to initiate password reset.");
      }
    } catch (err) {
      alert("Server Error: Unable to process request.");
    }
  };
}

if (otpForm) {
  otpForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = localStorage.getItem("resetEmail");
    const userEnteredOtp = document.getElementById("otp")?.value || "";
    const newPassword = document.getElementById("newPassword")?.value || "";

    if (userEnteredOtp !== serverOtp) {
       return alert("Incorrect OTP. Access denied.");
    }

    try {
      const res = await fetch(`${API_BASE}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp: userEnteredOtp, password: newPassword })
      });
      if (res.ok) {
        alert("Password updated successfully. You can now log in.");
        localStorage.removeItem("resetEmail");
        window.location.href = "index.html";
      } else {
        const data = await res.json();
        alert(data.message);
      }
    } catch (err) {
      alert("Error: Password reset failed.");
    }
  });
}
  
// ================= PROFILE MANAGEMENT =================

if (window.location.pathname.includes("profile.html")) {
    const token = localStorage.getItem("token");
    if (!token) {
        window.location.replace("index.html");
    } else {
        loadProfile();
    }
}

async function loadProfile() {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
        const res = await fetch(`${API_BASE}/profile`, {
            method: "GET",
            headers: { 
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            }
        });

        const data = await res.json();

        if (res.status === 401 || res.status === 403) {
            localStorage.removeItem("token");
            window.location.replace("index.html");
            return;
        }

        const s = data.student;
        if (!s) return;

        const setUI = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.innerText = val || "N/A";
        };

        setUI("name", s.name);
        setUI("email", s.email);
        setUI("mobile", s.mobile);
        setUI("enrollmentNo", s.enrollmentNo);
        setUI("rollNo", s.rollNo);
        setUI("department", s.department);
        setUI("course", s.course);
        setUI("batch", s.batch);
        setUI("gender", s.gender);
        setUI("twelfthMarks", s.twelfthMarks ? s.twelfthMarks + "%" : "N/A");
        setUI("twelfthPassingYear", s.twelfthPassingYear);
        setUI("paymentId", s.paymentId);
        setUI("isVerifiedBadge", s.isVerified ? "Verified ✅" : "Verification Pending ⏳");

        const statusElem = document.getElementById("status");
        if (statusElem) {
            statusElem.innerText = (s.status || "pending").toUpperCase();
            statusElem.className = `status-badge ${s.status.toLowerCase()}`;
        }

        const resElem = document.getElementById("resume");
        if (resElem) {
            resElem.href = s.resume || "#";
        }

        const picElem = document.getElementById("profilePic");
        if (picElem) {
            picElem.src = s.profilePicture || "default-avatar.png";
        }

    } catch (error) {
        console.error("Profile synchronization error:", error);
    }
}

function logout() {
    if (confirm("Are you sure you want to terminate the current session?")) {
        localStorage.removeItem("token");
        window.location.replace("index.html");
    }
}