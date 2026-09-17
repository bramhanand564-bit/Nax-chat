// ==========================================
// FILE: hooks/useChatRoomLogic.js
// ==========================================
import { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';

import { uploadToCloudinary } from '../utils/cloudinaryUpload'; 

export default function useChatRoomLogic(chatId, isGlobal, friendId, chatName, navigation) {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  
  const [uploadProgress, setUploadProgress] = useState(0);

  // 🔄 REAL-TIME FETCH (LOCKED)
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

  // 📝 TEXT MESSAGE LOGIC (LOCKED)
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

  // 📎 MEDIA SENDING LOGIC (UPDATED: Extracting actual MIME type and File Name)
  const handleMediaPick = async (mediaType) => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: mediaType === 'video' ? ImagePicker.MediaTypeOptions.Videos : ImagePicker.MediaTypeOptions.Images,
        quality: 0.7,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const fileUri = asset.uri;
        const actualMimeType = asset.mimeType; // 🚀 GETTING REAL MIME TYPE (e.g. video/quicktime)
        const fileName = asset.fileName || fileUri.split('/').pop();

        await sendMediaMessage(fileUri, mediaType, fileName, actualMimeType); 
      }
    } catch (error) {
      console.log('Media pick error:', error);
    }
  };

  // 📄 DOCUMENT SENDING LOGIC (UPDATED: Extracting actual MIME type)
  const handleDocumentPick = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
      if (result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        await sendMediaMessage(asset.uri, 'file', asset.name, asset.mimeType);
      }
    } catch (error) {
      console.log('Doc pick error:', error);
    }
  };

  // 🚀 SAVE MEDIA TO CLOUDINARY THEN FIRESTORE (UPDATED: Passing dynamic actualMimeType)
  const sendMediaMessage = async (fileUri, type, fileName = '', actualMimeType = null) => {
    try {
      setSending(true);
      setUploadProgress(0);

      // Fallback mime type if picker doesn't provide one
      const finalMimeType = actualMimeType || (type === 'video' ? 'video/mp4' : type === 'image' ? 'image/jpeg' : '*/*');

      // 1. Cloudinary upload using EXACT mime type
      const uploadResult = await uploadToCloudinary({
        fileUri: fileUri,
        fileName: fileName,
        mimeType: finalMimeType, // 🚀 PASSING DYNAMIC MIME TYPE HERE
        onProgress: (progress) => setUploadProgress(progress)
      });

      if (!uploadResult || !uploadResult.secureUrl) {
        throw new Error("Cloudinary upload failed, URL is null");
      }

      if (!isGlobal) {
        await setDoc(doc(db, 'chats', chatId), { 
          lastUpdated: serverTimestamp(),
          participants: [auth.currentUser.uid, friendId].filter(Boolean)
        }, { merge: true });
      }

      // 3. Save REAL URL and DELETE TOKEN to Firestore
      await addDoc(collection(db, 'chats', chatId, 'messages'), {
        fileUri: uploadResult.secureUrl, // 🌍 Real Internet URL
        deleteToken: uploadResult.deleteToken || null, 
        publicId: uploadResult.publicId || null,
        fileName: fileName,
        senderId: auth.currentUser.uid,
        senderName: auth.currentUser.email?.split('@')[0] || 'User',
        createdAt: serverTimestamp(),
        type: type, 
        text: type === 'image' ? '📷 Photo' : type === 'video' ? '🎥 Video' : '📄 Document'
      });

    } catch (error) {
      console.log('Media Send Error:', error);
      Alert.alert('Upload Failed', 'Could not send media file.');
    } finally {
      setSending(false);
      setUploadProgress(0);
    }
  };

  // 📞 CALL LOGIC (LOCKED)
  const initiateCall = (type) => {
    if (isGlobal) return Alert.alert('Notice', 'Calls are only available in private chats.');
    if (!friendId) return Alert.alert('Error', 'Friend ID missing.');
    navigation.navigate('Call', { callId: chatId, type: type, name: chatName, friendId: friendId, isCaller: true });
  };

  return {
    messages, inputText, setInputText, loading, sending, uploadProgress,
    handleSend, handleMediaPick, handleDocumentPick, initiateCall
  };
}
