import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';

// TODO: Replace this with your actual Firebase configuration
// You can find this in your Firebase Console under Project Settings
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Initialize Firebase only if config is provided to avoid crashes
const app = firebaseConfig.apiKey !== "YOUR_API_KEY" ? initializeApp(firebaseConfig) : null;
export const auth = app ? getAuth(app) : null;
export const db = app ? getFirestore(app) : null;
export const googleProvider = new GoogleAuthProvider();

// Mock Auth for preview purposes when Firebase is not configured
export const mockSignInWithGoogle = async (isAdmin = false) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        user: {
          uid: isAdmin ? 'admin-123' : 'student-123',
          displayName: isAdmin ? 'Admin User' : 'Student User',
          email: isAdmin ? 'admin@example.com' : 'student@example.com',
          photoURL: isAdmin ? 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix' : 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex',
        },
        role: isAdmin ? 'admin' : 'student'
      });
    }, 1000);
  });
};
