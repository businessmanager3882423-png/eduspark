import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  updateProfile,
  signOut,
  setPersistence,
  browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";

import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  collection,
  getDocs,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

/* EduSpark Firebase Web App configuration */
const firebaseConfig = {
  apiKey: "AIzaSyCk9JxU4lSP0kWZbfaps30vr0duMurz8dA",
  authDomain: "eduspark-c8c5b.firebaseapp.com",
  projectId: "eduspark-c8c5b",
  storageBucket: "eduspark-c8c5b.firebasestorage.app",
  messagingSenderId: "653512681319",
  appId: "1:653512681319:web:ca27758638315ab6ebb1c2"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

await setPersistence(auth, browserLocalPersistence);

const $ = id => document.getElementById(id);
const escapeHTML = value => String(value ?? "").replace(/[&<>"']/g, c => ({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;"
}[c]));

let currentUser = null;
let profile = {
  displayName: "",
  grade: "Grade 8",
  curriculum: "General",
  language: "English"
};
let progress = {
  completedLessons: [],
  xp: 0,
  streak: 0,
  lastActive: "",
  quizResults: []
};
let plannerItems = [];
let flashcards = [];
let authMode = "login";
let activePage = "dashboard";
let activeLessonId = null;
let activeQuizIndex = 0;
let quizAnswers = [];
let quizSubmitted = false;
let flashcardIndex = 0;
let flashcardBack = false;
let toastTimer = null;

const lessons = [
  {
    id: "math-1",
    title: "Understanding fractions",
    subject: "Mathematics",
    grade: "Foundation",
    emoji: "➗",
    duration: "8 min",
    description: "Learn how fractions represent parts of a whole.",
    body: `
      <h3>What is a fraction?</h3>
      <p>A fraction represents part of a whole. It has a numerator and a denominator.</p>
      <p>In <strong>3/4</strong>, the numerator is 3 and the denominator is 4.
      It means three out of four equal parts.</p>
      <h3>Example</h3>
      <p>A pizza is divided into 4 equal slices. If you eat 1 slice, you ate 1/4
      of the pizza. If you eat 3 slices, you ate 3/4.</p>
      <h3>Remember</h3>
      <ul>
        <li>The denominator tells how many equal parts make the whole.</li>
        <li>The numerator tells how many parts we are considering.</li>
        <li>Fractions can describe parts of objects, time, distance and quantities.</li>
      </ul>
    `
  },
  {
    id: "science-1",
    title: "How plants make food",
    subject: "Science",
    grade: "Foundation",
    emoji: "🌱",
    duration: "7 min",
    description: "Explore photosynthesis and what plants need to grow.",
    body: `
      <h3>Photosynthesis</h3>
      <p>Plants use sunlight, water and carbon dioxide to make glucose, a type of sugar.
      This process is called photosynthesis.</p>
      <h3>What plants need</h3>
      <ul>
        <li>Sunlight provides energy.</li>
        <li>Roots absorb water from the soil.</li>
        <li>Leaves take in carbon dioxide from the air.</li>
        <li>Chlorophyll helps capture light energy.</li>
      </ul>
      <p>Oxygen is released during photosynthesis. Plants use some of the glucose they
      produce for energy and growth.</p>
    `
  },
  {
    id: "english-1",
    title: "Build stronger sentences",
    subject: "English",
    grade: "Foundation",
    emoji: "✍️",
    duration: "6 min",
    description: "Understand subjects, verbs and complete sentences.",
    body: `
      <h3>What makes a sentence?</h3>
      <p>A complete sentence expresses a complete thought. It usually includes a subject
      and a verb.</p>
      <p><strong>Example:</strong> The student reads a book.</p>
      <ul>
        <li>Subject: The student</li>
        <li>Verb: reads</li>
        <li>Object: a book</li>
      </ul>
      <h3>Improve a sentence</h3>
      <p>Basic: The bird flew.</p>
      <p>More descriptive: The small bird flew across the garden.</p>
      <p>Clear writing uses precise words and complete thoughts.</p>
    `
  },
  {
    id: "coding-1",
    title: "Your first JavaScript idea",
    subject: "Coding",
    grade: "Foundation",
    emoji: "💻",
    duration: "9 min",
    description: "Learn variables and how programs store information.",
    body: `
      <h3>What is a variable?</h3>
      <p>A variable gives a name to a value that a program can use.</p>
      <p>Example:</p>
      <pre><code>const learnerName = "Alex";
      const points = 10;
      console.log(learnerName, points);</code></pre>
      <p><code>const</code> declares a variable that cannot be reassigned.
      The string stores text, while the number stores a numeric value.</p>
      <h3>Try it</h3>
      <p>Change the name and points, then predict what the program will display.</p>
    `
  },
  {
    id: "study-1",
    title: "Study smarter with active recall",
    subject: "Study Skills",
    grade: "All levels",
    emoji: "🧠",
    duration: "5 min",
    description: "Practise remembering ideas instead of only rereading them.",
    body: `
      <h3>What is active recall?</h3>
      <p>Active recall means trying to remember information without looking at the answer.</p>
      <ul>
        <li>Read a small section.</li>
        <li>Close the book and explain the idea from memory.</li>
        <li>Check what you missed.</li>
        <li>Repeat later to strengthen your memory.</li>
      </ul>
      <p>Combine recall with short breaks and spaced revision. Adjust the schedule to
      your energy, workload and learning needs.</p>
    `
  },
  {
    id: "math-2",
    title: "Percentages in everyday life",
    subject: "Mathematics",
    grade: "Foundation",
    emoji: "📊",
    duration: "8 min",
    description: "Understand percentages through simple examples.",
    body: `
      <h3>What does percent mean?</h3>
      <p>Percent means “per hundred”. So 25% means 25 out of 100.</p>
      <h3>Example</h3>
      <p>To calculate 25% of 80, convert 25% to 0.25 and multiply:</p>
      <p><strong>0.25 × 80 = 20</strong></p>
      <p>So 25% of 80 is 20. You can also find 10% by dividing by 10, then use that
      to calculate other percentages.</p>
    `
  }
];

const quizQuestions = [
  {
    question: "What does the denominator of a fraction tell us?",
    options: [
      "How many parts we are considering",
      "How many equal parts make the whole",
      "The name of the fraction",
      "The total number of objects in every problem"
    ],
    answer: 1,
    explanation: "The denominator tells how many equal parts make the whole."
  },
  {
    question: "Which inputs do plants use in photosynthesis?",
    options: [
      "Only oxygen",
      "Only soil",
      "Sunlight, water and carbon dioxide",
      "Only sugar"
    ],
    answer: 2,
    explanation: "Plants use light energy, water and carbon dioxide to make glucose."
  },
  {
    question: "Which is a complete sentence?",
    options: [
      "Because the rain",
      "The student reads a book.",
      "Running through the",
      "After the lesson"
    ],
    answer: 1,
    explanation: "It expresses a complete thought and includes a subject and verb."
  },
  {
    question: "What does a JavaScript variable help us do?",
    options: [
      "Store a value under a name",
      "Turn off the internet",
      "Create a physical computer",
      "Automatically fix every error"
    ],
    answer: 0,
    explanation: "Variables let programs refer to values by name."
  },
  {
    question: "What is active recall?",
    options: [
      "Only highlighting a page",
      "Reading the same page without a break",
      "Trying to remember information without looking",
      "Copying every sentence"
    ],
    answer: 2,
    explanation: "Active recall means retrieving information from memory."
  }
];

function userDoc() {
  return doc(db, "users", currentUser.uid);
}

function progressDoc() {
  return doc(db, "users", currentUser.uid, "progress", "main");
}

function plannerCollection() {
  return collection(db, "users", currentUser.uid, "planner");
}

function flashcardCollection() {
  return collection(db, "users", currentUser.uid, "flashcards");
}

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function toast(message, bad = false) {
  const el = $("toast");
  el.textContent = message;
  el.style.background = bad ? "#a52f42" : "#101c35";
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 3200);
}

function showAuthError(message = "") {
  $("authError").textContent = message;
}

function setAuthBusy(busy) {
  $("authSubmit").disabled = busy;
  $("googleBtn").disabled = busy;
  $("authSubmit").textContent = busy
    ? (authMode === "login" ? "Signing in…" : "Creating account…")
    : (authMode === "login" ? "Sign in" : "Create account");
}

function setAuthMode(mode) {
  authMode = mode;
  const signup = mode === "signup";
  $("nameField").classList.toggle("hidden", !signup);
  $("displayName").required = signup;
  $("authTitle").textContent = signup ? "Create your account" : "Sign in to learn";
  $("authEyebrow").textContent = signup ? "YOUR JOURNEY STARTS HERE" : "WELCOME BACK";
  $("authDescription").textContent = signup
    ? "Set up your personal learning space."
    : "Continue your learning journey.";
  $("authSubmit").textContent = signup ? "Create account" : "Sign in";
  $("switchText").textContent = signup ? "Already have an account?" : "New to EduSpark?";
  $("switchMode").textContent = signup ? "Sign in" : "Create account";
  $("forgotBtn").classList.toggle("hidden", signup);
  $("password").autocomplete = signup ? "new-password" : "current-password";
  showAuthError("");
}

async function loadCloudData() {
  $("syncStatus").textContent = "Syncing…";

  const profileSnap = await getDoc(userDoc());

  if (profileSnap.exists()) {
    profile = { ...profile, ...profileSnap.data() };
  } else {
    profile = {
      displayName: currentUser.displayName || currentUser.email.split("@")[0],
      grade: "Grade 8",
      curriculum: "General",
      language: "English"
    };

    await setDoc(userDoc(), {
      ...profile,
      role: "student",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  }

  if (!profile.grade) profile.grade = "Grade 8";
  if (!profile.curriculum) profile.curriculum = "General";
  if (!profile.language) profile.language = "English";

  const progressSnap = await getDoc(progressDoc());

  if (progressSnap.exists()) {
    const saved = progressSnap.data();
    progress = {
      ...progress,
      ...saved,
      completedLessons: Array.isArray(saved.completedLessons)
        ? saved.completedLessons : [],
      quizResults: Array.isArray(saved.quizResults) ? saved.quizResults : []
    };
  }

  const plannerSnap = await getDocs(plannerCollection());
  plannerItems = plannerSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  const flashSnap = await getDocs(flashcardCollection());
  flashcards = flashSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  await updateDailyStreak();
  updateUserChrome();
  $("syncStatus").textContent = "Cloud connected";
}

async function updateDailyStreak() {
  const today = todayKey();

  if (progress.lastActive === today) return;

  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterday = `${yesterdayDate.getFullYear()}-${String(yesterdayDate.getMonth() + 1).padStart(2, "0")}-${String(yesterdayDate.getDate()).padStart(2, "0")}`;

  progress.streak = progress.lastActive === yesterday
    ? Number(progress.streak || 0) + 1
    : 1;
  progress.lastActive = today;

  await saveProgress();
}

async function saveProgress() {
  if (!currentUser) return;

  await setDoc(progressDoc(), {
    completedLessons: progress.completedLessons,
    xp: Number(progress.xp || 0),
    streak: Number(progress.streak || 0),
    lastActive: progress.lastActive || todayKey(),
    quizResults: progress.quizResults || [],
    updatedAt: serverTimestamp()
  }, { merge: true });

  updateUserChrome();
}

async function saveProfile() {
  const name = $("profileName").value.trim();
  const grade = $("profileGrade").value;
  const curriculum = $("profileCurriculum").value;
  const language = $("profileLanguage").value;

  if (!name) {
    toast("Please enter your name.", true);
    return;
  }

  profile = { ...profile, displayName: name, grade, curriculum, language };

  await updateProfile(currentUser, { displayName: name });

  await setDoc(userDoc(), {
    displayName: name,
    grade,
    curriculum,
    language,
    updatedAt: serverTimestamp()
  }, { merge: true });

  updateUserChrome();
  toast("Learning profile saved.");
  renderCurrent();
}

function updateUserChrome() {
  const name = profile.displayName || currentUser?.displayName ||
    currentUser?.email?.split("@")[0] || "Student";

  $("userName").textContent = name;
  $("avatar").textContent = name.slice(0, 1).toUpperCase();
  $("sideXP").textContent = `${progress.xp || 0} XP`;
  $("sideCompleted").textContent =
    `${progress.completedLessons?.length || 0} lessons completed`;

  const pct = Math.min(100, ((progress.completedLessons?.length || 0) / lessons.length) * 100);
  $("sideProgress").style.width = `${pct}%`;
}

function showApplication() {
  $("authView").classList.add("hidden");
  $("appView").classList.remove("hidden");
  navigate("dashboard");
}

function showAuthentication() {
  $("appView").classList.add("hidden");
  $("authView").classList.remove("hidden");
}

async function handleAuthSubmit(event) {
  event.preventDefault();
  showAuthError("");
  setAuthBusy(true);

  try {
    const email = $("email").value.trim();
    const password = $("password").value;

    if (authMode === "signup") {
      const displayName = $("displayName").value.trim();
      if (!displayName) throw new Error("Please enter your name.");

      const result = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(result.user, { displayName });

      await setDoc(doc(db, "users", result.user.uid), {
        displayName,
        grade: "Grade 8",
        curriculum: "General",
        language: "English",
        role: "student",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    } else {
      await signInWithEmailAndPassword(auth, email, password);
    }
  } catch (error) {
    showAuthError(readableAuthError(error));
  } finally {
    setAuthBusy(false);
  }
}

function readableAuthError(error) {
  const messages = {
    "auth/email-already-in-use": "This email already has an account. Please sign in.",
    "auth/invalid-email": "Please enter a valid email address.",
    "auth/weak-password": "Use a stronger password with at least 6 characters.",
    "auth/invalid-credential": "Email or password is incorrect.",
    "auth/user-not-found": "No account was found for this email.",
    "auth/wrong-password": "Email or password is incorrect.",
    "auth/too-many-requests": "Too many attempts. Please wait and try again.",
    "auth/network-request-failed": "Network problem. Check your internet connection."
  };

  return messages[error.code] || error.message || "Authentication failed.";
}

async function googleSignIn() {
  showAuthError("");

  try {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  } catch (error) {
    showAuthError(readableAuthError(error));
  }
}

async function resetPassword() {
  const email = $("email").value.trim();

  if (!email) {
    showAuthError("Enter your email address first.");
    $("email").focus();
    return;
  }

  try {
    await sendPasswordResetEmail(auth, email);
    toast("If the account exists, a password reset email will be sent.");
  } catch (error) {
    showAuthError(readableAuthError(error));
  }
}

function navigate(page) {
  activePage = page;

  document.querySelectorAll(".nav-link[data-page]").forEach(button => {
    button.classList.toggle("active", button.dataset.page === page);
  });

  const names = {
    dashboard: "Dashboard",
    lessons: "Lessons",
    quiz: "Practice Quiz",
    ai: "AI Study Tutor",
    planner: "Study Planner",
    flashcards: "Flashcards",
    profile: "My Learning Profile"
  };

  $("pageTitle").textContent = names[page] || "Dashboard";
  $("breadcrumb").textContent = (names[page] || "Dashboard").toUpperCase();
  $("sidebar").classList.remove("open");
  $("scrim").classList.add("hidden");

  renderCurrent();
}

function pageHeading(title, description, action = "") {
  return `
    <div class="page-heading">
      <div>
        <h1>${escapeHTML(title)}</h1>
        <p>${escapeHTML(description)}</p>
      </div>
      ${action}
    </div>`;
}

function metric(label, value, foot, symbol) {
  return `
    <article class="metric-card">
      <span class="metric-icon">${symbol}</span>
      <span class="metric-label">${escapeHTML(label)}</span>
      <strong class="metric-value">${escapeHTML(value)}</strong>
      <small class="metric-foot">${escapeHTML(foot)}</small>
    </article>`;
}

function renderDashboard() {
  const done = progress.completedLessons.length;
  const pct = Math.round(done / lessons.length * 100);

  return `
    <section class="welcome-banner">
      <div>
        <span class="eyebrow">YOUR LEARNING SPACE</span>
        <h1>Keep your curiosity moving, ${escapeHTML((profile.displayName || "Learner").split(" ")[0])}.</h1>
        <p>Build knowledge one lesson at a time. Your progress is saved to your account
        so you can continue on another device.</p>
        <button class="btn btn-primary" data-page="lessons">Explore lessons →</button>
      </div>
      <div class="welcome-icon">✦</div>
    </section>

    <div class="metric-grid">
      ${metric("Lessons completed", `${done}`, `Out of ${lessons.length} sample lessons`, "▤")}
      ${metric("Learning points", `${progress.xp || 0} XP`, "Earned through practice", "✦")}
      ${metric("Current streak", `${progress.streak || 0} days`, "Daily learning activity", "◷")}
      ${metric("Learning progress", `${pct}%`, "Based on sample lessons", "↗")}
    </div>

    <div class="section-heading">
      <div><h3>Continue learning</h3><p>Choose a topic to begin or revisit.</p></div>
      <button class="text-link" data-page="lessons">All lessons →</button>
    </div>

    <div class="lesson-grid">
      ${lessons.slice(0, 3).map(renderLessonCard).join("")}
    </div>

    <div class="two-col">
      <section class="panel">
        <h3>Your learning profile</h3>
        <p>Learning level and language preferences.</p>
        <div class="list-row">
          <span class="list-dot">🎓</span>
          <div><strong>${escapeHTML(profile.grade)}</strong><small>Selected learning level</small></div>
        </div>
        <div class="list-row">
          <span class="list-dot">🌐</span>
          <div><strong>${escapeHTML(profile.curriculum)}</strong><small>Curriculum or learning framework</small></div>
        </div>
        <button class="btn btn-outline" data-page="profile">Edit profile</button>
      </section>
      <section class="panel">
        <h3>Study with AI</h3>
        <p>Ask for a clear explanation, practice quiz, revision notes or a study plan.</p>
        <button class="btn btn-primary" data-page="ai">Open AI Study Tutor →</button>
        <p class="help-text">AI answers can be incorrect. Check important facts with your teacher or trusted materials.</p>
      </section>
    </div>`;
}

function renderLessonCard(lesson) {
  const done = progress.completedLessons.includes(lesson.id);

  return `
    <article class="lesson-card">
      <div class="lesson-emoji">${lesson.emoji}</div>
      <div class="card-meta">
        <span class="pill">${escapeHTML(lesson.subject)}</span>
        <span class="pill">${escapeHTML(lesson.duration)}</span>
      </div>
      <h3>${escapeHTML(lesson.title)}</h3>
      <p>${escapeHTML(lesson.description)}</p>
      <button class="btn ${done ? "btn-light" : "btn-primary"}"
        data-open-lesson="${escapeHTML(lesson.id)}">
        ${done ? "Review lesson" : "Start lesson →"}
      </button>
    </article>`;
}

function renderLessons() {
  const subjects = ["All", ...new Set(lessons.map(item => item.subject))];

  return `
    ${pageHeading("Explore lessons", "Short, beginner-friendly lessons to start your learning journey.")}
    <section class="panel">
      <div class="field">
        <label for="lessonSearch">Search lessons</label>
        <input id="lessonSearch" placeholder="Search by topic or subject">
      </div>
      <div class="card-meta">
        ${subjects.map(subject => `
          <button class="btn btn-outline" data-subject-filter="${escapeHTML(subject)}">
            ${escapeHTML(subject)}
          </button>`).join("")}
      </div>
      <p class="help-text">These are starter lessons, not an official curriculum or an accredited course library.</p>
    </section>
    <div id="lessonResults" class="lesson-grid" style="margin-top:16px">
      ${lessons.map(renderLessonCard).join("")}
    </div>`;
}

function filterLessons(subject = "All") {
  const query = ($("lessonSearch")?.value || "").toLowerCase();
  const filtered = lessons.filter(lesson =>
    (subject === "All" || lesson.subject === subject) &&
    `${lesson.title} ${lesson.subject} ${lesson.description}`.toLowerCase().includes(query)
  );

  $("lessonResults").innerHTML = filtered.length
    ? filtered.map(renderLessonCard).join("")
    : `<div class="empty-state">No matching lessons. Try a different search.</div>`;
}

function openLesson(id) {
  const lesson = lessons.find(item => item.id === id);
  if (!lesson) return;

  activeLessonId = id;
  $("lessonTitle").textContent = lesson.title;
  $("lessonBody").innerHTML = lesson.body;
  $("completeLesson").textContent = progress.completedLessons.includes(id)
    ? "Completed ✓"
    : "Mark as completed";
  $("completeLesson").disabled = progress.completedLessons.includes(id);
  $("lessonDialog").showModal();
}

async function completeActiveLesson() {
  if (!activeLessonId) return;
  if (progress.completedLessons.includes(activeLessonId)) return;

  progress.completedLessons.push(activeLessonId);
  progress.xp = Number(progress.xp || 0) + 10;

  try {
    await saveProgress();
    $("completeLesson").textContent = "Completed ✓";
    $("completeLesson").disabled = true;
    toast("Lesson completed! +10 XP");
    renderCurrent();
  } catch (error) {
    progress.completedLessons = progress.completedLessons.filter(id => id !== activeLessonId);
    progress.xp = Math.max(0, progress.xp - 10);
    toast("Could not save progress. Check your connection and rules.", true);
    console.error(error);
  }
}

function renderQuiz() {
  if (quizSubmitted) {
    const score = quizQuestions.reduce((sum, question, index) =>
      sum + (quizAnswers[index] === question.answer ? 1 : 0), 0);

    return `
      ${pageHeading("Quiz results", "Review your answers and explanations.")}
      <section class="panel">
        <span class="eyebrow-small">YOUR SCORE</span>
        <div class="progress-big">${score} / ${quizQuestions.length}</div>
        <p>You can repeat the quiz to practise again.</p>
        ${quizQuestions.map((question, index) => `
          <div class="list-row">
            <span class="list-dot">${quizAnswers[index] === question.answer ? "✓" : "↻"}</span>
            <div>
              <strong>${escapeHTML(question.question)}</strong>
              <small>${escapeHTML(question.explanation)}</small>
            </div>
          </div>`).join("")}
        <button class="btn btn-primary" data-action="restart-quiz">Try again</button>
      </section>`;
  }

  const question = quizQuestions[activeQuizIndex];

  return `
    ${pageHeading("Practice quiz", "Check your understanding with a short starter quiz.")}
    <section class="panel">
      <div class="card-meta">
        <span class="pill">Question ${activeQuizIndex + 1} of ${quizQuestions.length}</span>
        <span class="pill">Mixed subjects</span>
      </div>
      <h3>${escapeHTML(question.question)}</h3>
      <div>
        ${question.options.map((option, index) => `
          <button class="quiz-option ${quizAnswers[activeQuizIndex] === index ? "selected" : ""}"
            data-quiz-answer="${index}">
            ${String.fromCharCode(65 + index)}. ${escapeHTML(option)}
          </button>`).join("")}
      </div>
      <div class="form-actions">
        <button class="btn btn-outline" data-action="quiz-prev" ${activeQuizIndex === 0 ? "disabled" : ""}>Previous</button>
        <button class="btn btn-primary" data-action="quiz-next">
          ${activeQuizIndex === quizQuestions.length - 1 ? "Submit quiz" : "Next question →"}
        </button>
      </div>
      <p class="help-text">Select one answer for each question. Your result is saved to your learning progress.</p>
    </section>`;
}

async function submitQuiz() {
  if (quizAnswers.some(answer => answer === undefined)) {
    toast("Answer every question before submitting.", true);
    return;
  }

  const score = quizQuestions.reduce((sum, question, index) =>
    sum + (quizAnswers[index] === question.answer ? 1 : 0), 0);

  quizSubmitted = true;
  progress.xp = Number(progress.xp || 0) + score * 5;
  progress.quizResults = [
    ...(progress.quizResults || []),
    { date: todayKey(), score, total: quizQuestions.length }
  ].slice(-50);

  try {
    await saveProgress();
    renderCurrent();
    toast(`Quiz saved. You earned ${score * 5} XP.`);
  } catch (error) {
    console.error(error);
    toast("Quiz displayed, but progress could not be saved.", true);
    renderCurrent();
  }
}

function renderAI() {
  return `
    ${pageHeading("AI Study Tutor", "Get an explanation, practise questions, revision notes or a study plan.")}
    <section class="panel">
      <div class="card-meta">
        <span class="pill">${escapeHTML(profile.grade)}</span>
        <span class="pill">${escapeHTML(profile.curriculum)}</span>
        <span class="pill">Response: ${escapeHTML(profile.language)}</span>
      </div>

      <form id="aiForm">
        <div class="form-grid">
          <div class="field">
            <label for="aiTask">What do you need?</label>
            <select id="aiTask" class="select">
              <option value="explain">Explain a topic</option>
              <option value="solver">Solve a study problem</option>
              <option value="quiz">Create a quiz</option>
              <option value="notes">Make revision notes</option>
              <option value="plan">Create a study plan</option>
              <option value="writing">Improve my writing</option>
              <option value="coding">Explain or help with code</option>
              <option value="translate">Translate text</option>
            </select>
          </div>
          <div class="field">
            <label for="aiSubject">Subject</label>
            <input id="aiSubject" placeholder="e.g. Mathematics, Biology, English">
          </div>
          <div class="field full-field">
            <label for="aiPrompt">Your question or instructions</label>
            <textarea id="aiPrompt" maxlength="6000" required
              placeholder="Tell the tutor what you are learning and what you need help with…"></textarea>
          </div>
        </div>
        <div class="form-actions">
          <button class="btn btn-primary" id="aiSubmit" type="submit">Ask EduSpark AI →</button>
        </div>
      </form>
      <p class="help-text">AI use is limited by server settings. Do not submit passwords, private records or other sensitive information.</p>
      <div id="aiLoading" class="loading hidden">Thinking through your question…</div>
      <div id="aiResult" class="ai-output" style="margin-top:18px"></div>
    </section>`;
}

async function askAI(event) {
  event.preventDefault();

  const button = $("aiSubmit");
  const output = $("aiResult");
  const loading = $("aiLoading");
  const prompt = $("aiPrompt").value.trim();

  if (!prompt) return;

  button.disabled = true;
  loading.classList.remove("hidden");
  output.textContent = "";

  try {
    const token = await currentUser.getIdToken();

    const response = await fetch("/api/ai", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({
        task: $("aiTask").value,
        prompt,
        grade: profile.grade,
        curriculum: profile.curriculum,
        language: profile.language,
        subject: $("aiSubject").value.trim()
      })
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok || !result.ok) {
      throw new Error(result.error || "The AI request failed.");
    }

    output.textContent = result.answer;
    const limitNote = document.createElement("p");
    limitNote.className = "help-text";
    limitNote.textContent = `Requests remaining today: ${result.remainingToday}`;
    output.appendChild(limitNote);
  } catch (error) {
    output.textContent = error.message ||
      "AI is temporarily unavailable. Check your backend deployment.";
  } finally {
    button.disabled = false;
    loading.classList.add("hidden");
  }
}

function renderPlanner() {
  const sorted = [...plannerItems].sort((a, b) =>
    String(a.date || "").localeCompare(String(b.date || ""))
  );

  return `
    ${pageHeading("Study planner", "Break your goals into smaller, manageable tasks.")}
    <section class="panel">
      <h3>Add a study task</h3>
      <form id="plannerForm">
        <div class="form-grid">
          <div class="field">
            <label for="taskTitle">Task</label>
            <input id="taskTitle" maxlength="150" required placeholder="e.g. Revise chapter 2">
          </div>
          <div class="field">
            <label for="taskSubject">Subject</label>
            <input id="taskSubject" maxlength="80" placeholder="e.g. Science">
          </div>
          <div class="field">
            <label for="taskDate">Date</label>
            <input id="taskDate" type="date" value="${todayKey()}" required>
          </div>
        </div>
        <div class="form-actions">
          <button class="btn btn-primary" type="submit">Add task</button>
        </div>
      </form>
    </section>
    <div class="section-heading"><div><h3>Your tasks</h3><p>Tasks sync to your signed-in account.</p></div></div>
    <div class="planner-list">
      ${sorted.length ? sorted.map(task => `
        <div class="planner-item ${task.done ? "done" : ""}">
          <input type="checkbox" data-task-done="${task.id}" ${task.done ? "checked" : ""}
            aria-label="Mark ${escapeHTML(task.title)} as complete">
          <div class="planner-main">
            <strong>${escapeHTML(task.title)}</strong>
            <small>${escapeHTML(task.subject || "General")} · ${escapeHTML(task.date || "No date")}</small>
          </div>
          <button class="delete-task" data-task-delete="${task.id}" aria-label="Delete task">✕</button>
        </div>`).join("") : `<div class="panel empty-state">No tasks yet. Add your first study task above.</div>`}
    </div>`;
}

async function addPlannerTask(event) {
  event.preventDefault();

  const payload = {
    title: $("taskTitle").value.trim(),
    subject: $("taskSubject").value.trim(),
    date: $("taskDate").value,
    done: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  if (!payload.title || !payload.date) return;

  try {
    const ref = await addDoc(plannerCollection(), {
      ...payload,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    plannerItems.push({ ...payload, id: ref.id });
    renderCurrent();
    toast("Study task added.");
  } catch (error) {
    console.error(error);
    toast("Could not save this task. Check Firestore rules.", true);
  }
}

async function togglePlannerTask(id, done) {
  const task = plannerItems.find(item => item.id === id);
  if (!task) return;

  try {
    await updateDoc(doc(db, "users", currentUser.uid, "planner", id), {
      done,
      updatedAt: serverTimestamp()
    });

    task.done = done;
    renderCurrent();
  } catch (error) {
    console.error(error);
    toast("Could not update task.", true);
  }
}

async function deletePlannerTask(id) {
  try {
    await deleteDoc(doc(db, "users", currentUser.uid, "planner", id));
    plannerItems = plannerItems.filter(item => item.id !== id);
    renderCurrent();
    toast("Task deleted.");
  } catch (error) {
    console.error(error);
    toast("Could not delete task.", true);
  }
}

function renderFlashcards() {
  const current = flashcards[flashcardIndex];

  return `
    ${pageHeading("Flashcards", "Create small revision cards and test what you remember.")}
    <section class="panel">
      <form id="flashcardForm">
        <div class="form-grid">
          <div class="field">
            <label for="flashFront">Question or front</label>
            <input id="flashFront" maxlength="500" required placeholder="What is photosynthesis?">
          </div>
          <div class="field">
            <label for="flashBack">Answer or back</label>
            <input id="flashBack" maxlength="1000" required placeholder="Plants use light to make glucose…">
          </div>
          <div class="field">
            <label for="flashSubject">Subject</label>
            <input id="flashSubject" maxlength="80" placeholder="Science">
          </div>
        </div>
        <div class="form-actions"><button class="btn btn-primary" type="submit">Save flashcard</button></div>
      </form>
    </section>

    <div class="section-heading"><div><h3>Revision cards</h3><p>${flashcards.length} saved cards</p></div></div>

    ${current ? `
      <section class="panel">
        <div class="flashcard">
          <div>
            <span class="pill">${escapeHTML(current.subject || "General")}</span>
            <p>${flashcardBack ? "ANSWER" : "QUESTION"}</p>
            <strong>${escapeHTML(flashcardBack ? current.back : current.front)}</strong>
          </div>
        </div>
        <div class="flashcard-actions">
          <button class="btn btn-outline" data-action="flash-prev">← Previous</button>
          <button class="btn btn-primary" data-action="flash-flip">Show ${flashcardBack ? "question" : "answer"}</button>
          <button class="btn btn-outline" data-action="flash-next">Next →</button>
        </div>
        <div class="form-actions">
          <button class="btn btn-outline" data-action="flash-delete">Delete this card</button>
        </div>
      </section>` : `<div class="panel empty-state">No flashcards yet. Create one using the form above.</div>`}
  `;
}

async function addFlashcard(event) {
  event.preventDefault();

  const payload = {
    front: $("flashFront").value.trim(),
    back: $("flashBack").value.trim(),
    subject: $("flashSubject").value.trim(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  try {
    const ref = await addDoc(flashcardCollection(), {
      ...payload,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    flashcards.push({ ...payload, id: ref.id });
    flashcardIndex = flashcards.length - 1;
    flashcardBack = false;
    renderCurrent();
    toast("Flashcard saved.");
  } catch (error) {
    console.error(error);
    toast("Could not save flashcard.", true);
  }
}

async function deleteCurrentFlashcard() {
  const card = flashcards[flashcardIndex];
  if (!card) return;

  try {
    await deleteDoc(doc(db, "users", currentUser.uid, "flashcards", card.id));
    flashcards.splice(flashcardIndex, 1);
    flashcardIndex = Math.max(0, Math.min(flashcardIndex, flashcards.length - 1));
    flashcardBack = false;
    renderCurrent();
    toast("Flashcard deleted.");
  } catch (error) {
    console.error(error);
    toast("Could not delete flashcard.", true);
  }
}

function renderProfile() {
  return `
    ${pageHeading("My learning profile", "Choose your level and preferences. These settings help the AI adapt its explanations.")}
    <section class="panel">
      <form id="profileForm">
        <div class="form-grid">
          <div class="field">
            <label for="profileName">Display name</label>
            <input id="profileName" maxlength="80" required value="${escapeHTML(profile.displayName)}">
          </div>
          <div class="field">
            <label for="profileGrade">Learning level</label>
            <select id="profileGrade" class="select">
              ${[
                "Early Learner", "Primary", "Grade 6", "Grade 7", "Grade 8",
                "Grade 9", "Grade 10", "Grade 11", "Grade 12",
                "College", "University", "Professional Skills", "Self-directed"
              ].map(value => `<option ${profile.grade === value ? "selected" : ""}>${value}</option>`).join("")}
            </select>
          </div>
          <div class="field">
            <label for="profileCurriculum">Curriculum or framework</label>
            <select id="profileCurriculum" class="select">
              ${[
                "General", "Cambridge", "IB", "US", "UK", "Pakistan",
                "India", "Other"
              ].map(value => `<option ${profile.curriculum === value ? "selected" : ""}>${value}</option>`).join("")}
            </select>
          </div>
          <div class="field">
            <label for="profileLanguage">AI response language</label>
            <select id="profileLanguage" class="select">
              ${[
                "English", "Urdu", "Roman Urdu", "Arabic", "Spanish",
                "French", "Hindi", "Chinese", "Other"
              ].map(value => `<option ${profile.language === value ? "selected" : ""}>${value}</option>`).join("")}
            </select>
          </div>
        </div>
        <div class="form-actions"><button class="btn btn-primary" type="submit">Save profile</button></div>
      </form>
      <hr style="border:0;border-top:1px solid var(--line);margin:25px 0">
      <p><strong>Signed-in email:</strong> ${escapeHTML(currentUser.email || "Not available")}</p>
      <p class="help-text">Changing your learning level changes the AI context. It does not automatically change official school placement or prove your academic ability.</p>
    </section>`;
}

function renderCurrent() {
  if (!currentUser) return;

  const pages = {
    dashboard: renderDashboard,
    lessons: renderLessons,
    quiz: renderQuiz,
    ai: renderAI,
    planner: renderPlanner,
    flashcards: renderFlashcards,
    profile: renderProfile
  };

  $("pageContent").innerHTML = (pages[activePage] || renderDashboard)();
}

async function handleAction(action) {
  switch (action) {
    case "restart-quiz":
      activeQuizIndex = 0;
      quizAnswers = [];
      quizSubmitted = false;
      renderCurrent();
      break;

    case "quiz-prev":
      activeQuizIndex = Math.max(0, activeQuizIndex - 1);
      renderCurrent();
      break;

    case "quiz-next":
      if (quizAnswers[activeQuizIndex] === undefined) {
        toast("Choose an answer first.", true);
        return;
      }

      if (activeQuizIndex === quizQuestions.length - 1) {
        await submitQuiz();
      } else {
        activeQuizIndex++;
        renderCurrent();
      }
      break;

    case "flash-prev":
      flashcardIndex = Math.max(0, flashcardIndex - 1);
      flashcardBack = false;
      renderCurrent();
      break;

    case "flash-next":
      flashcardIndex = Math.min(flashcards.length - 1, flashcardIndex + 1);
      flashcardBack = false;
      renderCurrent();
      break;

    case "flash-flip":
      flashcardBack = !flashcardBack;
      renderCurrent();
      break;

    case "flash-delete":
      await deleteCurrentFlashcard();
      break;
  }
}

document.addEventListener("click", async event => {
  const pageButton = event.target.closest("[data-page]");
  if (pageButton) {
    navigate(pageButton.dataset.page);
    return;
  }

  const lessonButton = event.target.closest("[data-open-lesson]");
  if (lessonButton) {
    openLesson(lessonButton.dataset.openLesson);
    return;
  }

  const filterButton = event.target.closest("[data-subject-filter]");
  if (filterButton) {
    filterLessons(filterButton.dataset.subjectFilter);
    return;
  }

  const answerButton = event.target.closest("[data-quiz-answer]");
  if (answerButton && !quizSubmitted) {
    quizAnswers[activeQuizIndex] = Number(answerButton.dataset.quizAnswer);
    renderCurrent();
    return;
  }

  const actionButton = event.target.closest("[data-action]");
  if (actionButton) {
    await handleAction(actionButton.dataset.action);
    return;
  }

  const deleteButton = event.target.closest("[data-task-delete]");
  if (deleteButton) {
    await deletePlannerTask(deleteButton.dataset.taskDelete);
    return;
  }

  const taskCheckbox = event.target.closest("[data-task-done]");
  if (taskCheckbox) {
    await togglePlannerTask(taskCheckbox.dataset.taskDone, taskCheckbox.checked);
  }
});

document.addEventListener("input", event => {
  if (event.target.id === "lessonSearch") filterLessons();
});

document.addEventListener("submit", async event => {
  if (event.target.id === "authForm") {
    await handleAuthSubmit(event);
  } else if (event.target.id === "aiForm") {
    await askAI(event);
  } else if (event.target.id === "plannerForm") {
    await addPlannerTask(event);
  } else if (event.target.id === "flashcardForm") {
    await addFlashcard(event);
  } else if (event.target.id === "profileForm") {
    event.preventDefault();
    await saveProfile();
  }
});

$("switchMode").addEventListener("click", () => {
  setAuthMode(authMode === "login" ? "signup" : "login");
});

$("googleBtn").addEventListener("click", googleSignIn);
$("forgotBtn").addEventListener("click", resetPassword);

$("completeLesson").addEventListener("click", completeActiveLesson);
$("closeLesson").addEventListener("click", () => $("lessonDialog").close());

$("lessonDialog").addEventListener("click", event => {
  if (event.target === $("lessonDialog")) $("lessonDialog").close();
});

$("logoutBtn").addEventListener("click", async () => {
  try {
    await signOut(auth);
    toast("You have signed out.");
  } catch (error) {
    toast("Could not sign out.", true);
  }
});

$("menuBtn").addEventListener("click", () => {
  $("sidebar").classList.add("open");
  $("scrim").classList.remove("hidden");
});

$("scrim").addEventListener("click", () => {
  $("sidebar").classList.remove("open");
  $("scrim").classList.add("hidden");
});

onAuthStateChanged(auth, async user => {
  currentUser = user;

  if (!user) {
    showAuthentication();
    $("syncStatus").textContent = "Signed out";
    return;
  }

  try {
    await loadCloudData();
    showApplication();
  } catch (error) {
    console.error("EduSpark initialization failed:", error);
    showAuthentication();
    showAuthError(
      "Your account signed in, but EduSpark could not load its data. Check Firestore setup and security rules, then sign in again."
    );
  }
});

if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(error => {
      console.warn("Service worker registration skipped:", error.message);
    });
  });
    }
