const Groq = require("groq-sdk");
require("dotenv").config();

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

exports.analyzeResume = async (resumeText, job, studentProfile = {}) => {
  try {
    if (!resumeText || resumeText.trim().length < 10) {
      return {
        score: 0,
        decision: "reject",
        reason: "Resume text missing or unreadable."
      };
    }

    const prompt = `
You are a fair and balanced ATS (Applicant Tracking System) used for ALL college departments including Computer Science, Mechanical, Civil, Electrical, Commerce, Arts, etc.

You MUST evaluate candidates based on relevance to the JOB DESCRIPTION, not only technical stack.

You MUST return ONLY valid JSON output.

---

RULES:

1. Do NOT assume missing skills automatically means rejection.
2. Evaluate based on relevance to the job role.
3. Give partial credit for transferable skills.
4. Consider all departments fairly.

---

EVALUATION STRUCTURE (100 points):

1. RELEVANT SKILLS (40 pts)
- Match skills from resume with job description
- Give partial credit for related skills
- CS roles → programming skills
- Non-CS roles → communication, analysis, tools, domain knowledge

2. PROJECTS / EXPERIENCE (25 pts)
- Technical or non-technical both count if relevant
- Internships, college projects, leadership roles included

3. ACADEMICS (20 pts)
- 90%+ = 20
- 80–89% = 17
- 70–79% = 14
- 60–69% = 11
- below 60% = 8

4. SOFT SKILLS (15 pts)
- Communication
- Leadership
- Teamwork
- Problem solving

---

DECISION RULE:
- score >= 70 → SELECT
- 50–69 → AVERAGE / REVIEW
- below 50 → REJECT

---

INPUT:

Resume:
${resumeText.slice(0, 6000)}
 
Job:
${job.description || job.title}

---

OUTPUT FORMAT (JSON ONLY):

{
  "score": number,
  "decision": "SELECT" or "AVERAGE" or "REJECT",
  "reason": "short fair explanation mentioning strengths and improvements"
}
`;

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content:
            "You are an ATS JSON evaluator system. Always respond in JSON format only."
        },
        {
          role: "user",
          content: prompt + "\n\nReturn JSON output only."
        }
      ],
      model: "llama-3.3-70b-versatile",
      response_format: { type: "json_object" },
      temperature: 0.2
    });

    let result = JSON.parse(chatCompletion.choices[0].message.content);

    const safeScore = Number(result.score) || 0;
    const safeDecision = safeScore >= 65 ? "SELECT" : "REJECT";
    const safeReason =
      result.reason || `Analysis complete with score ${safeScore}.`;

    console.log(`\n--------------------------------------------`);
    console.log(`🎯 CANDIDATE: ${studentProfile.name}`);
    console.log(`🔢 ATS SCORE: ${safeScore}/100 | [${safeDecision}]`);
    console.log(`📝 FEEDBACK: ${safeReason}`);
    console.log(`--------------------------------------------\n`);

    return {
      score: safeScore,
      decision: safeDecision.toLowerCase(),
      reason: safeReason
    };
  } catch (error) {
    console.error("❌ AI Error:", error.message);
    return {
      score: 0,
      decision: "reject",
      reason: "Process failed."
    };
  }
};