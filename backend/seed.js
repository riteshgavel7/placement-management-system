const fs = require('fs');
const crypto = require('crypto');

// MongoDB ObjectId generator
const generateObjectId = () => crypto.randomBytes(12).toString("hex");

const studentsData = [];

// Random Skills Pool taaki AI alag-alag score de sake
const skillsPool = [
  ["React", "Node.js", "MongoDB"],
  ["Java", "Spring Boot", "MySQL"],
  ["Python", "Machine Learning", "Flask"],
  ["C++", "Data Structures", "Algorithms"],
  ["PHP", "Laravel", "JavaScript"],
  ["Android Development", "Kotlin", "Firebase"]
];

for (let i = 1; i <= 200; i++) {
  const paddedNum = i.toString().padStart(3, '0');
  
  // Randomly ek skill set uthao
  const randomSkills = skillsPool[Math.floor(Math.random() * skillsPool.length)];

  const student = {
    _id: { "$oid": generateObjectId() }, 
    email: `student${paddedNum}@gmail.com`,
    __v: 0,
    isVerified: true,
    otp: null,
    otpExpire: null,
    batch: "2024",
    course: "MSC",
    department: "CSIT",
    enrollmentNo: `GGV/24/05${paddedNum}`,
    mobile: `810326${paddedNum.padStart(4, '0')}`,
    name: `Student Name ${paddedNum}`,
    
    // Sabka password 'password123' (Hashed)
    password: "$2b$10$Sbz0csGG84K1m8bmpVe6O.DktwJ02kkcwzBSGcDm8qG3W2e29KoVu",
    profilePicture: "https://ik.imagekit.io/cky9geipk/profilePictures/default.png",
    
    // AI is URL se PDF download karega
    resume: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
    
    // Randomize Skills & Marks taaki AI results different aayein
    skills: randomSkills, 
    twelfthMarks: parseFloat((Math.random() * (98 - 65) + 65).toFixed(2)), // 65% to 98%
    
    rollNo: `2401${paddedNum}`,
    status: "pending", 
    score: 0,          
    gender: i % 2 === 0 ? "Female" : "Male",
    hodEditCount: 1,
    isAdminApproved: false,
    isPaid: false,
    twelfthPassingYear: "2021"
  };

  studentsData.push(student);
}

// Write to JSON
try {
    fs.writeFileSync('students_mock.json', JSON.stringify(studentsData, null, 2));
    console.log("--------------------------------------------------");
    console.log("✅ SUCCESS: 200 Unique Students Generated!");
    console.log("📁 FILE: backend/students_mock.json");
    console.log("💡 TIP: Now import this file into MongoDB Compass.");
    console.log("--------------------------------------------------");
} catch (err) {
    console.error("❌ Error writing file:", err.message);
}