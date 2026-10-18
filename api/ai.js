import { getAdminServices, verifyUser } from "../lib/firebaseAdmin.js";

const ALLOWED_TASKS = new Set([
  "explain",
  "solver",
  "quiz",
  "notes",
  "plan",
  "writing",
  "coding",
  "translate"
]);

const MAX_DAILY_REQUESTS = 20;
const MAX_PROMPT_LENGTH = 6000;

function cleanText(value, max = 100) {
  return typeof value === "string"
    ? value.trim().slice(0, max)
    : "";
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({
      ok: false,
      error: "Method not allowed."
    });
  }

  try {
    if (!process.env.GEMINI_API_KEY) {
      return res.status(503).json({
        ok: false,
        error: "AI service is not configured yet."
      });
    }

    const user = await verifyUser(req);
    const body = req.body || {};

    const task = cleanText(body.task, 30);
    const prompt = cleanText(body.prompt, MAX_PROMPT_LENGTH);
    const grade = cleanText(body.grade, 60);
    const subject = cleanText(body.subject, 100);
    const language = cleanText(body.language, 60) || "English";
    const curriculum = cleanText(body.curriculum, 100) || "General";

    if (!ALLOWED_TASKS.has(task)) {
      return res.status(400).json({
        ok: false,
        error: "Unsupported AI task."
      });
    }

    if (!prompt || prompt.length < 2) {
      return res.status(400).json({
        ok: false,
        error: "Please enter a question or prompt."
      });
    }

    const { db } = getAdminServices();
    const now = new Date();
    const day = now.toISOString().slice(0, 10);
    const rateRef = db.collection("aiRateLimits").doc(user.uid);

    const usage = await db.runTransaction(async transaction => {
      const snapshot = await transaction.get(rateRef);
      const current = snapshot.exists ? snapshot.data() : {};
      const count = current.day === day ? Number(current.count || 0) : 0;

      if (count >= MAX_DAILY_REQUESTS) {
        const error = new Error("Daily AI limit reached. Try again tomorrow.");
        error.status = 429;
        throw error;
      }

      transaction.set(rateRef, {
        day,
        count: count + 1,
        updatedAt: new Date().toISOString()
      });

      return { remainingToday: MAX_DAILY_REQUESTS - count - 1 };
    });

    const taskInstructions = {
      explain: "Explain the topic step by step with a simple example.",
      solver: "Solve the educational problem step by step. Show reasoning and check the result.",
      quiz: "Create a short quiz with questions, options, and an answer key at the end.",
      notes: "Create clear revision notes with headings, key points, and examples.",
      plan: "Create a realistic study plan with breaks and achievable tasks.",
      writing: "Help improve the writing, explain changes, and avoid inventing facts.",
      coding: "Explain the code step by step and provide safe, educational examples.",
      translate: "Translate the supplied text accurately and explain ambiguous terms when useful."
    };

    const systemPrompt = [
      "You are EduSpark, an educational tutor for learners of different ages.",
      "Adapt explanations to the learner's grade and stated level.",
      "Use age-appropriate, respectful, inclusive language.",
      "Do not pretend to know a student's private records.",
      "Do not invent sources, facts, citations, grades, or qualifications.",
      "For uncertain or high-stakes topics, say what needs verification.",
      "For dangerous requests, redirect toward safe educational information.",
      "Respond in the requested language where possible.",
      `Learner level: ${grade || "not specified"}.`,
      `Subject: ${subject || "general"}.`,
      `Curriculum: ${curriculum}.`,
      `Response language: ${language}.`,
      `Task: ${taskInstructions[task]}`
    ].join("\n");

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": process.env.GEMINI_API_KEY
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: systemPrompt }]
          },
          contents: [{
            role: "user",
            parts: [{ text: prompt }]
          }],
          generationConfig: {
            temperature: 0.5,
            maxOutputTokens: 1800
          }
        })
      }
    );

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.error("Gemini provider error status:", response.status);

      return res.status(502).json({
        ok: false,
        error: "The AI provider could not complete this request. Please try again."
      });
    }

    const answer = (data.candidates?.[0]?.content?.parts || [])
      .map(part => part.text || "")
      .join("\n")
      .trim();

    if (!answer) {
      return res.status(502).json({
        ok: false,
        error: "The AI returned an empty response. Please try again."
      });
    }

    return res.status(200).json({
      ok: true,
      task,
      answer,
      remainingToday: usage.remainingToday
    });
  } catch (error) {
    const status = Number(error.status) || 500;

    if (status >= 500) {
      console.error("EduSpark AI request failed:", error.message);
    }

    return res.status(status).json({
      ok: false,
      error: status === 401
        ? "Your session has expired. Please sign in again."
        : status === 429
          ? error.message
          : status === 500
            ? "The server could not complete the request."
            : error.message || "Request failed."
    });
  }
  }


