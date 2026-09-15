// ==========================================
// FILE: api/MiniAppAPI.js
// ==========================================
import { auth } from '../firebaseConfig';
import { MiniAppFirebase } from '../firebase/miniApps';

export const MiniAppAPI = {
  
  publishMiniApp: async (appConfig, name, description, category) => {
    const user = auth.currentUser;
    if (!user || !user.uid) throw new Error("Authentication required.");
    if (!name || !category) throw new Error("App name and category are required.");

    const newAppSchema = {
      ownerId: user.uid,
      creatorId: user.uid,
      name: name,
      description: description || '',
      category: category,
      version: 1,
      status: 'published',
      entryType: 'declarative',
      color: appConfig.color || '#AF52DE',
      icon: appConfig.icon || 'apps',
      originalPrompt: appConfig.originalPrompt || '',
      components: appConfig.components || [],
      views: 0,
      installs: 0,
      rating: 0
    };

    return await MiniAppFirebase.createMiniApp(newAppSchema);
  },

  getPublicMiniApps: async () => {
    return await MiniAppFirebase.getPublicMiniApps();
  },

  // 🚀 NEW: Search Mini Apps locally from the public list
  searchMiniApps: async (searchQuery) => {
    const apps = await MiniAppFirebase.getPublicMiniApps();
    if (!searchQuery || searchQuery.trim() === '') return apps;
    
    const lowerQ = searchQuery.toLowerCase();
    return apps.filter(app => 
      app.name?.toLowerCase().includes(lowerQ) || 
      app.description?.toLowerCase().includes(lowerQ) ||
      app.category?.toLowerCase().includes(lowerQ)
    );
  }
};
