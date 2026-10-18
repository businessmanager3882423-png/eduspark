import { getAdminServices } from "../lib/firebaseAdmin.js";

const uid = process.argv[2];

if (!uid) {
  console.error("Usage: npm run set-admin -- FIREBASE_USER_UID");
  process.exit(1);
}

try {
  const { auth } = getAdminServices();
  const user = await auth.getUser(uid);

  await auth.setCustomUserClaims(uid, {
    ...(user.customClaims || {}),
    admin: true
  });

  console.log("Admin claim assigned to:", uid);
  console.log("The user must sign in again or refresh their ID token.");
} catch (error) {
  console.error("Could not assign admin:", error.message);
  process.exit(1);
}
