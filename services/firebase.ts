// NOTE: Using a mock implementation to prevent build errors when the 'firebase' package
// is not correctly installed or configured in the environment.
// To use real Firebase, ensure 'firebase' is installed (npm install firebase) and
// uncomment the imports and configuration below.

/*
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';

// ------------------------------------------------------------------
// CONFIGURAÇÃO DO FIREBASE
// Substitua os valores abaixo pelos do seu projeto no Firebase Console
// ------------------------------------------------------------------
const firebaseConfig = {
  apiKey: "SUA_API_KEY_AQUI",
  authDomain: "SEU_PROJETO.firebaseapp.com",
  projectId: "SEU_PROJECT_ID",
  storageBucket: "SEU_PROJETO.appspot.com",
  messagingSenderId: "SEU_MESSAGING_SENDER_ID",
  appId: "SEU_APP_ID"
};

// Initialize Firebase (Modular SDK pattern)
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();
*/

// Mock implementation to allow the app to run without valid Firebase setup
export const loginWithGoogle = async () => {
  console.log("Mock Firebase: Logging in with Google...");
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Return a mock object mimicking a Firebase User
  return {
    uid: "google_mock_" + Math.random().toString(36).substring(2, 9),
    email: "motorista.demo@exemplo.com",
    displayName: "Motorista Demo",
    photoURL: "",
  };
};

export const logoutFirebase = async () => {
  console.log("Mock Firebase: Logging out...");
  return Promise.resolve();
};

// Mock auth object
export const auth = {
  currentUser: null
};