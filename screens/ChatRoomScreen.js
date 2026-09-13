import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Image,
  KeyboardAvoidingView, Platform, Alert, Modal, Linking, Dimensions, SafeAreaView
} from 'react-native';

import { Ionicons, MaterialCommunityIcons, FontAwesome5, Feather } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import * as ImagePicker from 'expo-image-picker';
import { Audio, Video } from 'expo-av';
import * as DocumentPicker from 'expo-document-picker';
import * as Location from 'expo-location';
import * as Contacts from 'expo-contacts';
import * as Haptics from 'expo-haptics';

import { db, auth } from '../firebaseConfig';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

export default function ChatRoomScreen({ route, navigation }) {
  const { isDark } = useTheme();

  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');

  // UI Modals & Menus
  const [showAttachments, setShowAttachments] = useState(false);
  const [showHeaderMenu, setShowHeaderMenu] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [replyingTo, setReplyingTo] = useState(null);
  
  // New Feature States
  const [fullScreenMedia, setFullScreenMedia] = useState(null); // For Fullscreen Image/Video
  const [showProfileModal, setShowProfileModal] = useState(false); // For Unique ID
  const [myUniqueId, setMyUniqueId] = useState(''); 
  const [tempUniqueId, setTempUniqueId] = useState('');

  // Audio States
  const [recording, setRecording] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordTime, setRecordTime] = useState(0);
  const timerRef = useRef(null);
  const [playingAudioId, setPlayingAudioId] = useState(null);
  const soundRef = useRef(null);

  const scrollViewRef = useRef(null);
  const currentUser = auth.currentUser;

  // ================= GLASSY WATER BUBBLE THEME COLORS =================
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
    // Fetch unique ID from local storage
    AsyncStorage.getItem('nax_unique_id').then(id => { if(id) setMyUniqueId(id); });

    // Fetch Messages
    const q = query(collection(db, 'global_chats'), orderBy('createdAt', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => { unsubscribe(); if(timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const saveUniqueId = async () => {
    if(!tempUniqueId.trim()) return;
    const formattedId = tempUniqueId.trim().toLowerCase().replace(/\s+/g, '');
    await AsyncStorage.setItem('nax_unique_id', `@${formattedId}`);
    setMyUniqueId(`@${formattedId}`);
    setShowProfileModal(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(()=>{});
    Alert.alert("Success", `Your unique ID is now ${`@${formattedId}`}`);
  };

  const getMessageTime = (createdAt) => {
    if (!createdAt) return '...';
    try { return (typeof createdAt.toDate === 'function') ? createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : new Date(createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); } catch (e) { return '...'; }
  };

  // ================= CORE SENDING ENGINE =================
  const sendMessage = async () => {
    if (!inputText.trim()) return;
    try {
      await addDoc(collection(db, 'global_chats'), {
        text: inputText.trim(), 
        senderEmail: currentUser?.email || 'Unknown', 
        senderName: currentUser?.displayName || 'User', 
        senderUniqueId: myUniqueId || '@user', // Sending Unique ID
        senderId: currentUser?.uid || null,
        type: 'text', 
        replyTo: replyingTo ? replyingTo.text : null, 
        replyToSender: replyingTo ? replyingTo.senderName : null, 
        createdAt: serverTimestamp()
      });
      setInputText(''); setReplyingTo(null); setShowAttachments(false);
    } catch (error) {}
  };

  const sendMedia = async (type, data) => {
    try { 
      setShowAttachments(false); 
      await addDoc(collection(db, 'global_chats'), { 
        ...data, senderEmail: currentUser?.email || 'Unknown', senderName: currentUser?.displayName || 'User', senderUniqueId: myUniqueId || '@user', senderId: currentUser?.uid || null, type, createdAt: serverTimestamp() 
      }); 
    } catch (error) {}
  };

  // ================= CALLS & GAMES (NEW FEATURES) =================
  const initiateCall = (type) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(()=>{});
    sendMedia('call', { callType: type, status: 'started' });
    navigation.navigate('Call', { type });
  };

  const sendGameChallenge = (gameName) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(()=>{});
    sendMedia('game', { gameName: gameName, status: 'waiting' });
  };

  const openGameOptions = () => {
    setShowAttachments(false);
    Alert.alert(
      "🎮 Send Game Challenge",
      "Choose a game to play with friends:",
      [
        { text: "Tic-Tac-Toe", onPress: () => sendGameChallenge("Tic-Tac-Toe") },
        { text: "Chess", onPress: () => sendGameChallenge("Chess") },
        { text: "Ludo", onPress: () => sendGameChallenge("Ludo") },
        { text: "Cancel", style: "cancel" }
      ]
    );
  };

  // ================= MEDIA ATTACHMENTS (Images & Videos) =================
  const pickMedia = async (isCamera = false) => {
    try {
      if(isCamera) {
        const p = await ImagePicker.requestCameraPermissionsAsync();
        if(!p.granted) return;
      }
      
      const options = {
        mediaTypes: ImagePicker.MediaTypeOptions.All, // ALLOWS BOTH PHOTO & VIDEO
        quality: 0.5,
        videoMaxDuration: 60,
      };

      const result = isCamera ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
      
      if (!result.canceled && result.assets?.[0]) {
        const asset = result.assets[0];
        // In a real production app, upload URI to Firebase Storage and send URL.
        // For this demo, we send URI directly (works for local testing)
        sendMedia(asset.type === 'video' ? 'video' : 'image', { mediaUrl: asset.uri });
      }
    } catch(e){}
  };

  // ================= MESSAGE ACTIONS & RECORDING =================
  const startRecording = async () => { try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(()=>{}); const p = await Audio.requestPermissionsAsync(); if(!p.granted) return; await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true }); const r = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.LOW_QUALITY); setRecording(r.recording); setIsRecording(true); setRecordTime(0); timerRef.current = setInterval(()=>setRecordTime(prev=>prev+1), 1000); } catch(e){ setIsRecording(false); } };
  const stopRecording = async () => { if(!recording) return; try { setIsRecording(false); if(timerRef.current) clearInterval(timerRef.current); await recording.stopAndUnloadAsync(); const uri = recording.getURI(); setRecording(null); if(uri && recordTime>0) await sendMedia('audio', { audio: uri, duration: recordTime }); setRecordTime(0); } catch(e){ setIsRecording(false); } };
  const playAudio = async (uri, msgId) => { if(!uri) return; try { if(soundRef.current){ await soundRef.current.unloadAsync(); } const r = await Audio.Sound.createAsync({uri}); soundRef.current = r.sound; setPlayingAudioId(msgId); r.sound.setOnPlaybackStatusUpdate(s=>{ if(s.didJustFinish) setPlayingAudioId(null); }); await r.sound.playAsync(); } catch(e){ setPlayingAudioId(null); } };

  // ================= GLASS BUBBLE RENDERER =================
  const renderMessage = (msg) => {
    const isMe = msg.senderId === currentUser?.uid;
    const time = getMessageTime(msg.createdAt);
    const mType = msg.type || 'text';
    const mediaTypes = ['image', 'video', 'location', 'game', 'call'];

    return (
      <View key={msg.id} style={[styles.messageRow, { justifyContent: isMe ? 'flex-end' : 'flex-start' }]}>
        <TouchableOpacity 
          activeOpacity={0.85} 
          onLongPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(()=>{}); setSelectedMessage(msg); }} 
          style={[styles.messageBubble, { 
            backgroundColor: isMe ? bubbleMe : bubbleOther, 
            borderColor: isMe ? bubbleBorderMe : glassBorder,
            borderBottomRightRadius: isMe ? 5 : 24,
            borderBottomLeftRadius: isMe ? 24 : 5,
            padding: mediaTypes.includes(mType) ? 4 : 12 
          }]}
        >
          
          {/* Unique ID & Sender Name */}
          {!isMe && !['bot'].includes(mType) && ( 
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4, paddingHorizontal: mediaTypes.includes(mType) ? 8 : 0, paddingTop: mediaTypes.includes(mType) ? 6 : 0 }}>
              <Text style={[styles.senderName, { color: isDark ? '#4AB5FF' : '#0056B3' }]}>{msg.senderName}</Text>
              <Text style={{ fontSize: 11, color: textSub, marginLeft: 6, fontWeight: '500' }}>{msg.senderUniqueId}</Text>
            </View>
          )}

          {/* Type Logic Engine */}
          {mType === 'bot' ? ( <Text style={{ color: '#10B981', fontSize: 16, fontWeight: 'bold' }}>🤖 {msg.text}</Text> ) :
           
           mType === 'image' ? (
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

           mType === 'game' ? (
            <View style={[styles.gameCard, { backgroundColor: isDark ? 'rgba(0,0,0,0.4)' : '#F0F8FF' }]}>
              <View style={styles.gameHeader}>
                <Ionicons name="game-controller" size={24} color="#007AFF" />
                <Text style={{ color: textMain, fontWeight: 'bold', fontSize: 16, marginLeft: 8 }}>{msg.gameName} Challenge!</Text>
              </View>
              <Text style={{ color: textSub, fontSize: 13, marginBottom: 12 }}>{msg.senderName} invited you to play.</Text>
              <TouchableOpacity style={styles.gamePlayBtn} onPress={() => { Haptics.selectionAsync().catch(()=>{}); navigation.navigate('TicTacToe'); }}>
                <Text style={{ color: '#FFF', fontWeight: 'bold' }}>Play Now</Text>
                <Ionicons name="arrow-forward" size={16} color="#FFF" style={{ marginLeft: 5 }} />
              </TouchableOpacity>
            </View>
          ) :

           mType === 'call' ? (
            <View style={[styles.callCard, { backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(0,122,255,0.05)', borderColor: '#007AFF' }]}>
              <View style={styles.callIconBg}><Ionicons name={msg.callType === 'video' ? 'videocam' : 'call'} size={20} color="#007AFF" /></View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={{ color: textMain, fontWeight: 'bold' }}>{msg.callType === 'video' ? 'Video' : 'Voice'} Call Started</Text>
                <Text style={{ color: textSub, fontSize: 12 }}>Tap to join the call</Text>
              </View>
              <TouchableOpacity style={styles.joinBtn} onPress={() => navigation.navigate('Call', { type: msg.callType })}>
                <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 12 }}>Join</Text>
              </TouchableOpacity>
            </View>
          ) :

           mType === 'audio' ? (
            <View style={styles.audioContainer}>
              <TouchableOpacity onPress={() => playAudio(msg.audio, msg.id)} style={styles.playBtn}><Ionicons name={playingAudioId === msg.id ? 'pause' : 'play'} size={24} color={isMe ? '#007AFF' : textMain} /></TouchableOpacity>
              <View style={styles.audioWave}>{[12, 20, 15, 24, 10].map((h, i) => ( <View key={i} style={[styles.waveLine, { height: h, backgroundColor: isMe ? '#007AFF' : textSub }]} /> ))}</View>
              <Text style={{ color: isMe ? '#007AFF' : textMain, marginLeft: 10, fontSize: 13, fontWeight: '500' }}>{`${Math.floor((msg.duration||0)/60)}:${((msg.duration||0)%60).toString().padStart(2,'0')}`}</Text>
            </View>
          ) : (
            <Text style={{ color: textMain, fontSize: 16, lineHeight: 22 }}>{msg.text}</Text>
          )}

          {/* Time & Ticks */}
          <View style={[styles.msgFooter, mediaTypes.includes(mType) ? styles.mediaFooter : null]}>
            <Text style={[styles.msgTime, { color: mediaTypes.includes(mType) ? '#FFF' : textSub }]}>{time}</Text>
            {isMe && ( <Ionicons name="checkmark-done" size={16} color={mediaTypes.includes(mType) ? '#FFF' : '#007AFF'} style={{ marginLeft: 5 }} /> )}
          </View>

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
          <Image source={{ uri: 'https://ui-avatars.com/api/?name=Super+App&background=007AFF&color=fff' }} style={styles.avatar} />
          <View style={styles.headerInfo}>
            <Text style={[styles.headerName, { color: textMain }]} numberOfLines={1}>Global Super App</Text>
            <Text style={styles.headerStatus}>Ultra Mode Active 🌊</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={() => initiateCall('video')} style={styles.actionIcon}><Ionicons name="videocam-outline" size={26} color={textMain} /></TouchableOpacity>
            <TouchableOpacity onPress={() => initiateCall('voice')} style={styles.actionIcon}><Ionicons name="call-outline" size={24} color={textMain} /></TouchableOpacity>
            <TouchableOpacity onPress={() => setShowHeaderMenu(!showHeaderMenu)} style={styles.actionIcon}><Ionicons name="ellipsis-horizontal-circle-outline" size={26} color={textMain} /></TouchableOpacity>
          </View>
        </View>

        {/* Menu Options (Edit Profile ID) */}
        {showHeaderMenu && (
          <View style={[styles.headerMenu, { backgroundColor: glassPanelBg, borderColor: glassBorder }]}>
            <TouchableOpacity style={styles.menuOption} onPress={() => { setShowHeaderMenu(false); setShowProfileModal(true); }}>
              <Ionicons name="at-circle-outline" size={20} color={textMain} style={{ marginRight: 10 }} />
              <Text style={{ color: textMain, fontSize: 16 }}>Set Unique ID (@)</Text>
            </TouchableOpacity>
            {['Wallpapers', 'Clear Chat'].map((option, index) => (
              <TouchableOpacity key={index} style={styles.menuOption} onPress={() => { setShowHeaderMenu(false); }}>
                <Ionicons name={index === 0 ? "image-outline" : "trash-outline"} size={20} color={textMain} style={{ marginRight: 10 }} />
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

        {/* ================= WATER BUBBLE ATTACHMENT TRAY ================= */}
        {showAttachments && (
          <View style={[styles.attachmentTray, { backgroundColor: glassPanelBg, borderTopColor: glassBorder }]}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 10 }}>
              {[
                { i: 'images', c: '#3B82F6', n: 'Photo/Video', a: () => pickMedia(false) }, 
                { i: 'camera', c: '#EC4899', n: 'Camera', a: () => pickMedia(true) }, 
                { i: 'game-controller', c: '#8B5CF6', n: 'Games', a: openGameOptions },
                { i: 'location', c: '#10B981', n: 'Location', a: () => Alert.alert("Location", "Map feature...") },
                { i: 'document-text', c: '#F59E0B', n: 'Document', a: () => Alert.alert("Files", "File picker...") }
              ].map((item, index) => (
                <TouchableOpacity key={index} style={styles.attachOption} onPress={item.a}>
                  <View style={[styles.attachIconWrap, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#FFF', borderColor: glassBorder }]}><Ionicons name={item.i} size={28} color={item.c} /></View>
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
              {!inputText.trim() && ( <TouchableOpacity style={styles.iconBtn} onPress={() => pickMedia(true)}><Ionicons name="camera" size={26} color={textSub} /></TouchableOpacity> )}
            </View>
          )}

          <TouchableOpacity style={[styles.micBtn, { backgroundColor: inputText.trim() ? '#007AFF' : '#10B981', shadowColor: inputText.trim() ? '#007AFF' : '#10B981' }]} onPress={inputText.trim() ? sendMessage : undefined} onLongPress={!inputText.trim() ? startRecording : undefined} onPressOut={() => { if (isRecording) stopRecording(); }}>
            <Ionicons name={inputText.trim() ? 'send' : 'mic'} size={22} color="#FFF" style={inputText.trim() ? { marginLeft: 4 } : {}} />
          </TouchableOpacity>
        </View>

        {/* ================= MODAL: FULL SCREEN MEDIA ================= */}
        <Modal visible={!!fullScreenMedia} transparent={false} animationType="fade" onRequestClose={() => setFullScreenMedia(null)}>
          <View style={styles.fullScreenContainer}>
            <TouchableOpacity style={styles.fullScreenCloseBtn} onPress={() => setFullScreenMedia(null)}><Ionicons name="close" size={32} color="#FFF" /></TouchableOpacity>
            {fullScreenMedia?.type === 'video' ? (
              <Video source={{ uri: fullScreenMedia.uri }} style={{ width: '100%', height: '100%' }} resizeMode="contain" useNativeControls shouldPlay />
            ) : (
              <Image source={{ uri: fullScreenMedia?.uri }} style={{ width: '100%', height: '100%', resizeMode: 'contain' }} />
            )}
          </View>
        </Modal>

        {/* ================= MODAL: UNIQUE ID (INSTAGRAM STYLE) ================= */}
        <Modal visible={showProfileModal} transparent animationType="slide" onRequestClose={() => setShowProfileModal(false)}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalBox, { backgroundColor: glassPanelBg, borderColor: glassBorder }]}>
              <View style={styles.modalHeader}>
                <View style={[styles.modalIconBg, { backgroundColor: 'rgba(0,122,255,0.1)' }]}><Ionicons name="at" size={32} color="#007AFF" /></View>
              </View>
              <Text style={{ color: textMain, fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginBottom: 5 }}>Create Unique ID</Text>
              <Text style={{ color: textSub, textAlign: 'center', marginBottom: 20, fontSize: 13 }}>Choose a unique username so friends can easily find, tag, or play games with you.</Text>
              
              <View style={[styles.idInputContainer, { backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : '#FFF', borderColor: glassBorder }]}>
                <Text style={{ color: textSub, fontSize: 18, fontWeight: 'bold', marginRight: 5 }}>@</Text>
                <TextInput style={{ flex: 1, color: textMain, fontSize: 18, fontWeight: '600' }} placeholder="username" placeholderTextColor={textSub} value={tempUniqueId} onChangeText={setTempUniqueId} autoCapitalize="none" maxLength={15} />
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 25 }}>
                <TouchableOpacity style={{ flex: 1, padding: 14, alignItems: 'center' }} onPress={() => setShowProfileModal(false)}>
                  <Text style={{ color: textSub, fontWeight: 'bold', fontSize: 16 }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalSubmitBtn, { flex: 1, alignItems: 'center' }]} onPress={saveUniqueId}>
                  <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 16 }}>Claim ID</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
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
  headerStatus: { fontSize: 12, color: '#8AA2B5', fontWeight: '500', marginTop: 2 }, 
  headerActions: { flexDirection: 'row', alignItems: 'center' }, 
  actionIcon: { padding: 8, marginLeft: 2 }, 
  headerMenu: { position: 'absolute', top: 100, right: 15, borderRadius: 16, borderWidth: 1, elevation: 15, zIndex: 20, minWidth: 220, overflow: 'hidden' }, 
  menuOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 20, borderBottomWidth: 0.5, borderBottomColor: 'rgba(150,150,150,0.1)' },
  pinnedBox: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 15, borderBottomWidth: 1 }, 
  chatArea: { flex: 1 }, 
  encryptionBox: { flexDirection: 'row', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20, marginHorizontal: 'auto', alignSelf: 'center', marginBottom: 20, alignItems: 'center', borderWidth: 1 }, 
  encryptionText: { fontSize: 11, marginLeft: 6, fontWeight: '500' }, 
  
  messageRow: { flexDirection: 'row', marginBottom: 15 }, 
  messageBubble: { maxWidth: '82%', borderRadius: 24, borderWidth: 1, overflow: 'hidden' }, 
  senderName: { fontSize: 14, fontWeight: '700' }, 
  
  // New Media Styles
  chatMedia: { width: width * 0.7, height: width * 0.7, resizeMode: 'cover' }, 
  videoContainer: { position: 'relative', justifyContent: 'center', alignItems: 'center' },
  playOverlay: { position: 'absolute', width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  mediaFooter: { position: 'absolute', bottom: 8, right: 12, backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 }, 
  
  // Game & Call Cards
  gameCard: { width: 220, padding: 15, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(0,122,255,0.3)' },
  gameHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  gamePlayBtn: { backgroundColor: '#007AFF', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 12 },
  callCard: { flexDirection: 'row', alignItems: 'center', minWidth: 240, padding: 12, borderRadius: 16, borderWidth: 1 },
  callIconBg: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,122,255,0.1)', justifyContent: 'center', alignItems: 'center' },
  joinBtn: { backgroundColor: '#007AFF', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },

  msgFooter: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginTop: 4 }, 
  msgTime: { fontSize: 10, fontWeight: '500' }, 
  
  audioContainer: { flexDirection: 'row', alignItems: 'center', minWidth: 180, paddingVertical: 5 }, 
  playBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.8)', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  audioWave: { flexDirection: 'row', alignItems: 'center' }, 
  waveLine: { width: 3.5, borderRadius: 2, marginHorizontal: 2.5 }, 
  redDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#FF3B30' }, 
  
  attachmentTray: { paddingVertical: 20, borderTopWidth: 1 }, 
  attachRowGrid: { flexDirection: 'row', flexWrap: 'wrap' }, 
  attachOption: { alignItems: 'center', width: 85 }, 
  attachIconWrap: { width: 60, height: 60, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginBottom: 10, borderWidth: 1 }, 
  
  inputArea: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 12, paddingVertical: 10, paddingBottom: Platform.OS === 'ios' ? 25 : 15 }, 
  inputBox: { flex: 1, flexDirection: 'row', alignItems: 'flex-end', borderRadius: 28, paddingHorizontal: 5, paddingVertical: 5, marginHorizontal: 10, minHeight: 50, borderWidth: 1 }, 
  iconBtn: { padding: 8, justifyContent: 'center', marginBottom: 2 }, 
  input: { flex: 1, fontSize: 16, maxHeight: 120, minHeight: 40, paddingTop: Platform.OS === 'ios' ? 12 : 8, paddingBottom: Platform.OS === 'ios' ? 12 : 8, paddingHorizontal: 10 }, 
  micBtn: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginBottom: 2, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 6, elevation: 5 }, 
  
  // Modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }, 
  modalBox: { width: '88%', borderRadius: 28, padding: 25, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.15, shadowRadius: 20, elevation: 10 }, 
  modalHeader: { alignItems: 'center', marginBottom: 15 },
  modalIconBg: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center' },
  idInputContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 16, paddingHorizontal: 20, paddingVertical: 15 },
  modalSubmitBtn: { backgroundColor: '#007AFF', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 16 }, 

  fullScreenContainer: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  fullScreenCloseBtn: { position: 'absolute', top: 50, right: 20, zIndex: 10, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' }
});
