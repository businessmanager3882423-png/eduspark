
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";
import {
  getAuth, onAuthStateChanged, createUserWithEmailAndPassword,
  signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup,
  signOut, sendPasswordResetEmail, updateProfile
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";
import {
  getFirestore, doc, getDoc, setDoc, onSnapshot, serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";

/* ---------- Firebase setup ---------- */
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
const googleProvider = new GoogleAuthProvider();

const $ = (id) => document.getElementById(id);
const today = () => new Date().toLocaleDateString("en-CA");
const makeId = () => globalThis.crypto?.randomUUID?.() ||
  `${Date.now()}-${Math.random().toString(36).slice(2)}`;

const defaultData = () => ({
  profile: {
    name: "Student", level: "Secondary", language: "English",
    curriculum: "International"
  },
  xp: 0, streak: 0, lessonsCompleted: [], lessonsToday: 0,
  lastStudyDate: "", totalCorrect: 0, bestStreak: 0,
  examRewardClaimed: false, tasks: [], projects: [],
  updatedAt: Date.now()
});

let data = defaultData();
let currentUser = null;
let userRole = "student";
let authMode = "login";
let currentView = "dashboard";
let cloudUnsubscribe = null;
let saveTimer = null;
let isApplyingCloud = false;
let pendingInstallPrompt = null;
let activeLesson = null;
let selectedLessonAnswer = null;
let gameIndex = -1;
let gameLocked = false;
let gameStreak = 0;
let gameCorrect = 0;
let examSubmitted = false;
let scanObjectUrl = null;
let scanFile = null;
let toastTimer = null;

const lessons = [
  {
    id:"fractions",title:"Understanding Fractions",subject:"Mathematics",
    level:"Primary",track:"International",icon:"½",duration:"8 min",
    description:"Learn how fractions represent parts of a whole.",
    body:`<h3>What is a fraction?</h3><p>A fraction represents part of a whole. It has a numerator on top and a denominator on the bottom.</p><p>In <strong>3/4</strong>, the numerator is 3 and the denominator is 4. Imagine a pizza divided into four equal slices: three slices represent 3/4.</p><h3>Remember</h3><ul><li>The denominator tells you how many equal parts make the whole.</li><li>The numerator tells you how many parts you are considering.</li><li>The parts must be equal in size.</li></ul>`,
    question:"In the fraction 2/5, what does 5 tell us?",
    options:["The number of parts considered","The total number of equal parts","The number of whole pizzas"],
    answer:1
  },
  {
    id:"energy",title:"Forms of Energy",subject:"Science",level:"Middle",
    track:"International",icon:"⚡",duration:"10 min",
    description:"Discover common forms of energy and how they change.",
    body:`<h3>What is energy?</h3><p>Energy is the ability to cause change or do work. We use energy for movement, light, heating and many other activities.</p><ul><li><strong>Light energy:</strong> helps us see.</li><li><strong>Thermal energy:</strong> relates to temperature.</li><li><strong>Electrical energy:</strong> powers many devices.</li><li><strong>Chemical energy:</strong> is stored in food and fuels.</li><li><strong>Kinetic energy:</strong> is the energy of movement.</li></ul><h3>Energy changes</h3><p>A lamp changes electrical energy into light and thermal energy.</p>`,
    question:"Which type of energy is associated with movement?",
    options:["Kinetic energy","Stored chemical energy only","Soundproof energy"],
    answer:0
  },
  {
    id:"grammar",title:"Parts of Speech",subject:"English",level:"Primary",
    track:"International",icon:"Aa",duration:"7 min",
    description:"Recognise nouns, verbs, adjectives and adverbs.",
    body:`<h3>Words have different jobs</h3><ul><li><strong>Noun:</strong> names a person, place, thing or idea.</li><li><strong>Verb:</strong> expresses an action or state.</li><li><strong>Adjective:</strong> describes a noun.</li><li><strong>Adverb:</strong> often describes how an action happens.</li></ul><p>Example: “The <strong>happy</strong> child <strong>runs</strong> <strong>quickly</strong>.” Child is a noun, happy is an adjective, runs is a verb and quickly is an adverb.</p>`,
    question:"Which word is a verb in 'Birds fly high'?",
    options:["Birds","Fly","High"],
    answer:1
  },
  {
    id:"coding",title:"Coding Fundamentals",subject:"Technology",level:"Skills",
    track:"Skills",icon:"⌘",duration:"12 min",
    description:"Understand instructions, variables and logical steps.",
    body:`<h3>What is coding?</h3><p>Coding means writing instructions that a computer can follow. Programs use data, decisions and repetition to complete tasks.</p><ul><li><strong>Sequence:</strong> instructions in order.</li><li><strong>Variable:</strong> a named place to store data.</li><li><strong>Condition:</strong> a decision such as “if this is true”.</li><li><strong>Loop:</strong> repeats a set of instructions.</li></ul><h3>Think like a programmer</h3><p>Break a large problem into small steps, test each step and improve it when something goes wrong.</p>`,
    question:"What is a loop mainly used for?",
    options:["Repeating instructions","Changing the computer's screen size","Deleting every variable"],
    answer:0
  },
  {
    id:"study-skills",title:"Effective Study Techniques",subject:"Study Skills",
    level:"Secondary",track:"Skills",icon:"◷",duration:"9 min",
    description:"Use retrieval practice, spacing and focused study sessions.",
    body:`<h3>Study smarter</h3><ul><li><strong>Active recall:</strong> close your notes and try to remember key ideas.</li><li><strong>Spaced practice:</strong> revisit material over several days.</li><li><strong>Practice questions:</strong> use mistakes to find what to review.</li><li><strong>Breaks:</strong> pause regularly to refresh your attention.</li></ul><p>A practical session could be: review one topic, answer questions without notes, check your answers and schedule a short revision session later.</p>`,
    question:"Which approach helps you check what you really remember?",
    options:["Reading the same line without a pause","Active recall","Keeping every note open while guessing"],
    answer:1
  },
  {
    id:"web-design",title:"Web Design Basics",subject:"Technology",level:"Skills",
    track:"Skills",icon:"▣",duration:"11 min",
    description:"Learn the roles of HTML, CSS and JavaScript.",
    body:`<h3>Three common web technologies</h3><ul><li><strong>HTML:</strong> structures page content.</li><li><strong>CSS:</strong> controls visual presentation and layout.</li><li><strong>JavaScript:</strong> adds behaviour and interaction.</li></ul><p>For example, HTML creates a button, CSS styles it and JavaScript responds when a user clicks it.</p><h3>Design tip</h3><p>Make content readable, keep navigation predictable and ensure interactive controls work with a keyboard.</p>`,
    question:"Which technology primarily styles a web page?",
    options:["CSS","HTML alone","A spreadsheet"],
    answer:0
  },
  {
    id:"math-practice",title:"Fractions Practice",subject:"Mathematics",level:"Middle",
    track:"International",icon:"÷",duration:"6 min",
    description:"Practise equivalent fractions and simple calculations.",
    body:`<h3>Equivalent fractions</h3><p>Fractions can look different but represent the same value. For example, 1/2 and 2/4 are equivalent.</p><p>To create an equivalent fraction, multiply or divide the numerator and denominator by the same non-zero number.</p><h3>Adding fractions</h3><p>When denominators are equal, add the numerators and keep the denominator: 1/5 + 2/5 = 3/5.</p>`,
    question:"What is 1/5 + 2/5?",
    options:["3/10","3/5","2/5"],
    answer:1
  },
  {
    id:"exam-skills",title:"Preparing for an Exam",subject:"Study Skills",
    level:"College",track:"Skills",icon:"✓",duration:"8 min",
    description:"Build a revision plan and practise exam timing.",
    body:`<h3>A practical revision plan</h3><ul><li>List the topics you need to know.</li><li>Start with topics that need more practice.</li><li>Use short practice tests and review errors.</li><li>Leave time for sleep, breaks and final revision.</li></ul><p>During a timed test, read the instructions carefully, budget time and return to difficult questions if appropriate.</p>`,
    question:"Why should you review incorrect answers?",
    options:["To identify gaps and improve","To avoid learning the topic","To make every test longer"],
    answer:0
  },
  {
    id:"digital-safety",title:"Digital Safety Basics",subject:"Digital Skills",
    level:"Secondary",track:"Skills",icon:"◇",duration:"7 min",
    description:"Protect accounts and recognise suspicious messages.",
    body:`<h3>Stay safer online</h3><ul><li>Use unique, strong passwords and never share them.</li><li>Turn on multi-factor authentication when available.</li><li>Check links before opening them.</li><li>Do not share private information with strangers.</li><li>Ask a trusted adult or administrator for help with suspicious messages.</li></ul><p>A genuine service should not ask you to reveal your password in a chat or email.</p>`,
    question:"What should you do with a suspicious sign-in link?",
    options:["Open it immediately","Share your password there","Verify it through the official website"],
    answer:2
  },
  {
    id:"communication",title:"Clear Communication",subject:"Life Skills",
    level:"University",track:"Skills",icon:"✉",duration:"9 min",
    description:"Organise ideas and communicate respectfully.",
    body:`<h3>Communicate with purpose</h3><ul><li>Think about your audience and goal.</li><li>Put the main idea first.</li><li>Use examples to explain complex points.</li><li>Listen carefully and ask respectful questions.</li><li>Review important written messages before sending.</li></ul><p>Clear communication is a skill that improves through practice and feedback.</p>`,
    question:"What is a helpful way to explain a complex idea?",
    options:["Use a relevant example","Add unrelated details","Avoid organising the explanation"],
    answer:0
  }
];

const gameQuestions = [
  {q:"What is 7 × 8?",o:["54","56","64","48"],a:1},
  {q:"Which planet is known as the Red Planet?",o:["Venus","Mars","Jupiter","Mercury"],a:1},
  {q:"What is 15 + 27?",o:["32","41","42","43"],a:2},
  {q:"Which is a programming language?",o:["JavaScript","HTML only","JPEG","Wi-Fi"],a:0},
  {q:"How many sides does a hexagon have?",o:["5","6","7","8"],a:1},
  {q:"Which gas do plants absorb during photosynthesis?",o:["Oxygen","Nitrogen only","Carbon dioxide","Helium"],a:2}
];

const examQuestions = [
  {q:"What is 9 × 6?",o:["45","54","56","63"],a:1},
  {q:"Which part of a plant usually absorbs water from soil?",o:["Roots","Flower petals","Fruit","Seeds only"],a:0},
  {q:"Which technology styles a web page?",o:["CSS","HTML","DNS"],a:0},
  {q:"Which word is a noun?",o:["Quickly","Happiness","Run"],a:1},
  {q:"What is 1/4 + 1/4?",o:["1/8","2/8","1/2"],a:2}
];

/* ---------- Small helpers ---------- */
function toast(message) {
  const el = $("toast");
  if (!el) return;
  el.textContent = message;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 3000);
}
function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[c]));
}
function localKey() {
  return currentUser ? `eduspark_data_v2_${currentUser.uid}` : "eduspark_guest_v2";
}
function normaliseData(value) {
  const base = defaultData();
  if (!value || typeof value !== "object") return base;
  const result = {
    ...base, ...value,
    profile: {...base.profile, ...(value.profile || {})},
    tasks: Array.isArray(value.tasks) ? value.tasks : [],
    projects: Array.isArray(value.projects) ? value.projects : [],
    lessonsCompleted: Array.isArray(value.lessonsCompleted) ? value.lessonsCompleted : []
  };
  result.xp = Math.max(0, Number(result.xp) || 0);
  result.streak = Math.max(0, Number(result.streak) || 0);
  result.lessonsToday = Math.max(0, Number(result.lessonsToday) || 0);
  return result;
}
function readLocal() {
  try {
    const raw = localStorage.getItem(localKey());
    return raw ? normaliseData(JSON.parse(raw)) : defaultData();
  } catch {
    return defaultData();
  }
}
function writeLocal() {
  try {
    data.updatedAt = Date.now();
    localStorage.setItem(localKey(), JSON.stringify(data));
  } catch {
    toast("This browser could not save data locally.");
  }
}
function userDataRef() {
  return doc(db, "users", currentUser.uid, "private", "data");
}
function profileRef() {
  return doc(db, "users", currentUser.uid);
}
function queueSave() {
  writeLocal();
  updateDashboard();
  if (!currentUser || isApplyingCloud) {
    updateSyncStatus();
    return;
  }
  updateSyncStatus("Saving changes…");
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    try {
      await setDoc(userDataRef(), {...data, updatedAt: Date.now()});
      updateSyncStatus("All changes synced");
    } catch (error) {
      console.error("Cloud save failed", error);
      updateSyncStatus("Sync failed — check your connection and Firestore rules");
    }
  }, 650);
}
function recordStudyDay() {
  const now = today();
  if (data.lastStudyDate === now) return;
  const previous = new Date();
  previous.setDate(previous.getDate() - 1);
  const yesterday = previous.toLocaleDateString("en-CA");
  data.streak = data.lastStudyDate === yesterday ? data.streak + 1 : 1;
  data.lastStudyDate = now;
  data.lessonsToday = 0;
}
function awardXP(points) {
  data.xp += Math.max(0, Number(points) || 0);
}
function addLessonCompletion(id) {
  if (data.lessonsCompleted.includes(id)) return false;
  data.lessonsCompleted.push(id);
  data.lessonsToday = (data.lessonsToday || 0) + 1;
  awardXP(20);
  recordStudyDay();
  return true;
}
function getBadges() {
  const complete = data.lessonsCompleted.length;
  return [
    {name:"First Steps",desc:"Complete your first lesson",icon:"✦",earned:complete>=1},
    {name:"Curious Mind",desc:"Complete 5 lessons",icon:"◇",earned:complete>=5},
    {name:"Learning Explorer",desc:"Complete 10 lessons",icon:"✧",earned:complete>=10},
    {name:"Problem Solver",desc:"Answer 10 game questions correctly",icon:"⌘",earned:data.totalCorrect>=10},
    {name:"Consistent Learner",desc:"Build a 3-day study streak",icon:"♨",earned:data.streak>=3},
    {name:"Project Builder",desc:"Add your first portfolio project",icon:"▧",earned:data.projects.length>=1}
  ];
}
function updateSyncStatus(message) {
  if (message) $("syncStatus").textContent = message;
  else $("syncStatus").textContent = currentUser
    ? "Signed in as " + currentUser.email + ". Cloud sync is enabled when connected."
    : "Guest mode: data stays in this browser until you sign in.";
}
function setAuthError(message = "") {
  $("authError").textContent = message;
}
function authErrorMessage(error) {
  const code = error?.code || "";
  const messages = {
    "auth/invalid-email":"Please enter a valid email address.",
    "auth/email-already-in-use":"An account already exists for this email. Try signing in.",
    "auth/weak-password":"Use a password with at least 6 characters.",
    "auth/invalid-credential":"Email or password is incorrect.",
    "auth/user-not-found":"No account was found. Check your email or create an account.",
    "auth/wrong-password":"Email or password is incorrect.",
    "auth/popup-closed-by-user":"The Google sign-in window was closed.",
    "auth/unauthorized-domain":"Add this website domain in Firebase Authentication settings.",
    "auth/network-request-failed":"Network error. Check your internet connection.",
    "permission-denied":"Firestore permission denied. Check your Firestore rules."
  };
  return messages[code] || error?.message || "Something went wrong. Please try again.";
}

/* ---------- Authentication ---------- */
function setAuthMode(mode) {
  authMode = mode;
  const signup = mode === "signup";
  $("loginTab").classList.toggle("active", !signup);
  $("signupTab").classList.toggle("active", signup);
  $("nameField").classList.toggle("hidden", !signup);
  $("roleField").classList.toggle("hidden", !signup);
  $("authTitle").textContent = signup ? "Create your account" : "Welcome back";
  $("authSubtitle").textContent = signup
    ? "Start your personal learning journey."
    : "Sign in to continue learning.";
  $("authSubmit").textContent = signup ? "Create account" : "Sign in";
  $("forgotBtn").classList.toggle("hidden", signup);
  $("authPassword").autocomplete = signup ? "new-password" : "current-password";
  setAuthError();
}
async function ensureUserProfile(user, requestedRole = "student", displayName = "") {
  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      uid: user.uid,
      email: user.email || "",
      name: displayName || user.displayName || "Student",
      role: "student",
      requestedRole: ["student","parent","teacher"].includes(requestedRole) ? requestedRole : "student",
      createdAt: serverTimestamp()
    });
  } else if (requestedRole !== "student") {
    await setDoc(ref, {
      requestedRole,
      email: user.email || "",
      name: displayName || user.displayName || snap.data().name || "Student"
    }, {merge:true});
  }
}
async function submitAuth(event) {
  event.preventDefault();
  setAuthError();
  const button = $("authSubmit");
  const original = button.textContent;
  button.disabled = true;
  button.textContent = authMode === "signup" ? "Creating account…" : "Signing in…";
  try {
    const email = $("authEmail").value.trim();
    const password = $("authPassword").value;
    const name = $("authName").value.trim().slice(0,60);
    const requestedRole = $("requestedRole").value;
    if (authMode === "signup") {
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      if (name) await updateProfile(credential.user, {displayName:name});
      await ensureUserProfile(credential.user, requestedRole, name);
      toast("Account created. Welcome to EduSpark!");
    } else {
      await signInWithEmailAndPassword(auth, email, password);
    }
  } catch (error) {
    console.error(error);
    setAuthError(authErrorMessage(error));
  } finally {
    button.disabled = false;
    button.textContent = original;
  }
}
async function googleSignIn() {
  setAuthError();
  const button = $("googleBtn");
  button.disabled = true;
  button.textContent = "Opening Google sign-in…";
  try {
    const result = await signInWithPopup(auth, googleProvider);
    await ensureUserProfile(result.user);
    toast("Signed in with Google.");
  } catch (error) {
    console.error(error);
    setAuthError(authErrorMessage(error));
  } finally {
    button.disabled = false;
    button.innerHTML = '<span class="google-g">G</span> Continue with Google';
  }
}
async function resetPassword() {
  const email = $("authEmail").value.trim();
  if (!email) {
    setAuthError("Enter your email address first.");
    $("authEmail").focus();
    return;
  }
  try {
    await sendPasswordResetEmail(auth, email);
    toast("If this email has an account, a password reset email has been sent.");
  } catch (error) {
    setAuthError(authErrorMessage(error));
  }
}
async function logout() {
  try {
    if (cloudUnsubscribe) cloudUnsubscribe();
    cloudUnsubscribe = null;
    await signOut(auth);
  } catch (error) {
    toast(authErrorMessage(error));
  }
}

/* ---------- Role and app startup ---------- */
function applyRoleVisibility() {
  const isAdmin = userRole === "admin";
  const isTeacher = userRole === "teacher" || isAdmin;
  const isParent = userRole === "parent" || isAdmin;
  document.querySelector('[data-view="admin"]').classList.toggle("hidden", !isAdmin);
  document.querySelector('[data-view="teacher"]').classList.toggle("hidden", !isTeacher);
  document.querySelector('[data-view="parent"]').classList.toggle("hidden", !isParent);
  $("sidebarRole").textContent = userRole.charAt(0).toUpperCase() + userRole.slice(1) + " account";
  $("parentAccessText").textContent = isParent
    ? "Your account role is approved. A separate verified child link is still required to display a learner's records."
    : "Your current account does not have verified guardian access.";
  if (currentView === "admin" && !isAdmin) showView("dashboard");
  if (currentView === "teacher" && !isTeacher) showView("dashboard");
  if (currentView === "parent" && !isParent) showView("dashboard");
  renderAdmin();
}
function showApp() {
  $("authView").classList.add("hidden");
  $("appView").classList.remove("hidden");
  $("yearNow").textContent = new Date().getFullYear();
  $("sidebarName").textContent = data.profile.name || "Student";
  $("profileAvatar").textContent = (data.profile.name || "S").trim().charAt(0).toUpperCase();
  applyRoleVisibility();
  renderLessons();
  renderTasks();
  renderProjects();
  renderCareer();
  renderBadges();
  renderExam();
  updateDashboard();
  updateSyncStatus();
}
function showAuth() {
  $("appView").classList.add("hidden");
  $("authView").classList.remove("hidden");
  currentUser = null;
  userRole = "student";
  data = readLocal();
  updateNetworkStatus();
}
function loadUserData(user) {
  currentUser = user;
  if (cloudUnsubscribe) cloudUnsubscribe();
  userRole = "student";
  data = defaultData();
  const cached = readLocal();
  data.profile.name = user.displayName || cached.profile.name || "Student";
  if (cached.profile && !user.displayName) data.profile = {...data.profile,...cached.profile};
  isApplyingCloud = true;
  writeLocal();
  showApp();
  isApplyingCloud = false;

  getDoc(profileRef()).then(snap => {
    if (!snap.exists()) return ensureUserProfile(user);
    const profile = snap.data();
    userRole = ["student","parent","teacher","admin"].includes(profile.role) ? profile.role : "student";
    if (profile.name && !user.displayName) data.profile.name = profile.name;
    applyRoleVisibility();
    updateDashboard();
  }).catch(error => {
    console.error("Profile read failed", error);
    toast("Could not load account role. Check Firestore rules.");
  });

  cloudUnsubscribe = onSnapshot(userDataRef(), snap => {
    if (snap.exists()) {
      isApplyingCloud = true;
      data = normaliseData(snap.data());
      writeLocal();
      showApp();
      isApplyingCloud = false;
      updateSyncStatus("Cloud data synced");
    } else {
      queueSave();
    }
  }, error => {
    console.error("Cloud listener failed", error);
    updateSyncStatus("Cloud sync unavailable. Check Firestore rules.");
  });
}

onAuthStateChanged(auth, user => {
  if (user) loadUserData(user);
  else {
    if (cloudUnsubscribe) cloudUnsubscribe();
    cloudUnsubscribe = null;
    showAuth();
  }
});

/* ---------- Navigation ---------- */
function showView(view) {
  const target = $("view-" + view);
  if (!target) return;
  if (view === "admin" && userRole !== "admin") {
    toast("Admin access has not been granted to this account.");
    return;
  }
  if (view === "teacher" && !["teacher","admin"].includes(userRole)) {
    toast("Teacher access must be approved by an administrator.");
    return;
  }
  if (view === "parent" && !["parent","admin"].includes(userRole)) {
    toast("Parent access must be approved and linked securely.");
    return;
  }
  currentView = view;
  document.querySelectorAll(".view").forEach(el => el.classList.remove("active"));
  target.classList.add("active");
  document.querySelectorAll(".nav-link").forEach(el =>
    el.classList.toggle("active", el.dataset.view === view));
  const active = document.querySelector(`[data-view="${view}"]`);
  $("pageTitle").textContent = active ? active.textContent.trim().replace(/^[◫▤✧▧♧✓▦▣◎↗♡⚙]+\s*/,"") : "EduSpark";
  $("sidebar").classList.remove("open");
  window.scrollTo({top:0,behavior:"smooth"});
}
document.querySelectorAll("[data-view]").forEach(button =>
  button.addEventListener("click", () => showView(button.dataset.view)));
document.querySelectorAll("[data-go]").forEach(button =>
  button.addEventListener("click", () => showView(button.dataset.go)));
$("menuBtn").addEventListener("click", () => $("sidebar").classList.toggle("open"));
document.addEventListener("click", event => {
  if (window.innerWidth <= 850 &&
      !$("sidebar").contains(event.target) &&
      !$("menuBtn").contains(event.target)) {
    $("sidebar").classList.remove("open");
  }
});

/* ---------- Learning library ---------- */
function renderLessons() {
  const query = ($("lessonSearch")?.value || $("globalSearch")?.value || "").trim().toLowerCase();
  const level = $("levelFilter")?.value || "all";
  const track = $("curriculumFilter")?.value || "all";
  const filtered = lessons.filter(lesson => {
    const matchesQuery = !query ||
      `${lesson.title} ${lesson.subject} ${lesson.description} ${lesson.level}`.toLowerCase().includes(query);
    return matchesQuery && (level === "all" || lesson.level === level) &&
      (track === "all" || lesson.track === track || lesson.track === "International");
  });
  $("lessonGrid").innerHTML = filtered.length ? filtered.map(lesson => {
    const completed = data.lessonsCompleted.includes(lesson.id);
    return `<article class="lesson-card">
      <div class="lesson-card-top"><span class="lesson-icon">${escapeHtml(lesson.icon)}</span><span class="lesson-tag">${completed ? "COMPLETED" : escapeHtml(lesson.subject)}</span></div>
      <h3>${escapeHtml(lesson.title)}</h3><p>${escapeHtml(lesson.description)}</p>
      <div class="lesson-meta"><span>${escapeHtml(lesson.level)}</span><span>${escapeHtml(lesson.duration)}</span></div>
      <button class="btn ${completed ? "btn-outline" : "btn-primary"}" data-open-lesson="${escapeHtml(lesson.id)}">${completed ? "Review lesson" : "Start lesson"} →</button>
    </article>`;
  }).join("") : `<div class="empty-state">No lessons match these filters. Try a different search or level.</div>`;
  $("lessonGrid").querySelectorAll("[data-open-lesson]").forEach(button =>
    button.addEventListener("click", () => openLesson(button.dataset.openLesson)));
  renderContinueList();
}
function renderContinueList() {
  const list = $("continueList");
  if (!list) return;
  const recent = lessons.filter(l => data.lessonsCompleted.includes(l.id)).slice(-3).reverse();
  const items = recent.length ? recent : lessons.slice(0,3);
  list.innerHTML = items.map(lesson => `
    <div class="continue-item">
      <span class="continue-symbol">${escapeHtml(lesson.icon)}</span>
      <div class="continue-info"><strong>${escapeHtml(lesson.title)}</strong><small>${escapeHtml(lesson.subject)} · ${data.lessonsCompleted.includes(lesson.id) ? "Completed" : lesson.duration}</small></div>
      <button class="btn btn-outline" data-open-lesson="${escapeHtml(lesson.id)}">Open</button>
    </div>`).join("");
  list.querySelectorAll("[data-open-lesson]").forEach(button =>
    button.addEventListener("click", () => openLesson(button.dataset.openLesson)));
}
function openLesson(id) {
  const lesson = lessons.find(l => l.id === id);
  if (!lesson) return;
  activeLesson = lesson;
  selectedLessonAnswer = null;
  $("modalCategory").textContent = lesson.subject.toUpperCase();
  $("modalTitle").textContent = lesson.title;
  $("modalMeta").textContent = `${lesson.level} · ${lesson.duration} · ${lesson.track}`;
  $("modalBody").innerHTML = lesson.body;
  $("modalQuiz").innerHTML = `<h3>Quick check</h3><p>${escapeHtml(lesson.question)}</p>` +
    lesson.options.map((option,index) =>
      `<button type="button" class="answer-btn" data-lesson-answer="${index}">${escapeHtml(option)}</button>`
    ).join("") + `<p id="lessonQuizFeedback" class="feedback" aria-live="polite"></p>`;
  $("modalQuiz").querySelectorAll("[data-lesson-answer]").forEach(button => {
    button.addEventListener("click", () => {
      if (selectedLessonAnswer !== null) return;
      selectedLessonAnswer = Number(button.dataset.lessonAnswer);
      const correct = selectedLessonAnswer === lesson.answer;
      $("lessonQuizFeedback").textContent = correct ? "Correct — well done!" : "Not quite. Review the lesson and try again next time.";
      $("modalQuiz").querySelectorAll("[data-lesson-answer]").forEach((answerButton,index) => {
        answerButton.disabled = true;
        if (index === lesson.answer) answerButton.classList.add("correct");
        else if (index === selectedLessonAnswer) answerButton.classList.add("incorrect");
      });
      if (correct) {
        data.totalCorrect++;
        queueSave();
      }
    });
  });
  $("completeLesson").disabled = data.lessonsCompleted.includes(id);
  $("completeLesson").textContent = data.lessonsCompleted.includes(id) ? "Already completed" : "Mark lesson complete";
  $("lessonModal").classList.remove("hidden");
  $("closeLesson").focus();
}
function closeLesson() {
  $("lessonModal").classList.add("hidden");
  activeLesson = null;
}
$("closeLesson").addEventListener("click", closeLesson);
$("closeLessonBottom").addEventListener("click", closeLesson);
document.querySelectorAll("[data-close-modal]").forEach(el => el.addEventListener("click", closeLesson));
document.addEventListener("keydown", event => {
  if (event.key === "Escape") closeLesson();
});
$("completeLesson").addEventListener("click", () => {
  if (!activeLesson) return;
  if (addLessonCompletion(activeLesson.id)) {
    toast("Lesson completed! +20 XP");
    queueSave();
  } else {
    toast("You have already completed this lesson.");
  }
  renderLessons();
  renderBadges();
  updateDashboard();
  closeLesson();
});
$("lessonSearch").addEventListener("input", renderLessons);
$("levelFilter").addEventListener("change", renderLessons);
$("curriculumFilter").addEventListener("change", renderLessons);
$("globalSearch").addEventListener("keydown", event => {
  if (event.key === "Enter") {
    $("lessonSearch").value = event.currentTarget.value;
    showView("learn");
    renderLessons();
  }
});

/* ---------- Dashboard and achievements ---------- */
function updateDashboard() {
  const name = data.profile.name || currentUser?.displayName || "Student";
  $("welcomeTitle").textContent = `Welcome, ${name.split(" ")[0]}!`;
  $("welcomeText").textContent = "Small steps add up. Choose something to learn today.";
  $("sidebarName").textContent = name;
  $("profileAvatar").textContent = name.trim().charAt(0).toUpperCase();
  $("xpStat").textContent = data.xp;
  $("streakStat").textContent = `${data.streak} day${data.streak === 1 ? "" : "s"}`;
  $("lessonsStat").textContent = data.lessonsCompleted.length;
  $("goalStat").textContent = `${Math.min(data.lessonsToday,3)} / 3`;
  const percent = Math.min(100, Math.round(data.lessonsToday / 3 * 100));
  $("missionProgress").style.width = `${percent}%`;
  $("missionPercent").textContent = `${percent}%`;
  $("missionText").textContent = percent >= 100
    ? "Daily goal completed. Great work!"
    : `Complete ${3 - Math.min(data.lessonsToday,3)} more lesson(s) to reach your daily goal.`;
  $("correctCount").textContent = data.totalCorrect;
  $("gameXP").textContent = data.totalCorrect * 5;
  $("bestStreak").textContent = data.bestStreak;
  $("rewardXP").textContent = data.xp;
  $("rewardStreak").textContent = data.streak;
  $("badgeCount").textContent = getBadges().filter(b => b.earned).length;
  renderContinueList();
}
function renderBadges() {
  const badges = getBadges();
  $("badgeGrid").innerHTML = badges.map(b => `
    <article class="badge-card ${b.earned ? "" : "locked"}">
      <div class="badge-symbol">${b.earned ? b.icon : "🔒"}</div>
      <strong>${escapeHtml(b.name)}</strong><small>${escapeHtml(b.desc)}</small>
      <p class="small-text">${b.earned ? "Achievement unlocked" : "Keep learning to unlock"}</p>
    </article>`).join("");
  updateDashboard();
}

/* ---------- Learning game ---------- */
function startGameQuestion() {
  gameIndex++;
  if (gameIndex >= gameQuestions.length) {
    $("gameQuestion").textContent = "Challenge complete!";
    $("gameAnswers").innerHTML = "";
    $("gameFeedback").textContent = `You answered ${gameCorrect} question(s) correctly this round.`;
    $("nextQuestion").textContent = "Play again";
    gameIndex = -1;
    gameLocked = true;
    return;
  }
  gameLocked = false;
  const question = gameQuestions[gameIndex];
  $("gameRound").textContent = `Question ${gameIndex + 1} of ${gameQuestions.length}`;
  $("gameQuestion").textContent = question.q;
  $("gameFeedback").textContent = "";
  $("nextQuestion").textContent = "Next question";
  $("gameAnswers").innerHTML = question.o.map((answer,index) =>
    `<button class="answer-btn" type="button" data-game-answer="${index}">${escapeHtml(answer)}</button>`
  ).join("");
  $("gameAnswers").querySelectorAll("[data-game-answer]").forEach(button => {
    button.addEventListener("click", () => answerGame(Number(button.dataset.gameAnswer), button));
  });
}
function answerGame(choice, button) {
  if (gameLocked || gameIndex < 0) return;
  gameLocked = true;
  const question = gameQuestions[gameIndex];
  const correct = choice === question.a;
  $("gameAnswers").querySelectorAll("button").forEach((el,index) => {
    el.disabled = true;
    if (index === question.a) el.classList.add("correct");
    else if (index === choice) el.classList.add("incorrect");
  });
  if (correct) {
    gameCorrect++;
    gameStreak++;
    data.totalCorrect++;
    data.bestStreak = Math.max(data.bestStreak, gameStreak);
    awardXP(5);
    recordStudyDay();
    $("gameFeedback").textContent = "Correct! +5 XP";
    queueSave();
  } else {
    gameStreak = 0;
    $("gameFeedback").textContent = "Not quite — review the correct answer and keep practising.";
  }
  updateDashboard();
}
$("nextQuestion").addEventListener("click", () => {
  if (gameIndex === -1) {
    gameCorrect = 0;
    gameStreak = 0;
  }
  startGameQuestion();
});

/* ---------- Practice exam ---------- */
function renderExam() {
  examSubmitted = false;
  $("examQuestions").innerHTML = examQuestions.map((question,index) => `
    <div class="exam-question" data-exam-question="${index}">
      <h4>${index + 1}. ${escapeHtml(question.q)}</h4>
      ${question.o.map((option,optionIndex) => `
        <label class="exam-option"><input type="radio" name="exam-${index}" value="${optionIndex}" required>
        <span>${escapeHtml(option)}</span></label>`).join("")}
    </div>`).join("");
  $("submitExam").classList.remove("hidden");
  $("submitExam").disabled = false;
  $("retryExam").classList.add("hidden");
  $("examResult").classList.add("hidden");
}
$("examForm").addEventListener("submit", event => {
  event.preventDefault();
  if (examSubmitted) return;
  const answers = examQuestions.map((_,index) =>
    document.querySelector(`input[name="exam-${index}"]:checked`));
  if (answers.some(answer => !answer)) {
    toast("Please answer every question before submitting.");
    return;
  }
  examSubmitted = true;
  const score = answers.reduce((total,answer,index) =>
    total + (Number(answer.value) === examQuestions[index].a ? 1 : 0),0);
  const percent = Math.round(score / examQuestions.length * 100);
  let reward = 0;
  if (!data.examRewardClaimed) {
    reward = score * 3;
    data.xp += reward;
    data.examRewardClaimed = true;
  }
  $("examQuestions").querySelectorAll("input").forEach(input => input.disabled = true);
  $("submitExam").disabled = true;
  $("retryExam").classList.remove("hidden");
  $("examResult").classList.remove("hidden");
  $("examResult").innerHTML = `<h3>Your result: ${score}/${examQuestions.length} (${percent}%)</h3><p>${percent >= 80 ? "Excellent work! Keep building your knowledge." : percent >= 60 ? "Good effort. Review the topics you missed and practise again." : "Keep going. Review the lessons and try another practice round."}</p><p>${reward ? `You earned ${reward} XP for your first completed exam.` : "You have already claimed the first-exam XP reward."}</p>`;
  queueSave();
  renderBadges();
});
$("retryExam").addEventListener("click", renderExam);

/* ---------- Study planner ---------- */
function renderTasks() {
  const filter = $("taskFilter")?.value || "all";
  const tasks = data.tasks.filter(task =>
    filter === "all" || (filter === "done" ? task.done : !task.done)
  ).sort((a,b) => String(a.date).localeCompare(String(b.date)));
  $("taskCount").textContent = `${data.tasks.filter(t => !t.done).length} incomplete · ${data.tasks.length} total`;
  $("taskList").innerHTML = tasks.length ? tasks.map(task => `
    <div class="task-item ${task.done ? "done" : ""}">
      <input type="checkbox" data-task-check="${escapeHtml(task.id)}" ${task.done ? "checked" : ""} aria-label="Mark ${escapeHtml(task.title)} complete">
      <div class="task-main"><strong>${escapeHtml(task.title)}</strong><small>${escapeHtml(task.subject || "General")} · Due ${escapeHtml(task.date || "No date")}</small></div>
      <div class="task-actions"><button type="button" data-task-delete="${escapeHtml(task.id)}" aria-label="Delete task">×</button></div>
    </div>`).join("") : `<div class="empty-state">No tasks here yet. Add one to plan your next study session.</div>`;
  $("taskList").querySelectorAll("[data-task-check]").forEach(input => input.addEventListener("change", () => {
    const task = data.tasks.find(t => t.id === input.dataset.taskCheck);
    if (!task) return;
    task.done = input.checked;
    if (task.done && !task.rewarded) {
      task.rewarded = true;
      awardXP(5);
      recordStudyDay();
      toast("Task completed! +5 XP");
    }
    queueSave();
    renderTasks();
    renderBadges();
  }));
  $("taskList").querySelectorAll("[data-task-delete]").forEach(button => button.addEventListener("click", () => {
    data.tasks = data.tasks.filter(t => t.id !== button.dataset.taskDelete);
    queueSave();
    renderTasks();
  }));
}
$("taskDate").value = today();
$("taskForm").addEventListener("submit", event => {
  event.preventDefault();
  const title = $("taskTitle").value.trim();
  if (!title) return;
  data.tasks.push({
    id:makeId(), title:title.slice(0,120), date:$("taskDate").value,
    subject:$("taskSubject").value.trim().slice(0,60), done:false, rewarded:false
  });
  $("taskForm").reset();
  $("taskDate").value = today();
  queueSave();
  renderTasks();
  toast("Study task added.");
});
$("taskFilter").addEventListener("change", renderTasks);

/* ---------- Portfolio ---------- */
function renderProjects() {
  $("projectList").innerHTML = data.projects.length ? data.projects.map(project => `
    <article class="project-item">
      <strong>${escapeHtml(project.name)}</strong>
      <p>${escapeHtml(project.description || "No description added yet.")}</p>
      <small>Added ${escapeHtml(project.date || "")}</small>
      <button class="text-btn" type="button" data-project-delete="${escapeHtml(project.id)}">Delete project</button>
    </article>`).join("") : `<div class="empty-state">Your portfolio is ready. Add your first project or learning idea.</div>`;
  $("projectList").querySelectorAll("[data-project-delete]").forEach(button => button.addEventListener("click", () => {
    data.projects = data.projects.filter(project => project.id !== button.dataset.projectDelete);
    queueSave();
    renderProjects();
    renderBadges();
    toast("Project deleted.");
  }));
}
$("projectForm").addEventListener("submit", event => {
  event.preventDefault();
  const name = $("projectName").value.trim();
  if (!name) return;
  data.projects.unshift({
    id:makeId(), name:name.slice(0,100),
    description:$("projectDesc").value.trim().slice(0,1000),
    date:today()
  });
  $("projectForm").reset();
  queueSave();
  renderProjects();
  renderBadges();
  toast("Project saved to your portfolio.");
});

/* ---------- Career skills ---------- */
const careers = [
  {icon:"⌘",title:"Web development",desc:"Practise HTML, CSS, JavaScript and accessible interfaces.",level:"Beginner"},
  {icon:"▦",title:"Data literacy",desc:"Learn to interpret charts, tables and everyday data.",level:"All levels"},
  {icon:"✎",title:"Communication",desc:"Develop writing, presentation and teamwork skills.",level:"All levels"},
  {icon:"◇",title:"Digital safety",desc:"Build safer online habits and account security.",level:"Essential"},
  {icon:"↗",title:"Problem solving",desc:"Break problems into manageable steps and test ideas.",level:"All levels"},
  {icon:"✦",title:"Creative projects",desc:"Turn an idea into a small project for your portfolio.",level:"Hands-on"}
];
function renderCareer() {
  $("careerGrid").innerHTML = careers.map(item => `
    <article class="feature-card static-card"><span class="feature-icon lavender">${escapeHtml(item.icon)}</span><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.desc)}</small><span class="lesson-tag" style="margin-top:12px">${escapeHtml(item.level)}</span></article>`).join("");
}

/* ---------- Study assistant: honest local fallback ---------- */
function buildLocalGuidance(task, question, level, language) {
  const safeQuestion = escapeHtml(question);
  const simple = language === "Simple English";
  if (task === "plan") return `<h3>A study plan for: ${safeQuestion}</h3><ol><li>Write one clear learning goal.</li><li>Study the topic for 20–25 minutes.</li><li>Close your notes and recall the key ideas.</li><li>Answer 3–5 practice questions.</li><li>Review mistakes and schedule revision for another day.</li></ol><p>Suggested level: ${escapeHtml(level)}. Adjust session length to your needs and take breaks.</p>`;
  if (task === "quiz") return `<h3>Practice-question template</h3><p>Topic: <strong>${safeQuestion}</strong></p><ol><li>What is the main idea of this topic?</li><li>Explain one important term in your own words.</li><li>Give an example and explain why it fits.</li><li>What common mistake should a learner avoid?</li><li>How would you apply this idea to a new problem?</li></ol><p>These are general prompts, not AI-generated or curriculum-verified questions.</p>`;
  if (task === "notes") return `<h3>Revision notes framework</h3><p>Topic: <strong>${safeQuestion}</strong></p><ul><li><strong>Definition:</strong> Write the topic's meaning in one or two sentences.</li><li><strong>Key points:</strong> Record 3–5 essential facts.</li><li><strong>Example:</strong> Add one worked or real-life example.</li><li><strong>Common errors:</strong> List anything you often confuse.</li><li><strong>Recall check:</strong> Write three questions to answer later without notes.</li></ul>`;
  if (task === "solver") return `<h3>How to approach the problem</h3><p>Problem provided: <strong>${safeQuestion}</strong></p><ol><li>Write down what is known and what you need to find.</li><li>Choose a formula or rule that matches the problem.</li><li>Substitute values carefully and show each step.</li><li>Check your calculation and units.</li></ol><p>This local fallback has not calculated or verified your specific answer. A real maths solver requires a connected reasoning service.</p>`;
  if (task === "coding") return `<h3>Coding practice guide</h3><p>Goal: <strong>${safeQuestion}</strong></p><ol><li>Describe the expected input and output.</li><li>Break the problem into small steps.</li><li>Write pseudocode before the program.</li><li>Test a normal case and an edge case.</li><li>Read any error message and fix one issue at a time.</li></ol><p>This is a learning framework, not an executed or AI-generated solution.</p>`;
  if (task === "writing") return `<h3>Writing checklist</h3><p>Writing goal: <strong>${safeQuestion}</strong></p><ul><li>State the main point clearly.</li><li>Organise ideas into a beginning, middle and ending.</li><li>Use specific examples to support claims.</li><li>Check grammar, spelling and respectful tone.</li><li>Read the final version aloud to find unclear sentences.</li></ul>`;
  if (task === "translate") return `<h3>Text simplification guide</h3><p>Text provided: <strong>${safeQuestion}</strong></p><p>Break it into short sentences, explain unfamiliar words, and keep the original meaning. This version cannot translate or simplify the actual text without a language service connected.</p>`;
  return `<h3>How to learn this topic</h3><p>Topic: <strong>${safeQuestion}</strong></p><ol><li>Start with a simple definition in your own words.</li><li>Identify three important ideas.</li><li>Study one worked example.</li><li>Explain the idea without looking at your notes.</li><li>Practise with questions and review any mistakes.</li></ol><p>${simple ? "Use short sentences and familiar examples." : "For a more detailed explanation, connect a secure AI backend."} Learning level: ${escapeHtml(level)}.</p>`;
}
$("aiSubmit").addEventListener("click", () => {
  const question = $("aiQuestion").value.trim();
  if (!question) {
    toast("Enter a topic or question first.");
    $("aiQuestion").focus();
    return;
  }
  const task = $("aiTask").value;
  $("aiOutput").classList.remove("hidden");
  $("aiOutput").innerHTML = `<span class="game-pill">LOCAL STUDY GUIDANCE</span>${buildLocalGuidance(task,question,$("aiLevel").value,$("aiLanguage").value)}<p class="small-text muted">No external AI model was called. Check important answers against trusted learning materials.</p>`;
});
$("aiClear").addEventListener("click", () => {
  $("aiQuestion").value = "";
  $("aiOutput").innerHTML = "";
  $("aiOutput").classList.add("hidden");
});

/* ---------- Image scanner: optional browser OCR ---------- */
$("scanFile").addEventListener("change", event => {
  scanFile = event.target.files?.[0] || null;
  $("scanOutput").classList.add("hidden");
  $("scanOutput").textContent = "";
  $("scanPreview").innerHTML = "";
  $("scanPreview").classList.add("hidden");
  if (scanObjectUrl) URL.revokeObjectURL(scanObjectUrl);
  scanObjectUrl = null;
  if (!scanFile) return;
  if (scanFile.size > 10 * 1024 * 1024) {
    toast("Please choose a file smaller than 10 MB.");
    event.target.value = "";
    scanFile = null;
    return;
  }
  if (!["image/png","image/jpeg","image/webp","application/pdf"].includes(scanFile.type)) {
    toast("Please select a PNG, JPG, WebP or PDF file.");
    event.target.value = "";
    scanFile = null;
    return;
  }
  scanObjectUrl = URL.createObjectURL(scanFile);
  $("scanPreview").classList.remove("hidden");
  if (scanFile.type === "application/pdf") {
    $("scanPreview").innerHTML = `<p class="muted">PDF selected: ${escapeHtml(scanFile.name)}. Preview availability depends on the browser.</p><iframe title="PDF preview" src="${scanObjectUrl}"></iframe>`;
  } else {
    const img = document.createElement("img");
    img.alt = "Selected question image preview";
    img.src = scanObjectUrl;
    $("scanPreview").appendChild(img);
  }
});
$("scanPrepare").addEventListener("click", async () => {
  if (!scanFile) {
    toast("Choose an image or PDF first.");
    return;
  }
  if (scanFile.type === "application/pdf") {
    $("scanOutput").classList.remove("hidden");
    $("scanOutput").innerHTML = `<h3>PDF selected</h3><p>PDF preview is available where supported. OCR for PDF pages is not configured in this version. Use an image of the page or connect a PDF text-extraction service.</p>`;
    return;
  }
  const button = $("scanPrepare");
  button.disabled = true;
  button.textContent = "Loading OCR…";
  $("scanOutput").classList.remove("hidden");
  $("scanOutput").textContent = "Loading the optional OCR engine. An internet connection is required the first time.";
  try {
    if (!window.Tesseract) {
      await new Promise((resolve,reject) => {
        const script = document.createElement("script");
        script.src = "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js";
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });
    }
    button.textContent = "Reading image…";
    const result = await window.Tesseract.recognize(scanFile, "eng");
    const text = result?.data?.text?.trim() || "";
    $("scanOutput").innerHTML = `<h3>Extracted text — check it carefully</h3><pre>${escapeHtml(text || "No readable text was detected.")}</pre><p class="small-text muted">OCR may misread maths symbols, handwriting and diagrams. Verify the extracted text before relying on it.</p>`;
  } catch (error) {
    console.error(error);
    $("scanOutput").innerHTML = `<p>OCR could not start. Check your internet connection or use another image. The file has not been uploaded by this app.</p>`;
  } finally {
    button.disabled = false;
    button.textContent = "Extract text from image";
  }
});
$("scanClear").addEventListener("click", () => {
  if (scanObjectUrl) URL.revokeObjectURL(scanObjectUrl);
  scanObjectUrl = null;
  scanFile = null;
  $("scanFile").value = "";
  $("scanPreview").innerHTML = "";
  $("scanPreview").classList.add("hidden");
  $("scanOutput").innerHTML = "";
  $("scanOutput").classList.add("hidden");
});

/* ---------- Settings, export and reset ---------- */
function fillSettings() {
  $("displayName").value = data.profile.name || "";
  $("profileLevel").value = data.profile.level || "Secondary";
  $("profileLanguage").value = data.profile.language || "English";
  $("profileCurriculum").value = data.profile.curriculum || "International";
}
$("settingsForm").addEventListener("submit", async event => {
  event.preventDefault();
  data.profile.name = $("displayName").value.trim().slice(0,60) || "Student";
  data.profile.level = $("profileLevel").value;
  data.profile.language = $("profileLanguage").value;
  data.profile.curriculum = $("profileCurriculum").value;
  if (currentUser && currentUser.displayName !== data.profile.name) {
    try { await updateProfile(currentUser,{displayName:data.profile.name}); } catch (error) { console.warn(error); }
  }
  queueSave();
  renderLessons();
  toast("Preferences saved.");
});
$("exportData").addEventListener("click", () => {
  const exportData = {
    exportedAt:new Date().toISOString(),
    account:currentUser?.email || "Guest browser profile",
    learningData:data
  };
  const blob = new Blob([JSON.stringify(exportData,null,2)],{type:"application/json"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "eduspark-my-data.json";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  toast("Your data export has been prepared.");
});
$("resetData").addEventListener("click", async () => {
  const confirmed = confirm("Reset your EduSpark learning data, including progress, tasks and projects? If signed in, this reset will sync to your account. This does not delete your login account.");
  if (!confirmed) return;
  const name = data.profile.name;
  const level = data.profile.level;
  const language = data.profile.language;
  const curriculum = data.profile.curriculum;
  data = defaultData();
  data.profile = {name,level,language,curriculum};
  writeLocal();
  renderLessons();
  renderTasks();
  renderProjects();
  renderBadges();
  renderExam();
  updateDashboard();
  if (currentUser) {
    try {
      await setDoc(userDataRef(),{...data,updatedAt:Date.now()});
      toast("Learning data reset on this account.");
    } catch (error) {
      console.error(error);
      toast("Local data reset, but cloud reset failed. Check your connection.");
    }
  } else {
    toast("Learning data reset in this browser.");
  }
});
$("forceSync").addEventListener("click", async () => {
  if (!currentUser) {
    toast("Sign in to sync your learning data across devices.");
    return;
  }
  try {
    await setDoc(userDataRef(),{...data,updatedAt:Date.now()});
    updateSyncStatus("Manual sync completed");
    toast("Sync complete.");
  } catch (error) {
    console.error(error);
    updateSyncStatus("Sync failed. Check your connection and rules.");
    toast("Sync failed. Check Firebase setup.");
  }
});

/* ---------- Teacher draft is intentionally local ---------- */
$("saveTeacherDraft").addEventListener("click", () => {
  try {
    localStorage.setItem("eduspark_teacher_draft", $("teacherDraft").value.slice(0,4000));
    toast("Draft saved in this browser.");
  } catch {
    toast("This browser could not save the draft.");
  }
});
try {
  $("teacherDraft").value = localStorage.getItem("eduspark_teacher_draft") || "";
} catch {}

/* ---------- Admin preview ---------- */
function renderAdmin() {
  if (!$("adminContent")) return;
  if (userRole !== "admin") {
    $("adminContent").innerHTML = `<h3>Admin access required</h3><p class="muted">Only an account whose role has been granted securely by the project owner should see administrative information.</p>`;
    return;
  }
  $("adminContent").innerHTML = `<h3>Platform administration checklist</h3>
    <p class="muted">Your role is marked admin in the user profile. Sensitive administrative actions still need server-side validation and audited backend endpoints.</p>
    <ul><li>Review Firestore rules in the Firebase Rules Playground.</li><li>Grant roles only through a trusted owner-controlled process.</li><li>Use Firebase App Check and abuse monitoring before a public launch.</li><li>Do not expose student records, private API keys or payment secrets in frontend code.</li><li>Configure a verified guardian-link workflow before enabling child progress access.</li></ul>`;
}

/* ---------- PWA and network status ---------- */
function updateNetworkStatus() {
  const online = navigator.onLine;
  $("connectionDot").classList.toggle("online",online);
  $("connectionDot").classList.toggle("offline",!online);
  $("networkStatus").textContent = online ? "Network available" : "Offline mode";
}
window.addEventListener("online",updateNetworkStatus);
window.addEventListener("offline",updateNetworkStatus);
window.addEventListener("beforeinstallprompt", event => {
  event.preventDefault();
  pendingInstallPrompt = event;
  $("installBtn").classList.remove("hidden");
});
$("installBtn").addEventListener("click", async () => {
  if (!pendingInstallPrompt) {
    toast("Use your browser menu and choose Install app or Add to Home Screen.");
    return;
  }
  pendingInstallPrompt.prompt();
  await pendingInstallPrompt.userChoice;
  pendingInstallPrompt = null;
  $("installBtn").classList.add("hidden");
});
if ("serviceWorker" in navigator && location.protocol !== "file:") {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(error => {
      console.warn("Service worker registration failed",error);
    });
  });
}

/* ---------- Initial setup ---------- */
$("authForm").addEventListener("submit",submitAuth);
$("loginTab").addEventListener("click",() => setAuthMode("login"));
$("signupTab").addEventListener("click",() => setAuthMode("signup"));
$("googleBtn").addEventListener("click",googleSignIn);
$("forgotBtn").addEventListener("click",resetPassword);
$("logoutBtn").addEventListener("click",logout);
setAuthMode("login");
fillSettings();
updateNetworkStatus();
renderLessons();
renderTasks();
renderProjects();
renderCareer();
renderBadges();
renderExam();
updateDashboard();
