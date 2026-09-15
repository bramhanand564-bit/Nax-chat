// ==========================================
// FILE: hooks/useChatRoomLogic.js
// ==========================================
import { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';

export default function useChatRoomLogic(chatId, isGlobal, friendId, chatName, navigation) {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  // 🔄 REAL-TIME FETCH
  useEffect(() => {
    if (!auth.currentUser) return;
    const q = query(collection(db, 'chats', chatId, 'messages'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setMessages(msgs);
      setLoading(false);
    }, (error) => {
      console.log("Chat fetch error:", error);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [chatId]);

  // 📝 TEXT MESSAGE LOGIC
  const handleSend = async () => {
    if (!inputText.trim() || !auth.currentUser) return;
    const msgText = inputText.trim();
    setInputText('');
    setSending(true);

    try {
      if (!isGlobal) {
        await setDoc(doc(db, 'chats', chatId), { 
          lastUpdated: serverTimestamp(),
          participants: [auth.currentUser.uid, friendId].filter(Boolean)
        }, { merge: true });
      }
      await addDoc(collection(db, 'chats', chatId, 'messages'), {
        text: msgText,
        senderId: auth.currentUser.uid,
        senderName: auth.currentUser.email?.split('@')[0] || 'User',
        createdAt: serverTimestamp(),
        type: 'text'
      });
    } catch (error) {
      console.log('Send Error:', error);
      Alert.alert('Error', 'Message send failed.');
    } finally {
      setSending(false);
    }
  };

  // 📎 MEDIA SENDING LOGIC (Image & Video)
  const handleMediaPick = async (mediaType) => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: mediaType === 'video' ? ImagePicker.MediaTypeOptions.Videos : ImagePicker.MediaTypeOptions.Images,
        quality: 0.7,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const fileUri = result.assets[0].uri;
        sendMediaMessage(fileUri, mediaType); // Sending directly (Firebase storage upload can be added here later)
      }
    } catch (error) {
      console.log('Media pick error:', error);
    }
  };

  // 📄 DOCUMENT SENDING LOGIC
  const handleDocumentPick = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
      if (result.assets && result.assets.length > 0) {
        sendMediaMessage(result.assets[0].uri, 'file', result.assets[0].name);
      }
    } catch (error) {
      console.log('Doc pick error:', error);
    }
  };

  // 🚀 SAVE MEDIA TO FIRESTORE
  const sendMediaMessage = async (fileUri, type, fileName = '') => {
    try {
      await addDoc(collection(db, 'chats', chatId, 'messages'), {
        fileUri: fileUri, // For now storing local URI. (P2P or Storage integration goes here)
        fileName: fileName,
        senderId: auth.currentUser.uid,
        senderName: auth.currentUser.email?.split('@')[0] || 'User',
        createdAt: serverTimestamp(),
        type: type, // 'image', 'video', or 'file'
        text: type === 'image' ? '📷 Photo' : type === 'video' ? '🎥 Video' : '📄 Document'
      });
    } catch (error) {
      console.log('Media Send Error:', error);
    }
  };

  // 📞 CALL LOGIC
  const initiateCall = (type) => {
    if (isGlobal) return Alert.alert('Notice', 'Calls are only available in private chats.');
    if (!friendId) return Alert.alert('Error', 'Friend ID missing.');
    navigation.navigate('Call', { callId: chatId, type: type, name: chatName, friendId: friendId, isCaller: true });
  };

  return {
    messages, inputText, setInputText, loading, sending,
    handleSend, handleMediaPick, handleDocumentPick, initiateCall
  };
}
