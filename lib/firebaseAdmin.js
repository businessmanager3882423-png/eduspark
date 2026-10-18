import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

function loadServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

  if (!raw) {
    throw new Error("Firebase service account is not configured.");
  }

  const account = JSON.parse(raw);
  account.private_key = account.private_key?.replace(/\\n/g, "\n");

  return account;
}

function getAdminApp() {
  const existing = getApps().find(app => app.name === "eduspark-admin");
  if (existing) return existing;

  return initializeApp(
    { credential: cert(loadServiceAccount()) },
    "eduspark-admin"
  );
}

export function getAdminServices() {
  const app = getAdminApp();

  return {
    auth: getAuth(app),
    db: getFirestore(app)
  };
}

export async function verifyUser(req) {
  const header = req.headers.authorization || "";
  const match = header.match(/^Bearer\s+(.+)$/i);

  if (!match) {
    const error = new Error("Please sign in first.");
    error.status = 401;
    throw error;
  }

  const { auth } = getAdminServices();
  return auth.verifyIdToken(match[1], true);
}

export function sendJson(res, status, body) {
  return res.status(status).json(body);
}


