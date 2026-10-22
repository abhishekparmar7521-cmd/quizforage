
const express = require("express");
const cors = require("cors");
require("dotenv").config();

const { GoogleGenAI } = require("@google/genai");

const app = express();
const PORT = 3010;

app.use(cors());
app.use(express.json());

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});

// Test server
app.get("/", (req, res) => {
    res.send("QuizForge AI server is running!");
});

// Retry temporary Gemini API failures
async function generateQuizWithRetry(prompt) {
    for (let attempt = 1; attempt <= 3; attempt++) {
        try {
            return await ai.models.generateContent({
                model: "gemini-3.5-flash-lite",
                contents: prompt,
                config: {
                    responseMimeType: "application/json"
                }
            });
        } catch (error) {
            const status = error.status;

            if (
                ![429, 500, 502, 503, 504].includes(status) ||
                attempt === 3
            ) {
                throw error;
            }

            const delay = attempt * 2000;
            console.log(
                `Gemini error ${status}. Retrying in ${delay / 1000} seconds...`
            );

            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }

    throw new Error("Quiz generation failed after retries.");
}

// Generate quiz
app.post("/api/generate-quiz", async (req, res) => {
    console.log("Quiz generation route reached!");
    console.log("Received topic:", req.body.topic);

    try {
        const { topic, difficulty, questionCount } = req.body;

        if (
            typeof topic !== "string" ||
            !topic.trim() ||
            topic.trim().length > 150
        ) {
            return res.status(400).json({
                error: "Please enter a valid topic."
            });
        }

        const level = ["Easy", "Medium", "Hard"].includes(difficulty)
            ? difficulty
            : "Easy";

        const count = Number(questionCount);

        if (![5, 10].includes(count)) {
            return res.status(400).json({
                error: "Question count must be 5 or 10."
            });
        }

        const prompt = `
Create exactly ${count} multiple-choice quiz questions
about "${topic.trim()}".

Difficulty: ${level}.

Return ONLY valid JSON in this format:
{
  "questions": [
    {
      "question": "Question text",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": 0,
      "explanation": "Short explanation"
    }
  ]
}

Rules:
- Create exactly ${count} questions.
- Each question must have exactly four options.
- correctAnswer must be an integer from 0 to 3.
- Every question must have one correct answer.
- Questions must match the topic and difficulty.
- Return no Markdown fences or extra text.
`;

        // Call the retry function
        const response = await generateQuizWithRetry(prompt);

        if (!response.text) {
            throw new Error("Gemini returned an empty response.");
        }

        const result = JSON.parse(response.text);

        if (
            !Array.isArray(result.questions) ||
            result.questions.length !== count ||
            !result.questions.every(q =>
                typeof q.question === "string" &&
                Array.isArray(q.options) &&
                q.options.length === 4 &&
                q.options.every(option => typeof option === "string") &&
                Number.isInteger(q.correctAnswer) &&
                q.correctAnswer >= 0 &&
                q.correctAnswer <= 3 &&
                typeof q.explanation === "string"
            )
        ) {
            throw new Error("The AI returned an invalid quiz format.");
        }

        res.json({
            topic: topic.trim(),
            difficulty: level,
            questions: result.questions
        });

    } catch (error) {
        console.error("Quiz generation failed:", error);

        if (error.status === 503 || error.status === 429) {
            return res.status(503).json({
                error: "The AI service is busy. Please try again shortly."
            });
        }

        res.status(500).json({
            error: "Could not generate the quiz. Check the server terminal."
        });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
