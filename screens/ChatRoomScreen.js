import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Image, KeyboardAvoidingView, Platform, Alert, Modal, Clipboard } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import * as ImagePicker from 'expo-image-picker'; 
import { Audio } from 'expo-av'; // 🔴 NEW: Audio Engine

import { db, auth } from '../firebaseConfig';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, doc, deleteDoc, updateDoc } from 'firebase/firestore';

export default function ChatRoomScreen({ route, navigation }) {
  const { isDark } = useTheme();
  
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  
  const [showAttachments, setShowAttachments] = useState(false);
  const [showHeaderMenu, setShowHeaderMenu] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [replyingTo, setReplyingTo] = useState(null);
  const [pinnedMessage, setPinnedMessage] = useState("Welcome to Global Nax Room!");
  
  // Poll States
  const [showPollModal, setShowPollModal] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);

  // 🔴 NEW: Audio States
  const [recording, setRecording] = useState();
  const [isRecording, setIsRecording] = useState(false);
  const [recordTime, setRecordTime] = useState(0);
  const timerRef = useRef(null);
  const [playingAudioId, setPlayingAudioId] = useState(null);
  const soundRef = useRef(null);

  const scrollViewRef = useRef();
  const currentUser = auth.currentUser;

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
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMessages(msgs);
    });
    return unsubscribe;
  }, []);

  // ================= AUDIO RECORDING SYSTEM =================
  const startRecording = async () => {
    try {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.LOW_QUALITY);
      setRecording(recording);
      setIsRecording(true);
      setRecordTime(0);
      setShowAttachments(false);
      
      timerRef.current = setInterval(() => {
        setRecordTime(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Failed to start recording', err);
    }
  };

  const stopRecording = async () => {
    if (!recording) return;
    setIsRecording(false);
    clearInterval(timerRef.current);
    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();
    setRecording(undefined);

    if (recordTime > 0) {
      await addDoc(collection(db, 'global_chats'), {
        text: '', audio: uri, duration: recordTime, senderEmail: currentUser?.email, senderName: currentUser?.displayName, senderId: currentUser?.uid, type: 'audio', createdAt: serverTimestamp()
      });
    }
    setRecordTime(0);
  };

  const playAudio = async (uri, msgId) => {
    try {
      if (soundRef.current) await soundRef.current.unloadAsync();
      const { sound } = await Audio.Sound.createAsync({ uri });
      soundRef.current = sound;
      setPlayingAudioId(msgId);
      await sound.playAsync();
      
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.didJustFinish) setPlayingAudioId(null);
      });
    } catch (error) {
      Alert.alert("Playback Error", "Could not play this audio.");
      setPlayingAudioId(null);
    }
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // ================= TEXT, IMAGE, POLL LOGIC =================
  const pickImage = async () => {
    setShowAttachments(false);
    let result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, quality: 0.2, base64: true });
    if (!result.canceled) sendMediaMessage(`data:image/jpeg;base64,${result.assets[0].base64}`);
  };

  const takePhoto = async () => {
    setShowAttachments(false);
    let result = await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.2, base64: true });
    if (!result.canceled) sendMediaMessage(`data:image/jpeg;base64,${result.assets[0].base64}`);
  };

  const sendMediaMessage = async (base64Image) => {
    await addDoc(collection(db, 'global_chats'), {
      text: '', image: base64Image, senderEmail: currentUser?.email, senderName: currentUser?.displayName, senderId: currentUser?.uid, type: 'image', createdAt: serverTimestamp()
    });
  };

  const sendMessage = async () => {
    if (inputText.trim() === '') return;
    const textToSend = inputText;
    setInputText(''); setShowAttachments(false);
    await addDoc(collection(db, 'global_chats'), {
      text: textToSend, image: null, senderEmail: currentUser?.email, senderName: currentUser?.displayName, senderId: currentUser?.uid, type: 'text', reaction: null, replyTo: replyingTo ? replyingTo.text : null, replyToSender: replyingTo ? replyingTo.senderName : null, createdAt: serverTimestamp()
    });
    setReplyingTo(null);
  };

  const sendPoll = async () => {
    if (!pollQuestion.trim() || pollOptions.some(opt => !opt.trim())) return Alert.alert("Incomplete", "Please enter a question and all options.");
    setShowPollModal(false); setShowAttachments(false);
    const formattedOptions = pollOptions.map((opt, index) => ({ id: index.toString(), text: opt, voters: [] }));
    await addDoc(collection(db, 'global_chats'), {
      type: 'poll', question: pollQuestion, options: formattedOptions, senderEmail: currentUser?.email, senderName: currentUser?.displayName, senderId: currentUser?.uid, createdAt: serverTimestamp()
    });
    setPollQuestion(''); setPollOptions(['', '']);
  };

  const handleVote = async (msgId, currentOptions, selectedOptionId) => {
    const updatedOptions = currentOptions.map(opt => {
      const filteredVoters = opt.voters.filter(uid => uid !== currentUser.uid);
      if (opt.id === selectedOptionId) filteredVoters.push(currentUser.uid);
      return { ...opt, voters: filteredVoters };
    });
    await updateDoc(doc(db, 'global_chats', msgId), { options: updatedOptions });
  };

  const handleDelete = async () => { if (selectedMessage) { await deleteDoc(doc(db, 'global_chats', selectedMessage.id)); setSelectedMessage(null); } };
  const handleAction = (action) => {
    if (action === 'copy') Clipboard.setString(selectedMessage.text);
    else if (action === 'reply') setReplyingTo(selectedMessage);
    else if (action === 'pin') setPinnedMessage(selectedMessage.text || 'Pinned Item');
    setSelectedMessage(null);
  };
  const handleReaction = async (emoji) => { if (selectedMessage) { await updateDoc(doc(db, 'global_chats', selectedMessage.id), { reaction: emoji }); setSelectedMessage(null); } };

  // ================= RENDER MESSAGES =================
  const renderMessage = (msg) => {
    const isMe = msg.senderId === currentUser?.uid;
    const msgTime = msg.createdAt ? new Date(msg.createdAt.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '...';
    
    return (
      <View key={msg.id} style={[styles.messageRow, { justifyContent: isMe ? 'flex-end' : 'flex-start' }]}>
        <TouchableOpacity activeOpacity={0.8} onLongPress={() => setSelectedMessage(msg)} style={[styles.messageBubble, { backgroundColor: isMe ? myMsgBg : otherMsgBg, padding: msg.type === 'image' ? 4 : 8 }]}>
          
          {!isMe && msg.type !== 'image' && <Text style={styles.senderName}>{msg.senderName || 'User'}</Text>}
          
          {msg.replyTo && (
            <View style={[styles.quoteBox, { backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.05)' }]}>
              <Text style={{ color: '#007AFF', fontSize: 12, fontWeight: 'bold' }}>{msg.replyToSender}</Text>
              <Text style={{ color: textSub, fontSize: 13 }} numberOfLines={2}>{msg.replyTo}</Text>
            </View>
          )}

          {/* Type: AUDIO */}
          {msg.type === 'audio' ? (
            <View style={styles.audioContainer}>
              <TouchableOpacity onPress={() => playAudio(msg.audio, msg.id)} style={styles.playBtn}>
                <Ionicons name={playingAudioId === msg.id ? "pause" : "play"} size={24} color={isMe ? '#FFF' : '#00A884'} />
              </TouchableOpacity>
              <View style={styles.audioWave}>
                <View style={[styles.waveLine, { backgroundColor: isMe ? '#FFF' : '#00A884' }]} />
                <View style={[styles.waveLine, { height: 15, backgroundColor: isMe ? '#FFF' : '#00A884' }]} />
                <View style={[styles.waveLine, { height: 25, backgroundColor: isMe ? '#FFF' : '#00A884' }]} />
                <View style={[styles.waveLine, { backgroundColor: isMe ? '#FFF' : '#00A884' }]} />
              </View>
              <Text style={{ color: isMe ? '#FFF' : textMain, marginLeft: 10, fontSize: 13 }}>{formatTime(msg.duration || 0)}</Text>
            </View>
          ) 
          
          /* Type: POLL */
          : msg.type === 'poll' ? (
            <View style={{ minWidth: 220, paddingVertical: 5 }}>
              <Text style={[styles.pollQuestionText, { color: textMain }]}>📊 {msg.question}</Text>
              {msg.options.map(opt => {
                const totalVotes = msg.options.reduce((acc, o) => acc + o.voters.length, 0);
                const percent = totalVotes > 0 ? Math.round((opt.voters.length / totalVotes) * 100) : 0;
                const iVoted = opt.voters.includes(currentUser?.uid);
                return (
                  <TouchableOpacity key={opt.id} onPress={() => handleVote(msg.id, msg.options, opt.id)} style={[styles.pollOptionBtn, { borderColor: iVoted ? '#007AFF' : borderCol }]}>
                    <View style={[styles.pollProgressBar, { width: `${percent}%`, backgroundColor: iVoted ? 'rgba(0, 122, 255, 0.2)' : 'rgba(150, 150, 150, 0.1)' }]} />
                    <View style={styles.pollOptionContent}>
                      <Text style={{ color: textMain, fontWeight: iVoted ? 'bold' : 'normal' }}>{opt.text}</Text>
                      <Text style={{ color: textSub, fontSize: 12 }}>{percent}%</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
              <Text style={{ color: textSub, fontSize: 11, marginTop: 5, textAlign: 'right' }}>{msg.options.reduce((acc, o) => acc + o.voters.length, 0)} votes</Text>
            </View>
          ) 
          
          /* Type: IMAGE */
          : msg.type === 'image' && msg.image ? (
            <View>
              {!isMe && <Text style={[styles.senderName, {marginLeft: 6, marginTop: 4}]}>{msg.senderName || 'User'}</Text>}
              <Image source={{ uri: msg.image }} style={styles.chatImage} />
            </View>
          ) 
          
          /* Type: TEXT */
          : (
            <Text style={{ color: textMain, fontSize: 16, paddingHorizontal: 4 }}>{msg.text}</Text>
          )}
          
          <View style={[styles.msgFooter, msg.type === 'image' ? styles.imageFooter : null]}>
            <Text style={[styles.msgTime, { color: msg.type === 'image' ? '#FFF' : textSub }]}>{msgTime}</Text>
            {isMe && <Ionicons name="checkmark-done" size={15} color={msg.type === 'image' ? '#FFF' : '#53bdeb'} style={{ marginLeft: 4 }} />}
          </View>

          {msg.reaction && <View style={styles.reactionBadge}><Text style={{ fontSize: 12 }}>{msg.reaction}</Text></View>}
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.container, { backgroundColor: bg }]}>
        
        {/* Header */}
        <View style={[styles.header, { backgroundColor: headerBg }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}><Ionicons name="arrow-back" size={24} color={textMain} /></TouchableOpacity>
          <Image source={{ uri: 'https://ui-avatars.com/api/?name=Nax+Room&background=007AFF&color=fff' }} style={styles.avatar} />
          <View style={styles.headerInfo}>
            <Text style={[styles.headerName, { color: textMain }]} numberOfLines={1}>Global Nax Room</Text>
            <Text style={styles.headerStatus}>Voice notes active 🎙️</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={() => navigation.navigate('Call', { type: 'video', name: 'Global Nax Room' })} style={styles.actionIcon}><Ionicons name="videocam" size={22} color={textMain} /></TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate('Call', { type: 'voice', name: 'Global Nax Room' })} style={styles.actionIcon}><Ionicons name="call" size={20} color={textMain} /></TouchableOpacity>
            <TouchableOpacity onPress={() => setShowHeaderMenu(!showHeaderMenu)} style={styles.actionIcon}><Ionicons name="ellipsis-vertical" size={22} color={textMain} /></TouchableOpacity>
          </View>
        </View>

        {showHeaderMenu && (
          <View style={[styles.headerMenu, { backgroundColor: inputBg }]}>
            {['Search', 'Mute', 'Wallpaper', 'Export Chat'].map((opt, i) => (
              <TouchableOpacity key={i} style={styles.headerMenuOption} onPress={() => setShowHeaderMenu(false)}><Text style={{ color: textMain, fontSize: 16 }}>{opt}</Text></TouchableOpacity>
            ))}
          </View>
        )}

        {pinnedMessage && (
          <View style={[styles.pinnedBox, { backgroundColor: headerBg }]}>
            <Ionicons name="pin" size={16} color="#007AFF" style={{ marginRight: 10 }} />
            <View style={{ flex: 1 }}><Text style={{ color: '#007AFF', fontSize: 12, fontWeight: 'bold' }}>Pinned Message</Text><Text style={{ color: textSub, fontSize: 13 }} numberOfLines={1}>{pinnedMessage}</Text></View>
            <TouchableOpacity onPress={() => setPinnedMessage(null)}><Ionicons name="close" size={18} color={textSub} /></TouchableOpacity>
          </View>
        )}

        <ScrollView style={styles.chatArea} contentContainerStyle={{ padding: 10, paddingBottom: 20 }} ref={scrollViewRef} onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}>
          <View style={styles.encryptionBox}><Ionicons name="lock-closed" size={12} color="#F5C518" /><Text style={styles.encryptionText}>End-to-end encrypted.</Text></View>
          {messages.map(renderMessage)}
        </ScrollView>

        {showAttachments && (
          <View style={[styles.attachmentTray, { backgroundColor: headerBg }]}>
            <View style={styles.attachGrid}>
              <TouchableOpacity style={styles.attachOption} onPress={takePhoto}><View style={[styles.attachIconWrap, { backgroundColor: '#D3396D' }]}><Ionicons name="camera" size={24} color="#FFF" /></View><Text style={[styles.attachText, { color: textMain }]}>Camera</Text></TouchableOpacity>
              <TouchableOpacity style={styles.attachOption} onPress={pickImage}><View style={[styles.attachIconWrap, { backgroundColor: '#007AFF' }]}><Ionicons name="image" size={24} color="#FFF" /></View><Text style={[styles.attachText, { color: textMain }]}>Gallery</Text></TouchableOpacity>
              <TouchableOpacity style={styles.attachOption} onPress={() => { setShowAttachments(false); setShowPollModal(true); }}><View style={[styles.attachIconWrap, { backgroundColor: '#F59E0B' }]}><Ionicons name="bar-chart" size={24} color="#FFF" /></View><Text style={[styles.attachText, { color: textMain }]}>Poll</Text></TouchableOpacity>
            </View>
          </View>
        )}

        {replyingTo && (
          <View style={[styles.replyingBar, { backgroundColor: headerBg }]}><View style={{ flex: 1 }}><Text style={{ color: '#007AFF', fontWeight: 'bold', fontSize: 13 }}>Replying to {replyingTo.senderName}</Text><Text style={{ color: textSub, fontSize: 13 }} numberOfLines={1}>{replyingTo.text || 'Attachment'}</Text></View><TouchableOpacity onPress={() => setReplyingTo(null)}><Ionicons name="close-circle" size={24} color={textSub} /></TouchableOpacity></View>
        )}

        {/* 🔴 NEW: Dynamic Input Bar (Text vs Recording) */}
        <View style={[styles.inputArea, { backgroundColor: bg }]}>
          {isRecording ? (
            <View style={[styles.inputBox, { backgroundColor: inputBg, justifyContent: 'space-between', paddingHorizontal: 20 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={styles.redDot} />
                <Text style={{ color: textMain, fontSize: 16, marginLeft: 10 }}>{formatTime(recordTime)}</Text>
              </View>
              <Text style={{ color: textSub }}>Slide to cancel 👈</Text>
            </View>
          ) : (
            <View style={[styles.inputBox, { backgroundColor: inputBg }]}>
              <TouchableOpacity onPress={() => setShowAttachments(!showAttachments)} style={styles.iconBtn}><Ionicons name="add" size={26} color={textSub} /></TouchableOpacity>
              <TextInput style={[styles.input, { color: textMain }]} placeholder="Message" placeholderTextColor={textSub} multiline value={inputText} onChangeText={setInputText} onFocus={() => setShowAttachments(false)} />
              {!inputText.trim() && <TouchableOpacity style={styles.iconBtn} onPress={takePhoto}><Ionicons name="camera-outline" size={24} color={textSub} /></TouchableOpacity>}
            </View>
          )}
          
          {/* Mic / Send Button */}
          <TouchableOpacity 
            style={[styles.micBtn, { backgroundColor: inputText.trim() ? '#007AFF' : '#00A884' }]}
            onPress={inputText.trim() ? sendMessage : null}
            onLongPress={!inputText.trim() ? startRecording : null}
            onPressOut={!inputText.trim() && isRecording ? stopRecording : null}
          >
            <Ionicons name={inputText.trim() ? "send" : "mic"} size={24} color="#FFF" style={inputText.trim() ? {marginLeft: 4} : {}} />
          </TouchableOpacity>
        </View>

        {/* Poll Modal */}
        <Modal visible={showPollModal} transparent={true} animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={[styles.pollModalContent, { backgroundColor: inputBg }]}>
              <Text style={{ color: textMain, fontSize: 20, fontWeight: 'bold', marginBottom: 15 }}>Create Poll</Text>
              <TextInput style={[styles.pollInput, { backgroundColor: headerBg, color: textMain }]} placeholder="Ask a question..." placeholderTextColor={textSub} value={pollQuestion} onChangeText={setPollQuestion} />
              {pollOptions.map((opt, index) => ( <TextInput key={index} style={[styles.pollInput, { backgroundColor: headerBg, color: textMain, marginTop: 10 }]} placeholder={`Option ${index + 1}`} placeholderTextColor={textSub} value={opt} onChangeText={(text) => { const newOpts = [...pollOptions]; newOpts[index] = text; setPollOptions(newOpts); }} /> ))}
              {pollOptions.length < 4 && ( <TouchableOpacity style={{ marginTop: 15, paddingVertical: 10 }} onPress={() => setPollOptions([...pollOptions, ''])}><Text style={{ color: '#007AFF', fontWeight: 'bold' }}>+ Add Option</Text></TouchableOpacity> )}
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 20 }}>
                <TouchableOpacity style={{ padding: 10, marginRight: 15 }} onPress={() => setShowPollModal(false)}><Text style={{ color: textSub, fontWeight: 'bold', fontSize: 16 }}>Cancel</Text></TouchableOpacity>
                <TouchableOpacity style={{ backgroundColor: '#00A884', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 }} onPress={sendPoll}><Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 16 }}>Send</Text></TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Long Press Menu Modal */}
        <Modal visible={!!selectedMessage} transparent={true} animationType="fade">
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setSelectedMessage(null)}>
            <View style={[styles.modalContent, { backgroundColor: inputBg }]}>
              <View style={styles.reactionRow}>
                {['❤️', '😂', '🔥', '👍', '😢'].map((emoji, i) => ( <TouchableOpacity key={i} onPress={() => handleReaction(emoji)}><Text style={{ fontSize: 30, marginHorizontal: 8 }}>{emoji}</Text></TouchableOpacity> ))}
              </View>
              <View style={{ height: 1, backgroundColor: 'rgba(150,150,150,0.2)', marginVertical: 10 }} />
              <View style={styles.actionGrid}>
                {[ { id: 'reply', icon: 'arrow-undo-outline', name: 'Reply', color: textMain }, { id: 'copy', icon: 'copy-outline', name: 'Copy', color: textMain }, { id: 'pin', icon: 'pin-outline', name: 'Pin', color: textMain }, { id: 'delete', icon: 'trash-outline', name: 'Delete', color: '#FF3B30' } ].map((act, i) => {
                  if (act.id === 'delete' && selectedMessage?.senderId !== currentUser?.uid) return null; 
                  return (
                    <TouchableOpacity key={i} style={styles.actionGridItem} onPress={() => act.id === 'delete' ? handleDelete() : handleAction(act.id)}>
                      <Ionicons name={act.icon} size={24} color={act.color} />
                      <Text style={{ color: act.color, fontSize: 12, marginTop: 5 }}>{act.name}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </TouchableOpacity>
        </Modal>

      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: 45, paddingBottom: 10, paddingHorizontal: 5, elevation: 3, zIndex: 10 },
  backBtn: { padding: 5 },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  headerInfo: { flex: 1, marginLeft: 10 },
  headerName: { fontSize: 18, fontWeight: 'bold' },
  headerStatus: { fontSize: 13, color: '#888' },
  headerActions: { flexDirection: 'row', alignItems: 'center' },
  actionIcon: { paddingHorizontal: 10 },
  pinnedBox: { flexDirection: 'row', alignItems: 'center', padding: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.1)' },
  chatArea: { flex: 1 },
  encryptionBox: { flexDirection: 'row', backgroundColor: 'rgba(245, 197, 24, 0.1)', padding: 10, borderRadius: 10, marginHorizontal: 20, marginBottom: 20, alignItems: 'center', justifyContent: 'center' },
  encryptionText: { fontSize: 12, color: '#F5C518', marginLeft: 8, textAlign: 'center', flex: 1 },
  
  messageRow: { flexDirection: 'row', marginBottom: 12 },
  messageBubble: { maxWidth: '80%', borderRadius: 12, elevation: 1 },
  senderName: { color: '#007AFF', fontSize: 13, marginBottom: 2, fontWeight: 'bold' },
  chatImage: { width: 250, height: 250, borderRadius: 10, resizeMode: 'cover' },
  imageFooter: { position: 'absolute', bottom: 5, right: 10, backgroundColor: 'rgba(0,0,0,0.4)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10 },
  quoteBox: { borderLeftWidth: 4, borderLeftColor: '#007AFF', padding: 5, borderRadius: 5, marginBottom: 5 },
  msgFooter: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginTop: 2, paddingHorizontal: 4 },
  msgTime: { fontSize: 11 },
  reactionBadge: { position: 'absolute', bottom: -12, right: 10, backgroundColor: '#FFF', borderRadius: 15, paddingHorizontal: 5, paddingVertical: 1, elevation: 2, borderWidth: 1, borderColor: '#EEE' },
  
  // 🔴 Audio Styles
  audioContainer: { flexDirection: 'row', alignItems: 'center', minWidth: 150, paddingVertical: 5 },
  playBtn: { marginRight: 10 },
  audioWave: { flexDirection: 'row', alignItems: 'center' },
  waveLine: { width: 3, height: 10, borderRadius: 2, marginHorizontal: 2 },
  
  // 🔴 Recording Input Styles
  redDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#FF3B30' },
  
  attachmentTray: { padding: 20, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.1)' },
  attachGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start' },
  attachOption: { alignItems: 'center', width: '25%', marginBottom: 20 },
  attachIconWrap: { width: 55, height: 55, borderRadius: 27.5, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  attachText: { fontSize: 13, fontWeight: '500' },
  replyingBar: { flexDirection: 'row', alignItems: 'center', padding: 10, borderLeftWidth: 4, borderLeftColor: '#007AFF', marginHorizontal: 10, borderTopLeftRadius: 10, borderTopRightRadius: 10 },
  
  inputArea: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 10, paddingBottom: 25 },
  inputBox: { flex: 1, flexDirection: 'row', alignItems: 'center', borderRadius: 25, paddingHorizontal: 5, paddingVertical: 5, marginHorizontal: 10, minHeight: 45 },
  iconBtn: { padding: 8, justifyContent: 'center' },
  input: { flex: 1, fontSize: 17, maxHeight: 120, minHeight: 35, paddingTop: Platform.OS==='ios'?8:4, paddingHorizontal: 5 },
  micBtn: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '85%', borderRadius: 20, padding: 20, elevation: 10 },
  pollModalContent: { width: '90%', borderRadius: 15, padding: 20, elevation: 10 },
  pollInput: { padding: 12, borderRadius: 10, fontSize: 16, borderWidth: 1, borderColor: 'rgba(150,150,150,0.2)' },
  pollQuestionText: { fontSize: 16, fontWeight: 'bold', marginBottom: 10 },
  pollOptionBtn: { overflow: 'hidden', borderRadius: 8, borderWidth: 1, marginBottom: 8, position: 'relative' },
  pollProgressBar: { position: 'absolute', top: 0, bottom: 0, left: 0 },
  pollOptionContent: { flexDirection: 'row', justifyContent: 'space-between', padding: 10 },
  
  reactionRow: { flexDirection: 'row', justifyContent: 'center', paddingVertical: 10 },
  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start' },
  actionGridItem: { width: '25%', alignItems: 'center', marginVertical: 12 },
  headerMenu: { position: 'absolute', top: 90, right: 10, borderRadius: 10, paddingVertical: 5, elevation: 10, zIndex: 20, minWidth: 180 },
  headerMenuOption: { paddingVertical: 12, paddingHorizontal: 20 }
});
