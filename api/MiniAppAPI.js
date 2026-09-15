// ==========================================
// FILE: api/MiniAppAPI.js
// ==========================================
import { auth } from '../firebaseConfig';
import { MiniAppFirebase } from '../firebase/miniApps';

export const MiniAppAPI = {
  
  // Validate and Publish App from Studio
  publishMiniApp: async (appConfig, name, description, category) => {
    // 🛡️ SECURITY: Always trust auth.currentUser, never trust UI params for ownership
    const user = auth.currentUser;
    if (!user || !user.uid) {
      throw new Error("Authentication required. Please login to publish apps.");
    }

    if (!name || !category) {
      throw new Error("App name and category are required.");
    }

    // 🏗️ Construct Strict & Safe JSON for Declarative Apps
    const newAppSchema = {
      ownerId: user.uid,
      creatorId: user.uid,
      name: name,
      description: description || '',
      category: category,
      version: 1,
      status: 'published',
      entryType: 'declarative', // Identifies this as a safe JSON app, not a Web URL
      color: appConfig.color || '#AF52DE',
      icon: appConfig.icon || 'apps',
      originalPrompt: appConfig.originalPrompt || '',
      
      // The Safe UI Components (No JS logic)
      components: appConfig.components || [],
      
      // Analytics & Tracking
      views: 0,
      installs: 0,
      rating: 0
    };

    // Pass to Firebase Layer
    return await MiniAppFirebase.createMiniApp(newAppSchema);
  },

  // Fetch for Portal
  getPublicMiniApps: async () => {
    return await MiniAppFirebase.getPublicMiniApps();
  }
};
