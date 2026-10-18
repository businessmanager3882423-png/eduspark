
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const STORAGE_KEY = "eduspark_data_v1";

const defaultData = {
  profile: {
    name: "Student",
    level: "School",
    language: "English",
    curriculum: "International",
    religionOptIn: false
  },
  xp: 0,
  streak: 0,
  lessonsCompleted: [],
  lastStudyDate: "",
  tasks: [],
  projects: [],
  totalCorrect: 0,
  bestStreak: 0,
  missionCompleted: false
};

function loadData() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");

    if (!saved || typeof saved !== "object") {
      return structuredClone(defaultData);
    }

    return {
      ...structuredClone(defaultData),
      ...saved,
      profile: {
        ...defaultData.profile,
        ...(saved.profile || {})
      },
      lessonsCompleted: Array.isArray(saved.lessonsCompleted)
        ? saved.lessonsCompleted : [],
      tasks: Array.isArray(saved.tasks) ? saved.tasks : [],
      projects: Array.isArray(saved.projects) ? saved.projects : []
    };
  } catch {
    return structuredClone(defaultData);
  }
}

let data = loadData();
let toastTimer;
let activeQuestion = 0;
let gameScore = 0;
let gameStreak = 0;
let examAnswers = {};
let currentScanUrl = null;

function saveData() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    showToast("Storage is full. Export your data or remove old files.");
  }
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function showToast(message) {
  const toast = $("#toast");
  if (!toast) return;

  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, 2800);
}

function todayISO() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function formatDate(value) {
  if (!value) return "No date";
  const date = new Date(value + "T00:00:00");
  return Number.isNaN(date.getTime())
    ? "No date"
    : date.toLocaleDateString();
}

function addXP(amount, reason = "Learning progress") {
  const points = Math.max(0, Number(amount) || 0);
  data.xp += points;
  saveData();
  updateDashboard();
  showToast(`+${points} XP · ${reason}`);
}

function recordStudyDay() {
  const today = todayISO();

  if (data.lastStudyDate === today) return;

  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterday = new Date(
    yesterdayDate.getTime() -
    yesterdayDate.getTimezoneOffset() * 60000
  ).toISOString().slice(0, 10);

  data.streak = data.lastStudyDate === yesterday
    ? data.streak + 1
    : 1;

  data.lastStudyDate = today;
  saveData();
}

function completeLesson(id) {
  if (data.lessonsCompleted.includes(id)) {
    showToast("You have already completed this lesson.");
    return;
  }

  data.lessonsCompleted.push(id);
  recordStudyDay();
  data.xp += 20;
  saveData();
  renderLessons();
  updateDashboard();
  showToast("Lesson completed! +20 XP");
}

/* Navigation */

function navigate(viewName) {
  const target = document.getElementById(`view-${viewName}`);

  if (!target) {
    showToast("This section is not available.");
    return;
  }

  $$(".view").forEach((view) => view.classList.remove("active"));
  target.classList.add("active");

  $$(".nav-link").forEach((link) => {
    const isActive = link.dataset.view === viewName;
    link.classList.toggle("active", isActive);

    if (isActive) {
      link.setAttribute("aria-current", "page");
    } else {
      link.removeAttribute("aria-current");
    }
  });

  const activeLink = $(`.nav-link[data-view="${viewName}"]`);
  const title = activeLink?.dataset.title ||
    activeLink?.textContent?.trim() ||
    viewName;

  if ($("#pageTitle")) $("#pageTitle").textContent = title;

  $("#sidebar")?.classList.remove("open");
  window.scrollTo({ top: 0, behavior: "smooth" });

  if (viewName === "learn" || viewName === "dashboard") {
    renderLessons();
  }

  if (viewName === "planner") renderTasks();
  if (viewName === "portfolio") renderProjects();
}

function setupNavigation() {
  $$(".nav-link").forEach((link) => {
    link.addEventListener("click", () => {
      navigate(link.dataset.view);
    });
  });

  $$("[data-go]").forEach((button) => {
    button.addEventListener("click", () => {
      navigate(button.dataset.go);
    });
  });

  $("#menuBtn")?.addEventListener("click", () => {
    $("#sidebar")?.classList.toggle("open");
  });

  document.addEventListener("click", (event) => {
    const sidebar = $("#sidebar");
    const menu = $("#menuBtn");

    if (
      window.innerWidth <= 760 &&
      sidebar?.classList.contains("open") &&
      !sidebar.contains(event.target) &&
      !menu?.contains(event.target)
    ) {
      sidebar.classList.remove("open");
    }
  });
}

/* Learning content */

const lessons = [
  {
    id: "math-fractions",
    title: "Understanding Fractions",
    subject: "Mathematics",
    level: "School",
    curriculum: "All",
    icon: "➗",
    description: "Learn numerators, denominators and equivalent fractions.",
    duration: "10 min",
    content: "A fraction represents part of a whole. In 3/4, 3 is the numerator and 4 is the denominator. Equivalent fractions have the same value, such as 1/2 and 2/4."
  },
  {
    id: "science-energy",
    title: "Forms of Energy",
    subject: "Science",
    level: "School",
    curriculum: "All",
    icon: "⚡",
    description: "Explore heat, light, sound and electrical energy.",
    duration: "12 min",
    content: "Energy is the ability to do work. Common forms include kinetic, potential, thermal, chemical, electrical, light and sound energy. Energy can change from one form to another."
  },
  {
    id: "english-grammar",
    title: "Parts of Speech",
    subject: "English",
    level: "School",
    curriculum: "All",
    icon: "📘",
    description: "Understand nouns, verbs, adjectives and adverbs.",
    duration: "8 min",
    content: "Nouns name people, places or things. Verbs describe actions or states. Adjectives describe nouns. Adverbs often describe verbs, adjectives or other adverbs."
  },
  {
    id: "coding-basics",
    title: "Coding Fundamentals",
    subject: "Coding",
    level: "Skills",
    curriculum: "All",
    icon: "💻",
    description: "Discover variables, conditions and programming logic.",
    duration: "15 min",
    content: "A variable stores information. A condition lets a program make a decision. A loop repeats instructions. Start with small programs and test them one step at a time."
  },
  {
    id: "pakistan-studies",
    title: "Pakistan: An Introduction",
    subject: "Social Studies",
    level: "School",
    curriculum: "Pakistan",
    icon: "🌍",
    description: "Explore geography, culture and civic knowledge.",
    duration: "12 min",
    content: "Pakistan is a country in South Asia. Islamabad is its capital. Its regions have diverse landscapes, languages, traditions and cultural heritage."
  },
  {
    id: "study-skills",
    title: "Effective Study Techniques",
    subject: "Study Skills",
    level: "All",
    curriculum: "All",
    icon: "🎯",
    description: "Use active recall, breaks and spaced revision.",
    duration: "7 min",
    content: "Active recall means trying to remember information without looking at your notes. Spaced revision means revisiting topics over time. Short focused sessions and practice questions can improve learning."
  },
  {
    id: "fractions-practice",
    title: "Fractions: Practice",
    subject: "Mathematics",
    level: "School",
    curriculum: "All",
    icon: "🧮",
    description: "Practise comparing and simplifying fractions.",
    duration: "10 min",
    content: "To simplify a fraction, divide its numerator and denominator by their greatest common divisor. For example, 2/4 simplifies to 1/2 because both values can be divided by 2."
  },
  {
    id: "web-design",
    title: "Web Design Basics",
    subject: "Coding",
    level: "Skills",
    curriculum: "All",
    icon: "🎨",
    description: "Learn how HTML and CSS build web pages.",
    duration: "15 min",
    content: "HTML provides the structure of a webpage. CSS controls its appearance, such as colour, spacing and layout. JavaScript adds interactive behaviour."
  },
  {
    id: "exam-preparation",
    title: "Exam Preparation Skills",
    subject: "Study Skills",
    level: "All",
    curriculum: "All",
    icon: "📝",
    description: "Build a revision plan and practise recall.",
    duration: "9 min",
    content: "List your topics, identify difficult areas, schedule revision sessions and practise with questions. Review mistakes and make time for rest before an exam."
  }
];

function renderLessons() {
  const containers = [
    $("#lessonGrid"),
    $("#continueList")
  ].filter(Boolean);

  const search = ($("#lessonSearch")?.value || "").toLowerCase().trim();
  const level = $("#levelFilter")?.value || "All";
  const curriculum = $("#curriculumFilter")?.value || "All";

  const filtered = lessons.filter((lesson) => {
    const matchesSearch = [
      lesson.title,
      lesson.subject,
      lesson.description
    ].join(" ").toLowerCase().includes(search);

    const matchesLevel =
      level === "All" ||
      lesson.level === level ||
      lesson.level === "All";

    const matchesCurriculum =
      curriculum === "All" ||
      lesson.curriculum === "All" ||
      lesson.curriculum === curriculum;

    return matchesSearch && matchesLevel && matchesCurriculum;
  });

  const cards = filtered.map((lesson) => {
    const completed = data.lessonsCompleted.includes(lesson.id);

    return `
      <article class="lesson-card">
        <div class="lesson-icon">${lesson.icon}</div>
        <div class="card-meta">
          <span class="badge">${escapeHTML(lesson.subject)}</span>
          <span class="badge">${escapeHTML(lesson.duration)}</span>
        </div>
        <h3>${escapeHTML(lesson.title)}</h3>
        <p>${escapeHTML(lesson.description)}</p>
        <span class="badge ${completed ? "badge-success" : ""}">
          ${completed ? "Completed" : "Ready to learn"}
        </span>
        <button class="btn ${completed ? "" : "btn-primary"}"
          data-lesson="${escapeHTML(lesson.id)}">
          ${completed ? "Review lesson" : "Start lesson"}
        </button>
      </article>`;
  }).join("");

  containers.forEach((container) => {
    if (container.id === "continueList") {
      const recent = lessons.filter((lesson) =>
        data.lessonsCompleted.includes(lesson.id)
      ).slice(-3).reverse();

      container.innerHTML = recent.length
        ? recent.map((lesson) => `
          <div class="list-item">
            <div class="lesson-icon">${lesson.icon}</div>
            <div class="list-item-content">
              <h4>${escapeHTML(lesson.title)}</h4>
              <p>${escapeHTML(lesson.subject)} · Completed</p>
            </div>
            <button class="btn btn-small"
              data-lesson="${escapeHTML(lesson.id)}">Review</button>
          </div>`).join("")
        : `<div class="empty-state">
            <span class="empty-icon">📚</span>
            <p>Your learning journey starts here.</p>
            <button class="btn btn-primary mt-2" data-go="learn">
              Explore lessons
            </button>
          </div>`;
    } else {
      container.innerHTML = cards ||
        `<div class="empty-state">No lessons match your filters.</div>`;
    }
  });
}

function openLesson(id) {
  const lesson = lessons.find((item) => item.id === id);
  if (!lesson) return;

  const message = `${lesson.title}\n\n${lesson.content}\n\nComplete this lesson to earn 20 XP.`;

  const output = $("#aiOutput");
  if (output) {
    output.textContent = message;
  }

  const existing = $("#lessonModal");
  existing?.remove();

  const modal = document.createElement("div");
  modal.id = "lessonModal";
  modal.style.cssText = `
    position:fixed;inset:0;z-index:150;
    display:grid;place-items:center;padding:18px;
    background:rgba(0,0,0,.75);
  `;

  modal.innerHTML = `
    <div class="card" role="dialog" aria-modal="true"
      aria-labelledby="lessonModalTitle"
      style="width:min(650px,100%);max-height:85vh;overflow:auto">
      <h2 id="lessonModalTitle">${escapeHTML(lesson.icon)} ${escapeHTML(lesson.title)}</h2>
      <p class="mt-2">${escapeHTML(lesson.content)}</p>
      <div class="button-row">
        <button class="btn btn-primary" id="completeLessonBtn">
          Complete lesson (+20 XP)
        </button>
        <button class="btn" id="closeLessonBtn">Close</button>
      </div>
    </div>`;

  document.body.appendChild(modal);

  $("#completeLessonBtn")?.addEventListener("click", () => {
    completeLesson(lesson.id);
    modal.remove();
  });

  $("#closeLessonBtn")?.addEventListener("click", () => modal.remove());

  modal.addEventListener("click", (event) => {
    if (event.target === modal) modal.remove();
  });
}

document.addEventListener("click", (event) => {
  const lessonButton = event.target.closest("[data-lesson]");
  if (lessonButton) openLesson(lessonButton.dataset.lesson);
});

function setupLessonFilters() {
  $("#lessonSearch")?.addEventListener("input", renderLessons);
  $("#levelFilter")?.addEventListener("change", renderLessons);
  $("#curriculumFilter")?.addEventListener("change", renderLessons);
}

/* Dashboard */

function updateDashboard() {
  const setText = (id, value) => {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
  };

  setText("xpStat", data.xp);
  setText("streakStat", data.streak);
  setText("lessonsStat", data.lessonsCompleted.length);
  setText("goalStat", `${Math.min(data.lessonsCompleted.length, 5)}/5`);

  setText("missionText",
    data.missionCompleted
      ? "Daily mission completed!"
      : "Complete a lesson to make progress today.");

  const progress = $("#missionProgress");
  if (progress) {
    progress.style.width = data.missionCompleted
      ? "100%"
      : `${Math.min(data.lessonsCompleted.length, 5) * 20}%`;
  }

  const todayLabel = $("#todayLabel");
  if (todayLabel) {
    todayLabel.textContent = new Date().toLocaleDateString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric"
    });
  }

  const year = $("#yearNow");
  if (year) year.textContent = new Date().getFullYear();

  const name = data.profile.name || "Student";
  const greeting = $("#welcomeName");
  if (greeting) greeting.textContent = name;

  const avatar = $("#profileAvatar");
  if (avatar) avatar.textContent = name.trim().charAt(0).toUpperCase() || "S";

  const correctCount = $("#correctCount");
  if (correctCount) correctCount.textContent = gameScore;

  const gameXP = $("#gameXP");
  if (gameXP) gameXP.textContent = data.totalCorrect * 5;

  const bestStreak = $("#bestStreak");
  if (bestStreak) bestStreak.textContent = data.bestStreak;

  const taskCount = $("#taskCount");
  if (taskCount) {
    taskCount.textContent = data.tasks.filter((task) => !task.done).length;
  }

  const rewardXP = $("#rewardXP");
  if (rewardXP) rewardXP.textContent = data.xp;

  const rewardLessons = $("#rewardLessons");
  if (rewardLessons) rewardLessons.textContent = data.lessonsCompleted.length;

  const rewardStreak = $("#rewardStreak");
  if (rewardStreak) rewardStreak.textContent = data.streak;
}

/* AI study interface */

const aiTemplates = {
  explain: "Explain this topic in simple steps.",
  quiz: "Create practice questions about this topic.",
  notes: "Organise this topic into concise study notes.",
  writing: "Review this writing for clarity and grammar.",
  coding: "Explain the code and help me understand it.",
  plan: "Create a realistic study plan for this topic."
};

function setupAI() {
  $("#aiTask")?.addEventListener("change", () => {
    const task = $("#aiTask").value;
    const question = $("#aiQuestion");
    if (question && !question.value.trim()) {
      question.value = aiTemplates[task] || "";
    }
  });

  $("#aiClear")?.addEventListener("click", () => {
    if ($("#aiQuestion")) $("#aiQuestion").value = "";
    if ($("#aiOutput")) {
      $("#aiOutput").textContent = "Your study response will appear here.";
    }
  });

  $("#aiSubmit")?.addEventListener("click", () => {
    const question = $("#aiQuestion")?.value.trim();
    const output = $("#aiOutput");

    if (!question) {
      showToast("Enter a question or topic first.");
      $("#aiQuestion")?.focus();
      return;
    }

    if (output) {
      output.textContent =
        "AI service is not connected yet.\n\n" +
        "Your request has not been sent to an AI provider. " +
        "To enable real AI answers, connect a secure backend that " +
        "authenticates users, validates requests, applies usage limits " +
        "and keeps API keys on the server.\n\n" +
        `Requested task: ${$("#aiTask")?.value || "explain"}\n` +
        `Level: ${$("#aiLevel")?.value || "General"}\n` +
        `Curriculum: ${$("#aiCurriculum")?.value || "International"}\n\n` +
        `Your question:\n${question}`;
    }

    showToast("Demo prepared. Real AI needs a secure backend.");
  });
}

/* Scan preview */

function setupScanner() {
  $("#scanFile")?.addEventListener("change", (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const allowed = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "application/pdf"
    ];

    if (!allowed.includes(file.type)) {
      showToast("Choose a JPG, PNG, WebP image or PDF.");
      event.target.value = "";
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      showToast("File is too large. Maximum size is 10 MB.");
      event.target.value = "";
      return;
    }

    if (currentScanUrl) {
      URL.revokeObjectURL(currentScanUrl);
      currentScanUrl = null;
    }

    const output = $("#scanOutput");
    if (!output) return;

    output.replaceChildren();

    if (file.type === "application/pdf") {
      const note = document.createElement("p");
      note.textContent =
        "PDF selected. This demo can confirm the file, but PDF text extraction and OCR need an appropriate processing service.";
      output.appendChild(note);
    } else {
      currentScanUrl = URL.createObjectURL(file);

      const image = document.createElement("img");
      image.className = "scan-preview";
      image.alt = "Selected scan preview";
      image.src = currentScanUrl;

      output.appendChild(image);

      const note = document.createElement("p");
      note.textContent =
        "Image preview ready. Text recognition and scan enhancement are not connected in this demo.";
      output.appendChild(note);
    }

    const info = document.createElement("p");
    info.className = "mt-2";
    info.textContent =
      `${file.name} · ${(file.size / 1024).toFixed(1)} KB`;

    output.appendChild(info);
  });

  $("#scanPrepare")?.addEventListener("click", () => {
    const file = $("#scanFile")?.files?.[0];

    if (!file) {
      showToast("Choose an image or PDF first.");
      return;
    }

    showToast("Preview is ready. OCR and cleanup need a processing service.");
  });

  $("#scanClear")?.addEventListener("click", () => {
    if (currentScanUrl) {
      URL.revokeObjectURL(currentScanUrl);
      currentScanUrl = null;
    }

    if ($("#scanFile")) $("#scanFile").value = "";
    if ($("#scanOutput")) {
      $("#scanOutput").textContent = "No file selected.";
    }
  });
}

/* Learning game */

const questions = [
  {
    question: "What is 8 × 7?",
    answers: ["54", "56", "64", "48"],
    correct: 1,
    explanation: "8 multiplied by 7 equals 56."
  },
  {
    question: "Which part of speech names an action?",
    answers: ["Noun", "Adjective", "Verb", "Pronoun"],
    correct: 2,
    explanation: "A verb can describe an action or state."
  },
  {
    question: "Which language is used to style web pages?",
    answers: ["CSS", "SQL", "HTML only", "Python only"],
    correct: 0,
    explanation: "CSS controls the visual styling and layout of web pages."
  },
  {
    question: "What is the capital of Pakistan?",
    answers: ["Karachi", "Lahore", "Islamabad", "Peshawar"],
    correct: 2,
    explanation: "Islamabad is the capital of Pakistan."
  },
  {
    question: "Which is a renewable energy source?",
    answers: ["Coal", "Sunlight", "Petrol", "Natural gas"],
    correct: 1,
    explanation: "Solar energy comes from sunlight and is renewable."
  },
  {
    question: "What is 1/2 equal to?",
    answers: ["2/3", "2/4", "3/4", "1/4"],
    correct: 1,
    explanation: "One half and two quarters represent the same amount."
  }
];

function renderQuestion() {
  const question = questions[activeQuestion];
  const questionBox = $("#gameQuestion");
  const answersBox = $("#gameAnswers");
  const feedback = $("#gameFeedback");
  const nextButton = $("#nextQuestion");

  if (!questionBox || !answersBox) return;

  if (!question) {
    questionBox.textContent = "Quiz complete! Great effort.";
    answersBox.replaceChildren();

    if (feedback) {
      feedback.textContent = `Final score: ${gameScore}/${questions.length}`;
      feedback.className = "feedback success";
    }

    if (nextButton) nextButton.textContent = "Play again";
    return;
  }

  questionBox.textContent =
    `Question ${activeQuestion + 1} of ${questions.length}: ${question.question}`;

  answersBox.innerHTML = question.answers.map((answer, index) => `
    <button class="answer-option" data-answer="${index}">
      ${escapeHTML(answer)}
    </button>
  `).join("");

  if (feedback) {
    feedback.textContent = "";
    feedback.className = "feedback";
  }

  if (nextButton) {
    nextButton.textContent = "Next question";
    nextButton.disabled = true;
  }
}

function answerQuestion(index) {
  const question = questions[activeQuestion];
  if (!question) return;

  const buttons = $$("#gameAnswers [data-answer]");
  if (buttons.some((button) => button.disabled)) return;

  buttons.forEach((button) => {
    button.disabled = true;
  });

  const isCorrect = index === question.correct;
  const feedback = $("#gameFeedback");

  if (isCorrect) {
    gameScore++;
    gameStreak++;
    data.totalCorrect++;
    data.bestStreak = Math.max(data.bestStreak, gameStreak);
    data.xp += 5;
    recordStudyDay();

    buttons[index]?.classList.add("correct");

    if (feedback) {
      feedback.textContent = `Correct! ${question.explanation}`;
      feedback.className = "feedback success";
    }
  } else {
    gameStreak = 0;
    buttons[index]?.classList.add("incorrect");
    buttons[question.correct]?.classList.add("correct");

    if (feedback) {
      feedback.textContent = `Not quite. ${question.explanation}`;
      feedback.className = "feedback error";
    }
  }

  saveData();
  updateDashboard();

  const nextButton = $("#nextQuestion");
  if (nextButton) nextButton.disabled = false;
}

function setupGame() {
  renderQuestion();

  $("#gameAnswers")?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-answer]");
    if (!button) return;

    answerQuestion(Number(button.dataset.answer));
  });

  $("#nextQuestion")?.addEventListener("click", () => {
    if (activeQuestion >= questions.length) {
      activeQuestion = 0;
      gameScore = 0;
      gameStreak = 0;
    } else {
      const buttons = $$("#gameAnswers [data-answer]");
      if (buttons.length && !buttons.every((button) => button.disabled)) {
        showToast("Choose an answer before continuing.");
        return;
      }

      activeQuestion++;
    }

    renderQuestion();
    updateDashboard();
  });
}

/* Exam simulator */

const examQuestions = [
  {
    question: "Which number is a prime number?",
    options: ["9", "15", "17", "21"],
    correct: 2
  },
  {
    question: "Which HTML element creates a hyperlink?",
    options: ["<p>", "<a>", "<h1>", "<img>"],
    correct: 1
  },
  {
    question: "What does CPU stand for?",
    options: [
      "Central Processing Unit",
      "Computer Power Utility",
      "Central Program User",
      "Control Processing Upload"
    ],
    correct: 0
  },
  {
    question: "What is 25% of 200?",
    options: ["25", "40", "50", "75"],
    correct: 2
  },
  {
    question: "Which process do plants use to make food?",
    options: [
      "Evaporation",
      "Photosynthesis",
      "Condensation",
      "Digestion"
    ],
    correct: 1
  }
];

function renderExam() {
  const container = $("#examQuestions");
  if (!container) return;

  examAnswers = {};

  container.innerHTML = examQuestions.map((question, index) => `
    <div class="question-card mb-2">
      <h3>${index + 1}. ${escapeHTML(question.question)}</h3>
      <div class="answer-list">
        ${question.options.map((option, optionIndex) => `
          <label class="answer-option" style="display:flex;gap:10px">
            <input type="radio" name="exam-${index}" value="${optionIndex}">
            <span>${escapeHTML(option)}</span>
          </label>
        `).join("")}
      </div>
    </div>
  `).join("");

  container.addEventListener("change", (event) => {
    if (!event.target.matches('input[type="radio"]')) return;

    const match = event.target.name.match(/^exam-(\d+)$/);
    if (match) {
      examAnswers[Number(match[1])] = Number(event.target.value);
    }
  }, { once: false });
}

function setupExam() {
  renderExam();

  $("#submitExam")?.addEventListener("click", () => {
    let score = 0;
    let answered = 0;

    examQuestions.forEach((question, index) => {
      if (examAnswers[index] !== undefined) answered++;
      if (examAnswers[index] === question.correct) score++;
    });

    const result = $("#examResult");
    if (!result) return;

    result.textContent =
      `Result: ${score}/${examQuestions.length}. ` +
      `Answered: ${answered}/${examQuestions.length}. ` +
      `This is a practice demo, not an official examination.`;

    result.className = score >= 4
      ? "notice mt-2"
      : "notice warning mt-2";

    if (answered === examQuestions.length) {
      data.xp += score * 2;
      recordStudyDay();
      saveData();
      updateDashboard();
      showToast(`Practice completed. You earned ${score * 2} XP.`);
    } else {
      showToast("Answer every question to record exam XP.");
    }
  });
}

/* Study planner */

function renderTasks() {
  const list = $("#taskList");
  if (!list) return;

  const sorted = [...data.tasks].sort((a, b) => {
    if (a.done !== b.done) return Number(a.done) - Number(b.done);
    return (a.date || "").localeCompare(b.date || "");
  });

  if (!sorted.length) {
    list.innerHTML = `<div class="empty-state">No tasks yet. Add your first study task.</div>`;
    updateDashboard();
    return;
  }

  list.innerHTML = sorted.map((task) => `
    <div class="list-item">
      <input type="checkbox" data-task-done="${escapeHTML(task.id)}"
        ${task.done ? "checked" : ""}
        aria-label="Mark task complete">
      <div class="list-item-content">
        <h4 style="${task.done ? "text-decoration:line-through;opacity:.65" : ""}">
          ${escapeHTML(task.title)}
        </h4>
        <p>${escapeHTML(task.subject || "General")} · ${escapeHTML(formatDate(task.date))}</p>
      </div>
      <button class="btn btn-small btn-danger"
        data-task-delete="${escapeHTML(task.id)}">Delete</button>
    </div>
  `).join("");

  updateDashboard();
}

function setupPlanner() {
  $("#taskDate")?.setAttribute("min", todayISO());

  $("#taskForm")?.addEventListener("submit", (event) => {
    event.preventDefault();

    const title = $("#taskTitle")?.value.trim();
    if (!title) {
      showToast("Enter a task name.");
      return;
    }

    data.tasks.push({
      id: crypto.randomUUID(),
      title,
      date: $("#taskDate")?.value || todayISO(),
      subject: $("#taskSubject")?.value || "General",
      done: false
    });

    saveData();
    renderTasks();
    event.target.reset();

    if ($("#taskDate")) $("#taskDate").value = todayISO();

    showToast("Study task added.");
  });

  $("#taskList")?.addEventListener("change", (event) => {
    const id = event.target.dataset.taskDone;
    if (!id) return;

    const task = data.tasks.find((item) => item.id === id);
    if (!task) return;

    if (!task.done && event.target.checked) {
      data.xp += 5;
      recordStudyDay();
      showToast("Task completed! +5 XP");
    }

    task.done = event.target.checked;
    saveData();
    renderTasks();
  });

  $("#taskList")?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-task-delete]");
    if (!button) return;

    data.tasks = data.tasks.filter(
      (task) => task.id !== button.dataset.taskDelete
    );

    saveData();
    renderTasks();
    showToast("Task deleted.");
  });
}

/* Portfolio */

function renderProjects() {
  const list = $("#projectList");
  if (!list) return;

  if (!data.projects.length) {
    list.innerHTML = `<div class="empty-state">Your projects will appear here.</div>`;
    return;
  }

  list.innerHTML = data.projects.map((project) => `
    <article class="feature-card">
      <div class="feature-icon">🚀</div>
      <h3>${escapeHTML(project.name)}</h3>
      <p>${escapeHTML(project.description || "No description provided.")}</p>
      <span class="badge">${escapeHTML(formatDate(project.date))}</span>
      <button class="btn btn-danger mt-2"
        data-project-delete="${escapeHTML(project.id)}">Delete project</button>
    </article>
  `).join("");
}

function setupPortfolio() {
  $("#projectForm")?.addEventListener("submit", (event) => {
    event.preventDefault();

    const name = $("#projectName")?.value.trim();
    const description = $("#projectDesc")?.value.trim();

    if (!name) {
      showToast("Enter a project name.");
      return;
    }

    data.projects.push({
      id: crypto.randomUUID(),
      name,
      description,
      date: todayISO()
    });

    saveData();
    renderProjects();
    event.target.reset();
    showToast("Project saved to this browser.");
  });

  $("#projectList")?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-project-delete]");
    if (!button) return;

    data.projects = data.projects.filter(
      (project) => project.id !== button.dataset.projectDelete
    );

    saveData();
    renderProjects();
    showToast("Project deleted.");
  });
}

/* Settings */

function populateSettings() {
  const fields = {
    displayName: data.profile.name,
    profileLevel: data.profile.level,
    profileLanguage: data.profile.language,
    profileCurriculum: data.profile.curriculum
  };

  Object.entries(fields).forEach(([id, value]) => {
    const element = document.getElementById(id);
    if (element && value != null) element.value = value;
  });

  const religion = $("#religionOptIn");
  if (religion) religion.checked = Boolean(data.profile.religionOptIn);
}

function setupSettings() {
  populateSettings();

  $("#settingsForm")?.addEventListener("submit", (event) => {
    event.preventDefault();

    data.profile.name = $("#displayName")?.value.trim() || "Student";
    data.profile.level = $("#profileLevel")?.value || "School";
    data.profile.language = $("#profileLanguage")?.value || "English";
    data.profile.curriculum =
      $("#profileCurriculum")?.value || "International";
    data.profile.religionOptIn = Boolean($("#religionOptIn")?.checked);

    saveData();
    updateDashboard();
    populateSettings();

    showToast("Settings saved on this browser.");
  });

  $("#exportData")?.addEventListener("click", exportData);

  $("#resetData")?.addEventListener("click", () => {
    const confirmed = window.confirm(
      "Delete this browser's EduSpark progress, tasks, projects and settings? Export your data first if you need a backup."
    );

    if (!confirmed) return;

    data = structuredClone(defaultData);
    saveData();
    populateSettings();
    renderLessons();
    renderTasks();
    renderProjects();
    updateDashboard();

    showToast("Local demo data has been reset.");
  });
}

function exportData() {
  const blob = new Blob(
    [JSON.stringify(data, null, 2)],
    { type: "application/json" }
  );

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `eduspark-backup-${todayISO()}.json`;

  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
  showToast("Backup export started.");
}

/* Global search */

function setupGlobalSearch() {
  $("#globalSearch")?.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;

    const query = event.target.value.trim().toLowerCase();
    if (!query) return;

    const found = lessons.find((lesson) =>
      `${lesson.title} ${lesson.subject} ${lesson.description}`
        .toLowerCase()
        .includes(query)
    );

    if (found) {
      navigate("learn");
      if ($("#lessonSearch")) {
        $("#lessonSearch").value = query;
        renderLessons();
      }
      return;
    }

    const sections = [
      ["dashboard", "Dashboard"],
      ["learn", "Learn"],
      ["ai-tools", "AI Study Suite"],
      ["scan", "Scan & Clean"],
      ["games", "Learning Games"],
      ["exams", "Exam Simulator"],
      ["planner", "Study Planner"],
      ["community", "Community"],
      ["classroom", "Classroom"],
      ["career", "Career & Skills"],
      ["portfolio", "My Portfolio"],
      ["rewards", "Rewards"],
      ["settings", "Settings"]
    ];

    const section = sections.find(([, label]) =>
      label.toLowerCase().includes(query)
    );

    if (section) {
      navigate(section[0]);
    } else {
      showToast("No matching lesson or section found.");
    }
  });
}

/* Installable PWA */

let deferredInstallPrompt = null;

function setupInstall() {
  const installButton = $("#installBtn");
  if (!installButton) return;

  installButton.classList.add("hidden");

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    installButton.classList.remove("hidden");
  });

  installButton.addEventListener("click", async () => {
    if (!deferredInstallPrompt) {
      showToast("Use your browser menu and choose Install app or Add to Home Screen.");
      return;
    }

    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice;

    deferredInstallPrompt = null;
    installButton.classList.add("hidden");
  });

  window.addEventListener("appinstalled", () => {
    installButton.classList.add("hidden");
    showToast("EduSpark has been installed.");
  });
}

/* Connection status */

function updateConnectionStatus() {
  const online = navigator.onLine;
  const label = $("#networkStatus");
  const dot = $("#connectionDot");

  if (label) label.textContent = online ? "Online" : "Offline";
  if (dot) {
    dot.style.background = online ? "#26d5ad" : "#ff7887";
    dot.setAttribute("aria-label", online ? "Online" : "Offline");
  }
}

window.addEventListener("online", updateConnectionStatus);
window.addEventListener("offline", updateConnectionStatus);

/* Authentication placeholder */

function setupAuthenticationNotice() {
  $("#logoutBtn")?.addEventListener("click", () => {
    showToast(
      "Demo mode has no signed-in account. Real logout requires Firebase Authentication."
    );
  });
}

/* Service worker */

async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  if (location.protocol !== "https:" && location.hostname !== "localhost") return;

  try {
    await navigator.serviceWorker.register("./sw.js");
  } catch (error) {
    console.error("Service worker registration failed:", error);
  }
}

/* Initialisation */

function init() {
  setupNavigation();
  setupLessonFilters();
  setupAI();
  setupScanner();
  setupGame();
  setupExam();
  setupPlanner();
  setupPortfolio();
  setupSettings();
  setupGlobalSearch();
  setupInstall();
  setupAuthenticationNotice();

  renderLessons();
  renderTasks();
  renderProjects();
  populateSettings();
  updateDashboard();
  updateConnectionStatus();

  if ($("#taskDate")) {
    $("#taskDate").value = todayISO();
  }

  registerServiceWorker();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
