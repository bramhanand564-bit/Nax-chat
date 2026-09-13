import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCkT8uAVMgFfKMEQLl82ZYcmMrQJwra92Q",
  authDomain: "naxchat-27309.firebaseapp.com",
  projectId: "naxchat-27309",
  storageBucket: "naxchat-27309.firebasestorage.app",
  messagingSenderId: "138730719673",
  appId: "1:138730719673:web:7761e0c196d563f5164e68"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Auth & Firestore
export const auth = getAuth(app);
export const db = getFirestore(app);
