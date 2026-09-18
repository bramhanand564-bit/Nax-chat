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
// 🚀 NEW IMPORT: Media Compressor File
import { processMediaForUpload } from '../utils/mediaCompressor';

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

  // 📝 TEXT MESSAGE LOGIC (LOCKED & RESTORED GLOBAL LIMIT)
  const handleSend = async () => {
    if (!inputText.trim() || !auth.currentUser) return;
    const msgText = inputText.trim();

    // 🚀 Global Chat 500 characters limit
    if (isGlobal && msgText.length > 500) {
      Alert.alert('Limit Reached', 'You can only send up to 500 characters in Global Chat.');
      return;
    }

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

  // 📎 MEDIA SENDING LOGIC (UPDATED WITH QUALITY POPUP)
  const handleMediaPick = async (mediaType) => {
    // 🚀 Global Chat Media Block
    if (isGlobal) {
      Alert.alert('Not Allowed', 'Photos and Videos are not allowed in Global Chat.');
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: mediaType === 'video' ? ImagePicker.MediaTypeOptions.Videos : ImagePicker.MediaTypeOptions.Images,
        quality: 1, // Hamesha 1 rakho yaha, compress hum apne logic se karenge
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const fileUri = asset.uri;
        const actualMimeType = asset.mimeType; 
        const fileName = asset.fileName || fileUri.split('/').pop();

        // 🚀 THE MAGIC POPUP: Ask for Quality
        Alert.alert(
          'Select Quality',
          'How would you like to send this file?',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Original (Max 250MB)', 
              onPress: () => sendMediaMessage(fileUri, mediaType, fileName, actualMimeType, 'original') 
            },
            { 
              text: 'Standard (Data Saver)', 
              onPress: () => sendMediaMessage(fileUri, mediaType, fileName, actualMimeType, 'standard') 
            }
          ]
        );
      }
    } catch (error) {
      console.log('Media pick error:', error);
    }
  };

  // 📄 DOCUMENT SENDING LOGIC (RESTORED GLOBAL BLOCK)
  const handleDocumentPick = async () => {
    if (isGlobal) {
      Alert.alert('Not Allowed', 'Documents are not allowed in Global Chat.');
      return;
    }

    try {
      const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
      if (result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        await sendMediaMessage(asset.uri, 'file', asset.name, asset.mimeType, 'original'); // Docs humesha original jayenge
      }
    } catch (error) {
      console.log('Doc pick error:', error);
    }
  };

  // 🚀 SAVE MEDIA TO CLOUDINARY (UPDATED WITH COMPRESSION & CODEC FIX)
  const sendMediaMessage = async (fileUri, type, fileName = '', actualMimeType = null, qualityMode = 'standard') => {
    try {
      setSending(true);
      setUploadProgress(0);

      let processedUriToUpload = fileUri;

      // 🚀 STEP 1: COMPRESS & CHECK 250MB LIMIT
      if (type === 'image' || type === 'video') {
        const processResult = await processMediaForUpload(fileUri, type, qualityMode);
        processedUriToUpload = processResult.processedUri;
      }

      const finalMimeType = actualMimeType || (type === 'video' ? 'video/mp4' : type === 'image' ? 'image/jpeg' : '*/*');

      // 🚀 STEP 2: UPLOAD
      const uploadResult = await uploadToCloudinary({
        fileUri: processedUriToUpload,
        fileName: fileName,
        mimeType: finalMimeType, 
        onProgress: (progress) => setUploadProgress(progress)
      });

      if (!uploadResult || !uploadResult.secureUrl) {
        throw new Error("Cloudinary upload failed, URL is null");
      }

      // 🚀 STEP 3: VIDEO CODEC FIX (THE BLACK BOX KILLER)
      let finalUrl = uploadResult.secureUrl;
      if (type === 'video' && finalUrl.includes('/upload/')) {
        // Ye jadoo Cloudinary ko bolta hai: "Bhai kaisa bhi video ho, usko sab phone me chalne wala MP4 bana do"
        finalUrl = finalUrl.replace('/upload/', '/upload/f_mp4,vc_auto/');
      }

      if (!isGlobal) {
        await setDoc(doc(db, 'chats', chatId), { 
          lastUpdated: serverTimestamp(),
          participants: [auth.currentUser.uid, friendId].filter(Boolean)
        }, { merge: true });
      }

      // 🚀 STEP 4: SAVE REAL WORKING URL
      await addDoc(collection(db, 'chats', chatId, 'messages'), {
        fileUri: finalUrl, // 🌍 Universally Playable URL
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
      // 🚀 LIMIT ERROR ALERT
      if (error.message === 'FILE_TOO_LARGE') {
        Alert.alert('File Too Large', 'Original file exceeds 250MB limit. Please send as Standard.');
      } else {
        Alert.alert('Upload Failed', 'Could not send media file.');
      }
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
