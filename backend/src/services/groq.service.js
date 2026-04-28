const Groq = require("groq-sdk");
require('dotenv').config(); 

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

exports.analyzeResume = async (resumeText, job, studentProfile = {}) => {
  try {
    if (!resumeText || resumeText.trim().length < 10) {
        return { score: 0, decision: "reject", reason: "Resume text missing or unreadable." };
    }

    const sanitizedResume = resumeText.slice(0, 6000);

    const prompt = `
      Act as an ATS Expert. Compare this Resume against the JD and Student Profile.
      
      [JOB DATA]
      Title: ${job.title}
      JD Description: ${job.description}
      
      [STUDENT PROFILE]
      Name: ${studentProfile.name || 'N/A'}
      Dept: ${studentProfile.department || 'N/A'}

      [RESUME CONTENT]
      "${sanitizedResume}"

      [SCORING RULES]
      0. Holistic evaluation based on the entire resume content.
      1. Technical Skills (40pt): Match JD keywords to Resume.
      2. Projects (10pt): 10pt per project.
      3. Education (20pt): 20pt for job related fields.
      4. Contact (10pt): 10pt for Email/Phone.
      5. Free for good behavior in college (10pt): 10pt free no resume or keywords required gift from the college.

      [STRICT OUTPUT FORMAT]
      Return ONLY a JSON object with exactly these fields:
      {
        "score": number,
        "decision": "select" or "reject",
        "reason": "A detailed 1-3 sentence explanation of why this score was given, mentioning specific missing or matching skills."
      }
    `;

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { 
          role: "system", 
          content: "You are a precise JSON-only recruiter. You MUST always provide a 'reason' field in your JSON output explaining the score breakdown." 
        },
        { role: "user", content: prompt }
      ],
      model: "llama-3.3-70b-versatile",
      response_format: { type: "json_object" },
      temperature: 0.3 
    });

    let result;
    try {
        result = JSON.parse(chatCompletion.choices[0].message.content);
    } catch (e) {
        return { score: 0, decision: "reject", reason: "AI JSON Parse Error" };
    }

    // Validation to ensure fields exist
    const safeScore = Number(result.score) || 0;
    const safeDecision = (result.decision || (safeScore >= 65 ? "select" : "reject")).toUpperCase();
    const safeReason = result.reason || `Scored ${safeScore}/100 based on skill matching.`;

    // Terminal Logging
    console.log(`\n--------------------------------------------`);
    console.log(`🎯 STUDENT: ${studentProfile.name || 'Unknown'}`);
    console.log(`🔢 SCORE: ${safeScore}/100 | [${safeDecision}]`);
    console.log(`📝 REASON: ${safeReason}`);
    console.log(`--------------------------------------------\n`);
    
    return {
        score: safeScore,
        decision: safeDecision.toLowerCase(),
        reason: safeReason
    };

  } catch (error) {
    console.error("❌ Groq Service Critical Error:", error.message);
    return { score: 0, decision: "reject", reason: `AI process failed: ${error.message}` };
  }
};