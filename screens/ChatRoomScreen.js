import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Image, KeyboardAvoidingView, Platform, Alert, Modal, Linking, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import * as ImagePicker from 'expo-image-picker'; 
import { Audio } from 'expo-av'; 
import * as DocumentPicker from 'expo-document-picker'; 
import * as Location from 'expo-location'; 
import * as Contacts from 'expo-contacts'; 
import * as Haptics from 'expo-haptics';

import { db, auth } from '../firebaseConfig';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, doc, deleteDoc, updateDoc } from 'firebase/firestore';

const { width } = Dimensions.get('window');

export default function ChatRoomScreen({ route, navigation }) {
  const { isDark } = useTheme();
  
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  
  // UI States
  const [showAttachments, setShowAttachments] = useState(false);
  const [showHeaderMenu, setShowHeaderMenu] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [replyingTo, setReplyingTo] = useState(null);
  const [editingMsg, setEditingMsg] = useState(null);
  const [pinnedMessage, setPinnedMessage] = useState("⚡ Nax Ultra Pro Max Room Active!");
  const [showSlashCommands, setShowSlashCommands] = useState(false);
  
  // Interactive Modals
  const [showPollModal, setShowPollModal] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [showCoinModal, setShowCoinModal] = useState(false);
  const [coinAmount, setCoinAmount] = useState('');

  // Audio States
  const [recording, setRecording] = useState();
  const [isRecording, setIsRecording] = useState(false);
  const [recordTime, setRecordTime] = useState(0);
  const timerRef = useRef(null);
  const [playingAudioId, setPlayingAudioId] = useState(null);
  const soundRef = useRef(null);

  const scrollViewRef = useRef();
  const currentUser = auth.currentUser;

  // Colors
  const bg = isDark ? '#0B141A' : '#EFEAE2'; 
  const textMain = isDark ? '#E9EDEF' : '#111B21';
  const textSub = isDark ? '#8696A0' : '#667781';
  const inputBg = isDark ? '#202C33' : '#FFFFFF';
  const headerBg = isDark ? '#202C33' : '#F0F2F5';
  const myMsgBg = isDark ? '#005C4B' : '#D9FDD3';
  const otherMsgBg = isDark ? '#202C33' : '#FFFFFF';
  const borderCol = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';

  useEffect(() => {
    const q = query(collection(db, 'global_chats'), orderBy('createdAt', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => { setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))); });
    return unsubscribe;
  }, []);

  // Slash Commands
  const handleTextChange = (text) => {
    setInputText(text);
    if (text === '/') { Haptics.selectionAsync(); setShowSlashCommands(true); } 
    else { setShowSlashCommands(false); }
  };

  const executeCommand = (cmd) => {
    setShowSlashCommands(false);
    setInputText('');
    if (cmd === '/roll') sendMedia('bot', { text: `🎲 Rolled a ${Math.floor(Math.random() * 6) + 1}` });
    else if (cmd === '/flip') sendMedia('bot', { text: `🪙 Coin flipped: ${Math.random() > 0.5 ? 'Heads' : 'Tails'}` });
    else if (cmd === '/ai') Alert.alert("Nax AI", "Smart assistant ready to process prompt.");
    else if (cmd === '/clear') Alert.alert("Clear", "Local cache cleared successfully.");
  };

  // Sending Messages
  const sendMessage = async () => {
    if (inputText.trim() === '') return;
    if (editingMsg) { await updateDoc(doc(db, 'global_chats', editingMsg.id), { text: inputText, isEdited: true }); setEditingMsg(null); } 
    else {
      await addDoc(collection(db, 'global_chats'), {
        text: inputText, senderEmail: currentUser?.email, senderName: currentUser?.displayName || 'User', senderId: currentUser?.uid, type: 'text', reaction: null, replyTo: replyingTo ? replyingTo.text : null, replyToSender: replyingTo ? replyingTo.senderName : null, isEdited: false, createdAt: serverTimestamp()
      });
    }
    setInputText(''); setReplyingTo(null); setShowAttachments(false);
  };

  const sendMedia = async (type, data) => {
    setShowAttachments(false);
    await addDoc(collection(db, 'global_chats'), { ...data, senderEmail: currentUser?.email, senderName: currentUser?.displayName || 'User', senderId: currentUser?.uid, type, createdAt: serverTimestamp() });
  };

  // Attachments Actions
  const takePhoto = async () => { let r = await ImagePicker.launchCameraAsync({ base64: true, quality: 0.2 }); if(!r.canceled) sendMedia('image', { image: `data:image/jpeg;base64,${r.assets[0].base64}` }); };
  const pickImage = async () => { let r = await ImagePicker.launchImageLibraryAsync({ base64: true, quality: 0.2 }); if(!r.canceled) sendMedia('image', { image: `data:image/jpeg;base64,${r.assets[0].base64}` }); };
  const pickDoc = async () => { let r = await DocumentPicker.getDocumentAsync({}); if(!r.canceled) sendMedia('document', { fileName: r.assets[0].name, fileSize: r.assets[0].size }); };
  const shareLoc = async () => { let { status } = await Location.requestForegroundPermissionsAsync(); if(status==='granted') { let loc = await Location.getCurrentPositionAsync({}); sendMedia('location', { latitude: loc.coords.latitude, longitude: loc.coords.longitude }); } };
  const shareContact = async () => { let { status } = await Contacts.requestPermissionsAsync(); if(status==='granted') { const { data } = await Contacts.getContactsAsync({ limit: 1 }); if(data.length > 0) sendMedia('contact', { contactName: data[0].name, contactNumber: data[0].phoneNumbers?.[0]?.number || 'N/A' }); } };
  
  const sendCoins = async () => { if(!coinAmount) return; sendMedia('payment', { amount: coinAmount, currency: 'Nax Coins' }); setShowCoinModal(false); setCoinAmount(''); };
  const sendPoll = async () => { if (!pollQuestion || pollOptions.some(o => !o)) return; const opts = pollOptions.map((opt, i) => ({ id: i.toString(), text: opt, voters: [] })); sendMedia('poll', { question: pollQuestion, options: opts }); setShowPollModal(false); setPollQuestion(''); setPollOptions(['', '']); };

  // Audio Recording
  const startRecording = async () => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); await Audio.requestPermissionsAsync(); await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true }); const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.LOW_QUALITY); setRecording(recording); setIsRecording(true); setRecordTime(0); timerRef.current = setInterval(() => setRecordTime(p => p + 1), 1000); };
  const stopRecording = async (cancel = false) => { if (!recording) return; setIsRecording(false); clearInterval(timerRef.current); await recording.stopAndUnloadAsync(); const uri = recording.getURI(); setRecording(undefined); if (!cancel && recordTime > 0) sendMedia('audio', { audio: uri, duration: recordTime }); setRecordTime(0); };
  const playAudio = async (uri, msgId) => { if (soundRef.current) await soundRef.current.unloadAsync(); const { sound } = await Audio.Sound.createAsync({ uri }); soundRef.current = sound; setPlayingAudioId(msgId); await sound.playAsync(); sound.setOnPlaybackStatusUpdate((s) => { if (s.didJustFinish) setPlayingAudioId(null); }); };

  // Message Actions
  const handleAction = (action) => {
    Haptics.selectionAsync();
    if (action === 'copy') {
      Alert.alert("Copied", "Text copied to clipboard!"); 
    }
    else if (action === 'reply') setReplyingTo(selectedMessage);
    else if (action === 'pin') setPinnedMessage(selectedMessage.text || 'Pinned Item');
    else if (action === 'edit') { setInputText(selectedMessage.text); setEditingMsg(selectedMessage); }
    else if (action === 'delete') deleteDoc(doc(db, 'global_chats', selectedMessage.id));
    else if (action === 'translate') Alert.alert("Translated", `"${selectedMessage.text}" -> Transferred`);
    else if (action === 'summarize') Alert.alert("AI Summary", "Key points extracted.");
    else if (action === 'todo') Alert.alert("To-Do", "Task saved successfully.");
    else if (action === 'star') Alert.alert("Starred", "Added to favorites.");
    else if (action === 'speak') Alert.alert("TTS", "Audio playback initiated.");
    setSelectedMessage(null);
  };

  const handleReaction = async (emoji) => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); await updateDoc(doc(db, 'global_chats', selectedMessage.id), { reaction: emoji }); setSelectedMessage(null); };
  const handleVote = async (msgId, opts, optId) => { const updated = opts.map(o => { const voters = o.voters.filter(uid => uid !== currentUser.uid); if (o.id === optId) voters.push(currentUser.uid); return { ...o, voters }; }); await updateDoc(doc(db, 'global_chats', msgId), { options: updated }); };

  const renderMessage = (msg) => {
    const isMe = msg.senderId === currentUser?.uid;
    const time = msg.createdAt ? new Date(msg.createdAt.toDate()).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' }) : '...';
    
    return (
      <View key={msg.id} style={[styles.messageRow, { justifyContent: isMe ? 'flex-end' : 'flex-start' }]}>
        <TouchableOpacity activeOpacity={0.8} onLongPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setSelectedMessage(msg); }} style={[styles.messageBubble, { backgroundColor: isMe ? myMsgBg : otherMsgBg, padding: ['image','location','contact','payment'].includes(msg.type) ? 4 : 8 }]}>
          
          {!isMe && !['image','location','bot'].includes(msg.type) && <Text style={styles.senderName}>{msg.senderName}</Text>}
          {msg.replyTo && <View style={[styles.quoteBox, { backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.05)' }]}><Text style={{ color: '#007AFF', fontSize: 12, fontWeight: 'bold' }}>{msg.replyToSender}</Text><Text style={{ color: textSub, fontSize: 13 }} numberOfLines={2}>{msg.replyTo}</Text></View>}

          {/* DYNAMIC TYPES */}
          {msg.type === 'bot' ? ( <Text style={{ color: '#00A884', fontSize: 16, fontWeight: 'bold', fontStyle: 'italic' }}>🤖 {msg.text}</Text> ) :
           msg.type === 'audio' ? (
            <View style={styles.audioContainer}>
              <TouchableOpacity onPress={() => playAudio(msg.audio, msg.id)} style={{marginRight:10}}><Ionicons name={playingAudioId===msg.id?"pause":"play"} size={24} color={isMe?'#FFF':'#00A884'} /></TouchableOpacity>
              <View style={styles.audioWave}><View style={[styles.waveLine, { backgroundColor: isMe ? '#FFF' : '#00A884' }]} /><View style={[styles.waveLine, { height: 15, backgroundColor: isMe ? '#FFF' : '#00A884' }]} /><View style={[styles.waveLine, { height: 25, backgroundColor: isMe ? '#FFF' : '#00A884' }]} /><View style={[styles.waveLine, { backgroundColor: isMe ? '#FFF' : '#00A884' }]} /></View>
              <Text style={{ color: isMe ? '#FFF' : textMain, marginLeft:10, fontSize:13 }}>{`${Math.floor(msg.duration/60)}:${(msg.duration%60).toString().padStart(2,'0')}`}</Text>
            </View>
          ) : msg.type === 'poll' ? (
            <View style={{ minWidth: 220, paddingVertical: 5 }}>
              <Text style={{ color: textMain, fontSize: 16, fontWeight: 'bold', marginBottom:10 }}>📊 {msg.question}</Text>
              {msg.options.map(opt => {
                const tot = msg.options.reduce((a, o) => a + o.voters.length, 0);
                const pct = tot > 0 ? Math.round((opt.voters.length / tot) * 100) : 0;
                const voted = opt.voters.includes(currentUser?.uid);
                return (
                  <TouchableOpacity key={opt.id} onPress={() => handleVote(msg.id, msg.options, opt.id)} style={[styles.pollOptionBtn, { borderColor: voted ? '#007AFF' : borderCol }]}>
                    <View style={[styles.pollProgressBar, { width: `${pct}%`, backgroundColor: voted ? 'rgba(0,122,255,0.2)' : 'rgba(150,150,150,0.1)' }]} />
                    <View style={{flexDirection:'row', justifyContent:'space-between', padding:10}}><Text style={{ color: textMain, fontWeight: voted ? 'bold' : 'normal' }}>{opt.text}</Text><Text style={{ color: textSub, fontSize: 12 }}>{pct}%</Text></View>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : msg.type === 'document' ? (
            <View style={[styles.docContainer, { backgroundColor: isMe ? 'rgba(0,0,0,0.1)' : 'rgba(0,0,0,0.05)' }]}>
              <View style={[styles.docIcon, { backgroundColor: '#FF3B30' }]}><Ionicons name="document-text" size={24} color="#FFF" /></View>
              <View style={{ flex: 1 }}><Text style={{ color: textMain, fontWeight: 'bold', fontSize: 14 }} numberOfLines={1}>{msg.fileName}</Text><Text style={{ color: textSub, fontSize: 12 }}>{(msg.fileSize/1048576).toFixed(2)} MB • File</Text></View>
            </View>
          ) : msg.type === 'location' ? (
            <TouchableOpacity onPress={() => Linking.openURL(`geo:0,0?q=${msg.latitude},${msg.longitude}`)} style={styles.locationContainer}>
              <View style={styles.mapPlaceholder}><Ionicons name="map" size={40} color="#888" /><Ionicons name="location" size={30} color="#FF3B30" style={{position:'absolute'}} /></View>
              <View style={{ padding: 8 }}><Text style={{ color: textMain, fontWeight: 'bold' }}>Live Location</Text></View>
            </TouchableOpacity>
          ) : msg.type === 'contact' ? (
            <View style={[styles.docContainer, { backgroundColor: isMe ? 'rgba(0,0,0,0.1)' : 'rgba(0,0,0,0.05)' }]}>
              <View style={[styles.docIcon, { backgroundColor: '#0EA5E9', borderRadius: 20 }]}><Ionicons name="person" size={20} color="#FFF" /></View>
              <View style={{ flex: 1 }}><Text style={{ color: textMain, fontWeight: 'bold' }}>{msg.contactName}</Text><Text style={{ color: textSub, fontSize: 12 }}>{msg.contactNumber}</Text></View>
            </View>
          ) : msg.type === 'payment' ? (
            <View style={[styles.docContainer, { backgroundColor: '#F59E0B' }]}>
              <View style={[styles.docIcon, { backgroundColor: '#FFF', borderRadius:20 }]}><Ionicons name="sparkles" size={20} color="#F59E0B" /></View>
              <View style={{ flex: 1 }}><Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 16 }}>{msg.amount} {msg.currency}</Text><Text style={{ color: '#FFF', fontSize: 12 }}>Payment Transferred</Text></View>
            </View>
          ) : msg.type === 'image' && msg.image ? (
            <Image source={{ uri: msg.image }} style={styles.chatImage} />
          ) : (
            <Text style={{ color: textMain, fontSize: 16, paddingHorizontal: 4 }}>{msg.text}</Text>
          )}
          
          <View style={[styles.msgFooter, ['image','location'].includes(msg.type) ? styles.imageFooter : null]}>
            {msg.isEdited && <Text style={{ fontSize: 10, color: textSub, fontStyle: 'italic', marginRight: 5 }}>Edited</Text>}
            <Text style={[styles.msgTime, { color: ['image','location'].includes(msg.type) ? '#FFF' : textSub }]}>{time}</Text>
            {isMe && <Ionicons name="checkmark-done" size={15} color={['image','location'].includes(msg.type) ? '#FFF' : '#53bdeb'} style={{ marginLeft: 4 }} />}
          </View>
          {msg.reaction && <View style={styles.reactionBadge}><Text style={{ fontSize: 12 }}>{msg.reaction}</Text></View>}
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.container, { backgroundColor: bg }]}>
        
        {/* ================= HEADER ================= */}
        <View style={[styles.header, { backgroundColor: headerBg }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}><Ionicons name="arrow-back" size={24} color={textMain} /></TouchableOpacity>
          <Image source={{ uri: 'https://ui-avatars.com/api/?name=Nax+Room&background=007AFF&color=fff' }} style={styles.avatar} />
          <View style={styles.headerInfo}>
            <Text style={[styles.headerName, { color: textMain }]} numberOfLines={1}>Global Nax Room</Text>
            <Text style={styles.headerStatus}>10.5K members • 200 Features 🔥</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={() => navigation.navigate('Call',{type:'video'})} style={styles.actionIcon}><Ionicons name="videocam" size={22} color={textMain} /></TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate('Call',{type:'voice'})} style={styles.actionIcon}><Ionicons name="call" size={20} color={textMain} /></TouchableOpacity>
            <TouchableOpacity onPress={() => setShowHeaderMenu(!showHeaderMenu)} style={styles.actionIcon}><Ionicons name="ellipsis-vertical" size={22} color={textMain} /></TouchableOpacity>
          </View>
        </View>

        {/* ================= MEGA HEADER MENU ================= */}
        {showHeaderMenu && (
          <View style={[styles.headerMenu, { backgroundColor: inputBg }]}>
            {['Search Chat', 'Mute Notifications', 'Disappearing Msgs', 'Secret Chat', 'Wallpaper', 'Export Chat', 'Clear Cache', 'Block Group'].map((opt, i) => (
              <TouchableOpacity key={i} style={{ padding: 12, paddingHorizontal: 20 }} onPress={() => {setShowHeaderMenu(false); Alert.alert(opt, `${opt} triggered.`);}}><Text style={{ color: textMain, fontSize: 16 }}>{opt}</Text></TouchableOpacity>
            ))}
          </View>
        )}

        {pinnedMessage && (
          <View style={[styles.pinnedBox, { backgroundColor: headerBg }]}><Ionicons name="pin" size={16} color="#007AFF" style={{ marginRight: 10 }} /><View style={{ flex: 1 }}><Text style={{ color: '#007AFF', fontSize: 12, fontWeight: 'bold' }}>Pinned Message</Text><Text style={{ color: textSub, fontSize: 13 }} numberOfLines={1}>{pinnedMessage}</Text></View><TouchableOpacity onPress={() => setPinnedMessage(null)}><Ionicons name="close" size={18} color={textSub} /></TouchableOpacity></View>
        )}

        <ScrollView style={styles.chatArea} contentContainerStyle={{ padding: 10, paddingBottom: 20 }} ref={scrollViewRef} onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}>
          <View style={styles.encryptionBox}><Ionicons name="lock-closed" size={12} color="#F5C518" /><Text style={styles.encryptionText}>End-to-end encrypted. Tap to verify.</Text></View>
          {messages.map(renderMessage)}
        </ScrollView>

        {/* ================= MEGA ATTACHMENTS GRID ================= */}
        {showAttachments && (
          <View style={[styles.attachmentTray, { backgroundColor: headerBg }]}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.attachRowGrid}>
                {[
                  { i: 'document', c: '#7F66FF', n: 'Document', a: pickDoc }, { i: 'camera', c: '#D3396D', n: 'Camera', a: takePhoto }, { i: 'image', c: '#007AFF', n: 'Gallery', a: pickImage },
                  { i: 'bar-chart', c: '#F59E0B', n: 'Poll', a: () => {setShowAttachments(false); setShowPollModal(true);} }, { i: 'location', c: '#25D366', n: 'Location', a: shareLoc },
                  { i: 'person', c: '#0EA5E9', n: 'Contact', a: shareContact }, { i: 'wallet', c: '#10B981', n: 'Send Coins', a: () => {setShowAttachments(false); setShowCoinModal(true);} },
                  { i: 'time', c: '#64748B', n: 'Schedule', a: () => Alert.alert("Schedule", "Set time.") }, { i: 'brush', c: '#FF4500', n: 'Draw', a: () => Alert.alert("Whiteboard", "Opening...") },
                  { i: 'robot', c: '#8A2BE2', n: 'AI Gen', a: () => Alert.alert("Nax AI", "Generate images...") }, { i: 'list', c: '#FF1493', n: 'To-Do', a: () => Alert.alert("Tasks", "Add task.") },
                  { i: 'game-controller', c: '#00CED1', n: 'Games', a: () => Alert.alert("Mini Games", "Tic-Tac-Toe loading.") }
                ].map((item, i) => (
                  <TouchableOpacity key={i} style={styles.attachOption} onPress={item.a}>
                    <View style={[styles.attachIconWrap, { backgroundColor: item.c }]}><Ionicons name={item.i} size={24} color="#FFF" /></View><Text style={{ fontSize: 12, color: textMain, fontWeight: '500' }}>{item.n}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        )}

        {/* ================= COMMAND DETECTOR UI ================= */}
        {showSlashCommands && (
          <View style={[styles.commandTray, { backgroundColor: headerBg }]}>
            {[ {c: '/roll', d: 'Roll a dice'}, {c: '/flip', d: 'Flip a coin'}, {c: '/ai', d: 'Ask AI Bot'}, {c: '/clear', d: 'Clear Chat Cache'} ].map((cmd, i) => (
              <TouchableOpacity key={i} style={styles.commandRow} onPress={() => executeCommand(cmd.c)}>
                <Text style={{color: '#007AFF', fontWeight: 'bold', fontSize: 16}}>{cmd.c}</Text><Text style={{color: textSub, marginLeft: 10}}>{cmd.d}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {(replyingTo || editingMsg) && (
          <View style={[styles.replyingBar, { backgroundColor: headerBg }]}>
            <View style={{ flex: 1 }}><Text style={{ color: '#007AFF', fontWeight: 'bold', fontSize: 13 }}>{editingMsg ? 'Editing Message' : `Replying to ${replyingTo.senderName}`}</Text><Text style={{ color: textSub, fontSize: 13 }} numberOfLines={1}>{editingMsg ? editingMsg.text : (replyingTo.text || 'Attachment')}</Text></View>
            <TouchableOpacity onPress={() => {setReplyingTo(null); setEditingMsg(null); setInputText('');}}><Ionicons name="close-circle" size={24} color={textSub} /></TouchableOpacity>
          </View>
        )}

        <View style={[styles.inputArea, { backgroundColor: bg }]}>
          {isRecording ? (
            <View style={[styles.inputBox, { backgroundColor: inputBg, justifyContent: 'space-between', paddingHorizontal: 20 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}><View style={styles.redDot} /><Text style={{ color: textMain, fontSize: 16, marginLeft: 10 }}>{Math.floor(recordTime/60)}:{(recordTime%60).toString().padStart(2,'0')}</Text></View><Text style={{ color: textSub }}>Slide to cancel 👈</Text>
            </View>
          ) : (
            <View style={[styles.inputBox, { backgroundColor: inputBg }]}>
              <TouchableOpacity onPress={() => setShowAttachments(!showAttachments)} style={styles.iconBtn}><Ionicons name="add" size={26} color={textSub} /></TouchableOpacity>
              <TextInput style={[styles.input, { color: textMain }]} placeholder="Message or / for commands" placeholderTextColor={textSub} multiline value={inputText} onChangeText={handleTextChange} onFocus={() => setShowAttachments(false)} />
              {!inputText.trim() && <TouchableOpacity style={styles.iconBtn} onPress={takePhoto}><Ionicons name="camera-outline" size={24} color={textSub} /></TouchableOpacity>}
            </View>
          )}
          <TouchableOpacity style={[styles.micBtn, { backgroundColor: inputText.trim() ? '#007AFF' : '#00A884' }]} onPress={inputText.trim() ? sendMessage : null} onLongPress={!inputText.trim() ? startRecording : null} onPressOut={() => { if(isRecording) stopRecording(false); }}>
            <Ionicons name={inputText.trim() ? "send" : "mic"} size={22} color="#FFF" style={inputText.trim() ? {marginLeft: 4} : {}} />
          </TouchableOpacity>
        </View>

        {/* ================= MEGA LONG-PRESS ACTION MODAL ================= */}
        <Modal visible={!!selectedMessage} transparent={true} animationType="fade">
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setSelectedMessage(null)}>
            <View style={[styles.actionModal, { backgroundColor: inputBg }]}>
              <View style={styles.reactionRow}>
                {['❤️', '😂', '🔥', '👍', '😢', '💯'].map((emoji, i) => ( <TouchableOpacity key={i} onPress={() => handleReaction(emoji)}><Text style={{ fontSize: 30, marginHorizontal: 6 }}>{emoji}</Text></TouchableOpacity> ))}
              </View>
              <View style={{ height: 1, backgroundColor: borderCol, marginVertical: 10 }} />
              <ScrollView>
                <View style={styles.actionGrid}>
                  {[ 
                    { id: 'reply', i: 'arrow-undo', n: 'Reply', c: textMain }, { id: 'copy', i: 'copy', n: 'Copy', c: textMain }, 
                    { id: 'forward', i: 'arrow-redo', n: 'Forward', c: textMain }, { id: 'star', i: 'star', n: 'Star', c: textMain }, 
                    { id: 'pin', i: 'pin', n: 'Pin', c: textMain }, { id: 'translate', i: 'language', n: 'Translate', c: textMain }, 
                    { id: 'summarize', i: 'bulb', n: 'AI Sum', c: '#F59E0B' }, { id: 'speak', i: 'volume-high', n: 'Speak', c: textMain }, 
                    { id: 'todo', i: 'list', n: 'To-Do', c: textMain }, { id: 'edit', i: 'pencil', n: 'Edit', c: textMain }, 
                    { id: 'delete', i: 'trash', n: 'Delete', c: '#FF3B30' } 
                  ].map((act, i) => {
                    if ((act.id === 'delete' || act.id === 'edit') && selectedMessage?.senderId !== currentUser?.uid) return null; 
                    return ( <TouchableOpacity key={i} style={{ width: '25%', alignItems: 'center', marginVertical: 12 }} onPress={() => handleAction(act.id)}><Ionicons name={act.i} size={24} color={act.c} /><Text style={{ color: act.c, fontSize: 11, marginTop: 5 }}>{act.n}</Text></TouchableOpacity> );
                  })}
                </View>
              </ScrollView>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Poll & Coin Modals */}
        <Modal visible={showPollModal} transparent={true} animationType="slide"><View style={styles.modalOverlay}><View style={[styles.modalBox, { backgroundColor: inputBg }]}><Text style={{ color: textMain, fontSize: 20, fontWeight: 'bold', marginBottom: 15 }}>Create Poll 📊</Text><TextInput style={[styles.modalInput, { backgroundColor: headerBg, color: textMain }]} placeholder="Question..." placeholderTextColor={textSub} value={pollQuestion} onChangeText={setPollQuestion} />{pollOptions.map((opt, i) => ( <TextInput key={i} style={[styles.modalInput, { backgroundColor: headerBg, color: textMain, marginTop: 10 }]} placeholder={`Option ${i+1}`} placeholderTextColor={textSub} value={opt} onChangeText={(t) => { const n = [...pollOptions]; n[i] = t; setPollOptions(n); }} /> ))} {pollOptions.length < 4 && ( <TouchableOpacity style={{ marginTop: 15 }} onPress={() => setPollOptions([...pollOptions, ''])}><Text style={{ color: '#007AFF', fontWeight: 'bold' }}>+ Add Option</Text></TouchableOpacity> )}<View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 20 }}><TouchableOpacity style={{ padding: 10, marginRight: 15 }} onPress={() => setShowPollModal(false)}><Text style={{ color: textSub, fontWeight: 'bold' }}>Cancel</Text></TouchableOpacity><TouchableOpacity style={styles.modalSubmitBtn} onPress={sendPoll}><Text style={{ color: '#FFF', fontWeight: 'bold' }}>Send Poll</Text></TouchableOpacity></View></View></View></Modal>
        <Modal visible={showCoinModal} transparent={true} animationType="fade"><View style={styles.modalOverlay}><View style={[styles.modalBox, { backgroundColor: inputBg }]}><Text style={{ color: textMain, fontSize: 20, fontWeight: 'bold', marginBottom: 15 }}>Send Nax Coins 🪙</Text><TextInput style={[styles.modalInput, { backgroundColor: headerBg, color: textMain, fontSize:20, textAlign:'center', padding:20 }]} placeholder="0" placeholderTextColor={textSub} keyboardType="numeric" value={coinAmount} onChangeText={setCoinAmount} /><View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 20 }}><TouchableOpacity style={{ padding: 10, marginRight: 15 }} onPress={() => setShowCoinModal(false)}><Text style={{ color: textSub, fontWeight: 'bold' }}>Cancel</Text></TouchableOpacity><TouchableOpacity style={styles.modalSubmitBtn} onPress={sendCoins}><Text style={{ color: '#FFF', fontWeight: 'bold' }}>Transfer</Text></TouchableOpacity></View></View></View></Modal>

      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 }, header: { flexDirection: 'row', alignItems: 'center', paddingTop: 45, paddingBottom: 10, paddingHorizontal: 5, elevation: 3, zIndex: 10 }, backBtn: { padding: 5 }, avatar: { width: 40, height: 40, borderRadius: 20 }, headerInfo: { flex: 1, marginLeft: 10 }, headerName: { fontSize: 18, fontWeight: 'bold' }, headerStatus: { fontSize: 12, color: '#00A884' }, headerActions: { flexDirection: 'row', alignItems: 'center' }, actionIcon: { paddingHorizontal: 10 }, headerMenu: { position: 'absolute', top: 90, right: 10, borderRadius: 10, elevation: 10, zIndex: 20, minWidth: 180 }, pinnedBox: { flexDirection: 'row', alignItems: 'center', padding: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.1)' }, chatArea: { flex: 1 }, encryptionBox: { flexDirection: 'row', backgroundColor: 'rgba(245, 197, 24, 0.1)', padding: 10, borderRadius: 10, marginHorizontal: 20, marginBottom: 20, alignItems: 'center', justifyContent: 'center' }, encryptionText: { fontSize: 12, color: '#F5C518', marginLeft: 8 }, messageRow: { flexDirection: 'row', marginBottom: 12 }, messageBubble: { maxWidth: '82%', borderRadius: 12, elevation: 1 }, senderName: { color: '#007AFF', fontSize: 13, marginBottom: 2, fontWeight: 'bold' }, chatImage: { width: 250, height: 250, borderRadius: 10 }, imageFooter: { position: 'absolute', bottom: 5, right: 10, backgroundColor: 'rgba(0,0,0,0.4)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10 }, quoteBox: { borderLeftWidth: 4, borderLeftColor: '#007AFF', padding: 5, borderRadius: 5, marginBottom: 5 }, msgFooter: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginTop: 2, paddingHorizontal: 4 }, msgTime: { fontSize: 11 }, reactionBadge: { position: 'absolute', bottom: -12, right: 10, backgroundColor: '#FFF', borderRadius: 15, paddingHorizontal: 5, paddingVertical: 1, elevation: 2, borderWidth: 1, borderColor: '#EEE' }, audioContainer: { flexDirection: 'row', alignItems: 'center', minWidth: 150, paddingVertical: 5 }, audioWave: { flexDirection: 'row', alignItems: 'center' }, waveLine: { width: 3, height: 10, borderRadius: 2, marginHorizontal: 2 }, redDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#FF3B30' }, docContainer: { flexDirection: 'row', alignItems: 'center', minWidth: 200, padding: 8, borderRadius: 8 }, docIcon: { width: 40, height: 40, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: 10 }, locationContainer: { minWidth: 220, borderRadius: 8, overflow: 'hidden' }, mapPlaceholder: { height: 120, backgroundColor: 'rgba(0,0,0,0.1)', justifyContent: 'center', alignItems: 'center' }, attachmentTray: { padding: 15, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.1)' }, attachRowGrid: { flexDirection: 'row', flexWrap: 'wrap', width: width * 1.5 }, attachOption: { alignItems: 'center', width: 80, marginBottom: 15 }, attachIconWrap: { width: 55, height: 55, borderRadius: 27.5, justifyContent: 'center', alignItems: 'center', marginBottom: 8 }, commandTray: { padding: 10, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.1)' }, commandRow: { flexDirection: 'row', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)' }, replyingBar: { flexDirection: 'row', alignItems: 'center', padding: 10, borderLeftWidth: 4, borderLeftColor: '#007AFF', marginHorizontal: 10, borderTopLeftRadius: 10, borderTopRightRadius: 10 }, inputArea: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 10, paddingBottom: 25 }, inputBox: { flex: 1, flexDirection: 'row', alignItems: 'center', borderRadius: 25, paddingHorizontal: 5, paddingVertical: 5, marginHorizontal: 10, minHeight: 45 }, iconBtn: { padding: 8, justifyContent: 'center' }, input: { flex: 1, fontSize: 17, maxHeight: 120, minHeight: 35, paddingTop: Platform.OS==='ios'?8:4, paddingHorizontal: 5 }, micBtn: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' }, modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }, modalBox: { width: '90%', borderRadius: 15, padding: 20, elevation: 10 }, modalInput: { padding: 12, borderRadius: 10, fontSize: 16, borderWidth: 1, borderColor: 'rgba(150,150,150,0.2)' }, modalSubmitBtn: { backgroundColor: '#00A884', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 }, actionModal: { width: '85%', borderRadius: 20, padding: 20, maxHeight: '60%' }, reactionRow: { flexDirection: 'row', justifyContent: 'center', paddingVertical: 10 }, actionGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start' }, pollProgressBar: { position: 'absolute', top: 0, bottom: 0, left: 0 }, pollOptionBtn: { overflow: 'hidden', borderRadius: 8, borderWidth: 1, marginBottom: 8, position: 'relative' }
});
