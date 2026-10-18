
# EduSpark — Learn, Play and Grow

EduSpark is a responsive learning platform prototype for exploring lessons, practising quizzes, tracking progress and organising study tasks.

## Current features

- Responsive dashboard and learning library
- Firebase email/password and Google authentication
- Per-account Firestore learning-data storage
- Lesson completion, XP, streaks and achievements
- Educational quiz game and practice exam
- Study planner with task dates and completion tracking
- Personal project portfolio
- Local study guidance templates
- Optional browser-based OCR for images
- Image and PDF preview
- Learning preferences and JSON data export
- PWA manifest, app icon and service-worker caching
- Firestore rules that protect user data by UID

## Files

- `index.html` — application interface
- `style.css` — responsive visual design
- `app.js` — authentication, lessons, learning activities and data handling
- `firestore.rules` — database access rules
- `manifest.json` — PWA metadata
- `sw.js` — app-shell cache and offline navigation fallback
- `icon.svg` — application icon

## Firebase setup

1. Open the Firebase project `eduspark-c8c5b`.
2. Enable Email/Password under Authentication > Sign-in method.
3. Enable Google sign-in and configure the authorised domains.
4. Create a Cloud Firestore database.
5. Publish the supplied `firestore.rules`.
6. Add your deployed website domain to Firebase Authentication authorised domains.
7. Test sign-in, sign-out, account isolation and cloud sync using separate test accounts.

The Firebase web configuration identifies the project. Database rules and authentication protect the data; the client configuration is not a replacement for security rules.

## Run and publish

Use a local web server for development. For GitHub Pages, keep the application files in the repository root and enable Pages in repository settings.

Test the deployed HTTPS site on mobile and desktop. Installability and service-worker support require a compatible browser and secure context.

## Important limitations

- The study assistant currently provides local study guidance templates, not generative AI.
- Image OCR uses an optional browser library and may misread maths, handwriting or diagrams.
- PDF files can be previewed where the browser supports them; PDF text extraction is not configured.
- Parent-child linking, shared classrooms, moderated community features and secure admin workflows require additional backend implementation.
- Teacher and admin roles must be granted by a trusted owner-controlled process.
- Payment processing, subscription enforcement and certificate verification are not implemented.
- Firestore sync requires internet access. Local browser storage and cloud storage are different.
- The PWA cache does not guarantee every remote dependency or feature works offline.

Never put private AI keys, payment secrets or administrator credentials in frontend files.
