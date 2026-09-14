import { db } from '../firebaseConfig';
import {
  collection,
  doc,
  setDoc,
  getDocs,
  getDoc,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore';

const BOTS_COLLECTION = 'bots';

/**
 * BotService - Handles all database operations for the Nax Bot Ecosystem.
 * Rule: Keep Firebase logic separated from UI screens.
 */
export const BotService = {
  
  // 1. Check if a bot @username is already taken
  checkUsernameAvailable: async (username) => {
    try {
      const q = query(
        collection(db, BOTS_COLLECTION), 
        where('username', '==', username.toLowerCase())
      );
      const snapshot = await getDocs(q);
      return snapshot.empty; // Returns true if username is available
    } catch (error) {
      console.log('Error checking bot username:', error);
      throw error;
    }
  },

  // 2. Create a new Bot in Firestore
  createBot: async (ownerId, botData) => {
    try {
      const newBotRef = doc(collection(db, BOTS_COLLECTION));
      
      const newBot = {
        id: newBotRef.id,
        ownerId: ownerId,
        name: botData.name,
        username: botData.username.toLowerCase(),
        description: botData.description || 'Welcome to my Nax Bot!',
        welcomeMessage: botData.welcomeMessage || 'Hello! How can I help you today?',
        avatar: botData.avatar || '',
        status: 'active',
        isPublic: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      
      await setDoc(newBotRef, newBot);
      return newBot;
    } catch (error) {
      console.log('Error creating bot:', error);
      throw error;
    }
  },

  // 3. Get all bots created/owned by the current user
  getUserBots: async (ownerId) => {
    try {
      const q = query(
        collection(db, BOTS_COLLECTION), 
        where('ownerId', '==', ownerId)
      );
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      }));
    } catch (error) {
      console.log('Error fetching user bots:', error);
      return [];
    }
  },

  // 4. Fetch details of a specific bot by its ID
  getBotById: async (botId) => {
    try {
      const botDoc = await getDoc(doc(db, BOTS_COLLECTION, botId));
      if (botDoc.exists()) {
        return { id: botDoc.id, ...botDoc.data() };
      }
      return null;
    } catch (error) {
      console.log('Error fetching bot by ID:', error);
      return null;
    }
  }
};
