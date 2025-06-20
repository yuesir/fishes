// Firebase config goes here
const firebaseConfig = {
  apiKey: "AIzaSyB0SvfVvI8Eq1ZUhzCgJHRqJKKhanWABTI",
  authDomain: "checkboxgame.firebaseapp.com",
  projectId: "checkboxgame",
  storageBucket: "checkboxgame.firebasestorage.app",
  messagingSenderId: "571679687712",
  appId: "1:571679687712:web:68f1a057e0592d1739e845"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
window.db = firebase.firestore();
