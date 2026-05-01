const axios = require('axios');
require('dotenv').config(); 

exports.analyzeResume = async (resumeText, job, studentProfile = {}) => {
  try {
    if (!resumeText || resumeText.trim().length < 10) {
        return { score: 0, decision: "reject", reason: "Resume text missing or unreadable." };
    }

    const prompt = `
  [STRICT TECHNICAL AUDIT MODE - NO ASSUMPTIONS ALLOWED]
  
  CANDIDATE: ${studentProfile.name}
  TARGET JOB: ${job.title}
  JD REQUIREMENTS: ${job.description}
  RESUME TEXT: "${resumeText.slice(0, 6000)}"

  [MANDATORY EVALUATION STEPS]
  STEP 1: Identify the primary tech stack in the JD.
  STEP 2: Scan the RESUME TEXT for EXACT matches. If a skill is not found, its score is 0.
  STEP 3: Check PROJECTS. If they are non-technical (e.g., Event Management), they get 0 points for a ${job.title} role.
  STEP 4: Verify CGPA. If CGPA is < 6.0, penalize heavily.

  [SCORING BREAKDOWN - TOTAL 100]
  1. ACADEMICS (20 pts): 
     - Score based ONLY on provided CGPA: 9.0+ (15), 8.0-8.9 (13), 7.0-7.9 (11), <7.0 (8). 
     - Fundamental subjects (DSA, OS, DBMS) match: +5 pts.
  2. DOMAIN SKILLS (35 pts): 
     - Direct technical match (JavaScript, Node.js, etc.): 25 pts. 
     - Tooling (Git, SQL): 10 pts.
     - IF CORE TECH IS MISSING: SCORE IS 0.
  3. TECHNICAL PROJECTS (25 pts): 
     - ONLY Technical/Coding projects count. Event/Volunteering = 0 pts.
  4. LEADERSHIP & GRACE (20 pts): 
     - College grace (10) + Soft skills/Leadership (10).

  [THE "BRUTAL" REJECTION RULE]
  - If the candidate does not have the technical skills required for ${job.title}, they MUST be rejected, regardless of their soft skills or CGPA.
  - DO NOT mention names or data from other candidates. 

  [OUTPUT FORMAT - JSON ONLY]
  {
    "score": number,
    "decision": "select" (if score >= 70) or "reject" (if score < 70),
    "reason": "A 4-5 sentence technical audit. Must mention: 'Missing: [skills]', 'Academic Score: [score]', and 'Project Feedback: [feedback]'. Be direct and harsh if the candidate is not a fit."
  }
`;

    const response = await axios.post('http://localhost:11434/api/generate', {
      model: "llama3.1",
      system: `Analyze ${studentProfile.name} ONLY. Do not use info from previous candidates. Provide scores based on ${job.description}.`,
      prompt: prompt,
      stream: false,
      format: "json",
      options: {
        temperature: 0.4, // Kam temperature = Zyada accuracy
        num_predict: 800 
      }
    });

    let result = JSON.parse(response.data.response);

    // Score and Reason Safety
    const safeScore = Number(result.score) || 0;
    const finalDecision = safeScore >= 65 ? "selected" : "rejected"; // Framework match
    
    let safeReason = result.reason;
    if (Array.isArray(safeReason)) safeReason = safeReason.join(" ");
    if (typeof safeReason === 'object') safeReason = JSON.stringify(safeReason);

    console.log(`\n--- [OLLAMA LOCAL ANALYSIS] ---`);
    console.log(`🎯 CANDIDATE: ${studentProfile.name}`);
    console.log(`🔢 ATS SCORE: ${safeScore}/100 | [${finalDecision.toUpperCase()}]`);
    console.log(`📝 FEEDBACK: ${safeReason}`);
    console.log(`-------------------------------\n`);
    
    return {
        score: safeScore,
        decision: finalDecision,
        reason: safeReason
    };

  } catch (error) {
    console.error("❌ Ollama Service Error:", error.message);
    return { score: 0, decision: "reject", reason: `Local processing failed.` };
  }
};