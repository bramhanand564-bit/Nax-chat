import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Image,
  KeyboardAvoidingView, Platform, Alert, Modal, Linking, Dimensions, SafeAreaView
} from 'react-native';

import { Ionicons, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import * as ImagePicker from 'expo-image-picker';
import { Audio, Video } from 'expo-av';
import * as DocumentPicker from 'expo-document-picker';
import * as Location from 'expo-location';
import * as Contacts from 'expo-contacts';
import * as Haptics from 'expo-haptics';

import { db, auth } from '../firebaseConfig';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, doc, deleteDoc, updateDoc, setDoc } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

export default function ChatRoomScreen({ route, navigation }) {
  const { isDark } = useTheme();

  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');

  // UI States
  const [showAttachments, setShowAttachments] = useState(false);
  const [showHeaderMenu, setShowHeaderMenu] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState(null);
  
  const [fullScreenMedia, setFullScreenMedia] = useState(null); 
  const [myUniqueId, setMyUniqueId] = useState(''); 
  const [isFriendOnline, setIsFriendOnline] = useState(true);

  // Audio States
  const [recording, setRecording] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordTime, setRecordTime] = useState(0);
  const timerRef = useRef(null);
  const [playingAudioId, setPlayingAudioId] = useState(null);
  const soundRef = useRef(null);

  const scrollViewRef = useRef(null);
  const currentUser = auth.currentUser;

  // ================= GLASSY WATER BUBBLE COLORS =================
  const bg = isDark ? '#0A1520' : '#E8F1F5'; 
  const textMain = isDark ? '#F0F4F8' : '#1A2C3A';
  const textSub = isDark ? '#8AA2B5' : '#6A8296';
  
  const glassPanelBg = isDark ? 'rgba(20, 35, 50, 0.75)' : 'rgba(255, 255, 255, 0.85)';
  const glassBorder = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.5)';
  
  const bubbleMe = isDark ? 'rgba(0, 130, 255, 0.25)' : 'rgba(0, 122, 255, 0.15)';
  const bubbleOther = isDark ? 'rgba(30, 45, 60, 0.8)' : 'rgba(255, 255, 255, 0.9)';
  const bubbleBorderMe = isDark ? 'rgba(0, 150, 255, 0.3)' : 'rgba(0, 122, 255, 0.3)';

  // ================= INITIALIZATION =================
  useEffect(() => {
    AsyncStorage.getItem('nax_unique_id').then(id => { if(id) setMyUniqueId(id); });
    if(currentUser) setDoc(doc(db, 'users_presence', currentUser.uid), { status: 'Online', lastSeen: serverTimestamp() }, { merge: true });

    const q = query(collection(db, 'global_chats'), orderBy('createdAt', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => { setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))); });

    return () => { 
      unsubscribe(); 
      if(timerRef.current) clearInterval(timerRef.current); 
      if(currentUser) setDoc(doc(db, 'users_presence', currentUser.uid), { status: 'Offline', lastSeen: serverTimestamp() }, { merge: true });
    };
  }, []);

  const getMessageTime = (createdAt) => {
    if (!createdAt) return '...';
    try { return (typeof createdAt.toDate === 'function') ? createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : new Date(createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); } catch (e) { return '...'; }
  };

  // ================= 🚀 SMART ATTACHMENT LOGIC (THE UX CONVENIENCE) =================

  // 1. Send Text
  const sendMessage = async () => {
    if (!inputText.trim()) return;
    try {
      await addDoc(collection(db, 'global_chats'), {
        text: inputText.trim(), senderEmail: currentUser?.email || 'Unknown', senderName: currentUser?.displayName || 'User', senderUniqueId: myUniqueId || '@user', senderId: currentUser?.uid || null,
        type: 'text', createdAt: serverTimestamp()
      });
      setInputText(''); setShowAttachments(false);
    } catch (error) {}
  };

  const sendMedia = async (type, data) => {
    try { setShowAttachments(false); await addDoc(collection(db, 'global_chats'), { ...data, senderEmail: currentUser?.email || 'Unknown', senderName: currentUser?.displayName || 'User', senderUniqueId: myUniqueId || '@user', senderId: currentUser?.uid || null, type, createdAt: serverTimestamp() }); } catch (error) {}
  };

  // 2. Photo & Video Picker (Opens strictly Gallery)
  const pickGalleryMedia = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(()=>{});
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All, // Photo & Video Both
        quality: 0.5,
        videoMaxDuration: 60
      });
      if (!result.canceled && result.assets?.[0]) { 
        sendMedia(result.assets[0].type === 'video' ? 'video' : 'image', { mediaUrl: result.assets[0].uri }); 
      }
    } catch(e){}
  };

  // 3. Camera Direct (Opens Camera immediately)
  const openCameraDirect = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(()=>{});
      const p = await ImagePicker.requestCameraPermissionsAsync();
      if(!p.granted) { Alert.alert("Permission Needed", "Camera access is required."); return; }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        quality: 0.5
      });
      if (!result.canceled && result.assets?.[0]) { 
        sendMedia(result.assets[0].type === 'video' ? 'video' : 'image', { mediaUrl: result.assets[0].uri }); 
      }
    } catch(e){}
  };

  // 4. Document Picker (Opens Native File Manager for PDFs, ZIPs, Docs)
  const pickDocument = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(()=>{});
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*', // Allow all document types
        copyToCacheDirectory: true
      });
      if (!result.canceled && result.assets?.[0]) { 
        const file = result.assets[0];
        sendMedia('document', { 
          fileName: file.name || 'Document File', 
          fileSize: `${(file.size / 1048576).toFixed(2)} MB`,
          fileUri: file.uri 
        }); 
      }
    } catch(e){}
  };

  // 5. Advanced Options (Location & Contacts)
  const shareLocation = async () => {
    try {
      const {status} = await Location.requestForegroundPermissionsAsync();
      if(status === 'granted'){ 
        const l = await Location.getCurrentPositionAsync({}); 
        sendMedia('location', { latitude: l.coords.latitude, longitude: l.coords.longitude }); 
      }
    } catch(e){}
  };

  const shareContact = async () => {
    try {
      const {status} = await Contacts.requestPermissionsAsync();
      if(status === 'granted'){ 
        const r = await Contacts.getContactsAsync({ limit: 1 }); 
        if(r.data?.length > 0) sendMedia('contact', { contactName: r.data[0].name, contactNumber: r.data[0].phoneNumbers?.[0]?.number||'N/A' }); 
      }
    } catch(e){}
  };

  // ================= AUDIO RECORDING =================
  const startRecording = async () => { try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(()=>{}); const p = await Audio.requestPermissionsAsync(); if(!p.granted) return; await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true }); const r = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.LOW_QUALITY); setRecording(r.recording); setIsRecording(true); setRecordTime(0); timerRef.current = setInterval(()=>setRecordTime(prev=>prev+1), 1000); } catch(e){ setIsRecording(false); } };
  const stopRecording = async () => { if(!recording) return; try { setIsRecording(false); if(timerRef.current) clearInterval(timerRef.current); await recording.stopAndUnloadAsync(); const uri = recording.getURI(); setRecording(null); if(uri && recordTime>0) await sendMedia('audio', { audio: uri, duration: recordTime }); setRecordTime(0); } catch(e){ setIsRecording(false); } };
  const playAudio = async (uri, msgId) => { if(!uri) return; try { if(soundRef.current){ await soundRef.current.unloadAsync(); } const r = await Audio.Sound.createAsync({uri}); soundRef.current = r.sound; setPlayingAudioId(msgId); r.sound.setOnPlaybackStatusUpdate(s=>{ if(s.didJustFinish) setPlayingAudioId(null); }); await r.sound.playAsync(); } catch(e){ setPlayingAudioId(null); } };

  // ================= GLASS BUBBLE RENDERER =================
  const renderMessage = (msg) => {
    const isMe = msg.senderId === currentUser?.uid;
    const time = getMessageTime(msg.createdAt);
    const mType = msg.type || 'text';
    const noPadTypes = ['image', 'video', 'location', 'contact'];

    return (
      <View key={msg.id} style={[styles.messageRow, { justifyContent: isMe ? 'flex-end' : 'flex-start' }]}>
        <TouchableOpacity activeOpacity={0.85} onLongPress={() => { Haptics.selectionAsync().catch(()=>{}); setSelectedMessage(msg); }} style={[styles.messageBubble, { backgroundColor: isMe ? bubbleMe : bubbleOther, borderColor: isMe ? bubbleBorderMe : glassBorder, borderBottomRightRadius: isMe ? 5 : 24, borderBottomLeftRadius: isMe ? 24 : 5, padding: noPadTypes.includes(mType) ? 4 : 12 }]}>
          
          {!isMe && ( 
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4, paddingHorizontal: noPadTypes.includes(mType) ? 8 : 0, paddingTop: noPadTypes.includes(mType) ? 6 : 0 }}>
              <Text style={[styles.senderName, { color: isDark ? '#4AB5FF' : '#0056B3' }]}>{msg.senderName}</Text>
              <Text style={{ fontSize: 11, color: textSub, marginLeft: 6, fontWeight: '500' }}>{msg.senderUniqueId}</Text>
            </View>
          )}

          {mType === 'image' ? (
            <TouchableOpacity onPress={() => setFullScreenMedia({ uri: msg.mediaUrl, type: 'image' })}>
              <Image source={{ uri: msg.mediaUrl }} style={[styles.chatMedia, { borderRadius: isMe ? 18 : 20, borderBottomRightRadius: isMe ? 4 : 20, borderBottomLeftRadius: isMe ? 20 : 4 }]} />
            </TouchableOpacity>
          ) : 
           mType === 'video' ? (
            <TouchableOpacity style={styles.videoContainer} onPress={() => setFullScreenMedia({ uri: msg.mediaUrl, type: 'video' })}>
              <Video source={{ uri: msg.mediaUrl }} resizeMode="cover" style={[styles.chatMedia, { borderRadius: isMe ? 18 : 20, borderBottomRightRadius: isMe ? 4 : 20, borderBottomLeftRadius: isMe ? 20 : 4 }]} />
              <View style={styles.playOverlay}><Ionicons name="play" size={30} color="#FFF" /></View>
            </TouchableOpacity>
          ) :
           mType === 'document' ? (
            <View style={[styles.docContainer, { backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.05)' }]}>
              <View style={[styles.docIcon, { backgroundColor: '#8B5CF6' }]}><Ionicons name="document-text" size={24} color="#FFF" /></View>
              <View style={{ flex: 1, paddingRight: 10 }}>
                <Text style={{ color: textMain, fontWeight: 'bold', fontSize: 14 }} numberOfLines={1}>{msg.fileName}</Text>
                <Text style={{ color: textSub, fontSize: 12, marginTop: 2 }}>{msg.fileSize} • Document</Text>
              </View>
            </View>
          ) :
           mType === 'location' ? (
            <TouchableOpacity onPress={() => Linking.openURL(`geo:0,0?q=${msg.latitude},${msg.longitude}`).catch(()=>{})} style={styles.locationContainer}>
              <View style={styles.mapPlaceholder}><Ionicons name="map" size={40} color="#888" /><Ionicons name="location" size={30} color="#FF3B30" style={{ position: 'absolute' }} /></View>
              <View style={{ padding: 10 }}><Text style={{ color: textMain, fontWeight: 'bold' }}>Live Location</Text></View>
            </TouchableOpacity>
          ) :
           mType === 'contact' ? (
            <View style={[styles.docContainer, { backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.05)' }]}><View style={[styles.docIcon, { backgroundColor: '#0EA5E9' }]}><Ionicons name="person" size={24} color="#FFF" /></View><View style={{ flex: 1 }}><Text style={{ color: textMain, fontWeight: 'bold' }}>{msg.contactName}</Text><Text style={{ color: textSub, fontSize: 12 }}>{msg.contactNumber}</Text></View></View>
          ) :
           mType === 'audio' ? (
            <View style={styles.audioContainer}>
              <TouchableOpacity onPress={() => playAudio(msg.audio, msg.id)} style={styles.playBtn}><Ionicons name={playingAudioId === msg.id ? 'pause' : 'play'} size={24} color={isMe ? '#007AFF' : textMain} /></TouchableOpacity>
              <View style={styles.audioWave}>{[12, 20, 15, 24, 10].map((h, i) => ( <View key={i} style={[styles.waveLine, { height: h, backgroundColor: isMe ? '#007AFF' : textSub }]} /> ))}</View>
              <Text style={{ color: isMe ? '#007AFF' : textMain, marginLeft: 10, fontSize: 13, fontWeight: '500' }}>{`${Math.floor((msg.duration||0)/60)}:${((msg.duration||0)%60).toString().padStart(2,'0')}`}</Text>
            </View>
          ) : ( <Text style={{ color: textMain, fontSize: 16, lineHeight: 22 }}>{msg.text}</Text> )}

          <View style={[styles.msgFooter, noPadTypes.includes(mType) ? styles.mediaFooter : null]}>
            <Text style={[styles.msgTime, { color: noPadTypes.includes(mType) ? '#FFF' : textSub }]}>{time}</Text>
            {isMe && ( <Ionicons name="checkmark-done" size={16} color={noPadTypes.includes(mType) ? '#FFF' : '#007AFF'} style={{ marginLeft: 5 }} /> )}
          </View>

          {msg.reaction && ( <View style={[styles.reactionBadge, { backgroundColor: isDark ? '#1E2D3D' : '#FFF', borderColor: glassBorder }]}><Text style={{ fontSize: 14 }}>{msg.reaction}</Text></View> )}
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <SafeAreaView style={[styles.container, { backgroundColor: bg }]}>
        
        {/* ================= GLASSY HEADER ================= */}
        <View style={[styles.header, { backgroundColor: glassPanelBg, borderBottomColor: glassBorder }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}><Ionicons name="chevron-back" size={28} color={textMain} /></TouchableOpacity>
          <Image source={{ uri: 'https://ui-avatars.com/api/?name=Global+Chat&background=007AFF&color=fff' }} style={styles.avatar} />
          <View style={styles.headerInfo}>
            <Text style={[styles.headerName, { color: textMain }]} numberOfLines={1}>Global Nax Room</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
              <View style={[styles.statusDot, { backgroundColor: isFriendOnline ? '#34C759' : '#FF3B30' }]} />
              <Text style={styles.headerStatus}>{isFriendOnline ? 'Online' : 'Offline'}</Text>
            </View>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={() => navigation.navigate('Call', { type: 'video' })} style={styles.actionIcon}><Ionicons name="videocam-outline" size={26} color={textMain} /></TouchableOpacity>
            <TouchableOpacity onPress={() => setShowHeaderMenu(!showHeaderMenu)} style={styles.actionIcon}><Ionicons name="ellipsis-horizontal-circle-outline" size={26} color={textMain} /></TouchableOpacity>
          </View>
        </View>

        {showHeaderMenu && (
          <View style={[styles.headerMenu, { backgroundColor: glassPanelBg, borderColor: glassBorder }]}>
            {['Search Friend', 'Clear Chat'].map((option, index) => (
              <TouchableOpacity key={index} style={styles.menuOption} onPress={() => { setShowHeaderMenu(false); }}>
                <Ionicons name={index === 0 ? "search-outline" : "trash-outline"} size={20} color={textMain} style={{ marginRight: 10 }} />
                <Text style={{ color: textMain, fontSize: 16 }}>{option}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* ================= CHAT LIST ================= */}
        <ScrollView style={styles.chatArea} contentContainerStyle={{ padding: 15, paddingBottom: 20 }} ref={scrollViewRef} onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}>
          <View style={[styles.encryptionBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', borderColor: glassBorder }]}><Ionicons name="lock-closed-outline" size={14} color={textSub} /><Text style={[styles.encryptionText, { color: textSub }]}>Messages are end-to-end encrypted.</Text></View>
          {messages.map(renderMessage)}
        </ScrollView>

        {/* ================= SMART ATTACHMENT TRAY ================= */}
        {showAttachments && (
          <View style={[styles.attachmentTray, { backgroundColor: glassPanelBg, borderTopColor: glassBorder }]}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 10 }}>
              {[
                { i: 'document-text', c: '#8B5CF6', n: 'Document', a: pickDocument },   // NATIVE FILE MANAGER
                { i: 'images', c: '#3B82F6', n: 'Gallery', a: pickGalleryMedia },      // NATIVE PHOTO GALLERY
                { i: 'camera', c: '#EC4899', n: 'Camera', a: openCameraDirect },       // DIRECT CAMERA LAUNCH
                { i: 'location', c: '#10B981', n: 'Location', a: shareLocation },      // NATIVE GPS
                { i: 'person', c: '#F59E0B', n: 'Contact', a: shareContact }           // NATIVE PHONEBOOK
              ].map((item, index) => (
                <TouchableOpacity key={index} style={styles.attachOption} onPress={item.a}>
                  <View style={[styles.attachIconWrap, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#FFF', borderColor: glassBorder }]}>
                    <Ionicons name={item.i} size={28} color={item.c} />
                  </View>
                  <Text style={{ fontSize: 13, color: textMain, fontWeight: '500' }}>{item.n}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* ================= FLOATING GLASS INPUT AREA ================= */}
        <View style={[styles.inputArea, { backgroundColor: bg }]}>
          {isRecording ? (
            <View style={[styles.inputBox, { backgroundColor: glassPanelBg, borderColor: glassBorder, justifyContent: 'space-between', paddingHorizontal: 20 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}><View style={[styles.redDot, { opacity: recordTime % 2 === 0 ? 1 : 0 }]} /><Text style={{ color: textMain, fontSize: 16, marginLeft: 10, fontWeight: 'bold' }}>{Math.floor(recordTime / 60)}:{(recordTime % 60).toString().padStart(2, '0')}</Text></View>
              <Text style={{ color: textSub }}>Slide to cancel 👈</Text>
            </View>
          ) : (
            <View style={[styles.inputBox, { backgroundColor: glassPanelBg, borderColor: glassBorder }]}>
              <TouchableOpacity onPress={() => setShowAttachments(!showAttachments)} style={styles.iconBtn}><Ionicons name="add-circle" size={30} color={textSub} /></TouchableOpacity>
              <TextInput style={[styles.input, { color: textMain }]} placeholder="Message..." placeholderTextColor={textSub} multiline value={inputText} onChangeText={setInputText} onFocus={() => setShowAttachments(false)} />
              {!inputText.trim() && ( <TouchableOpacity style={styles.iconBtn} onPress={openCameraDirect}><Ionicons name="camera" size={26} color={textSub} /></TouchableOpacity> )}
            </View>
          )}

          <TouchableOpacity style={[styles.micBtn, { backgroundColor: inputText.trim() ? '#007AFF' : '#10B981', shadowColor: inputText.trim() ? '#007AFF' : '#10B981' }]} onPress={inputText.trim() ? sendMessage : undefined} onLongPress={!inputText.trim() ? startRecording : undefined} onPressOut={() => { if (isRecording) stopRecording(); }}>
            <Ionicons name={inputText.trim() ? 'send' : 'mic'} size={22} color="#FFF" style={inputText.trim() ? { marginLeft: 4 } : {}} />
          </TouchableOpacity>
        </View>

        {/* ================= FULL SCREEN MEDIA MODAL ================= */}
        <Modal visible={!!fullScreenMedia} transparent={false} animationType="fade" onRequestClose={() => setFullScreenMedia(null)}>
          <View style={styles.fullScreenContainer}>
            <TouchableOpacity style={styles.fullScreenCloseBtn} onPress={() => setFullScreenMedia(null)}><Ionicons name="close" size={32} color="#FFF" /></TouchableOpacity>
            {fullScreenMedia?.type === 'video' ? ( <Video source={{ uri: fullScreenMedia.uri }} style={{ width: '100%', height: '100%' }} resizeMode="contain" useNativeControls shouldPlay /> ) : ( <Image source={{ uri: fullScreenMedia?.uri }} style={{ width: '100%', height: '100%', resizeMode: 'contain' }} /> )}
          </View>
        </Modal>

        {/* ================= MESSAGE ACTION MODAL ================= */}
        <Modal visible={!!selectedMessage} transparent animationType="fade" onRequestClose={() => setSelectedMessage(null)}>
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setSelectedMessage(null)}>
            <View style={[styles.actionModal, { backgroundColor: glassPanelBg, borderColor: glassBorder }]}>
              <View style={styles.reactionRow}>
                {['❤️', '😂', '🔥', '👍', '🙏', '🤯'].map((emoji, index) => ( <TouchableOpacity key={index} onPress={async () => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(()=>{}); await updateDoc(doc(db, 'global_chats', selectedMessage.id), { reaction: emoji }); setSelectedMessage(null); }} style={styles.reactionEmojiBg}><Text style={{ fontSize: 28 }}>{emoji}</Text></TouchableOpacity> ))}
              </View>
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.actionGrid}>
                  {[
                    { id: 'copy', i: 'copy', n: 'Copy', c: textMain }, { id: 'forward', i: 'arrow-redo', n: 'Forward', c: textMain },
                    { id: 'delete', i: 'trash', n: 'Delete', c: '#EF4444' }
                  ].map((action, index) => {
                    if (action.id === 'delete' && selectedMessage?.senderId !== currentUser?.uid) return null;
                    return ( <TouchableOpacity key={index} style={styles.actionGridItem} onPress={async () => { Haptics.selectionAsync().catch(()=>{}); if(action.id==='delete') await deleteDoc(doc(db, 'global_chats', selectedMessage.id)); setSelectedMessage(null); }}><View style={[styles.actionIconBg, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)' }]}><Ionicons name={action.i} size={22} color={action.c} /></View><Text style={{ color: action.c, fontSize: 12, marginTop: 6, fontWeight: '500' }}>{action.n}</Text></TouchableOpacity> );
                  })}
                </View>
              </ScrollView>
            </View>
          </TouchableOpacity>
        </Modal>

      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 }, 
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: Platform.OS === 'ios' ? 10 : 45, paddingBottom: 12, paddingHorizontal: 10, borderBottomWidth: 1 }, 
  backBtn: { padding: 5 }, 
  avatar: { width: 44, height: 44, borderRadius: 22, marginHorizontal: 10 }, 
  headerInfo: { flex: 1 }, 
  headerName: { fontSize: 18, fontWeight: '700' }, 
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 5 },
  headerStatus: { fontSize: 12, color: '#8AA2B5', fontWeight: '500' }, 
  headerActions: { flexDirection: 'row', alignItems: 'center' }, 
  actionIcon: { padding: 8, marginLeft: 2 }, 
  headerMenu: { position: 'absolute', top: 100, right: 15, borderRadius: 16, borderWidth: 1, elevation: 15, zIndex: 20, minWidth: 220, overflow: 'hidden' }, 
  menuOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 20, borderBottomWidth: 0.5, borderBottomColor: 'rgba(150,150,150,0.1)' },
  
  chatArea: { flex: 1 }, 
  encryptionBox: { flexDirection: 'row', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20, marginHorizontal: 'auto', alignSelf: 'center', marginBottom: 20, alignItems: 'center', borderWidth: 1 }, 
  encryptionText: { fontSize: 11, marginLeft: 6, fontWeight: '500' }, 
  
  messageRow: { flexDirection: 'row', marginBottom: 15 }, 
  messageBubble: { maxWidth: '82%', borderRadius: 24, borderWidth: 1, overflow: 'hidden' }, 
  senderName: { fontSize: 14, fontWeight: '700' }, 
  
  chatMedia: { width: width * 0.7, height: width * 0.7, resizeMode: 'cover' }, 
  videoContainer: { position: 'relative', justifyContent: 'center', alignItems: 'center' },
  playOverlay: { position: 'absolute', width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  mediaFooter: { position: 'absolute', bottom: 8, right: 12, backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 }, 
  
  docContainer: { flexDirection: 'row', alignItems: 'center', minWidth: 220, padding: 8, borderRadius: 16 },
  docIcon: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  locationContainer: { minWidth: 240, borderRadius: 18, overflow: 'hidden' }, 
  mapPlaceholder: { height: 130, backgroundColor: 'rgba(0,0,0,0.05)', justifyContent: 'center', alignItems: 'center' }, 
  callCard: { flexDirection: 'row', alignItems: 'center', minWidth: 240, padding: 12, borderRadius: 16, borderWidth: 1 },
  callIconBg: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,122,255,0.1)', justifyContent: 'center', alignItems: 'center' },
  joinBtn: { backgroundColor: '#007AFF', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },

  msgFooter: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginTop: 4 }, 
  msgTime: { fontSize: 10, fontWeight: '500' }, 
  reactionBadge: { position: 'absolute', bottom: -14, right: 10, borderRadius: 20, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 }, 
  
  audioContainer: { flexDirection: 'row', alignItems: 'center', minWidth: 180, paddingVertical: 5 }, 
  playBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.8)', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  audioWave: { flexDirection: 'row', alignItems: 'center' }, 
  waveLine: { width: 3.5, borderRadius: 2, marginHorizontal: 2.5 }, 
  redDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#FF3B30' }, 
  
  attachmentTray: { paddingVertical: 20, borderTopWidth: 1 }, 
  attachOption: { alignItems: 'center', width: 85 }, 
  attachIconWrap: { width: 60, height: 60, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginBottom: 10, borderWidth: 1 }, 
  
  inputArea: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 12, paddingVertical: 10, paddingBottom: Platform.OS === 'ios' ? 25 : 15 }, 
  inputBox: { flex: 1, flexDirection: 'row', alignItems: 'flex-end', borderRadius: 28, paddingHorizontal: 5, paddingVertical: 5, marginHorizontal: 10, minHeight: 50, borderWidth: 1 }, 
  iconBtn: { padding: 8, justifyContent: 'center', marginBottom: 2 }, 
  input: { flex: 1, fontSize: 16, maxHeight: 120, minHeight: 40, paddingTop: Platform.OS === 'ios' ? 12 : 8, paddingBottom: Platform.OS === 'ios' ? 12 : 8, paddingHorizontal: 10 }, 
  micBtn: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginBottom: 2, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 6, elevation: 5 }, 
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }, 
  actionModal: { width: '90%', borderRadius: 28, padding: 20, maxHeight: '65%', borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 30, elevation: 15 }, 
  reactionRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, paddingHorizontal: 5 }, 
  reactionEmojiBg: { padding: 8, borderRadius: 20, backgroundColor: 'rgba(150,150,150,0.1)' },
  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start', marginTop: 10 }, 
  actionGridItem: { width: '25%', alignItems: 'center', marginVertical: 12 }, 
  actionIconBg: { width: 48, height: 48, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  
  fullScreenContainer: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  fullScreenCloseBtn: { position: 'absolute', top: 50, right: 20, zIndex: 10, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' }
});
