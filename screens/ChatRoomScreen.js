import React, { useState, useEffect, useRef, memo } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, Image,
  KeyboardAvoidingView, Platform, Alert, Modal, Dimensions, SafeAreaView,
  ActivityIndicator, Animated, Easing, Keyboard, Pressable, Linking, Share
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import * as ImagePicker from 'expo-image-picker';
import { Video, Audio } from 'expo-av';
import * as DocumentPicker from 'expo-document-picker';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db, auth } from '../firebaseConfig';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, doc, updateDoc, setDoc, increment, limit, getDoc, where } from 'firebase/firestore';
import { RTCPeerConnection, RTCIceCandidate, RTCSessionDescription, RTCView, mediaDevices } from 'react-native-webrtc';

const { width, height } = Dimensions.get('window');

// --- CONSTANTS ---
const COLORS = {
  bg: '#050A10', header: '#0B1824', surface: '#101A26', surface2: '#14202E',
  bubbleMe: '#087EFF', bubbleOther: '#172433', text: '#F4F7FA', sub: '#8FA6B9',
  border: 'rgba(255,255,255,0.08)', success: '#34C759', danger: '#FF3B30', overlay: 'rgba(0,0,0,0.75)'
};
const ICE_SERVERS = [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }];
const REACTIONS = ['❤️', '😂', '👍', '😮', '😢', '🔥', '🎉'];

export default function ChatRoomScreen({ route, navigation }) {
  useTheme();
  const { chatId = 'global_chats', chatName = 'Global Room', friendId = null, friendUsername = '', friendAvatar = '' } = route.params || {};
  const currentUser = auth.currentUser;

  // --- STATES ---
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploadText, setUploadText] = useState('');
  const [myUniqueId, setMyUniqueId] = useState('');
  const [online, setOnline] = useState(false);
  const [typing, setTyping] = useState(false);
  
  // UI & Menus
  const [showAttachments, setShowAttachments] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [contextMenu, setContextMenu] = useState({ visible: false, msg: null, yPos: 0 });
  const [replyTo, setReplyTo] = useState(null);
  const [editMsgId, setEditMsgId] = useState(null);
  const [fullScreenMedia, setFullScreenMedia] = useState(null);

  // WebRTC Call States
  const [incomingCall, setIncomingCall] = useState(null);
  const [callVisible, setCallVisible] = useState(false);
  const [callType, setCallType] = useState('audio');
  const [callState, setCallState] = useState('idle');
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [callSeconds, setCallSeconds] = useState(0);

  // Refs
  const listRef = useRef(null);
  const attachAnim = useRef(new Animated.Value(height)).current;
  const sendScale = useRef(new Animated.Value(1)).current;
  const peerRef = useRef(null);
  const localStreamRef = useRef(null);
  const callIdRef = useRef(null);
  const callUnsubsRef = useRef([]);
  const timerRef = useRef(null);

  // --- INIT & FIRESTORE ---
  useEffect(() => {
    AsyncStorage.getItem('nax_unique_id').then(id => { if (id) setMyUniqueId(id); });
    const colPath = chatId === 'global_chats' ? 'global_chats' : `chats/${chatId}/messages`;
    const q = query(collection(db, colPath), orderBy('createdAt', 'desc'), limit(150));
    
    const unsub = onSnapshot(q, snap => {
      setMessages(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });
    return () => unsub();
  }, [chatId]);

  useEffect(() => {
    if (!friendId) return;
    return onSnapshot(doc(db, 'users', friendId), snap => setOnline(Boolean(snap.data()?.online)));
  }, [friendId]);

  const updateChatMetadata = async (lastMsg, type = 'text') => {
    if (!currentUser?.uid || !friendId || chatId === 'global_chats') return;
    const now = serverTimestamp();
    try {
      const baseData = { chatId, lastMessage: lastMsg, lastMessageType: type, lastMessageTime: now, updatedAt: now };
      await setDoc(doc(db, `users/${currentUser.uid}/user_chats`, chatId), { ...baseData, friendId, friendName: chatName }, { merge: true });
      await setDoc(doc(db, `users/${friendId}/user_chats`, chatId), { ...baseData, friendId: currentUser.uid, friendName: currentUser.displayName || 'User', unreadCount: increment(1) }, { merge: true });
    } catch (e) {}
  };

  // --- MESSAGING ENGINE ---
  const animateSend = () => {
    Animated.sequence([ Animated.timing(sendScale, { toValue: 0.8, duration: 80, useNativeDriver: true }), Animated.spring(sendScale, { toValue: 1, friction: 4, useNativeDriver: true }) ]).start();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const sendMessage = async () => {
    const val = text.trim();
    if (!val || !currentUser?.uid) return;
    animateSend(); setText('');
    const colPath = chatId === 'global_chats' ? 'global_chats' : `chats/${chatId}/messages`;

    try {
      if (editMsgId) {
        await updateDoc(doc(db, colPath, editMsgId), { text: val, isEdited: true, updatedAt: serverTimestamp() });
        setEditMsgId(null);
      } else {
        const msg = { text: val, type: 'text', senderName: currentUser.displayName || 'User', senderUniqueId: myUniqueId, senderId: currentUser.uid, createdAt: serverTimestamp() };
        if (replyTo) { msg.replyToId = replyTo.id; msg.replyToText = replyTo.text || 'Media'; msg.replyToSender = replyTo.senderName || 'User'; }
        await addDoc(collection(db, colPath), msg);
        await updateChatMetadata(val, 'text');
        setReplyTo(null);
        setTimeout(() => listRef.current?.scrollToOffset({ offset: 0, animated: true }), 100);
      }
    } catch (e) { Alert.alert('Error', 'Message send failed.'); }
  };

  // --- MEDIA & UPLOAD ENGINE ---
  const uploadToCloud = async (file, msgType) => {
    closeAttachmentMenu(); setUploadText('Sending media...');
    try {
      const formData = new FormData();
      formData.append('file', { uri: Platform.OS === 'android' ? file.uri : file.uri.replace('file://', ''), name: file.fileName || `media_${Date.now()}.${msgType==='video'?'mp4':'jpg'}`, type: file.mimeType || 'application/octet-stream' });
      const res = await fetch('https://tmpfiles.org/api/v1/upload', { method: 'POST', body: formData, headers: { 'Content-Type': 'multipart/form-data' } });
      const json = await res.json();

      if (json.status === 'success') {
        const directUrl = json.data.url.replace('tmpfiles.org/', 'tmpfiles.org/dl/');
        const msg = { mediaUrl: directUrl, fileName: file.fileName || 'Media', type: msgType, senderName: currentUser.displayName || 'User', senderId: currentUser.uid, createdAt: serverTimestamp() };
        await addDoc(collection(db, chatId === 'global_chats' ? 'global_chats' : `chats/${chatId}/messages`), msg);
        await updateChatMetadata(`📁 ${msgType}`, msgType);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else throw new Error();
    } catch (e) { Alert.alert('Failed', 'Media upload failed.'); }
    setUploadText('');
  };

  const handleMediaPick = async (isDoc = false) => {
    try {
      let res = isDoc ? await DocumentPicker.getDocumentAsync({ type: '*/*' }) : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.All, quality: 0.7 });
      if (!res.canceled && res.assets?.[0]) await uploadToCloud(res.assets[0], isDoc ? 'document' : (res.assets[0].type === 'video' ? 'video' : 'image'));
    } catch(e) {}
  };

  const sendLocation = async () => {
    closeAttachmentMenu(); setUploadText('Getting Location...');
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return Alert.alert('Denied', 'Location permission needed.');
      const loc = await Location.getCurrentPositionAsync({});
      await addDoc(collection(db, chatId === 'global_chats' ? 'global_chats' : `chats/${chatId}/messages`), { type: 'location', latitude: loc.coords.latitude, longitude: loc.coords.longitude, senderId: currentUser.uid, senderName: currentUser.displayName || 'User', createdAt: serverTimestamp() });
      await updateChatMetadata('📍 Location', 'location');
    } catch (e) { Alert.alert('Error', 'Failed to get location.'); }
    setUploadText('');
  };

  // --- WEBRTC CALL ENGINE ---
  const getMedia = async (type) => {
    try { return await mediaDevices.getUserMedia({ audio: true, video: type === 'video' }); } 
    catch (e) { Alert.alert('Permission required', 'Allow camera/mic.'); return null; }
  };

  const createPeer = async () => {
    const peer = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    peerRef.current = peer;
    peer.ontrack = e => { if (e.streams?.[0]) { setRemoteStream(e.streams[0]); setCallState('connected'); }};
    peer.onconnectionstatechange = () => { if (['failed', 'disconnected', 'closed'].includes(peer.connectionState)) cleanupCall(false); };
    return peer;
  };

  const startTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setCallSeconds(0); timerRef.current = setInterval(() => setCallSeconds(s => s + 1), 1000);
  };

  const cleanupCall = async (updateRemote) => {
    if (timerRef.current) clearInterval(timerRef.current);
    callUnsubsRef.current.forEach(u => u()); callUnsubsRef.current = [];
    if (updateRemote && callIdRef.current) { try { await updateDoc(doc(db, 'calls', callIdRef.current), { status: 'ended', endedAt: serverTimestamp() }); } catch(e){} }
    if (peerRef.current) peerRef.current.close();
    if (localStreamRef.current) localStreamRef.current.getTracks().forEach(t => t.stop());
    peerRef.current = null; localStreamRef.current = null; callIdRef.current = null;
    setLocalStream(null); setRemoteStream(null); setCallVisible(false); setCallState('idle'); setIncomingCall(null);
  };

  const startCall = async (type) => {
    if (!friendId || callVisible) return;
    setCallType(type); setCallVisible(true); setCallState('calling');
    const stream = await getMedia(type); if (!stream) return cleanupCall(false);
    localStreamRef.current = stream; setLocalStream(stream);
    const peer = await createPeer(); stream.getTracks().forEach(t => peer.addTrack(t, stream));
    
    try {
      const callRef = await addDoc(collection(db, 'calls'), { callerId: currentUser.uid, callerName: currentUser.displayName || 'User', receiverId: friendId, type, status: 'ringing', createdAt: serverTimestamp() });
      callIdRef.current = callRef.id;
      peer.onicecandidate = async e => { if (e.candidate) await addDoc(collection(db, 'calls', callRef.id, 'callerCandidates'), e.candidate.toJSON()); };
      const offer = await peer.createOffer({}); await peer.setLocalDescription(offer);
      await updateDoc(doc(db, 'calls', callRef.id), { offer: { type: offer.type, sdp: offer.sdp } });
      
      callUnsubsRef.current.push(onSnapshot(doc(db, 'calls', callRef.id), async snap => {
        if (!snap.exists()) return;
        const data = snap.data();
        if (data.answer && !peer.currentRemoteDescription) { await peer.setRemoteDescription(new RTCSessionDescription(data.answer)); setCallState('connected'); startTimer(); }
        if (data.status === 'rejected' || data.status === 'ended') cleanupCall(false);
      }));
      callUnsubsRef.current.push(onSnapshot(collection(db, 'calls', callRef.id, 'receiverCandidates'), snap => {
        snap.docChanges().forEach(async change => { if (change.type === 'added') await peer.addIceCandidate(new RTCIceCandidate(change.doc.data())); });
      }));
    } catch (e) { Alert.alert('Error', 'Call failed to start.'); cleanupCall(false); }
  };

  const acceptCall = async () => {
    if (!incomingCall) return;
    const { id, type } = incomingCall; setCallType(type); setCallVisible(true); setCallState('connecting'); setIncomingCall(null);
    const stream = await getMedia(type); if (!stream) return cleanupCall(false);
    localStreamRef.current = stream; setLocalStream(stream);
    const peer = await createPeer(); stream.getTracks().forEach(t => peer.addTrack(t, stream));
    
    try {
      const snap = await getDoc(doc(db, 'calls', id));
      await peer.setRemoteDescription(new RTCSessionDescription(snap.data().offer));
      peer.onicecandidate = async e => { if (e.candidate) await addDoc(collection(db, 'calls', id, 'receiverCandidates'), e.candidate.toJSON()); };
      const answer = await peer.createAnswer({}); await peer.setLocalDescription(answer);
      await updateDoc(doc(db, 'calls', id), { answer: { type: answer.type, sdp: answer.sdp }, status: 'accepted' });
      callIdRef.current = id; startTimer();
      callUnsubsRef.current.push(onSnapshot(collection(db, 'calls', id, 'callerCandidates'), snap => {
        snap.docChanges().forEach(async change => { if (change.type === 'added') await peer.addIceCandidate(new RTCIceCandidate(change.doc.data())); });
      }));
    } catch (e) { cleanupCall(false); }
  };

  useEffect(() => {
    if (!currentUser?.uid || !friendId) return;
    return onSnapshot(query(collection(db, 'calls'), where('receiverId', '==', currentUser.uid)), snap => {
      snap.docChanges().forEach(change => {
        const data = change.doc.data();
        if (['added', 'modified'].includes(change.type) && data.status === 'ringing' && data.callerId === friendId) {
          setIncomingCall({ id: change.doc.id, ...data });
        }
      });
    });
  }, [currentUser?.uid, friendId]);

  // --- ATTACHMENT MENU ANIMATION ---
  const openAttachmentMenu = () => { Keyboard.dismiss(); setShowAttachments(true); Animated.spring(attachAnim, { toValue: 0, friction: 7, useNativeDriver: true }).start(); Haptics.selectionAsync(); };
  const closeAttachmentMenu = () => { Animated.timing(attachAnim, { toValue: height, duration: 250, useNativeDriver: true }).start(() => setShowAttachments(false)); };

  // --- ACTIONS & CONTEXT MENU ---
  const handleMessageAction = async (action) => {
    const msg = contextMenu.msg; setContextMenu({ visible: false, msg: null, yPos: 0 });
    if (action === 'reply') setReplyTo(msg);
    else if (action === 'edit') { setEditMsgId(msg.id); setText(msg.text); }
    else if (action === 'delete') await updateDoc(doc(db, chatId === 'global_chats' ? 'global_chats' : `chats/${chatId}/messages`, msg.id), { isDeleted: true, text: '🚫 Message deleted', mediaUrl: null });
    else if (action === 'copy') Share.share({ message: msg.text || msg.mediaUrl });
  };

  const handleReaction = async (emoji) => {
    const msg = contextMenu.msg; setContextMenu({ visible: false, msg: null, yPos: 0 }); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const msgRef = doc(db, chatId === 'global_chats' ? 'global_chats' : `chats/${chatId}/messages`, msg.id);
    const reactions = msg.reactions || {};
    if (reactions[currentUser.uid] === emoji) delete reactions[currentUser.uid]; else reactions[currentUser.uid] = emoji;
    await updateDoc(msgRef, { reactions });
  };

  // --- RENDER MESSAGE ---
  const renderMessage = ({ item }) => {
    const isMe = item.senderId === currentUser?.uid;
    const time = item.createdAt ? new Date(item.createdAt.toDate?.() || item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
    const reactions = Object.values(item.reactions || {});

    return (
      <Pressable onLongPress={(e) => { Keyboard.dismiss(); setContextMenu({ visible: true, msg: item, yPos: e.nativeEvent.pageY }); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); }}>
        <View style={[styles.msgRow, { justifyContent: isMe ? 'flex-end' : 'flex-start' }]}>
          <View style={[styles.bubble, isMe ? styles.myBubble : styles.otherBubble]}>
            {!isMe && chatId === 'global_chats' && <Text style={styles.senderName}>{item.senderName}</Text>}
            {item.replyToId && <View style={styles.replyBox}><Text style={{ color: COLORS.bubbleMe, fontSize: 11, fontWeight: 'bold' }}>{item.replyToSender}</Text><Text style={{ color: COLORS.sub, fontSize: 12 }} numberOfLines={1}>{item.replyToText}</Text></View>}
            
            {/* Media Rendering */}
            {(item.type === 'image' || item.type === 'video') && (
              <TouchableOpacity onPress={() => setFullScreenMedia({ uri: item.mediaUrl, type: item.type })}>
                {item.type === 'video' ? <><Video source={{ uri: item.mediaUrl }} style={styles.mediaItem} resizeMode="cover" /><View style={styles.playOverlay}><Ionicons name="play" size={30} color="#FFF"/></View></> : <Image source={{ uri: item.mediaUrl }} style={styles.mediaItem} />}
              </TouchableOpacity>
            )}
            {item.type === 'location' && ( <TouchableOpacity onPress={() => Linking.openURL(`geo:${item.latitude},${item.longitude}?q=${item.latitude},${item.longitude}`)}><View style={[styles.mediaItem, { backgroundColor: '#1A2A3A', justifyContent: 'center', alignItems: 'center' }]}><Ionicons name="location" size={40} color="#FF3B30"/><Text style={{color:'#FFF', marginTop: 5}}>View Location</Text></View></TouchableOpacity> )}
            {item.type === 'document' && ( <TouchableOpacity style={styles.docBox} onPress={() => Linking.openURL(item.mediaUrl)}><Ionicons name="document-text" size={24} color="#FFF"/><Text style={{color:'#FFF', marginLeft: 8}}>{item.fileName || 'Document'}</Text></TouchableOpacity> )}
            
            {/* Text Rendering */}
            {item.type === 'text' && <Text style={[styles.msgText, { color: isMe ? '#FFF' : COLORS.text }]}>{item.text}</Text>}

            <View style={styles.msgFooter}>
              {item.isEdited && <Text style={styles.editedTxt}>edited</Text>}
              <Text style={styles.timeTxt}>{time}</Text>
              {isMe && <Ionicons name="checkmark-done" size={14} color={item.type==='text'?'#FFF':'#4FC3FF'} style={{ marginLeft: 4 }} />}
            </View>
          </View>
          {reactions.length > 0 && <View style={[styles.reactionBadge, isMe ? { right: 8 } : { left: 8 }]}><Text style={{fontSize: 12}}>{reactions.join(' ')}</Text></View>}
        </View>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}><Ionicons name="chevron-back" size={28} color={COLORS.text}/></TouchableOpacity>
        <Image source={{ uri: friendAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(chatName)}&background=087EFF&color=fff` }} style={styles.avatar} />
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={styles.headerTitle} numberOfLines={1}>{chatName}</Text>
          {friendId && <Text style={[styles.headerStatus, { color: online ? COLORS.success : COLORS.sub }]}>{online ? 'Online' : 'Offline'}</Text>}
        </View>
        {friendId && (
          <>
            <TouchableOpacity style={styles.iconBtn} onPress={() => startCall('audio')}><Ionicons name="call-outline" size={22} color={COLORS.text}/></TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn} onPress={() => startCall('video')}><Ionicons name="videocam-outline" size={24} color={COLORS.text}/></TouchableOpacity>
          </>
        )}
      </View>

      {uploadText ? <View style={styles.uploadBanner}><ActivityIndicator size="small" color="#FFF" /><Text style={{ color: '#FFF', marginLeft: 10 }}>{uploadText}</Text></View> : null}

      {/* CHAT LIST */}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {loading ? <ActivityIndicator size="large" color={COLORS.bubbleMe} style={{ flex: 1 }} /> : (
          <FlatList ref={listRef} data={messages} inverted keyExtractor={item => item.id} renderItem={renderMessage} contentContainerStyle={{ padding: 15 }} showsVerticalScrollIndicator={false} />
        )}

        {/* REPLY BAR */}
        {(replyTo || editMsgId) && (
          <View style={styles.replyBar}>
            <View style={{ width: 3, backgroundColor: COLORS.bubbleMe, marginRight: 10 }} />
            <View style={{ flex: 1 }}><Text style={{ color: COLORS.bubbleMe, fontWeight: 'bold', fontSize: 12 }}>{editMsgId ? 'Edit Message' : `Replying to ${replyTo?.senderName}`}</Text><Text style={{ color: COLORS.sub, fontSize: 12 }} numberOfLines={1}>{replyTo?.text || 'Media'}</Text></View>
            <TouchableOpacity onPress={() => { setReplyTo(null); setEditMsgId(null); setText(''); }}><Ionicons name="close-circle" size={24} color={COLORS.sub}/></TouchableOpacity>
          </View>
        )}

        {/* COMPOSER */}
        <View style={styles.composer}>
          <TouchableOpacity onPress={openAttachmentMenu} style={styles.attachBtn}><Ionicons name="add" size={30} color={COLORS.sub}/></TouchableOpacity>
          <View style={styles.inputBox}>
            <TextInput style={styles.input} placeholder="Message..." placeholderTextColor={COLORS.sub} multiline value={text} onChangeText={(t) => { setText(t); setTyping(t.length > 0); }} />
            {text.length === 0 && <Ionicons name="mic-outline" size={24} color={COLORS.sub} style={{ marginHorizontal: 8 }}/>}
          </View>
          {text.trim().length > 0 && (
            <Animated.View style={{ transform: [{ scale: sendScale }] }}>
              <TouchableOpacity style={styles.sendBtn} onPress={sendMessage}><Ionicons name="send" size={18} color="#FFF" style={{ marginLeft: 3 }}/></TouchableOpacity>
            </Animated.View>
          )}
        </View>
      </KeyboardAvoidingView>

      {/* ATTACHMENT SHEET */}
      {showAttachments && (
        <View style={styles.overlayFull}>
          <TouchableOpacity style={{ flex: 1 }} onPress={closeAttachmentMenu} />
          <Animated.View style={[styles.attachSheet, { transform: [{ translateY: attachAnim }] }]}>
            <View style={styles.sheetHandle} /><Text style={styles.sheetTitle}>Share Content</Text>
            <View style={styles.attachGrid}>
              <TouchableOpacity style={styles.attachItem} onPress={() => handleMediaPick(false)}><View style={[styles.attachIcon, {backgroundColor:'#34C759'}]}><Ionicons name="image" size={26} color="#FFF"/></View><Text style={styles.attachLabel}>Gallery</Text></TouchableOpacity>
              <TouchableOpacity style={styles.attachItem} onPress={() => handleMediaPick(true)}><View style={[styles.attachIcon, {backgroundColor:'#007AFF'}]}><Ionicons name="document" size={26} color="#FFF"/></View><Text style={styles.attachLabel}>Document</Text></TouchableOpacity>
              <TouchableOpacity style={styles.attachItem} onPress={sendLocation}><View style={[styles.attachIcon, {backgroundColor:'#FF3B30'}]}><Ionicons name="location" size={26} color="#FFF"/></View><Text style={styles.attachLabel}>Location</Text></TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      )}

      {/* CONTEXT MENU (TELEGRAM STYLE) */}
      <Modal visible={contextMenu.visible} transparent animationType="fade">
        <Pressable style={styles.overlayFull} onPress={() => setContextMenu({ visible: false, msg: null, yPos: 0 })}>
          <View style={[styles.contextMenu, { top: Math.min(Math.max(contextMenu.yPos - 50, 100), height - 250) }]}>
            <View style={styles.reactionBar}>
              {REACTIONS.map(emoji => <TouchableOpacity key={emoji} onPress={() => handleReaction(emoji)}><Text style={{fontSize: 24}}>{emoji}</Text></TouchableOpacity>)}
            </View>
            <View style={styles.actionList}>
              <TouchableOpacity style={styles.actionBtn} onPress={() => handleMessageAction('reply')}><Text style={styles.actionTxt}>Reply</Text><Ionicons name="arrow-undo-outline" size={20} color="#FFF"/></TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn} onPress={() => handleMessageAction('copy')}><Text style={styles.actionTxt}>Copy</Text><Ionicons name="copy-outline" size={20} color="#FFF"/></TouchableOpacity>
              {contextMenu.msg?.senderId === currentUser?.uid && (
                <>
                  <TouchableOpacity style={styles.actionBtn} onPress={() => handleMessageAction('edit')}><Text style={styles.actionTxt}>Edit</Text><Ionicons name="pencil" size={20} color="#FFF"/></TouchableOpacity>
                  <TouchableOpacity style={styles.actionBtn} onPress={() => handleMessageAction('delete')}><Text style={[styles.actionTxt, {color: COLORS.danger}]}>Delete</Text><Ionicons name="trash" size={20} color={COLORS.danger}/></TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </Pressable>
      </Modal>

      {/* INCOMING CALL MODAL */}
      {incomingCall && (
        <Modal transparent visible animationType="fade">
          <View style={styles.callOverlay}>
            <View style={styles.incomingCard}>
              <Image source={{ uri: `https://ui-avatars.com/api/?name=${incomingCall.callerName}&background=087EFF&color=fff` }} style={{ width: 90, height: 90, borderRadius: 45 }} />
              <Text style={{ color: '#FFF', fontSize: 22, fontWeight: 'bold', marginTop: 15 }}>{incomingCall.callerName}</Text>
              <Text style={{ color: COLORS.sub, fontSize: 14, marginTop: 5 }}>Incoming {incomingCall.type} call</Text>
              <View style={{ flexDirection: 'row', gap: 40, marginTop: 30 }}>
                <TouchableOpacity style={[styles.callBtnRound, {backgroundColor: COLORS.danger}]} onPress={rejectCall}><Ionicons name="close" size={30} color="#FFF"/></TouchableOpacity>
                <TouchableOpacity style={[styles.callBtnRound, {backgroundColor: COLORS.success}]} onPress={acceptCall}><Ionicons name="call" size={30} color="#FFF"/></TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* ACTIVE WEBRTC CALL SCREEN */}
      {callVisible && (
        <Modal visible animationType="slide">
          <SafeAreaView style={{ flex: 1, backgroundColor: '#000' }}>
            {callType === 'video' && remoteStream ? (
              <RTCView streamURL={remoteStream.toURL()} style={StyleSheet.absoluteFillObject} objectFit="cover" />
            ) : (
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <Image source={{ uri: `https://ui-avatars.com/api/?name=${chatName}&background=087EFF&color=fff` }} style={{ width: 120, height: 120, borderRadius: 60 }} />
                <Text style={{ color: '#FFF', fontSize: 26, fontWeight: 'bold', marginTop: 20 }}>{chatName}</Text>
                <Text style={{ color: COLORS.sub, fontSize: 16, marginTop: 5 }}>{callState === 'connected' ? `${Math.floor(callSeconds/60)}:${String(callSeconds%60).padStart(2,'0')}` : callState}</Text>
              </View>
            )}
            
            {callType === 'video' && localStream && (
              <RTCView streamURL={localStream.toURL()} style={styles.localVideo} objectFit="cover" />
            )}

            <View style={styles.callControls}>
              <TouchableOpacity style={styles.ctrlBtn} onPress={() => { localStreamRef.current.getAudioTracks().forEach(t => t.enabled = !micEnabled); setMicEnabled(!micEnabled); }}><Ionicons name={micEnabled ? "mic" : "mic-off"} size={26} color="#FFF"/></TouchableOpacity>
              {callType === 'video' && <TouchableOpacity style={styles.ctrlBtn} onPress={() => { localStreamRef.current.getVideoTracks().forEach(t => t.enabled = !cameraEnabled); setCameraEnabled(!cameraEnabled); }}><Ionicons name={cameraEnabled ? "videocam" : "videocam-off"} size={26} color="#FFF"/></TouchableOpacity>}
              <TouchableOpacity style={[styles.ctrlBtn, {backgroundColor: COLORS.danger, width: 60, height: 60, borderRadius: 30}]} onPress={() => cleanupCall(true)}><Ionicons name="call" size={30} color="#FFF" style={{transform:[{rotate:'135deg'}]}}/></TouchableOpacity>
            </View>
          </SafeAreaView>
        </Modal>
      )}

      {/* FULLSCREEN MEDIA */}
      <Modal visible={!!fullScreenMedia} transparent={false} animationType="fade">
        <View style={styles.callOverlay}>
          <TouchableOpacity style={{ position: 'absolute', top: 50, right: 20, zIndex: 10 }} onPress={() => setFullScreenMedia(null)}><Ionicons name="close" size={36} color="#FFF"/></TouchableOpacity>
          {fullScreenMedia?.type === 'video' ? <Video source={{ uri: fullScreenMedia.uri }} style={{ width: '100%', height: '100%' }} resizeMode="contain" useNativeControls shouldPlay /> : <Image source={{ uri: fullScreenMedia?.uri }} style={{ width: '100%', height: '100%', resizeMode: 'contain' }} />}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.header, paddingHorizontal: 5, paddingTop: Platform.OS === 'ios' ? 10 : 45, paddingBottom: 15, borderBottomWidth: 1, borderColor: COLORS.border },
  iconBtn: { padding: 10 },
  avatar: { width: 42, height: 42, borderRadius: 21 },
  headerTitle: { color: COLORS.text, fontSize: 18, fontWeight: '700' },
  headerStatus: { fontSize: 13, fontWeight: '500', marginTop: 2 },
  uploadBanner: { backgroundColor: '#007AFF', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 10 },
  msgRow: { flexDirection: 'row', marginBottom: 15 },
  bubble: { maxWidth: '80%', padding: 10, borderRadius: 18 },
  myBubble: { backgroundColor: COLORS.bubbleMe, borderBottomRightRadius: 4 },
  otherBubble: { backgroundColor: COLORS.bubbleOther, borderBottomLeftRadius: 4 },
  senderName: { color: '#4AB5FF', fontSize: 12, fontWeight: 'bold', marginBottom: 4 },
  replyBox: { backgroundColor: 'rgba(0,0,0,0.2)', padding: 8, borderRadius: 8, borderLeftWidth: 3, borderLeftColor: COLORS.bubbleMe, marginBottom: 6 },
  msgText: { fontSize: 16, lineHeight: 22 },
  msgFooter: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginTop: 5 },
  timeTxt: { color: 'rgba(255,255,255,0.5)', fontSize: 11 },
  editedTxt: { color: 'rgba(255,255,255,0.5)', fontSize: 10, fontStyle: 'italic', marginRight: 5 },
  reactionBadge: { position: 'absolute', bottom: -10, backgroundColor: '#1A2A3A', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border },
  mediaItem: { width: width * 0.65, height: width * 0.65, borderRadius: 12, resizeMode: 'cover' },
  playOverlay: { position: 'absolute', top: '40%', left: '40%', width: 50, height: 50, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 25, justifyContent: 'center', alignItems: 'center' },
  docBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)', padding: 10, borderRadius: 8 },
  replyBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, padding: 12, borderTopWidth: 1, borderColor: COLORS.border },
  composer: { flexDirection: 'row', alignItems: 'flex-end', backgroundColor: COLORS.bg, padding: 10, paddingBottom: Platform.OS === 'ios' ? 25 : 15 },
  attachBtn: { padding: 8, marginBottom: 2 },
  inputBox: { flex: 1, flexDirection: 'row', alignItems: 'flex-end', backgroundColor: COLORS.surface2, borderRadius: 24, paddingLeft: 15, minHeight: 45, maxHeight: 120, borderWidth: 1, borderColor: COLORS.border },
  input: { flex: 1, color: COLORS.text, fontSize: 16, paddingTop: 12, paddingBottom: 12 },
  sendBtn: { width: 45, height: 45, borderRadius: 23, backgroundColor: COLORS.bubbleMe, justifyContent: 'center', alignItems: 'center', marginLeft: 10, marginBottom: 2 },
  overlayFull: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: COLORS.overlay, zIndex: 100 },
  attachSheet: { position: 'absolute', bottom: 0, width: '100%', backgroundColor: '#121A24', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 40 },
  sheetHandle: { width: 40, height: 5, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 3, alignSelf: 'center', marginTop: 12 },
  sheetTitle: { color: COLORS.text, fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginVertical: 15 },
  attachGrid: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 20 },
  attachItem: { alignItems: 'center' },
  attachIcon: { width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  attachLabel: { color: COLORS.text, fontSize: 13, fontWeight: '500' },
  contextMenu: { position: 'absolute', alignSelf: 'center', width: 220 },
  reactionBar: { flexDirection: 'row', justifyContent: 'space-around', backgroundColor: '#1E2D3D', padding: 12, borderRadius: 30, marginBottom: 15 },
  actionList: { backgroundColor: '#1E2D3D', borderRadius: 16, overflow: 'hidden' },
  actionBtn: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderColor: COLORS.border },
  actionTxt: { color: COLORS.text, fontSize: 16, fontWeight: '500' },
  callOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center' },
  incomingCard: { width: 300, backgroundColor: '#111C28', borderRadius: 24, padding: 30, alignItems: 'center' },
  callBtnRound: { width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center' },
  localVideo: { position: 'absolute', top: 50, right: 20, width: 110, height: 160, borderRadius: 12, backgroundColor: '#222' },
  callControls: { position: 'absolute', bottom: 40, width: '100%', flexDirection: 'row', justifyContent: 'center', gap: 20 },
  ctrlBtn: { width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' }
});
