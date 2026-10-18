export default function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({
      ok: false,
      error: "Method not allowed."
    });
  }

  return res.status(200).json({
    ok: true,
    service: "EduSpark Backend",
    version: "1.0.0",
    firebaseAdminConfigured: Boolean(
      process.env.FIREBASE_SERVICE_ACCOUNT_JSON
    ),
    aiConfigured: Boolean(process.env.GEMINI_API_KEY),
    message: "Backend endpoint is responding."
  });
}
