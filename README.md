
# EduSpark

**Learn, Play and Grow**

EduSpark is a responsive student learning platform designed to
help learners organise their studies, practise quizzes, explore
lessons and track their progress.

## Features

- Responsive student dashboard
- Lesson library and lesson categories
- Educational quiz games
- Exam practice interface
- Study planner
- Student portfolio
- Progress and XP tracking
- Study assistant interface
- Image and PDF preview interface
- Settings and data export
- Progressive Web App (PWA) support
- Basic app-shell caching for offline access

## Technology

- HTML
- CSS
- JavaScript
- LocalStorage
- Web App Manifest
- Service Worker
- Optional future Firebase integration

## Run locally

1. Download or clone this repository.
2. Keep all application files in the root folder.
3. Open `index.html` in a browser.
4. For service-worker and PWA testing, serve the project
   through localhost or HTTPS.

## GitHub Pages

1. Open repository Settings.
2. Select Pages.
3. Choose the deployment branch.
4. Select the root folder.
5. Save and wait for deployment.
6. Open the generated HTTPS website link.

## Important limitations

The initial frontend version is a working prototype.
LocalStorage data stays in the current browser and is not
automatically synchronised across accounts or devices.

The study assistant does not provide real AI responses unless
a secure backend is connected.

Image and PDF previews do not perform actual OCR by themselves.
Firebase authentication, cloud synchronisation, classroom sharing,
secure administration and payments require further implementation
and testing before production use.

Never put private API keys or payment secrets in frontend files.

## Security

Configure Firestore rules to match the actual data structure.
Test access with Firebase Emulator or the Firebase Rules
Playground before using real student data.

## Future improvements

- Firebase Authentication and cloud sync
- Secure AI study assistant
- OCR and document question extraction
- Teacher and classroom tools
- Parent portal
- Accessible learning content
- Subscription and payment integration
- Automated tests and error reporting

