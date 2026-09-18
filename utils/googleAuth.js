// ==========================================
// FILE: utils/googleAuth.js
// ==========================================
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { auth } from '../firebaseConfig';

// 🚀 GOOGLE INITIALIZATION
export const initGoogleSignIn = () => {
  GoogleSignin.configure({
    // Yahan tumhara asli Web Client ID lag gaya hai!
    webClientId: '138730719673-5vn0agd7hibmqd87b5a82l2q66dqnij9.apps.googleusercontent.com', 
    
    // 🚀 YAHI WO JADUI CHABI HAI! Iske bina Drive ka hidden folder access nahi hoga
    scopes: ['https://www.googleapis.com/auth/drive.appdata'], 
    
    offlineAccess: true, // Taki token baad me bhi kaam kare
  });
};

// 🔐 LOGIN FUNCTION
export const signInWithGoogle = async () => {
  try {
    // 1. Check if Google Play Services are available
    await GoogleSignin.hasPlayServices();
    
    // 2. Open Google Login Pop-up
    const userInfo = await GoogleSignin.signIn();
    const { idToken, accessToken } = userInfo.data || userInfo;
    
    // 3. Connect Google with Firebase
    const googleCredential = GoogleAuthProvider.credential(idToken);
    const userCredential = await signInWithCredential(auth, googleCredential);
    
    console.log("✅ Google Sign-In Success!");
    
    // 4. Return Google User and The Secret Access Token (for Drive)
    return { 
      success: true, 
      user: userCredential.user, 
      driveAccessToken: accessToken 
    };
    
  } catch (error) {
    console.log('Google Sign-In Error:', error);
    if (error.code === statusCodes.SIGN_IN_CANCELLED) {
      console.log('User cancelled the login flow');
    } else if (error.code === statusCodes.IN_PROGRESS) {
      console.log('Login already in progress');
    } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
      console.log('Play services not available');
    }
    return { success: false, error };
  }
};

// 🚪 LOGOUT FUNCTION
export const signOutGoogle = async () => {
  try {
    await GoogleSignin.signOut();
    await auth.signOut();
  } catch (error) {
    console.log('Logout Error:', error);
  }
};
