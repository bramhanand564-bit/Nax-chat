import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Keyboard
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  addDoc, collection, getDoc, increment, onSnapshot, orderBy,
  query, serverTimestamp, setDoc, updateDoc, doc, where,
} from 'firebase/firestore';
import {
  RTCPeerConnection, RTCIceCandidate, RTCSessionDescription,
  RTCView, mediaDevices,
} from 'react-native-webrtc';
import { auth, db } from '../firebaseConfig';
import { useTheme } from '../context/ThemeContext';

const BLUE = '#087EFF';
const GREEN = '#34C759';
const RED = '#FF3B30';
const DARK = '#050A10';
const DARK_HEADER = '#0B1824';
const DARK_INPUT = '#142433';
const DARK_BUBBLE = '#172433';
const LIGHT = '#F3F7FA';
const LIGHT_BUBBLE = '#DCEAF7';
const WHITE = '#FFFFFF';
const SUB = '#8FA6B9';

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

export default function ChatRoomScreen({ route, navigation }) {
  const params = route?.params || {};
  const chatId = params.chatId || '';
  const friendId = params.friendId || '';
  const chatName = params.chatName || params.friendUsername || 'Chat';
  const friendUsername = params.friendUsername || '';
  const friendAvatar = params.friendAvatar || '';
  const currentUser = auth.currentUser;

  const { isDark } = useTheme();

  const bg = isDark ? DARK : LIGHT;
  const headerBg = isDark ? DARK_HEADER : WHITE;
  const inputBg = isDark ? DARK_INPUT : '#E8EFF4';
  const textColor = isDark ? '#F4F7FA' : '#142532';
  const subColor = isDark ? SUB : '#6C8494';
  const otherBubble = isDark ? DARK_BUBBLE : LIGHT_BUBBLE;

  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [online, setOnline] = useState(false);

  const [replyMessage, setReplyMessage] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [menuVisible, setMenuVisible] = useState(false);

  const [incomingCall, setIncomingCall] = useState(null);
  const [callVisible, setCallVisible] = useState(false);
  const [callType, setCallType] = useState('audio');
  const [callState, setCallState] = useState('idle');
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [speakerEnabled, setSpeakerEnabled] = useState(true);
  const [callSeconds, setCallSeconds] = useState(0);
  const [callError, setCallError] = useState('');

  const listRef = useRef(null);
  const peerRef = useRef(null);
  const localStreamRef = useRef(null);
  const callIdRef = useRef(null);
  const callUnsubsRef = useRef([]);
  const timerRef = useRef(null);
  const mountedRef = useRef(true);

  // ==========================================
  // FIREBASE REFERENCES
  // ==========================================
  const messagesRef = () => {
    if (!chatId) return null;
    if (chatId === 'global_chats') return collection(db, 'global_chats');
    return collection(db, 'chats', chatId, 'messages');
  };

  const messageRef = (id) => {
    if (chatId === 'global_chats') return doc(db, 'global_chats', id);
    return doc(db, 'chats', chatId, 'messages', id);
  };

  const timeText = (value) => {
    if (!value) return '';
    try {
      const date = value?.toDate ? value.toDate() : new Date(value);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  // ==========================================
  // LISTENERS
  // ==========================================
  useEffect(() => {
    mountedRef.current = true;
    const ref = messagesRef();
    if (!ref) {
      setLoading(false);
      return;
    }
    const q = query(ref, orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, snap => {
      const list = snap.docs.map(item => ({ id: item.id, ...item.data() }));
      if (mountedRef.current) {
        setMessages(list);
        setLoading(false);
      }
    }, error => {
      console.log('Messages listener:', error);
      if (mountedRef.current) setLoading(false);
    });
    return () => unsub();
  }, [chatId]);

  useEffect(() => {
    if (!friendId) return;
    return onSnapshot(doc(db, 'users', friendId), snap => {
      setOnline(Boolean(snap.data()?.online));
    }, error => console.log('Presence listener:', error));
  }, [friendId]);

  useEffect(() => {
    if (!currentUser?.uid || !chatId || chatId === 'global_chats') return;
    setDoc(doc(db, 'users', currentUser.uid, 'user_chats', chatId), { unreadCount: 0 }, { merge: true })
      .catch(error => console.log('Unread clear:', error));
  }, [chatId, messages.length, currentUser?.uid]);

  // ==========================================
  // METADATA & MESSAGING
  // ==========================================
  const updateChatMetadata = async (lastMessage, type = 'text') => {
    if (!currentUser?.uid || !friendId || chatId === 'global_chats') return;
    const now = serverTimestamp();
    try {
      await setDoc(doc(db, 'users', currentUser.uid, 'user_chats', chatId), {
        chatId, type: 'private', friendId, friendName: chatName, friendUsername, friendAvatar,
        lastMessage, lastMessageType: type, lastMessageTime: now, updatedAt: now,
      }, { merge: true });

      await setDoc(doc(db, 'users', friendId, 'user_chats', chatId), {
        chatId, type: 'private', friendId: currentUser.uid, friendName: currentUser.displayName || 'User',
        lastMessage, lastMessageType: type, lastMessageTime: now, updatedAt: now, unreadCount: increment(1),
      }, { merge: true });
    } catch (error) { console.log('Chat metadata:', error); }
  };

  const sendMessage = async () => {
    const value = text.trim();
    if (!value || sending || !currentUser?.uid) return;
    const ref = messagesRef();
    if (!ref) return;

    setSending(true);
    try {
      const data = {
        type: 'text', text: value, senderId: currentUser.uid,
        senderName: currentUser.displayName || 'User', createdAt: serverTimestamp(), read: false,
      };
      if (replyMessage) {
        data.replyToId = replyMessage.id;
        data.replyToText = replyMessage.text || 'Media';
        data.replyToSender = replyMessage.senderName || 'User';
      }
      await addDoc(ref, data);
      await updateChatMetadata(value, 'text');
      
      setText('');
      setReplyMessage(null);
      setTimeout(() => {
        listRef.current?.scrollToOffset({ offset: 0, animated: true });
      }, 80);
    } catch (error) {
      console.log('Send message:', error);
      Alert.alert('Error', 'Message send nahi hua.');
    } finally {
      setSending(false);
    }
  };

  // ==========================================
  // MESSAGE ACTIONS (REPLY, EDIT, DELETE)
  // ==========================================
  const startReply = (message) => {
    setReplyMessage(message); setEditingMessage(null); setSelectedMessage(null); setMenuVisible(false);
  };
  
  const cancelReply = () => {
    setReplyMessage(null);
  };

  const startEdit = (message) => {
    if (message.senderId !== currentUser?.uid) return;
    setEditingMessage(message); setReplyMessage(null); setText(message.text || ''); setSelectedMessage(null); setMenuVisible(false);
  };

  const cancelEdit = () => {
    setEditingMessage(null); setText('');
  };

  const saveEdit = async () => {
    const value = text.trim();
    if (!value || !editingMessage) return;
    try {
      await updateDoc(messageRef(editingMessage.id), { text: value, isEdited: true, editedAt: serverTimestamp() });
      cancelEdit();
    } catch (error) {
      console.log('Edit message:', error); Alert.alert('Error', 'Message edit nahi hua.');
    }
  };

  const deleteMessage = async () => {
    if (!selectedMessage || selectedMessage.senderId !== currentUser?.uid) return;
    try {
      await updateDoc(messageRef(selectedMessage.id), { isDeleted: true, text: '', mediaUrl: '', deletedAt: serverTimestamp() });
    } catch (error) { console.log('Delete message:', error); }
    setSelectedMessage(null); setMenuVisible(false);
  };

  const addReaction = async (emoji) => {
    if (!selectedMessage || !currentUser?.uid) return;
    try {
      await updateDoc(messageRef(selectedMessage.id), { [`reactions.${currentUser.uid}`]: emoji });
    } catch (error) { console.log('Reaction:', error); }
    setSelectedMessage(null); setMenuVisible(false);
  };

  const onLongPress = (message) => {
    Keyboard.dismiss();
    setSelectedMessage(message);
    setMenuVisible(true);
  };

  // ==========================================
  // WEBRTC CALL ENGINE
  // ==========================================
  const cleanupCall = async (updateRemote) => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    callUnsubsRef.current.forEach(unsub => { try { unsub(); } catch {} }); callUnsubsRef.current = [];
    if (updateRemote && callIdRef.current) {
      try { await updateDoc(doc(db, 'calls', callIdRef.current), { status: 'ended', endedAt: serverTimestamp() }); } catch (error) {}
    }
    if (peerRef.current) { try { peerRef.current.close(); } catch {} } peerRef.current = null;
    if (localStreamRef.current) { localStreamRef.current.getTracks().forEach(track => { try { track.stop(); } catch {} }); }
    localStreamRef.current = null; callIdRef.current = null;
    setLocalStream(null); setRemoteStream(null); setCallVisible(false); setCallState('idle'); setCallSeconds(0); setCallError(''); setIncomingCall(null);
  };

  const getMedia = async (type) => {
    try {
      return await mediaDevices.getUserMedia({ audio: true, video: type === 'video' });
    } catch (error) {
      Alert.alert('Permission required', type === 'video' ? 'Camera aur microphone permission allow karo.' : 'Microphone permission allow karo.');
      return null;
    }
  };

  const createPeer = async () => {
    const peer = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    peerRef.current = peer;
    peer.ontrack = event => {
      const stream = event.streams?.[0];
      if (stream) { setRemoteStream(stream); setCallState('connected'); }
    };
    peer.onconnectionstatechange = () => {
      if (peer.connectionState === 'connected') setCallState('connected');
      if (['failed', 'disconnected', 'closed'].includes(peer.connectionState) && mountedRef.current) setCallState('ended');
    };
    return peer;
  };

  const addIceListener = (id, peer, collectionName) => {
    const ref = collection(db, 'calls', id, collectionName);
    const unsub = onSnapshot(ref, snap => {
      snap.docChanges().forEach(async change => {
        if (change.type !== 'added') return;
        try { await peer.addIceCandidate(new RTCIceCandidate(change.doc.data())); } catch (error) {}
      });
    });
    callUnsubsRef.current.push(unsub);
  };

  const watchCall = (id, peer) => {
    const unsub = onSnapshot(doc(db, 'calls', id), async snap => {
      if (!snap.exists()) return;
      const data = snap.data();
      if (data.answer && !peer.currentRemoteDescription) {
        try { await peer.setRemoteDescription(new RTCSessionDescription(data.answer)); setCallState('connected'); } catch (error) {}
      }
      if (data.status === 'rejected' || data.status === 'ended') await cleanupCall(false);
    });
    callUnsubsRef.current.push(unsub);
  };

  const startTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setCallSeconds(0);
    timerRef.current = setInterval(() => setCallSeconds(value => value + 1), 1000);
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60); const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const startCall = async (type) => {
    if (!friendId || !currentUser?.uid || callVisible) return;
    setCallType(type); setCallVisible(true); setCallState('calling'); setCallError('');
    const stream = await getMedia(type);
    if (!stream) { setCallVisible(false); setCallState('idle'); return; }
    localStreamRef.current = stream; setLocalStream(stream);
    const peer = await createPeer();
    stream.getTracks().forEach(track => peer.addTrack(track, stream));

    try {
      const callRef = await addDoc(collection(db, 'calls'), {
        callerId: currentUser.uid, callerName: currentUser.displayName || 'User', receiverId: friendId, type, status: 'ringing', createdAt: serverTimestamp(),
      });
      callIdRef.current = callRef.id;
      peer.onicecandidate = async event => {
        if (event.candidate) await addDoc(collection(db, 'calls', callRef.id, 'callerCandidates'), event.candidate.toJSON());
      };
      const offer = await peer.createOffer({});
      await peer.setLocalDescription(offer);
      await updateDoc(doc(db, 'calls', callRef.id), { offer: { type: offer.type, sdp: offer.sdp } });
      watchCall(callRef.id, peer);
      addIceListener(callRef.id, peer, 'receiverCandidates');
    } catch (error) { setCallError('Call start nahi hui.'); }
  };

  const acceptCall = async () => {
    if (!incomingCall) return;
    const type = incomingCall.type === 'video' ? 'video' : 'audio';
    const id = incomingCall.id;
    setCallType(type); setCallVisible(true); setCallState('connecting'); setIncomingCall(null); setCallError('');
    const stream = await getMedia(type);
    if (!stream) { setCallVisible(false); setCallState('idle'); return; }
    localStreamRef.current = stream; setLocalStream(stream);
    const peer = await createPeer();
    stream.getTracks().forEach(track => peer.addTrack(track, stream));

    try {
      const ref = doc(db, 'calls', id);
      const snap = await getDoc(ref);
      const data = snap.data();
      if (!data?.offer) throw new Error('Offer missing');
      await peer.setRemoteDescription(new RTCSessionDescription(data.offer));
      peer.onicecandidate = async event => {
        if (event.candidate) await addDoc(collection(db, 'calls', id, 'receiverCandidates'), event.candidate.toJSON());
      };
      const answer = await peer.createAnswer({});
      await peer.setLocalDescription(answer);
      await updateDoc(ref, { answer: { type: answer.type, sdp: answer.sdp }, status: 'accepted' });
      callIdRef.current = id;
      addIceListener(id, peer, 'callerCandidates');
    } catch (error) { setCallError('Call connect nahi hui.'); }
  };

  const rejectCall = async () => {
    if (!incomingCall) return;
    try { await updateDoc(doc(db, 'calls', incomingCall.id), { status: 'rejected' }); } catch (error) {}
    setIncomingCall(null);
  };

  useEffect(() => {
    if (!currentUser?.uid || !friendId) return;
    const q = query(collection(db, 'calls'), where('receiverId', '==', currentUser.uid));
    return onSnapshot(q, snap => {
      snap.docChanges().forEach(change => {
        if (!['added', 'modified'].includes(change.type)) return;
        const data = change.doc.data();
        if (data.status !== 'ringing' || data.callerId !== friendId) return;
        setIncomingCall({ id: change.doc.id, ...data });
        setCallType(data.type === 'video' ? 'video' : 'audio');
      });
    });
  }, [currentUser?.uid, friendId]);

  useEffect(() => {
    if (!callVisible || callState !== 'connected') return;
    startTimer();
    return () => { if (timerRef.current) clearInterval(timerRef.current); timerRef.current = null; };
  }, [callVisible, callState]);

  useEffect(() => {
    return () => { mountedRef.current = false; cleanupCall(false); };
  }, []);

  const toggleMic = () => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const next = !micEnabled;
    stream.getAudioTracks().forEach(track => { track.enabled = next; });
    setMicEnabled(next);
  };

  const toggleCamera = () => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const next = !cameraEnabled;
    stream.getVideoTracks().forEach(track => { track.enabled = next; });
    setCameraEnabled(next);
  };

  // ==========================================
  // RENDER UI COMPONENTS
  // ==========================================
  const renderMessage = ({ item }) => {
    const mine = item.senderId === currentUser?.uid;
    const reactions = Object.values(item.reactions || {});

    return (
      <Pressable onLongPress={() => onLongPress(item)} style={[styles.row, { justifyContent: mine ? 'flex-end' : 'flex-start' }]}>
        <View style={[styles.bubble, { backgroundColor: mine ? BLUE : otherBubble, borderBottomRightRadius: mine ? 5 : 18, borderBottomLeftRadius: mine ? 18 : 5 }]}>
          {item.replyToText ? (
            <View style={styles.replyInside}>
              <Text style={styles.replyLabel}>Reply</Text>
              <Text numberOfLines={1} style={styles.replyText}>{item.replyToText}</Text>
            </View>
          ) : null}
          <Text style={[styles.messageText, { color: mine ? WHITE : textColor }]}>
            {item.isDeleted ? '🚫 Message deleted' : item.text || ''}
          </Text>
          {reactions.length > 0 ? (
            <Text style={styles.reactionBadge}>{reactions.join(' ')}</Text>
          ) : null}
          <View style={styles.meta}>
            {item.isEdited ? <Text style={styles.edited}>edited</Text> : null}
            <Text style={styles.time}>{timeText(item.createdAt)}</Text>
          </View>
        </View>
      </Pressable>
    );
  };

  const renderMenu = () => {
    if (!selectedMessage) return null;
    const mine = selectedMessage.senderId === currentUser?.uid;
    return (
      <Modal transparent visible={menuVisible} animationType="fade" onRequestClose={() => setMenuVisible(false)}>
        <Pressable style={styles.overlay} onPress={() => setMenuVisible(false)}>
          <Pressable style={[styles.menu, { backgroundColor: isDark ? '#12202D' : WHITE }]} onPress={() => {}}>
            <Text style={[styles.menuTitle, { color: textColor }]}>Message options</Text>
            <TouchableOpacity style={styles.menuItem} onPress={() => startReply(selectedMessage)}>
              <Ionicons name="arrow-undo-outline" size={22} color={BLUE} />
              <Text style={[styles.menuText, { color: textColor }]}>Reply</Text>
            </TouchableOpacity>
            {mine ? (
              <TouchableOpacity style={styles.menuItem} onPress={() => startEdit(selectedMessage)}>
                <Ionicons name="create-outline" size={22} color={BLUE} />
                <Text style={[styles.menuText, { color: textColor }]}>Edit</Text>
              </TouchableOpacity>
            ) : null}
            <View style={styles.reactions}>
              {['❤️', '😂', '👍', '😮', '😢'].map(emoji => (
                <TouchableOpacity key={emoji} style={styles.emojiButton} onPress={() => addReaction(emoji)}>
                  <Text style={styles.emoji}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {mine ? (
              <TouchableOpacity style={styles.menuItem} onPress={() => Alert.alert('Delete message', 'Delete this message?', [ { text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: deleteMessage } ])}>
                <Ionicons name="trash-outline" size={22} color={RED} />
                <Text style={[styles.menuText, { color: RED }]}>Delete</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity style={styles.cancelMenu} onPress={() => setMenuVisible(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    );
  };

  const renderIncoming = () => {
    if (!incomingCall) return null;
    const video = incomingCall.type === 'video';
    return (
      <Modal transparent visible animationType="fade">
        <View style={styles.overlayCenter}>
          <View style={styles.incomingCard}>
            <View style={styles.bigAvatar}><Text style={styles.bigAvatarText}>{chatName.charAt(0).toUpperCase()}</Text></View>
            <Text style={styles.incomingName}>{incomingCall.callerName || chatName}</Text>
            <Text style={styles.incomingType}>{video ? 'Incoming video call' : 'Incoming audio call'}</Text>
            <View style={styles.incomingButtons}>
              <TouchableOpacity style={styles.reject} onPress={rejectCall}><Ionicons name="close" size={30} color={WHITE} /></TouchableOpacity>
              <TouchableOpacity style={styles.accept} onPress={acceptCall}><Ionicons name="call" size={28} color={WHITE} /></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  const renderCall = () => {
    if (!callVisible) return null;
    const video = callType === 'video';
    return (
      <Modal visible animationType="slide" onRequestClose={() => cleanupCall(true)}>
        <SafeAreaView style={styles.callScreen}>
          {video && remoteStream ? (
            <RTCView streamURL={remoteStream.toURL()} style={styles.remoteVideo} objectFit="cover" />
          ) : (
            <View style={styles.audioScreen}>
              <View style={styles.bigAvatar}><Text style={styles.bigAvatarText}>{chatName.charAt(0).toUpperCase()}</Text></View>
              <Text style={styles.callName}>{chatName}</Text>
              <Text style={styles.callStatus}>{callState === 'connected' ? formatDuration(callSeconds) : callState === 'calling' ? 'Calling...' : 'Connecting...'}</Text>
            </View>
          )}
          {video && localStream ? <RTCView streamURL={localStream.toURL()} style={styles.localVideo} objectFit="cover" /> : null}
          {video ? (
            <View style={styles.videoTop}>
              <Text style={styles.videoName}>{chatName}</Text>
              <Text style={styles.videoStatus}>{callState === 'connected' ? formatDuration(callSeconds) : callState}</Text>
            </View>
          ) : null}
          {callError ? <Text style={styles.callError}>{callError}</Text> : null}
          <View style={styles.callControls}>
            <CallButton icon={micEnabled ? 'mic' : 'mic-off'} label="Mic" onPress={toggleMic} />
            {video ? <CallButton icon={cameraEnabled ? 'videocam' : 'videocam-off'} label="Camera" onPress={toggleCamera} /> : null}
            <CallButton icon={speakerEnabled ? 'volume-high' : 'volume-mute'} label="Speaker" onPress={() => setSpeakerEnabled(!speakerEnabled)} />
            <TouchableOpacity style={styles.endCall} onPress={() => cleanupCall(true)}>
              <Ionicons name="call" size={26} color={WHITE} />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]}>
      <View style={[styles.header, { backgroundColor: headerBg }]}>
        <TouchableOpacity style={styles.headerButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={textColor} />
        </TouchableOpacity>
        <View style={styles.avatar}><Text style={styles.avatarText}>{chatName.charAt(0).toUpperCase()}</Text></View>
        <View style={styles.headerInfo}>
          <Text numberOfLines={1} style={[styles.headerTitle, { color: textColor }]}>{chatName}</Text>
          {friendId ? <Text style={[styles.headerStatus, { color: online ? GREEN : subColor }]}>{online ? 'Online' : 'Offline'}</Text> : null}
        </View>
        {friendId ? (
          <>
            <TouchableOpacity style={styles.headerButton} onPress={() => startCall('audio')}><Ionicons name="call-outline" size={22} color={textColor} /></TouchableOpacity>
            <TouchableOpacity style={styles.headerButton} onPress={() => startCall('video')}><Ionicons name="videocam-outline" size={23} color={textColor} /></TouchableOpacity>
          </>
        ) : null}
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {loading ? (
          <View style={styles.empty}><Text style={[styles.emptyText, { color: subColor }]}>Loading messages...</Text></View>
        ) : messages.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="chatbubble-outline" size={45} color={subColor} />
            <Text style={[styles.emptyTitle, { color: textColor }]}>No messages yet</Text>
            <Text style={[styles.emptyText, { color: subColor }]}>Start the conversation.</Text>
          </View>
        ) : (
          <FlatList ref={listRef} data={messages} inverted keyExtractor={item => item.id} renderItem={renderMessage} contentContainerStyle={styles.list} keyboardShouldPersistTaps="handled" />
        )}

        {replyMessage || editingMessage ? (
          <View style={[styles.contextBar, { backgroundColor: inputBg }]}>
            <View style={styles.contextInfo}>
              <Text style={styles.contextTitle}>{editingMessage ? 'Editing message' : 'Replying'}</Text>
              <Text numberOfLines={1} style={[styles.contextText, { color: textColor }]}>{editingMessage?.text || replyMessage?.text || 'Media'}</Text>
            </View>
            <TouchableOpacity onPress={editingMessage ? cancelEdit : cancelReply}><Ionicons name="close" size={22} color={textColor} /></TouchableOpacity>
          </View>
        ) : null}

        <View style={[styles.composer, { backgroundColor: headerBg }]}>
          <View style={[styles.inputBox, { backgroundColor: inputBg }]}>
            <TextInput value={text} onChangeText={setText} placeholder={editingMessage ? 'Edit message...' : 'Message...'} placeholderTextColor={subColor} multiline style={[styles.input, { color: textColor }]} />
          </View>
          <TouchableOpacity style={[styles.send, { opacity: text.trim() ? 1 : 0.55 }]} disabled={!text.trim() || sending} onPress={editingMessage ? saveEdit : sendMessage}>
            <Ionicons name={editingMessage ? 'checkmark' : 'send'} size={21} color={WHITE} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {renderMenu()}
      {renderIncoming()}
      {renderCall()}
    </SafeAreaView>
  );
}

function CallButton({ icon, label, onPress }) {
  return (
    <TouchableOpacity style={styles.callButton} onPress={onPress}>
      <Ionicons name={icon} size={22} color={WHITE} />
      <Text style={styles.callButtonText}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  header: { minHeight: 62, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, borderBottomWidth: 1, borderBottomColor: 'rgba(128,150,165,0.12)' },
  headerButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: BLUE, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: WHITE, fontSize: 17, fontWeight: '800' },
  headerInfo: { flex: 1, marginLeft: 9 },
  headerTitle: { fontSize: 17, fontWeight: '800' },
  headerStatus: { fontSize: 12, marginTop: 2, fontWeight: '600' },
  list: { paddingHorizontal: 12, paddingVertical: 12 },
  row: { width: '100%', flexDirection: 'row', marginVertical: 3 },
  bubble: { maxWidth: '82%', paddingHorizontal: 13, paddingTop: 9, paddingBottom: 7, borderRadius: 18 },
  messageText: { fontSize: 16, lineHeight: 21 },
  replyInside: { borderLeftWidth: 3, borderLeftColor: BLUE, paddingLeft: 8, marginBottom: 6 },
  replyLabel: { color: BLUE, fontSize: 11, fontWeight: '800' },
  replyText: { color: '#9EB4C5', fontSize: 12, marginTop: 2 },
  meta: { flexDirection: 'row', justifyContent: 'flex-end', gap: 5, marginTop: 4 },
  time: { color: '#B8C9D5', fontSize: 10 },
  edited: { color: '#B8C9D5', fontSize: 10, fontStyle: 'italic' },
  reactionBadge: { fontSize: 13, marginTop: 3 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30 },
  emptyTitle: { fontSize: 18, fontWeight: '800', marginTop: 12 },
  emptyText: { fontSize: 14, marginTop: 5, textAlign: 'center' },
  contextBar: { minHeight: 54, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, borderTopWidth: 1, borderTopColor: 'rgba(128,150,165,0.12)' },
  contextInfo: { flex: 1 },
  contextTitle: { color: BLUE, fontSize: 12, fontWeight: '800' },
  contextText: { fontSize: 13, marginTop: 2 },
  composer: { minHeight: 66, flexDirection: 'row', alignItems: 'flex-end', padding: 9, gap: 8 },
  inputBox: { flex: 1, minHeight: 46, maxHeight: 120, borderRadius: 23, paddingHorizontal: 16, justifyContent: 'center' },
  input: { fontSize: 16, maxHeight: 105, paddingTop: 10, paddingBottom: 10 },
  send: { width: 46, height: 46, borderRadius: 23, backgroundColor: BLUE, alignItems: 'center', justifyContent: 'center' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.58)', justifyContent: 'flex-end' },
  menu: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 18, paddingBottom: 25 },
  menuTitle: { fontSize: 18, fontWeight: '800', marginBottom: 8 },
  menuItem: { height: 52, flexDirection: 'row', alignItems: 'center', gap: 14 },
  menuText: { fontSize: 16, fontWeight: '600' },
  reactions: { flexDirection: 'row', gap: 8, paddingVertical: 9 },
  emojiButton: { width: 46, height: 46, borderRadius: 23, backgroundColor: 'rgba(128,150,165,0.12)', alignItems: 'center', justifyContent: 'center' },
  emoji: { fontSize: 23 },
  cancelMenu: { height: 48, borderRadius: 24, backgroundColor: 'rgba(128,150,165,0.12)', alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  cancelText: { color: SUB, fontSize: 15, fontWeight: '800' },
  overlayCenter: { flex: 1, backgroundColor: 'rgba(0,0,0,0.68)', alignItems: 'center', justifyContent: 'center', padding: 25 },
  incomingCard: { width: '100%', maxWidth: 360, borderRadius: 28, backgroundColor: '#10202D', alignItems: 'center', padding: 30 },
  bigAvatar: { width: 92, height: 92, borderRadius: 46, backgroundColor: BLUE, alignItems: 'center', justifyContent: 'center' },
  bigAvatarText: { color: WHITE, fontSize: 36, fontWeight: '900' },
  incomingName: { color: WHITE, fontSize: 22, fontWeight: '900', marginTop: 17 },
  incomingType: { color: '#9EB4C5', fontSize: 14, marginTop: 5 },
  incomingButtons: { flexDirection: 'row', gap: 45, marginTop: 28 },
  reject: { width: 60, height: 60, borderRadius: 30, backgroundColor: RED, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '135deg' }] },
  accept: { width: 60, height: 60, borderRadius: 30, backgroundColor: GREEN, alignItems: 'center', justifyContent: 'center' },
  callScreen: { flex: 1, backgroundColor: '#03070B' },
  audioScreen: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  callName: { color: WHITE, fontSize: 25, fontWeight: '900', marginTop: 22 },
  callStatus: { color: '#A9BAC7', fontSize: 15, marginTop: 7 },
  remoteVideo: { ...StyleSheet.absoluteFillObject, backgroundColor: '#000' },
  localVideo: { position: 'absolute', top: 22, right: 16, width: 115, height: 165, borderRadius: 16, backgroundColor: '#111' },
  videoTop: { position: 'absolute', top: 20, left: 20 },
  videoName: { color: WHITE, fontSize: 18, fontWeight: '800' },
  videoStatus: { color: '#D0DCE4', fontSize: 13, marginTop: 3 },
  callError: { position: 'absolute', bottom: 145, left: 20, right: 20, color: '#FF8D86', textAlign: 'center', fontSize: 14 },
  callControls: { position: 'absolute', bottom: 25, left: 15, right: 15, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 12 },
  callButton: { minWidth: 58, height: 58, borderRadius: 29, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  callButtonText: { color: WHITE, fontSize: 9, marginTop: 2 },
  endCall: { width: 62, height: 62, borderRadius: 31, backgroundColor: RED, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '135deg' }] },
});
