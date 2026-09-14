import { db } from '../firebaseConfig';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { BotService } from '../services/BotService';

/**
 * BotMessageHandler
 * Handles incoming messages directed at a bot and generates automatic responses.
 */
export const BotMessageHandler = {
  
  /**
   * Processes a user's message and sends the bot's response to Firestore
   * @param {string} chatId - The ID of the current chat room
   * @param {string} botId - The Firestore ID of the bot
   * @param {string} userMessageText - The text the user sent
   * @param {string} userName - The name of the user who sent the message
   */
  processMessage: async (chatId, botId, userMessageText, userName) => {
    try {
      // 1. Fetch bot details (to get its specific welcome message, name, etc.)
      const bot = await BotService.getBotById(botId);
      if (!bot) return;

      let responseText = "Sorry, I am still learning!";
      const text = userMessageText.trim().toLowerCase();

      // 2. Telegram-Style Basic Command Handling
      if (text === '/start') {
        responseText = bot.welcomeMessage || `Hello ${userName}! I am ${bot.name}. How can I help you?`;
      } 
      else if (text === '/help') {
        responseText = `Here are my available commands:\n\n/start - Restart the bot\n/help - Show this menu\n/about - Learn more about me`;
      } 
      else if (text === '/about') {
        responseText = bot.description || `I am a smart bot running on the Nax Super App ecosystem!`;
      } 
      else {
        // Fallback response for normal text
        responseText = `I received: "${userMessageText}". My AI functions are currently being upgraded by my creator!`;
      }

      // 3. Send Bot's Response directly to the Chat
      const collectionPath = chatId === 'global_chats' ? 'global_chats' : `chats/${chatId}/messages`;
      
      await addDoc(collection(db, collectionPath), {
        text: responseText,
        type: 'text',
        senderId: bot.id,
        senderName: `🤖 ${bot.name}`,
        senderUniqueId: `@${bot.username}`,
        isBot: true, // Special flag to identify bot messages
        createdAt: serverTimestamp(),
        read: false,
      });

    } catch (error) {
      console.log('Bot Message Handler Error:', error);
    }
  }
};
