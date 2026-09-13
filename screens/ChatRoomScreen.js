import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Image,
  KeyboardAvoidingView, Platform, Alert, Modal, Dimensions, SafeAreaView, ActivityIndicator
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import * as ImagePicker from 'expo-image-picker';
import { Video } from 'expo-av';
import * as DocumentPicker from 'expo-document-picker';
import * as Haptics from 'expo-haptics';

// File System & Media Library for Local Storage
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';

import { db, auth } from '../firebaseConfig';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

export default function ChatRoomScreen({ route, navigation }) {
  const { isDark } = useTheme();

  const chatId = route.params?.chatId || 'global_chats';
  const chatTitle = route.params?.chatName || 'Global Nax Room';

  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');

  // UI States
  const [showAttachments, setShowAttachments] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [fullScreenMedia, setFullScreenMedia] = useState(null); 
  const [myUniqueId, setMyUniqueId] = useState(''); 
  
  // Call States
  const [isCallingOut, setIsCallingOut] = useState(false);
  
  // Upload States
  const [isUploading, setIsUploading] = useState(false);
  const [uploadText, setUploadText] = useState('');

  const scrollViewRef = useRef(null);
  const currentUser = auth.currentUser;

  // Glassy Colors
  const bg = isDark ? '#0A1520' : '#E8F1F5'; 
  const textMain = isDark ? '#F0F4F8' : '#1A2C3A';
  const textSub = isDark ? '#8AA2B5' : '#6A8296';
  const glassPanelBg = isDark ? 'rgba(20, 35, 50, 0.85)' : 'rgba(255, 255, 255, 0.9)';
  const glassBorder = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.5)';
  const bubbleMe = isDark ? 'rgba(0, 130, 255, 0.25)' : 'rgba(0, 122, 255, 0.15)';
  const bubbleOther = isDark ? 'rgba(30, 45, 60, 0.9)' : 'rgba(255, 255, 255, 0.95)';

  useEffect(() => {
    AsyncStorage.getItem('nax_unique_id').then(id => { if(id) setMyUniqueId(id); });

    const collectionPath = chatId === 'global_chats' ? 'global_chats' : `chats/${chatId}/messages`;
    const q = query(collection(db, collectionPath), orderBy('createdAt', 'asc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => { 
      setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))); 
    });

    return () => unsubscribe();
  }, [chatId]);

  const getMessageTime = (createdAt) => {
    if (!createdAt) return '...';
    try { return (typeof createdAt.toDate === 'function') ? createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : new Date(createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); } catch (e) { return '...'; }
  };

  // ================= 1. TEXT MESSAGE =================
  const sendMessage = async () => {
    if (!inputText.trim()) return;
    const collectionPath = chatId === 'global_chats' ? 'global_chats' : `chats/${chatId}/messages`;
    await addDoc(collection(db, collectionPath), {
      text: inputText.trim(), senderName: currentUser?.displayName || 'User', senderUniqueId: myUniqueId || '@user', senderId: currentUser?.uid || null,
      type: 'text', createdAt: serverTimestamp()
    });
    setInputText('');
  };

  // ================= 2. CLOUD UPLOAD ENGINE =================
  const uploadToCloud = async (file) => {
    setIsUploading(true);
    setUploadText('Uploading to Cloud...');
    
    try {
      const formData = new FormData();
      formData.append('file', {
        uri: Platform.OS === 'android' ? file.uri : file.uri.replace('file://', ''),
        name: file.fileName || `media_${Date.now()}.${file.type === 'video' ? 'mp4' : 'jpg'}`,
        type: file.mimeType || 'application/octet-stream'
      });

      // Free Temp Cloud for sending (Direct Link)
      const response = await fetch('https://tmpfiles.org/api/v1/upload', {
        method: 'POST', body: formData, headers: { 'Content-Type': 'multipart/form-data' }
      });
      const json = await response.json();

      if (json.status === 'success') {
        const directUrl = json.data.url.replace('tmpfiles.org/', 'tmpfiles.org/dl/');
        
        const collectionPath = chatId === 'global_chats' ? 'global_chats' : `chats/${chatId}/messages`;
        await addDoc(collection(db, collectionPath), {
          mediaUrl: directUrl,
          fileName: file.fileName || 'Media File',
          fileSize: `${(file.size / 1048576).toFixed(2)} MB`,
          senderName: currentUser?.displayName || 'User', 
          senderUniqueId: myUniqueId || '@user', 
          senderId: currentUser?.uid || null,
          type: file.type === 'video' ? 'video' : 'image', 
          isDownloaded: false, // Samne wale ke liye pehle download false rahega
          createdAt: serverTimestamp()
        });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Alert.alert("Upload Failed", "Cloud server rejected the file.");
      }
    } catch (error) {
      Alert.alert("Error", "Could not connect to Cloud.");
    }
    setIsUploading(false);
  };

  // ================= 3. LOCAL DOWNLOAD ENGINE (NEW) =================
  const downloadToLocal = async (cloudUrl, fileName, msgId) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      Alert.alert("Downloading...", "Saving to your gallery...");

      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Please allow storage access to save media.'); return;
      }

      const fileUri = FileSystem.documentDirectory + (fileName || `download_${Date.now()}.mp4`);
      const downloadRes = await FileSystem.downloadAsync(cloudUrl, fileUri);

      // Save to Gallery
      const asset = await MediaLibrary.createAssetAsync(downloadRes.uri);
      
      // Update Firebase so it plays locally next time
      const collectionPath = chatId === 'global_chats' ? 'global_chats' : `chats/${chatId}/messages`;
      await updateDoc(doc(db, collectionPath, msgId), {
        localUri: asset.uri,
        isDownloaded: true
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      Alert.alert('Download Error', 'Could not save the file.');
    }
  };

  // ================= 4. MEDIA PICKERS =================
  const handleMediaSelection = async () => {
    try {
      setShowAttachments(false);
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.All, quality: 0.5 });
      if (!result.canceled && result.assets?.[0]) {
        const asset = result.assets[0];
        asset.type = asset.type === 'video' || asset.uri.endsWith('.mp4') ? 'video' : 'image';
        uploadToCloud(asset);
      }
    } catch(e) {}
  };

  // ================= 5. CALL ENGINE =================
  const initiateCall = (type) => {
    if(chatId === 'global_chats') { Alert.alert("Notice", "Calls only work in private chats."); return; }
    setIsCallingOut(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setTimeout(() => {
      setIsCallingOut(false);
      navigation.navigate('Call', { roomId: chatId, type });
    }, 2000);
  };

  // ================= 6. MESSAGE RENDERER =================
  const renderMessage = (msg) => {
    const isMe = msg.senderId === currentUser?.uid;
    const time = getMessageTime(msg.createdAt);
    const mType = msg.type || 'text';
    
    // Auto-assume my own sent files are local
    const playUri = msg.isDownloaded || isMe ? (msg.localUri || msg.mediaUrl) : msg.mediaUrl;

    return (
      <View key={msg.id} style={[styles.messageRow, { justifyContent: isMe ? 'flex-end' : 'flex-start' }]}>
        <TouchableOpacity activeOpacity={0.9} onLongPress={() => { Haptics.selectionAsync(); setSelectedMessage(msg); }} style={[styles.messageBubble, { backgroundColor: isMe ? bubbleMe : bubbleOther, borderColor: glassBorder, borderBottomRightRadius: isMe ? 5 : 20, borderBottomLeftRadius: isMe ? 20 : 5, padding: mType === 'text' ? 12 : 6 }]}>
          
          {!isMe && ( 
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4, paddingHorizontal: mType !== 'text' ? 8 : 0, paddingTop: mType !== 'text' ? 6 : 0 }}>
              <Text style={[styles.senderName, { color: isDark ? '#4AB5FF' : '#0056B3' }]}>{msg.senderName}</Text>
              <Text style={{ fontSize: 11, color: textSub, marginLeft: 6 }}>{msg.senderUniqueId}</Text>
            </View>
          )}

          {mType === 'image' || mType === 'video' ? (
            <View style={styles.videoContainer}>
              {(!msg.isDownloaded && !isMe) ? (
                // 🛑 BLURRED + DOWNLOAD BUTTON (Kala dabba hatane ke liye)
                <TouchableOpacity onPress={() => downloadToLocal(msg.mediaUrl, msg.fileName, msg.id)}>
                  <Image source={{ uri: msg.mediaUrl || 'https://via.placeholder.com/300' }} style={[styles.chatMedia, { opacity: 0.4, blurRadius: 10 }]} />
                  <View style={styles.downloadOverlay}>
                    <Ionicons name="download" size={36} color="#FFF" />
                    <Text style={{ color: '#FFF', marginTop: 5, fontWeight: 'bold' }}>{msg.fileSize || 'Download'}</Text>
                  </View>
                </TouchableOpacity>
              ) : (
                // ✅ LOCAL PLAY (Gallery se seedha chalega)
                <TouchableOpacity onPress={() => setFullScreenMedia({ uri: playUri, type: mType })}>
                  {mType === 'video' ? (
                    <>
                      <Video source={{ uri: playUri }} resizeMode="cover" style={styles.chatMedia} />
                      <View style={styles.playOverlay}><Ionicons name="play" size={32} color="#FFF" /></View>
                    </>
                  ) : (
                    <Image source={{ uri: playUri }} style={styles.chatMedia} />
                  )}
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <Text style={{ color: textMain, fontSize: 16, lineHeight: 22 }}>{msg.text}</Text>
          )}

          <View style={[styles.msgFooter, mType !== 'text' ? styles.mediaFooter : null]}>
            <Text style={[styles.msgTime, { color: mType !== 'text' ? '#FFF' : textSub }]}>{time}</Text>
            {isMe && <Ionicons name="checkmark-done" size={16} color={mType !== 'text' ? '#FFF' : '#007AFF'} style={{ marginLeft: 4 }} />}
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]}>
      
      {/* HEADER */}
      <View style={[styles.header, { backgroundColor: glassPanelBg, borderBottomColor: glassBorder }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}><Ionicons name="chevron-back" size={28} color={textMain} /></TouchableOpacity>
        <Image source={{ uri: `https://ui-avatars.com/api/?name=${encodeURIComponent(chatTitle)}&background=007AFF&color=fff` }} style={styles.avatar} />
        <View style={styles.headerInfo}>
          <Text style={[styles.headerName, { color: textMain }]} numberOfLines={1}>{chatTitle}</Text>
          <Text style={{ fontSize: 12, color: '#34C759', fontWeight: '500' }}>Online</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => initiateCall('video')} style={styles.actionIcon}><Ionicons name="videocam-outline" size={26} color={textMain} /></TouchableOpacity>
          <TouchableOpacity onPress={() => initiateCall('voice')} style={styles.actionIcon}><Ionicons name="call-outline" size={24} color={textMain} /></TouchableOpacity>
        </View>
      </View>

      {/* CLOUD UPLOAD INDICATOR */}
      {isUploading && (
        <View style={[styles.uploadBanner, { backgroundColor: glassPanelBg, borderColor: glassBorder }]}>
          <ActivityIndicator size="small" color="#007AFF" />
          <Text style={{ color: textMain, fontWeight: 'bold', marginLeft: 10 }}>{uploadText}</Text>
        </View>
      )}

      {/* CHAT AREA */}
      <ScrollView style={styles.chatArea} contentContainerStyle={{ padding: 15, paddingBottom: 20 }} ref={scrollViewRef} onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}>
        <View style={[styles.encryptionBox, { borderColor: glassBorder }]}><Ionicons name="shield-checkmark" size={14} color={textSub} /><Text style={[styles.encryptionText, { color: textSub }]}>Cloud Download & P2P Encryption Active.</Text></View>
        {messages.map(renderMessage)}
      </ScrollView>

      {/* ATTACHMENTS */}
      {showAttachments && (
        <View style={[styles.attachmentTray, { backgroundColor: glassPanelBg, borderTopColor: glassBorder }]}>
          <TouchableOpacity style={styles.attachOption} onPress={handleMediaSelection}>
            <View style={[styles.attachIconBg, { backgroundColor: '#3B82F6' }]}><Ionicons name="images" size={24} color="#FFF" /></View>
            <Text style={{ color: textMain, fontSize: 12, marginTop: 6, fontWeight: '500' }}>Gallery/Files</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.attachOption} onPress={() => { setShowAttachments(false); navigation.navigate('TicTacToe'); }}>
            <View style={[styles.attachIconBg, { backgroundColor: '#10B981' }]}><Ionicons name="game-controller" size={24} color="#FFF" /></View>
            <Text style={{ color: textMain, fontSize: 12, marginTop: 6, fontWeight: '500' }}>Games</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* INPUT BAR */}
      <View style={[styles.inputArea, { backgroundColor: bg }]}>
        <View style={[styles.inputBox, { backgroundColor: glassPanelBg, borderColor: glassBorder }]}>
          <TouchableOpacity onPress={() => setShowAttachments(!showAttachments)} style={styles.iconBtn}><Ionicons name="add-circle" size={30} color={textSub} /></TouchableOpacity>
          <TextInput style={[styles.input, { color: textMain }]} placeholder="Message..." placeholderTextColor={textSub} multiline value={inputText} onChangeText={setInputText} onFocus={() => setShowAttachments(false)} />
        </View>
        <TouchableOpacity style={[styles.micBtn, { backgroundColor: inputText.trim() ? '#007AFF' : '#10B981' }]} onPress={inputText.trim() ? sendMessage : undefined}>
          <Ionicons name={inputText.trim() ? 'send' : 'mic'} size={22} color="#FFF" style={inputText.trim() ? { marginLeft: 4 } : {}} />
        </TouchableOpacity>
      </View>

      {/* MODALS */}
      <Modal visible={isCallingOut} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.actionModal, { backgroundColor: glassPanelBg, borderColor: glassBorder, alignItems: 'center' }]}>
            <ActivityIndicator size="large" color="#007AFF" style={{ marginBottom: 10 }} />
            <Text style={{ color: textMain, fontSize: 18, fontWeight: 'bold' }}>Ringing...</Text>
          </View>
        </View>
      </Modal>

      <Modal visible={!!fullScreenMedia} transparent={false} animationType="fade" onRequestClose={() => setFullScreenMedia(null)}>
        <View style={styles.fullScreenContainer}>
          <TouchableOpacity style={styles.fullScreenCloseBtn} onPress={() => setFullScreenMedia(null)}><Ionicons name="close" size={32} color="#FFF" /></TouchableOpacity>
          {fullScreenMedia?.type === 'video' ? ( <Video source={{ uri: fullScreenMedia.uri }} style={{ width: '100%', height: '100%' }} resizeMode="contain" useNativeControls shouldPlay /> ) : ( <Image source={{ uri: fullScreenMedia?.uri }} style={{ width: '100%', height: '100%', resizeMode: 'contain' }} /> )}
        </View>
      </Modal>

      <Modal visible={!!selectedMessage} transparent animationType="fade" onRequestClose={() => setSelectedMessage(null)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setSelectedMessage(null)}>
          <View style={[styles.actionModal, { backgroundColor: glassPanelBg, borderColor: glassBorder }]}>
            <TouchableOpacity style={{ padding: 15, alignItems: 'center' }} onPress={async () => { if(selectedMessage?.senderId === currentUser?.uid) await deleteDoc(doc(db, chatId === 'global_chats' ? 'global_chats' : `chats/${chatId}/messages`, selectedMessage.id)); setSelectedMessage(null); }}>
              <Text style={{ color: '#EF4444', fontWeight: 'bold', fontSize: 16 }}>Delete Message</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 }, 
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: Platform.OS === 'ios' ? 10 : 45, paddingBottom: 12, paddingHorizontal: 10, borderBottomWidth: 1 }, 
  backBtn: { padding: 5 }, 
  avatar: { width: 44, height: 44, borderRadius: 22, marginHorizontal: 10 }, 
  headerInfo: { flex: 1 }, 
  headerName: { fontSize: 18, fontWeight: '700' }, 
  headerActions: { flexDirection: 'row', alignItems: 'center' }, 
  actionIcon: { padding: 8, marginLeft: 2 }, 
  
  uploadBanner: { flexDirection: 'row', alignItems: 'center', padding: 12, margin: 10, borderRadius: 12, borderWidth: 1, elevation: 3 },
  chatArea: { flex: 1 }, 
  encryptionBox: { flexDirection: 'row', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20, alignSelf: 'center', marginBottom: 20, borderWidth: 1 }, 
  encryptionText: { fontSize: 11, marginLeft: 6 }, 
  
  messageRow: { flexDirection: 'row', marginBottom: 15 }, 
  messageBubble: { maxWidth: '82%', borderRadius: 20, borderWidth: 1, overflow: 'hidden' }, 
  senderName: { fontSize: 13, fontWeight: '700', marginBottom: 4 }, 
  
  chatMedia: { width: width * 0.65, height: width * 0.65, borderRadius: 16, resizeMode: 'cover', backgroundColor: '#1E2D3D' },
  videoContainer: { position: 'relative', justifyContent: 'center', alignItems: 'center' },
  playOverlay: { position: 'absolute', width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  downloadOverlay: { position: 'absolute', width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  
  msgFooter: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginTop: 4, paddingHorizontal: 4 }, 
  mediaFooter: { position: 'absolute', bottom: 8, right: 12, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10 },
  msgTime: { fontSize: 10, fontWeight: '500' }, 
  
  attachmentTray: { paddingVertical: 20, borderTopWidth: 1, flexDirection: 'row', justifyContent: 'space-around' }, 
  attachOption: { alignItems: 'center' }, 
  attachIconBg: { width: 50, height: 50, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  
  inputArea: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 12, paddingVertical: 10, paddingBottom: Platform.OS === 'ios' ? 25 : 15 }, 
  inputBox: { flex: 1, flexDirection: 'row', alignItems: 'flex-end', borderRadius: 28, paddingHorizontal: 5, paddingVertical: 5, marginHorizontal: 10, minHeight: 50, borderWidth: 1 }, 
  iconBtn: { padding: 8, justifyContent: 'center', marginBottom: 2 }, 
  input: { flex: 1, fontSize: 16, maxHeight: 120, minHeight: 40, paddingTop: 10, paddingBottom: 10, paddingHorizontal: 10 }, 
  micBtn: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginBottom: 2 }, 
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' }, 
  actionModal: { width: '80%', borderRadius: 20, padding: 20, borderWidth: 1 },
  
  fullScreenContainer: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  fullScreenCloseBtn: { position: 'absolute', top: 50, right: 20, zIndex: 10, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.3)', justifyContent: 'center', alignItems: 'center' }
});
