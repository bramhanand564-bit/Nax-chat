import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Image,
  KeyboardAvoidingView, Platform, Alert, Modal, Linking, Dimensions, SafeAreaView
} from 'react-native';

import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
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

  // UI Modals & Menus
  const [showAttachments, setShowAttachments] = useState(false);
  const [showHeaderMenu, setShowHeaderMenu] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [replyingTo, setReplyingTo] = useState(null);
  const [editingMsg, setEditingMsg] = useState(null);
  const [pinnedMessage, setPinnedMessage] = useState('📌 Nax Super App: Water Bubble Engine 🌊');
  const [showSlashCommands, setShowSlashCommands] = useState(false);

  // Super App Modals
  const [showPollModal, setShowPollModal] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [showCoinModal, setShowCoinModal] = useState(false);
  const [coinAmount, setCoinAmount] = useState('');

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
  const bg = isDark ? '#0A1520' : '#E8F1F5'; // Soft deep water / Light fresh water
  const textMain = isDark ? '#F0F4F8' : '#1A2C3A';
  const textSub = isDark ? '#8AA2B5' : '#6A8296';
  
  // Glassmorphism Colors
  const glassPanelBg = isDark ? 'rgba(20, 35, 50, 0.75)' : 'rgba(255, 255, 255, 0.85)';
  const glassBorder = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.5)';
  
  const bubbleMe = isDark ? 'rgba(0, 130, 255, 0.25)' : 'rgba(0, 122, 255, 0.15)';
  const bubbleOther = isDark ? 'rgba(30, 45, 60, 0.8)' : 'rgba(255, 255, 255, 0.9)';
  const bubbleBorderMe = isDark ? 'rgba(0, 150, 255, 0.3)' : 'rgba(0, 122, 255, 0.3)';

  useEffect(() => {
    const q = query(collection(db, 'global_chats'), orderBy('createdAt', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => { unsubscribe(); if(timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const getMessageTime = (createdAt) => {
    if (!createdAt) return '...';
    try { return (typeof createdAt.toDate === 'function') ? createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : new Date(createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); } catch (e) { return '...'; }
  };

  // ================= SMART SLASH COMMANDS =================
  const handleTextChange = (text) => {
    setInputText(text);
    if (text === '/') { Haptics.selectionAsync().catch(()=>{}); setShowSlashCommands(true); } 
    else { setShowSlashCommands(false); }
  };

  const executeCommand = (cmd) => {
    setShowSlashCommands(false); setInputText('');
    if (cmd === '/roll') sendMedia('bot', { text: `🎲 Rolled a ${Math.floor(Math.random() * 6) + 1}` });
    else if (cmd === '/ai') Alert.alert('🤖 Nax AI', 'How can I help you today?');
    else if (cmd === '/split') Alert.alert('💸 Split Bill', 'WeChat Engine: Choose members to split the cost.');
    else if (cmd === '/cab') Alert.alert('🚕 Mini-Program', 'Loading Cab booking interface...');
  };

  // ================= CORE MESSAGING =================
  const sendMessage = async () => {
    if (!inputText.trim()) return;
    try {
      if (editingMsg) {
        await updateDoc(doc(db, 'global_chats', editingMsg.id), { text: inputText.trim(), isEdited: true });
        setEditingMsg(null);
      } else {
        await addDoc(collection(db, 'global_chats'), {
          text: inputText.trim(), senderEmail: currentUser?.email || 'Unknown', senderName: currentUser?.displayName || 'User', senderId: currentUser?.uid || null,
          type: 'text', reaction: null, replyTo: replyingTo ? replyingTo.text : null, replyToSender: replyingTo ? replyingTo.senderName : null, isEdited: false, createdAt: serverTimestamp()
        });
      }
      setInputText(''); setReplyingTo(null); setShowAttachments(false);
    } catch (error) {}
  };

  const sendMedia = async (type, data) => {
    try { setShowAttachments(false); await addDoc(collection(db, 'global_chats'), { ...data, senderEmail: currentUser?.email || 'Unknown', senderName: currentUser?.displayName || 'User', senderId: currentUser?.uid || null, type, createdAt: serverTimestamp() }); } catch (error) {}
  };

  // ================= MEDIA & ATTACHMENTS (WATER BUBBLE ICONS) =================
  const takePhoto = async () => { try { const p = await ImagePicker.requestCameraPermissionsAsync(); if(!p.granted) return; const r = await ImagePicker.launchCameraAsync({ base64: true, quality: 0.2 }); if(!r.canceled && r.assets?.[0]?.base64) await sendMedia('image', { image: `data:image/jpeg;base64,${r.assets[0].base64}` }); } catch(e){} };
  const pickImage = async () => { try { const r = await ImagePicker.launchImageLibraryAsync({ base64: true, quality: 0.2 }); if(!r.canceled && r.assets?.[0]?.base64) await sendMedia('image', { image: `data:image/jpeg;base64,${r.assets[0].base64}` }); } catch(e){} };
  const pickDoc = async () => { try { const r = await DocumentPicker.getDocumentAsync({}); if(!r.canceled && r.assets?.[0]) await sendMedia('document', { fileName: r.assets[0].name, fileSize: r.assets[0].size }); } catch(e){} };
  const shareLoc = async () => { try { const {status} = await Location.requestForegroundPermissionsAsync(); if(status==='granted'){ const l = await Location.getCurrentPositionAsync({}); await sendMedia('location', { latitude: l.coords.latitude, longitude: l.coords.longitude }); } } catch(e){} };
  const shareContact = async () => { try { const {status} = await Contacts.requestPermissionsAsync(); if(status==='granted'){ const r = await Contacts.getContactsAsync({ limit: 1 }); if(r.data?.length>0) await sendMedia('contact', { contactName: r.data[0].name, contactNumber: r.data[0].phoneNumbers?.[0]?.number||'N/A' }); } } catch(e){} };
  
  const sendCoins = async () => { if(!coinAmount.trim()) return; await sendMedia('payment', { amount: coinAmount.trim(), currency: 'Nax Coins' }); setShowCoinModal(false); setCoinAmount(''); };
  const sendPoll = async () => { if(!pollQuestion.trim()||pollOptions.some(o=>!o.trim())) return; const opts = pollOptions.map((o,i)=>({id:i.toString(), text:o.trim(), voters:[]})); await sendMedia('poll', { question: pollQuestion.trim(), options: opts }); setShowPollModal(false); setPollQuestion(''); setPollOptions(['','']); };

  // ================= VOICE RECORDING =================
  const startRecording = async () => { try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(()=>{}); const p = await Audio.requestPermissionsAsync(); if(!p.granted) return; await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true }); const r = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.LOW_QUALITY); setRecording(r.recording); setIsRecording(true); setRecordTime(0); timerRef.current = setInterval(()=>setRecordTime(prev=>prev+1), 1000); } catch(e){ setIsRecording(false); } };
  const stopRecording = async () => { if(!recording) return; try { setIsRecording(false); if(timerRef.current) clearInterval(timerRef.current); await recording.stopAndUnloadAsync(); const uri = recording.getURI(); setRecording(null); if(uri && recordTime>0) await sendMedia('audio', { audio: uri, duration: recordTime }); setRecordTime(0); } catch(e){ setIsRecording(false); } };
  const playAudio = async (uri, msgId) => { if(!uri) return; try { if(soundRef.current){ await soundRef.current.unloadAsync(); } const r = await Audio.Sound.createAsync({uri}); soundRef.current = r.sound; setPlayingAudioId(msgId); r.sound.setOnPlaybackStatusUpdate(s=>{ if(s.didJustFinish) setPlayingAudioId(null); }); await r.sound.playAsync(); } catch(e){ setPlayingAudioId(null); } };

  // ================= ACTIONS & REACTIONS =================
  const handleAction = async (action) => {
    if (!selectedMessage) return;
    Haptics.selectionAsync().catch(()=>{});
    try {
      if (action === 'copy') Alert.alert('Copied', 'Text copied successfully.');
      else if (action === 'reply') setReplyingTo(selectedMessage);
      else if (action === 'pin') setPinnedMessage(selectedMessage.text || 'Media Item');
      else if (action === 'edit') { setInputText(selectedMessage.text || ''); setEditingMsg(selectedMessage); }
      else if (action === 'delete') await deleteDoc(doc(db, 'global_chats', selectedMessage.id));
      else if (action === 'translate') Alert.alert('🌐 Translate', 'Translating to your native language...');
      else if (action === 'silent') Alert.alert('🔕 Silent Mode', 'Message delivered without sound.');
      else if (action === 'bomb') Alert.alert('💣 View Once', 'Message set to destroy after reading.');
      else if (action === 'forward') Alert.alert('➡️ Forward', 'Select contacts to forward to.');
    } catch (e) {}
    setSelectedMessage(null);
  };

  const handleReaction = async (emoji) => { if(!selectedMessage) return; try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(()=>{}); await updateDoc(doc(db, 'global_chats', selectedMessage.id), { reaction: emoji }); } catch(e){} setSelectedMessage(null); };
  const handleVote = async (msgId, opts, optId) => { if(!currentUser?.uid) return; try { const updated = (opts||[]).map(o=>{ const v=(o.voters||[]).filter(uid=>uid!==currentUser.uid); if(o.id===optId) v.push(currentUser.uid); return {...o, voters:v}; }); await updateDoc(doc(db, 'global_chats', msgId), { options: updated }); } catch(e){} };

  // ================= GLASS BUBBLE RENDERER =================
  const renderMessage = (msg) => {
    const isMe = msg.senderId === currentUser?.uid;
    const time = getMessageTime(msg.createdAt);
    const mType = msg.type || 'text';
    const noPadTypes = ['image', 'location', 'contact', 'payment'];

    return (
      <View key={msg.id} style={[styles.messageRow, { justifyContent: isMe ? 'flex-end' : 'flex-start' }]}>
        <TouchableOpacity 
          activeOpacity={0.8} 
          onLongPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(()=>{}); setSelectedMessage(msg); }} 
          style={[styles.messageBubble, { 
            backgroundColor: isMe ? bubbleMe : bubbleOther, 
            borderColor: isMe ? bubbleBorderMe : glassBorder,
            borderBottomRightRadius: isMe ? 5 : 24,
            borderBottomLeftRadius: isMe ? 24 : 5,
            padding: noPadTypes.includes(mType) ? 5 : 12 
          }]}
        >
          
          {!isMe && !['image', 'location', 'bot'].includes(mType) && ( <Text style={[styles.senderName, { color: isDark ? '#4AB5FF' : '#0056B3' }]}>{msg.senderName || 'User'}</Text> )}

          {/* Quoted Message */}
          {msg.replyTo && (
            <View style={[styles.quoteBox, { backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,100,255,0.05)', borderColor: isDark ? '#4AB5FF' : '#007AFF' }]}>
              <Text style={{ color: isDark ? '#4AB5FF' : '#007AFF', fontSize: 12, fontWeight: 'bold' }}>{msg.replyToSender || 'User'}</Text>
              <Text style={{ color: textSub, fontSize: 13 }} numberOfLines={2}>{msg.replyTo}</Text>
            </View>
          )}

          {/* Type Logic */}
          {mType === 'bot' ? ( <Text style={{ color: '#10B981', fontSize: 16, fontWeight: 'bold' }}>🤖 {msg.text}</Text> ) :
           mType === 'audio' ? (
            <View style={styles.audioContainer}>
              <TouchableOpacity onPress={() => playAudio(msg.audio, msg.id)} style={styles.playBtn}><Ionicons name={playingAudioId === msg.id ? 'pause' : 'play'} size={24} color={isMe ? '#007AFF' : textMain} /></TouchableOpacity>
              <View style={styles.audioWave}>{[12, 20, 15, 24, 10].map((h, i) => ( <View key={i} style={[styles.waveLine, { height: h, backgroundColor: isMe ? '#007AFF' : textSub }]} /> ))}</View>
              <Text style={{ color: isMe ? '#007AFF' : textMain, marginLeft: 10, fontSize: 13, fontWeight: '500' }}>{`${Math.floor((msg.duration||0)/60)}:${((msg.duration||0)%60).toString().padStart(2,'0')}`}</Text>
            </View>
          ) : mType === 'poll' ? (
            <View style={{ minWidth: 220, paddingVertical: 5 }}>
              <Text style={{ color: textMain, fontSize: 16, fontWeight: 'bold', marginBottom: 12 }}>📊 {msg.question}</Text>
              {(msg.options || []).map((opt) => {
                const total = (msg.options||[]).reduce((s, i) => s + (i.voters||[]).length, 0); const pct = total>0 ? Math.round(((opt.voters||[]).length/total)*100) : 0; const voted = (opt.voters||[]).includes(currentUser?.uid);
                return ( <TouchableOpacity key={opt.id} onPress={()=>handleVote(msg.id, msg.options, opt.id)} style={[styles.pollOptionBtn, { borderColor: voted ? '#007AFF' : glassBorder }]}><View style={[styles.pollProgressBar, { width: `${pct}%`, backgroundColor: voted ? 'rgba(0,122,255,0.2)' : 'rgba(150,150,150,0.1)' }]} /><View style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 12 }}><Text style={{ color: textMain, fontWeight: voted ? 'bold' : 'normal' }}>{opt.text}</Text><Text style={{ color: textSub, fontSize: 12 }}>{pct}%</Text></View></TouchableOpacity> );
              })}
            </View>
          ) : mType === 'document' ? (
            <View style={[styles.docContainer, { backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.05)' }]}><View style={[styles.docIcon, { backgroundColor: '#FF3B30' }]}><Ionicons name="document-text" size={24} color="#FFF" /></View><View style={{ flex: 1 }}><Text style={{ color: textMain, fontWeight: 'bold', fontSize: 14 }} numberOfLines={1}>{msg.fileName}</Text><Text style={{ color: textSub, fontSize: 12 }}>{((msg.fileSize||0)/1048576).toFixed(2)} MB</Text></View></View>
          ) : mType === 'location' ? (
            <TouchableOpacity onPress={() => Linking.openURL(`geo:0,0?q=${msg.latitude},${msg.longitude}`).catch(()=>{})} style={styles.locationContainer}><View style={styles.mapPlaceholder}><Ionicons name="map" size={40} color="#888" /><Ionicons name="location" size={30} color="#FF3B30" style={{ position: 'absolute' }} /></View><View style={{ padding: 10 }}><Text style={{ color: textMain, fontWeight: 'bold' }}>Live Location</Text></View></TouchableOpacity>
          ) : mType === 'contact' ? (
            <View style={[styles.docContainer, { backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.05)' }]}><View style={[styles.docIcon, { backgroundColor: '#0EA5E9' }]}><Ionicons name="person" size={24} color="#FFF" /></View><View style={{ flex: 1 }}><Text style={{ color: textMain, fontWeight: 'bold' }}>{msg.contactName}</Text><Text style={{ color: textSub, fontSize: 12 }}>{msg.contactNumber}</Text></View></View>
          ) : mType === 'payment' ? (
            <View style={[styles.docContainer, { backgroundColor: 'rgba(245, 158, 11, 0.15)', borderColor: '#F59E0B', borderWidth: 1 }]}><View style={[styles.docIcon, { backgroundColor: '#F59E0B' }]}><FontAwesome5 name="coins" size={20} color="#FFF" /></View><View style={{ flex: 1 }}><Text style={{ color: textMain, fontWeight: 'bold', fontSize: 16 }}>{msg.amount} {msg.currency}</Text><Text style={{ color: textSub, fontSize: 12 }}>Nax Transfer</Text></View></View>
          ) : mType === 'image' && msg.image ? (
            <Image source={{ uri: msg.image }} style={styles.chatImage} />
          ) : (
            <Text style={{ color: textMain, fontSize: 16, lineHeight: 22 }}>{msg.text}</Text>
          )}

          {/* Time & Ticks */}
          <View style={[styles.msgFooter, noPadTypes.includes(mType) ? styles.imageFooter : null]}>
            {msg.isEdited && ( <Text style={{ fontSize: 10, color: textSub, fontStyle: 'italic', marginRight: 5 }}>Edited</Text> )}
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
          <Image source={{ uri: 'https://ui-avatars.com/api/?name=Super+App&background=007AFF&color=fff' }} style={styles.avatar} />
          <View style={styles.headerInfo}>
            <Text style={[styles.headerName, { color: textMain }]} numberOfLines={1}>Global Super App</Text>
            <Text style={styles.headerStatus}>Ultra Mode Active • Telegram + WeChat</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={() => Alert.alert('Call', 'HD Video Calling initiated.')} style={styles.actionIcon}><Ionicons name="videocam-outline" size={26} color={textMain} /></TouchableOpacity>
            <TouchableOpacity onPress={() => setShowHeaderMenu(!showHeaderMenu)} style={styles.actionIcon}><Ionicons name="ellipsis-horizontal-circle-outline" size={26} color={textMain} /></TouchableOpacity>
          </View>
        </View>

        {/* Header Options */}
        {showHeaderMenu && (
          <View style={[styles.headerMenu, { backgroundColor: glassPanelBg, borderColor: glassBorder }]}>
            {['Search', 'Secret Chat 🔒', 'Mute Notifications', 'Wallpapers', 'Chat Folders', 'Export'].map((option, index) => (
              <TouchableOpacity key={index} style={styles.menuOption} onPress={() => { setShowHeaderMenu(false); Alert.alert(option, `${option} settings opened.`); }}>
                <Text style={{ color: textMain, fontSize: 16 }}>{option}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {pinnedMessage && (
          <View style={[styles.pinnedBox, { backgroundColor: glassPanelBg, borderColor: glassBorder }]}>
            <Ionicons name="pin" size={18} color="#007AFF" style={{ marginRight: 12 }} />
            <View style={{ flex: 1 }}><Text style={{ color: '#007AFF', fontSize: 12, fontWeight: 'bold', marginBottom: 2 }}>Pinned</Text><Text style={{ color: textSub, fontSize: 13 }} numberOfLines={1}>{pinnedMessage}</Text></View>
            <TouchableOpacity onPress={() => setPinnedMessage(null)}><Ionicons name="close-circle" size={20} color={textSub} /></TouchableOpacity>
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
                { i: 'document-text', c: '#8B5CF6', n: 'File (2GB)', a: pickDoc }, { i: 'camera', c: '#EC4899', n: 'Camera', a: takePhoto }, { i: 'image', c: '#3B82F6', n: 'Gallery', a: pickImage },
                { i: 'pie-chart', c: '#F59E0B', n: 'Live Poll', a: () => { setShowAttachments(false); setShowPollModal(true); } }, { i: 'location', c: '#10B981', n: 'Location', a: shareLoc },
                { i: 'person', c: '#06B6D4', n: 'Contact', a: shareContact }, { i: 'wallet', c: '#F59E0B', n: 'Nax Pay', a: () => { setShowAttachments(false); setShowCoinModal(true); } },
                { i: 'time', c: '#64748B', n: 'Schedule', a: () => Alert.alert('Schedule', 'Telegram: Set future time.') }, { i: 'car', c: '#EF4444', n: 'Cab', a: () => Alert.alert('WeChat', 'Opening Cab Mini-Program') }
              ].map((item, index) => (
                <TouchableOpacity key={index} style={styles.attachOption} onPress={item.a}>
                  <View style={[styles.attachIconWrap, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#FFF', borderColor: glassBorder }]}><Ionicons name={item.i} size={28} color={item.c} /></View>
                  <Text style={{ fontSize: 13, color: textMain, fontWeight: '500' }}>{item.n}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Commands / Auto-Suggest */}
        {showSlashCommands && (
          <View style={[styles.commandTray, { backgroundColor: glassPanelBg, borderTopColor: glassBorder }]}>
            {[ { c: '/ai', d: 'Ask Nax Bot' }, { c: '/split', d: 'Split Restaurant Bill' }, { c: '/silent', d: 'Send without sound' }, { c: '/roll', d: 'Roll Dice' } ].map((cmd, index) => (
              <TouchableOpacity key={index} style={styles.commandRow} onPress={() => executeCommand(cmd.c)}>
                <View style={styles.cmdBadge}><Text style={{ color: '#FFF', fontWeight: 'bold' }}>{cmd.c}</Text></View><Text style={{ color: textMain, marginLeft: 12, fontSize: 15 }}>{cmd.d}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Reply/Edit Bar */}
        {(replyingTo || editingMsg) && (
          <View style={[styles.replyingBar, { backgroundColor: glassPanelBg, borderTopColor: glassBorder }]}>
            <View style={styles.replyLeftBar} />
            <View style={{ flex: 1, paddingLeft: 10 }}>
              <Text style={{ color: '#007AFF', fontWeight: 'bold', fontSize: 13, marginBottom: 2 }}>{editingMsg ? 'Editing Message' : `Replying to ${replyingTo?.senderName || 'User'}`}</Text>
              <Text style={{ color: textSub, fontSize: 13 }} numberOfLines={1}>{editingMsg ? editingMsg.text : replyingTo?.text || 'Media Attachment'}</Text>
            </View>
            <TouchableOpacity onPress={() => { setReplyingTo(null); setEditingMsg(null); setInputText(''); }} style={{ padding: 5 }}><Ionicons name="close-circle" size={24} color={textSub} /></TouchableOpacity>
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
              <TextInput style={[styles.input, { color: textMain }]} placeholder="Message or type /" placeholderTextColor={textSub} multiline value={inputText} onChangeText={handleTextChange} onFocus={() => setShowAttachments(false)} />
              {!inputText.trim() && ( <TouchableOpacity style={styles.iconBtn} onPress={takePhoto}><Ionicons name="camera" size={26} color={textSub} /></TouchableOpacity> )}
            </View>
          )}

          <TouchableOpacity style={[styles.micBtn, { backgroundColor: inputText.trim() ? '#007AFF' : '#10B981', shadowColor: inputText.trim() ? '#007AFF' : '#10B981' }]} onPress={inputText.trim() ? sendMessage : undefined} onLongPress={!inputText.trim() ? startRecording : undefined} onPressOut={() => { if (isRecording) stopRecording(); }}>
            <Ionicons name={inputText.trim() ? 'send' : 'mic'} size={22} color="#FFF" style={inputText.trim() ? { marginLeft: 4 } : {}} />
          </TouchableOpacity>
        </View>

        {/* ================= LONG PRESS / SUPER APP MODALS ================= */}
        <Modal visible={!!selectedMessage} transparent animationType="fade" onRequestClose={() => setSelectedMessage(null)}>
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setSelectedMessage(null)}>
            <View style={[styles.actionModal, { backgroundColor: glassPanelBg, borderColor: glassBorder }]}>
              
              {/* Reactions */}
              <View style={styles.reactionRow}>
                {['❤️', '😂', '🔥', '👍', '🙏', '🤯'].map((emoji, index) => ( <TouchableOpacity key={index} onPress={() => handleReaction(emoji)} style={styles.reactionEmojiBg}><Text style={{ fontSize: 28 }}>{emoji}</Text></TouchableOpacity> ))}
              </View>
              
              {/* Action Grid */}
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.actionGrid}>
                  {[
                    { id: 'reply', i: 'arrow-undo', n: 'Reply', c: textMain }, { id: 'copy', i: 'copy', n: 'Copy', c: textMain },
                    { id: 'forward', i: 'arrow-redo', n: 'Forward', c: textMain }, { id: 'star', i: 'star', n: 'Save', c: textMain },
                    { id: 'pin', i: 'pin', n: 'Pin', c: textMain }, { id: 'translate', i: 'language', n: 'Translate', c: textMain },
                    { id: 'summarize', i: 'flask', n: 'AI Sum', c: '#8B5CF6' }, { id: 'bomb', i: 'flame', n: 'View Once', c: '#F59E0B' },
                    { id: 'todo', i: 'list', n: 'To-Do', c: textMain }, { id: 'edit', i: 'pencil', n: 'Edit', c: textMain },
                    { id: 'delete', i: 'trash', n: 'Delete', c: '#EF4444' }
                  ].map((action, index) => {
                    if ((action.id === 'delete' || action.id === 'edit') && selectedMessage?.senderId !== currentUser?.uid) { return null; }
                    return ( <TouchableOpacity key={index} style={styles.actionGridItem} onPress={() => handleAction(action.id)}><View style={[styles.actionIconBg, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)' }]}><Ionicons name={action.i} size={22} color={action.c} /></View><Text style={{ color: action.c, fontSize: 12, marginTop: 6, fontWeight: '500' }}>{action.n}</Text></TouchableOpacity> );
                  })}
                </View>
              </ScrollView>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Modals for Polls and Coins */}
        <Modal visible={showPollModal} transparent animationType="slide" onRequestClose={() => setShowPollModal(false)}><View style={styles.modalOverlay}><View style={[styles.modalBox, { backgroundColor: glassPanelBg, borderColor: glassBorder }]}><Text style={{ color: textMain, fontSize: 20, fontWeight: 'bold', marginBottom: 15 }}>Create Live Poll 📊</Text><TextInput style={[styles.modalInput, { backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : '#FFF', color: textMain, borderColor: glassBorder }]} placeholder="Ask a question..." placeholderTextColor={textSub} value={pollQuestion} onChangeText={setPollQuestion} />{pollOptions.map((option, index) => (<TextInput key={index} style={[styles.modalInput, { backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : '#FFF', color: textMain, marginTop: 10, borderColor: glassBorder }]} placeholder={`Option ${index + 1}`} placeholderTextColor={textSub} value={option} onChangeText={(text) => { const updated = [...pollOptions]; updated[index] = text; setPollOptions(updated); }} />))}{pollOptions.length < 4 && ( <TouchableOpacity style={{ marginTop: 15 }} onPress={() => setPollOptions([...pollOptions, ''])}><Text style={{ color: '#007AFF', fontWeight: 'bold', fontSize: 15 }}>+ Add Option</Text></TouchableOpacity> )}<View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 25 }}><TouchableOpacity style={{ padding: 12, marginRight: 10 }} onPress={() => setShowPollModal(false)}><Text style={{ color: textSub, fontWeight: 'bold', fontSize: 16 }}>Cancel</Text></TouchableOpacity><TouchableOpacity style={styles.modalSubmitBtn} onPress={sendPoll}><Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 16 }}>Send Poll</Text></TouchableOpacity></View></View></View></Modal>
        <Modal visible={showCoinModal} transparent animationType="fade" onRequestClose={() => setShowCoinModal(false)}><View style={styles.modalOverlay}><View style={[styles.modalBox, { backgroundColor: glassPanelBg, borderColor: glassBorder }]}><Text style={{ color: textMain, fontSize: 20, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' }}>Nax Pay / WeChat Coins</Text><Text style={{ color: textSub, textAlign: 'center', marginBottom: 20 }}>Send money seamlessly in chat.</Text><TextInput style={[styles.modalInput, { backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : '#FFF', color: textMain, fontSize: 28, textAlign: 'center', padding: 25, borderColor: glassBorder }]} placeholder="0.00" placeholderTextColor={textSub} keyboardType="numeric" value={coinAmount} onChangeText={setCoinAmount} /><View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 25 }}><TouchableOpacity style={{ padding: 12, marginRight: 10 }} onPress={() => setShowCoinModal(false)}><Text style={{ color: textSub, fontWeight: 'bold', fontSize: 16 }}>Cancel</Text></TouchableOpacity><TouchableOpacity style={[styles.modalSubmitBtn, { backgroundColor: '#F59E0B' }]} onPress={sendCoins}><Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 16 }}>Transfer</Text></TouchableOpacity></View></View></View></Modal>

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
  headerName: { fontSize: 18, fontWeight: '700', letterSpacing: 0.3 }, 
  headerStatus: { fontSize: 12, color: '#8AA2B5', fontWeight: '500', marginTop: 2 }, 
  headerActions: { flexDirection: 'row', alignItems: 'center' }, 
  actionIcon: { padding: 8, marginLeft: 5 }, 
  headerMenu: { position: 'absolute', top: 100, right: 15, borderRadius: 16, borderWidth: 1, elevation: 15, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20, zIndex: 20, minWidth: 200, overflow: 'hidden' }, 
  menuOption: { paddingVertical: 14, paddingHorizontal: 20, borderBottomWidth: 0.5, borderBottomColor: 'rgba(150,150,150,0.1)' },
  pinnedBox: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 15, borderBottomWidth: 1 }, 
  chatArea: { flex: 1 }, 
  encryptionBox: { flexDirection: 'row', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20, marginHorizontal: 'auto', alignSelf: 'center', marginBottom: 20, alignItems: 'center', borderWidth: 1 }, 
  encryptionText: { fontSize: 11, marginLeft: 6, fontWeight: '500' }, 
  messageRow: { flexDirection: 'row', marginBottom: 15 }, 
  messageBubble: { maxWidth: '82%', borderRadius: 24, borderWidth: 1 }, 
  senderName: { fontSize: 13, marginBottom: 4, fontWeight: '700', letterSpacing: 0.2 }, 
  chatImage: { width: 260, height: 260, borderRadius: 18 }, 
  imageFooter: { position: 'absolute', bottom: 8, right: 12, backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 }, 
  quoteBox: { borderLeftWidth: 3, padding: 8, borderRadius: 10, marginBottom: 8, borderWidth: 1 }, 
  msgFooter: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginTop: 4, paddingHorizontal: 4 }, 
  msgTime: { fontSize: 10, fontWeight: '500' }, 
  reactionBadge: { position: 'absolute', bottom: -14, right: 10, borderRadius: 20, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 }, 
  audioContainer: { flexDirection: 'row', alignItems: 'center', minWidth: 180, paddingVertical: 5 }, 
  playBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.8)', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  audioWave: { flexDirection: 'row', alignItems: 'center' }, 
  waveLine: { width: 3.5, borderRadius: 2, marginHorizontal: 2.5 }, 
  redDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#FF3B30' }, 
  docContainer: { flexDirection: 'row', alignItems: 'center', minWidth: 220, padding: 10, borderRadius: 16 }, 
  docIcon: { width: 46, height: 46, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 12 }, 
  locationContainer: { minWidth: 240, borderRadius: 18, overflow: 'hidden' }, 
  mapPlaceholder: { height: 130, backgroundColor: 'rgba(0,0,0,0.05)', justifyContent: 'center', alignItems: 'center' }, 
  attachmentTray: { paddingVertical: 20, borderTopWidth: 1 }, 
  attachRowGrid: { flexDirection: 'row', flexWrap: 'wrap', width: width * 1.8 }, 
  attachOption: { alignItems: 'center', width: 85, marginBottom: 20 }, 
  attachIconWrap: { width: 60, height: 60, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginBottom: 10, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 8 }, 
  commandTray: { padding: 10, borderTopWidth: 1 }, 
  commandRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(150,150,150,0.1)' }, 
  cmdBadge: { backgroundColor: '#007AFF', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  replyingBar: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 15, borderTopWidth: 1 }, 
  replyLeftBar: { width: 4, height: '100%', backgroundColor: '#007AFF', borderRadius: 2 },
  inputArea: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 12, paddingVertical: 10, paddingBottom: Platform.OS === 'ios' ? 25 : 15 }, 
  inputBox: { flex: 1, flexDirection: 'row', alignItems: 'flex-end', borderRadius: 28, paddingHorizontal: 5, paddingVertical: 5, marginHorizontal: 10, minHeight: 50, borderWidth: 1 }, 
  iconBtn: { padding: 8, justifyContent: 'center', marginBottom: 2 }, 
  input: { flex: 1, fontSize: 16, maxHeight: 120, minHeight: 40, paddingTop: Platform.OS === 'ios' ? 12 : 8, paddingBottom: Platform.OS === 'ios' ? 12 : 8, paddingHorizontal: 10 }, 
  micBtn: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginBottom: 2, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 6, elevation: 5 }, 
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' }, 
  modalBox: { width: '88%', borderRadius: 24, padding: 25, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.15, shadowRadius: 20, elevation: 10 }, 
  modalInput: { padding: 16, borderRadius: 16, fontSize: 16, borderWidth: 1 }, 
  modalSubmitBtn: { backgroundColor: '#007AFF', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 }, 
  actionModal: { width: '90%', borderRadius: 28, padding: 20, maxHeight: '65%', borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 30, elevation: 15 }, 
  reactionRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, paddingHorizontal: 5 }, 
  reactionEmojiBg: { padding: 8, borderRadius: 20, backgroundColor: 'rgba(150,150,150,0.1)' },
  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start', marginTop: 10 }, 
  actionGridItem: { width: '25%', alignItems: 'center', marginVertical: 12 }, 
  actionIconBg: { width: 48, height: 48, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  pollProgressBar: { position: 'absolute', top: 0, bottom: 0, left: 0 }, 
  pollOptionBtn: { overflow: 'hidden', borderRadius: 14, borderWidth: 1, marginBottom: 10, position: 'relative' }
});
