
const topicInput = document.getElementById("topic");
const difficultyInput = document.getElementById("difficulty");
const questionCountInput = document.getElementById("questionCount");

const generateBtn = document.getElementById("generateBtn");
const nextBtn = document.getElementById("nextBtn");
const submitBtn = document.getElementById("submitBtn");
const restartBtn = document.getElementById("restartBtn");

const message = document.getElementById("message");
const quizSection = document.getElementById("quizSection");
const quizTitle = document.getElementById("quizTitle");
const questionContainer = document.getElementById("questionContainer");
const resultSection = document.getElementById("resultSection");
const resultContainer = document.getElementById("resultContainer");

// Temporary sample questions.
// Later, Gemma AI will generate these dynamically.
const sampleQuestions = [
    {
        question: "Which language is used to add interactivity to websites?",
        options: ["HTML", "CSS", "JavaScript", "SQL"],
        correctAnswer: "JavaScript",
        explanation: "JavaScript adds interactive behavior to web pages."
    },
    {
        question: "Which keyword declares a block-scoped variable?",
        options: ["var", "let", "print", "echo"],
        correctAnswer: "let",
        explanation: "let declares a variable whose scope is limited to its block."
    },
    {
        question: "Which method displays a message in the browser console?",
        options: [
            "console.log()",
            "document.writeLine()",
            "print.console()",
            "message.show()"
        ],
        correctAnswer: "console.log()",
        explanation: "console.log() prints information to the developer console."
    },
    {
        question: "Which symbol is commonly used for strict equality?",
        options: ["=", "==", "===", "!="],
        correctAnswer: "===",
        explanation: "=== compares values without performing type conversion."
    },
    {
        question: "Which array method adds an item to the end?",
        options: ["pop()", "push()", "shift()", "slice()"],
        correctAnswer: "push()",
        explanation: "push() appends one or more elements to an array."
    }
];

let questions = [];
let currentQuestion = 0;
let score = 0;
let userAnswers = [];

generateBtn.addEventListener("click", startQuiz);
nextBtn.addEventListener("click", showNextQuestion);
submitBtn.addEventListener("click", finishQuiz);
restartBtn.addEventListener("click", resetQuiz);


async function startQuiz() {
    const topic = topicInput.value.trim();
    const difficulty = difficultyInput.value;
    const count = Number(questionCountInput.value);

    if (!topic) {
        message.textContent = "Please enter a topic first.";
        topicInput.focus();
        return;
    }

    generateBtn.disabled = true;
    message.textContent = "Generating your AI quiz... Please wait.";

    try {
        const response = await fetch(
            "http://127.0.0.1:3010/api/generate-quiz",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    topic: topic,
                    difficulty: difficulty,
                    questionCount: count
                })
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Failed to generate quiz.");
        }

        if (!Array.isArray(data.questions) || data.questions.length === 0) {
            throw new Error("The AI returned no questions.");
        }

        // Convert the backend answer index into the option text.
        questions = data.questions.map(q => ({
            question: q.question,
            options: q.options,
            correctAnswer: q.options[q.correctAnswer],
            explanation: q.explanation
        }));

        currentQuestion = 0;
        score = 0;
        userAnswers = [];

        quizTitle.textContent = `${data.topic} Quiz`;
        message.textContent =
            `AI Quiz | Difficulty: ${data.difficulty}`;

        resultSection.hidden = true;
        quizSection.hidden = false;

        showQuestion();

    } catch (error) {
        console.error("Quiz generation error:", error);
        message.textContent = error.message ||
            "Unable to generate quiz. Please try again.";
    } finally {
        generateBtn.disabled = false;
    }
}


function showQuestion() {
    const q = questions[currentQuestion];

    questionContainer.innerHTML = "";

    const card = document.createElement("div");
    card.className = "question-card";

    const heading = document.createElement("h3");
    heading.textContent =
        `Question ${currentQuestion + 1} of ${questions.length}: ${q.question}`;

    card.appendChild(heading);

    q.options.forEach(option => {
        const label = document.createElement("label");
        label.className = "option";

        const radio = document.createElement("input");
        radio.type = "radio";
        radio.name = "answer";
        radio.value = option;

        label.appendChild(radio);
        label.appendChild(document.createTextNode(option));
        card.appendChild(label);
    });

    questionContainer.appendChild(card);

    nextBtn.hidden = true;
    submitBtn.hidden = true;

    const answerBtn = document.createElement("button");
    answerBtn.textContent = "Check Answer";
    answerBtn.addEventListener("click", checkAnswer);

    questionContainer.appendChild(answerBtn);
}

function checkAnswer() {
    const selected = document.querySelector(
        'input[name="answer"]:checked'
    );

    if (!selected) {
        message.textContent = "Please select an answer.";
        return;
    }

    const q = questions[currentQuestion];
    const isCorrect = selected.value === q.correctAnswer;

    userAnswers[currentQuestion] = selected.value;

    if (isCorrect) {
        score++;
    }

    const feedback = document.createElement("p");
    feedback.className = `feedback ${isCorrect ? "correct" : "incorrect"}`;

    feedback.textContent = isCorrect
        ? "Correct! " + q.explanation
        : `Incorrect. Correct answer: ${q.correctAnswer}. ${q.explanation}`;

    questionContainer.appendChild(feedback);

    document.querySelectorAll('input[name="answer"]').forEach(input => {
        input.disabled = true;
    });

    const checkBtn = questionContainer.querySelector("button");
    checkBtn.disabled = true;

    message.textContent = "";

    if (currentQuestion < questions.length - 1) {
        nextBtn.hidden = false;
    } else {
        submitBtn.hidden = false;
    }
}

function showNextQuestion() {
    currentQuestion++;
    showQuestion();
}

function finishQuiz() {
    quizSection.hidden = true;
    resultSection.hidden = false;

    const percentage = Math.round((score / questions.length) * 100);

    let performance;

    if (percentage >= 80) {
        performance = "Excellent work!";
    } else if (percentage >= 50) {
        performance = "Good effort! Keep practicing.";
    } else {
        performance = "Keep learning. You will improve!";
    }

    resultContainer.innerHTML = `
        <h3>${score} / ${questions.length}</h3>
        <p>Accuracy: ${percentage}%</p>
        <p>${performance}</p>
    `;
}

function resetQuiz() {
    quizSection.hidden = true;
    resultSection.hidden = true;

    message.textContent = "";
    questionContainer.innerHTML = "";

    topicInput.value = "";
    topicInput.focus();
}
