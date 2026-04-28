const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");
const profileForm = document.getElementById("profileForm");
const getOtpBtn = document.getElementById("getOtpBtn");
const otpSection = document.getElementById("otpSection");

let serverOtp = "";

const API_BASE = "http://localhost:3000/api/students";
const API_JOB = "http://localhost:3000/api/jobs/all";
const API_APPLY = "http://localhost:3000/api/jobs/apply";

// ================= LOGIN  =================
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
        alert(json.message || "Login failed");
      }
    } catch (error) {
      console.error(error);
      alert("Server error");
    }
  });
}


// ================= STEP 1: GET OTP (FIXED WITH IF CHECK) =======================
if (getOtpBtn) {
  getOtpBtn.onclick = async () => {
      const emailElem = document.getElementById("regEmail");
      const enrollElem = document.getElementById("enrollmentNo");
  
      if (!emailElem || !enrollElem) {
          return alert("Critical Error: HTML inputs mein ID 'regEmail' ya 'enrollmentNo' missing hai!");
      }
  
      const email = emailElem.value;
      const enrollmentNo = enrollElem.value;
  
      if (!email || !enrollmentNo) {
          return alert("Pehle Email aur Enrollment Number bharo!");
      }
  
      getOtpBtn.innerText = "Sending OTP...";
      getOtpBtn.disabled = true;
  
      try {
          const res = await fetch("http://localhost:3000/api/students/send-otp", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ email, enrollmentNo, type: "register" }),
          });
          
          if (!res.ok) {
              const errorData = await res.json();
              throw new Error(errorData.message || "OTP send karne mein error");
          }
  
          const data = await res.json();
          serverOtp = data.tempOtp; 
          alert("OTP bhej diya gaya hai!");
          if (otpSection) otpSection.style.display = "block";
          getOtpBtn.style.display = "none"; 
  
      } catch (err) {
          alert("Error: " + err.message);
          getOtpBtn.innerText = "Get OTP to Register";
          getOtpBtn.disabled = false;
      }
  };
}

// ================= STEP 2: REGISTER + PAYMENT (FIXED WITH IF CHECK) =======================
if (registerForm) {
  registerForm.onsubmit = async (e) => {
    e.preventDefault();
    
    const userOtpElem = document.getElementById("regOtp");
    const userOtp = userOtpElem ? userOtpElem.value : "";

    if (userOtp !== serverOtp) {
        return alert("Bhai galat OTP hai, check kar ke phir se daal!");
    }

    try {
        const orderRes = await fetch("http://localhost:3000/api/payment/create-order", { 
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                email: document.getElementById("regEmail").value,
                enrollmentNo: document.getElementById("enrollmentNo").value,
                rollNo: document.getElementById("rollNo").value
            })
        });

        const order = await orderRes.json();

        if (!orderRes.ok) {
            alert(order.message); 
            return; 
        }

        // --- BYPASS LOGIC: Agar Amount 0 hai ya isFree true hai ---
        if (order.isFree || order.amount === 0) {
            alert("Free Registration! Details upload ho rahi hain...");
            // Seedha register API call bina Razorpay popup ke
            return handleFinalRegistration(null); 
        }

        // --- RAZORPAY FLOW: Wahi purana options object ---
        const options = {
            key: "rzp_test_Sh0enw3UAfHi0P", 
            amount: order.amount,
            currency: "INR",
            name: "Placement Portal",
            order_id: order.id,
            handler: async function (response) {
                alert("Payment Success! Details upload ho rahi hain...");
                handleFinalRegistration(response); // Logic ko function mein move kar diya
            },
            modal: { ondismiss: function() { alert("Payment window closed."); } },
            theme: { color: "#222" }
        };
        
        const rzp = new window.Razorpay(options);
        rzp.open();

    } catch (err) { alert("System Error: " + err.message); }
  };
}

// Yeh function payment response ke baad registration details ko final submit karega
async function handleFinalRegistration(response) {
    const formData = new FormData(registerForm);
    
    if (response) {
        // PAID FLOW
        formData.append("razorpay_payment_id", response.razorpay_payment_id);
        formData.append("razorpay_order_id", response.razorpay_order_id);
        formData.append("razorpay_signature", response.razorpay_signature);
        formData.append("payment_mode", "PAID");
    } else {
        // FREE FLOW
        formData.append("payment_mode", "FREE");
        // Kuch dummy values taaki backend verification crash na ho
        formData.append("razorpay_payment_id", "FREE_PAY_ID");
        formData.append("razorpay_order_id", "FREE_ORDER_ID");
        formData.append("razorpay_signature", "FREE_SIGNATURE");
    }

    const finalRes = await fetch("http://localhost:3000/api/students/register", {
        method: "POST",
        body: formData 
    });
    
    const finalData = await finalRes.json();
    if(finalRes.ok) {
        alert("Registration Successful!");
        window.location.href = "index.html";
    } else {
        // Agar yahan "Fraud Detected" aa raha hai, toh niche backend wala change karo
        alert("Error: " + finalData.message);
    }
}

// ================= FORGOT PASSWORD =================
const emailForm = document.getElementById("emailForm");
const otpForm = document.getElementById("otpForm");

if (emailForm) {
  emailForm.onsubmit = async (e) => { 
    e.preventDefault();
    const emailElem = document.getElementById("email");
    const emailInput = emailElem ? emailElem.value : "";
    try {
      const res = await fetch(`${API_BASE}/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailInput, type: "forget" }),
      });
      const data = await res.json();
      if (res.ok) {
        alert("OTP bhej diya gaya hai!");
        serverOtp = data.tempOtp; 
        localStorage.setItem("resetEmail", emailInput);
        emailForm.style.display = "none";
        if (otpForm) otpForm.style.display = "block";
      } else {
        alert(data.message || "Error sending OTP");
      }
    } catch (err) {
      console.error(err);
      alert("Server error");
    }
  };
}

if (otpForm) {
  otpForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = localStorage.getItem("resetEmail");
    const otpInput = document.getElementById("otp");
    const passInput = document.getElementById("newPassword");
    const userEnteredOtp = otpInput ? otpInput.value : "";
    const newPassword = passInput ? passInput.value : "";

    if (userEnteredOtp !== serverOtp) {
       return alert("Bhai OTP galat hai! Email check karo.");
    }

    try {
      const res = await fetch(`${API_BASE}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp: userEnteredOtp, password: newPassword })
      });
      const data = await res.json();
      if (res.ok) {
        alert("Password reset ho gaya! Ab login karo.");
        localStorage.removeItem("resetEmail");
        window.location.href = "index.html";
      } else {
        alert(data.message);
      }
    } catch (err) {
      console.error(err);
      alert("Server error");
    }
  });
}

// ================= PROFILE & LOGOUT =================

// 1. Page Load Check: Sirf profile.html par hi trigger hoga
if (window.location.pathname.includes("profile.html")) {
    const token = localStorage.getItem("token");
    if (!token) {
        window.location.replace("index.html"); // .replace use karne se back button loop nahi banta
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

        // Agar token expire ho gaya ya unauthorized hai
        if (res.status === 401 || res.status === 403) {
            localStorage.removeItem("token");
            window.location.replace("index.html");
            return;
        }

        if (!res.ok) {
            console.error("Profile fetch failed:", data.message);
            return;
        }

        // Backend response se student object nikalna
        const s = data.student;
        if (!s) return;

        // --- Helper: UI mein text set karne ke liye ---
        const setUI = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.innerText = val || "-";
        };

        // --- Data Mapping ---
        setUI("name", s.name);
        setUI("email", s.email);
        setUI("mobile", s.mobile);
        setUI("enrollmentNo", s.enrollmentNo);
        setUI("rollNo", s.rollNo);
        setUI("department", s.department);
        setUI("course", s.course);
        setUI("batch", s.batch);
        setUI("gender", s.gender);
        setUI("twelfthMarks", s.twelfthMarks ? s.twelfthMarks + "%" : "-");
        setUI("twelfthPassingYear", s.twelfthPassingYear);
        setUI("paymentId", s.paymentId);
        setUI("isVerifiedBadge", s.isVerified ? "Verified ✅" : "Pending ⏳");

        // --- Status Badge ---
        const statusElem = document.getElementById("status");
        if (statusElem) {
            statusElem.innerText = (s.status || "pending").toUpperCase();
            statusElem.className = `status-badge ${s.status.toLowerCase()}`;
        }

        // --- Links & Images ---
        const resElem = document.getElementById("resume");
        if (resElem) {
            resElem.href = s.resume || "#";
            if (!s.resume) resElem.style.pointerEvents = "none"; // Resume nahi hai to link disable
        }

        const picElem = document.getElementById("profilePic");
        if (picElem) {
            picElem.src = s.profilePicture || "default-avatar.png";
            picElem.onerror = () => { picElem.src = "default-avatar.png"; };
        }

    } catch (error) {
        console.error("Profile load error:", error);
    }
}

// Logout Function
function logout() {
    if (confirm("Kya aap logout karna chahte hain?")) {
        localStorage.removeItem("token");
        window.location.replace("index.html");
    }
}