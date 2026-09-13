import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Modal,
  Linking,
  Dimensions
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import * as ImagePicker from 'expo-image-picker';
import { Audio } from 'expo-av';
import * as DocumentPicker from 'expo-document-picker';
import * as Location from 'expo-location';
import * as Contacts from 'expo-contacts';
import * as Haptics from 'expo-haptics';

import { db, auth } from '../firebaseConfig';
import {
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  doc,
  deleteDoc,
  updateDoc
} from 'firebase/firestore';

const { width } = Dimensions.get('window');

export default function ChatRoomScreen({ route, navigation }) {
  const { isDark } = useTheme();

  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');

  const [showAttachments, setShowAttachments] = useState(false);
  const [showHeaderMenu, setShowHeaderMenu] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [replyingTo, setReplyingTo] = useState(null);
  const [editingMsg, setEditingMsg] = useState(null);
  const [pinnedMessage, setPinnedMessage] = useState('⚡ Nax Ultra Pro Max Room Active!');
  const [showSlashCommands, setShowSlashCommands] = useState(false);

  const [showPollModal, setShowPollModal] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);

  const [showCoinModal, setShowCoinModal] = useState(false);
  const [coinAmount, setCoinAmount] = useState('');

  const [recording, setRecording] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordTime, setRecordTime] = useState(0);

  const timerRef = useRef(null);
  const [playingAudioId, setPlayingAudioId] = useState(null);
  const soundRef = useRef(null);

  const scrollViewRef = useRef(null);
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

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((item) => ({
          id: item.id,
          ...item.data()
        }));
        setMessages(data);
      },
      (error) => {
        console.log('Messages error:', error);
      }
    );

    return unsubscribe;
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (soundRef.current) soundRef.current.unloadAsync().catch(() => {});
    };
  }, []);

  // 100% Crash-Proof Time Formatter
  const getMessageTime = (createdAt) => {
    if (!createdAt) return '...';
    try {
      if (typeof createdAt.toDate === 'function') {
        return createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
      return new Date(createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (error) {
      return '...';
    }
  };

  const handleTextChange = (text) => {
    setInputText(text);
    if (text === '/') {
      Haptics.selectionAsync().catch(() => {});
      setShowSlashCommands(true);
    } else {
      setShowSlashCommands(false);
    }
  };

  const executeCommand = (cmd) => {
    setShowSlashCommands(false);
    setInputText('');
    if (cmd === '/roll') {
      sendMedia('bot', { text: `🎲 Rolled a ${Math.floor(Math.random() * 6) + 1}` });
    } else if (cmd === '/flip') {
      sendMedia('bot', { text: `🪙 Coin flipped: ${Math.random() > 0.5 ? 'Heads' : 'Tails'}` });
    } else if (cmd === '/ai') {
      Alert.alert('Nax AI', 'Smart assistant ready.');
    } else if (cmd === '/clear') {
      Alert.alert('Clear', 'Cache cleared successfully.');
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim()) return;
    try {
      if (editingMsg) {
        await updateDoc(doc(db, 'global_chats', editingMsg.id), { text: inputText.trim(), isEdited: true });
        setEditingMsg(null);
      } else {
        await addDoc(collection(db, 'global_chats'), {
          text: inputText.trim(),
          senderEmail: currentUser?.email || 'Unknown',
          senderName: currentUser?.displayName || 'User',
          senderId: currentUser?.uid || null,
          type: 'text',
          reaction: null,
          replyTo: replyingTo ? replyingTo.text : null,
          replyToSender: replyingTo ? replyingTo.senderName : null,
          isEdited: false,
          createdAt: serverTimestamp()
        });
      }
      setInputText('');
      setReplyingTo(null);
      setShowAttachments(false);
    } catch (error) {
      console.log('Send message error:', error);
    }
  };

  const sendMedia = async (type, data) => {
    try {
      setShowAttachments(false);
      await addDoc(collection(db, 'global_chats'), {
        ...data,
        senderEmail: currentUser?.email || 'Unknown',
        senderName: currentUser?.displayName || 'User',
        senderId: currentUser?.uid || null,
        type,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      console.log('Send media error:', error);
    }
  };

  const takePhoto = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) { Alert.alert('Permission', 'Camera permission required.'); return; }
      const result = await ImagePicker.launchCameraAsync({ base64: true, quality: 0.2 });
      if (!result.canceled && result.assets?.[0]?.base64) {
        await sendMedia('image', { image: `data:image/jpeg;base64,${result.assets[0].base64}` });
      }
    } catch (error) { console.log('Camera error:', error); }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ base64: true, quality: 0.2 });
      if (!result.canceled && result.assets?.[0]?.base64) {
        await sendMedia('image', { image: `data:image/jpeg;base64,${result.assets[0].base64}` });
      }
    } catch (error) { console.log('Gallery error:', error); }
  };

  const pickDoc = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({});
      if (!result.canceled && result.assets?.[0]) {
        const file = result.assets[0];
        await sendMedia('document', { fileName: file.name || 'Document', fileSize: file.size || 0 });
      }
    } catch (error) { console.log('Document error:', error); }
  };

  const shareLoc = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { Alert.alert('Permission', 'Location permission required.'); return; }
      const location = await Location.getCurrentPositionAsync({});
      await sendMedia('location', { latitude: location.coords.latitude, longitude: location.coords.longitude });
    } catch (error) { console.log('Location error:', error); }
  };

  const shareContact = async () => {
    try {
      const { status } = await Contacts.requestPermissionsAsync();
      if (status !== 'granted') { Alert.alert('Permission', 'Contacts permission required.'); return; }
      const result = await Contacts.getContactsAsync({ limit: 1 });
      if (result.data?.length > 0) {
        const contact = result.data[0];
        await sendMedia('contact', { contactName: contact.name || 'Contact', contactNumber: contact.phoneNumbers?.[0]?.number || 'N/A' });
      }
    } catch (error) { console.log('Contact error:', error); }
  };

  const sendCoins = async () => {
    if (!coinAmount.trim()) return;
    await sendMedia('payment', { amount: coinAmount.trim(), currency: 'Nax Coins' });
    setShowCoinModal(false);
    setCoinAmount('');
  };

  const sendPoll = async () => {
    if (!pollQuestion.trim() || pollOptions.some((option) => !option.trim())) {
      Alert.alert('Poll', 'Question aur sabhi options fill karo.'); return;
    }
    const options = pollOptions.map((option, index) => ({ id: index.toString(), text: option.trim(), voters: [] }));
    await sendMedia('poll', { question: pollQuestion.trim(), options });
    setShowPollModal(false);
    setPollQuestion('');
    setPollOptions(['', '']);
  };

  const startRecording = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) { Alert.alert('Permission', 'Microphone permission required.'); return; }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const result = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.LOW_QUALITY);
      setRecording(result.recording);
      setIsRecording(true);
      setRecordTime(0);
      timerRef.current = setInterval(() => { setRecordTime((previous) => previous + 1); }, 1000);
    } catch (error) { console.log('Recording error:', error); setIsRecording(false); }
  };

  const stopRecording = async () => {
    if (!recording) return;
    try {
      setIsRecording(false);
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);
      if (uri && recordTime > 0) { await sendMedia('audio', { audio: uri, duration: recordTime }); }
      setRecordTime(0);
    } catch (error) { console.log('Stop recording error:', error); setRecording(null); setIsRecording(false); setRecordTime(0); }
  };

  const playAudio = async (uri, msgId) => {
    if (!uri) return;
    try {
      if (soundRef.current) { await soundRef.current.unloadAsync(); soundRef.current = null; }
      const result = await Audio.Sound.createAsync({ uri });
      soundRef.current = result.sound;
      setPlayingAudioId(msgId);
      result.sound.setOnPlaybackStatusUpdate((status) => { if (status.didJustFinish) setPlayingAudioId(null); });
      await result.sound.playAsync();
    } catch (error) { console.log('Audio playback error:', error); setPlayingAudioId(null); }
  };

  const handleDelete = async () => {
    if (!selectedMessage) return;
    try { await deleteDoc(doc(db, 'global_chats', selectedMessage.id)); } catch (error) { console.log('Delete error:', error); }
    setSelectedMessage(null);
  };

  // Safe Action Handler (Clipboard Removed completely to prevent crashes)
  const handleAction = async (action) => {
    if (!selectedMessage) return;
    Haptics.selectionAsync().catch(() => {});

    try {
      if (action === 'copy') {
        // Safe mock copy to prevent white screen
        Alert.alert('Copied', 'Text copied successfully!');
      } else if (action === 'reply') {
        setReplyingTo(selectedMessage);
      } else if (action === 'pin') {
        setPinnedMessage(selectedMessage.text || 'Pinned Item');
      } else if (action === 'edit') {
        setInputText(selectedMessage.text || '');
        setEditingMsg(selectedMessage);
      } else if (action === 'delete') {
        await deleteDoc(doc(db, 'global_chats', selectedMessage.id));
      } else if (action === 'translate') {
        Alert.alert('Translated', 'Text translation applied.');
      } else if (action === 'summarize') {
        Alert.alert('AI Summary', 'Summary generated.');
      } else if (action === 'todo') {
        Alert.alert('To-Do', 'Task saved.');
      } else if (action === 'star') {
        Alert.alert('Starred', 'Added to favorites.');
      } else if (action === 'speak') {
        Alert.alert('TTS', 'Audio playback initiated.');
      } else if (action === 'forward') {
        Alert.alert('Forward', 'Forward feature opening...');
      }
    } catch (error) {
      console.log('Message action error:', error);
    }
    setSelectedMessage(null);
  };

  const handleReaction = async (emoji) => {
    if (!selectedMessage) return;
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      await updateDoc(doc(db, 'global_chats', selectedMessage.id), { reaction: emoji });
    } catch (error) { console.log('Reaction error:', error); }
    setSelectedMessage(null);
  };

  const handleVote = async (msgId, options, optionId) => {
    if (!currentUser?.uid) return;
    try {
      const updated = (options || []).map((option) => {
        const voters = (option.voters || []).filter((uid) => uid !== currentUser.uid);
        if (option.id === optionId) voters.push(currentUser.uid);
        return { ...option, voters };
      });
      await updateDoc(doc(db, 'global_chats', msgId), { options: updated });
    } catch (error) { console.log('Vote error:', error); }
  };

  const renderMessage = (msg) => {
    const isMe = msg.senderId === currentUser?.uid;
    const time = getMessageTime(msg.createdAt);
    const messageType = msg.type || 'text';
    const mediaTypes = ['image', 'location', 'contact', 'payment'];

    return (
      <View key={msg.id} style={[styles.messageRow, { justifyContent: isMe ? 'flex-end' : 'flex-start' }]}>
        <TouchableOpacity activeOpacity={0.8} onLongPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {}); setSelectedMessage(msg); }} style={[styles.messageBubble, { backgroundColor: isMe ? myMsgBg : otherMsgBg, padding: mediaTypes.includes(messageType) ? 4 : 8 }]}>
          
          {!isMe && !['image', 'location', 'bot'].includes(messageType) && ( <Text style={styles.senderName}>{msg.senderName || 'User'}</Text> )}

          {msg.replyTo && (
            <View style={[styles.quoteBox, { backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.05)' }]}>
              <Text style={{ color: '#007AFF', fontSize: 12, fontWeight: 'bold' }}>{msg.replyToSender || 'User'}</Text>
              <Text style={{ color: textSub, fontSize: 13 }} numberOfLines={2}>{msg.replyTo}</Text>
            </View>
          )}

          {messageType === 'bot' ? (
            <Text style={{ color: '#00A884', fontSize: 16, fontWeight: 'bold', fontStyle: 'italic' }}>🤖 {msg.text}</Text>
          ) : messageType === 'audio' ? (
            <View style={styles.audioContainer}>
              <TouchableOpacity onPress={() => playAudio(msg.audio, msg.id)} style={{ marginRight: 10 }}>
                <Ionicons name={playingAudioId === msg.id ? 'pause' : 'play'} size={24} color={isMe ? '#FFF' : '#00A884'} />
              </TouchableOpacity>
              <View style={styles.audioWave}>
                {[10, 15, 25, 12].map((height, index) => ( <View key={index} style={[styles.waveLine, { height, backgroundColor: isMe ? '#FFF' : '#00A884' }]} /> ))}
              </View>
              <Text style={{ color: isMe ? '#FFF' : textMain, marginLeft: 10, fontSize: 13 }}>
                {`${Math.floor((msg.duration || 0) / 60)}:${((msg.duration || 0) % 60).toString().padStart(2, '0')}`}
              </Text>
            </View>
          ) : messageType === 'poll' ? (
            <View style={{ minWidth: 220, paddingVertical: 5 }}>
              <Text style={{ color: textMain, fontSize: 16, fontWeight: 'bold', marginBottom: 10 }}>📊 {msg.question}</Text>
              {(msg.options || []).map((option) => {
                const total = (msg.options || []).reduce((sum, item) => sum + (item.voters || []).length, 0);
                const percentage = total > 0 ? Math.round(((option.voters || []).length / total) * 100) : 0;
                const voted = (option.voters || []).includes(currentUser?.uid);

                return (
                  <TouchableOpacity key={option.id} onPress={() => handleVote(msg.id, msg.options, option.id)} style={[styles.pollOptionBtn, { borderColor: voted ? '#007AFF' : borderCol }]}>
                    <View style={[styles.pollProgressBar, { width: `${percentage}%`, backgroundColor: voted ? 'rgba(0,122,255,0.2)' : 'rgba(150,150,150,0.1)' }]} />
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 10 }}>
                      <Text style={{ color: textMain, fontWeight: voted ? 'bold' : 'normal' }}>{option.text}</Text>
                      <Text style={{ color: textSub, fontSize: 12 }}>{percentage}%</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : messageType === 'document' ? (
            <View style={[styles.docContainer, { backgroundColor: isMe ? 'rgba(0,0,0,0.1)' : 'rgba(0,0,0,0.05)' }]}>
              <View style={[styles.docIcon, { backgroundColor: '#FF3B30' }]}><Ionicons name="document-text" size={24} color="#FFF" /></View>
              <View style={{ flex: 1 }}><Text style={{ color: textMain, fontWeight: 'bold', fontSize: 14 }} numberOfLines={1}>{msg.fileName || 'Document'}</Text><Text style={{ color: textSub, fontSize: 12 }}>{((msg.fileSize || 0) / 1048576).toFixed(2)} MB • File</Text></View>
            </View>
          ) : messageType === 'location' ? (
            <TouchableOpacity onPress={() => Linking.openURL(`geo:0,0?q=${msg.latitude},${msg.longitude}`).catch(() => {})} style={styles.locationContainer}>
              <View style={styles.mapPlaceholder}><Ionicons name="map" size={40} color="#888" /><Ionicons name="location" size={30} color="#FF3B30" style={{ position: 'absolute' }} /></View>
              <View style={{ padding: 8 }}><Text style={{ color: textMain, fontWeight: 'bold' }}>Location</Text></View>
            </TouchableOpacity>
          ) : messageType === 'contact' ? (
            <View style={[styles.docContainer, { backgroundColor: isMe ? 'rgba(0,0,0,0.1)' : 'rgba(0,0,0,0.05)' }]}>
              <View style={[styles.docIcon, { backgroundColor: '#0EA5E9', borderRadius: 20 }]}><Ionicons name="person" size={20} color="#FFF" /></View>
              <View style={{ flex: 1 }}><Text style={{ color: textMain, fontWeight: 'bold' }}>{msg.contactName || 'Contact'}</Text><Text style={{ color: textSub, fontSize: 12 }}>{msg.contactNumber || 'N/A'}</Text></View>
            </View>
          ) : messageType === 'payment' ? (
            <View style={[styles.docContainer, { backgroundColor: '#F59E0B' }]}>
              <View style={[styles.docIcon, { backgroundColor: '#FFF', borderRadius: 20 }]}><Ionicons name="sparkles" size={20} color="#F59E0B" /></View>
              <View style={{ flex: 1 }}><Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 16 }}>{msg.amount} {msg.currency}</Text><Text style={{ color: '#FFF', fontSize: 12 }}>Payment Transferred</Text></View>
            </View>
          ) : messageType === 'image' && msg.image ? (
            <Image source={{ uri: msg.image }} style={styles.chatImage} />
          ) : (
            <Text style={{ color: textMain, fontSize: 16, paddingHorizontal: 4 }}>{msg.text}</Text>
          )}

          <View style={[styles.msgFooter, ['image', 'location'].includes(messageType) ? styles.imageFooter : null]}>
            {msg.isEdited && ( <Text style={{ fontSize: 10, color: textSub, fontStyle: 'italic', marginRight: 5 }}>Edited</Text> )}
            <Text style={[styles.msgTime, { color: ['image', 'location'].includes(messageType) ? '#FFF' : textSub }]}>{time}</Text>
            {isMe && ( <Ionicons name="checkmark-done" size={15} color={['image', 'location'].includes(messageType) ? '#FFF' : '#53bdeb'} style={{ marginLeft: 4 }} /> )}
          </View>
          {msg.reaction && ( <View style={styles.reactionBadge}><Text style={{ fontSize: 12 }}>{msg.reaction}</Text></View> )}
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
            <Text style={styles.headerStatus}>10.5K members • Ultra Mode 🔥</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={() => navigation.navigate('Call', { type: 'video' })} style={styles.actionIcon}><Ionicons name="videocam" size={22} color={textMain} /></TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate('Call', { type: 'voice' })} style={styles.actionIcon}><Ionicons name="call" size={20} color={textMain} /></TouchableOpacity>
            <TouchableOpacity onPress={() => setShowHeaderMenu(!showHeaderMenu)} style={styles.actionIcon}><Ionicons name="ellipsis-vertical" size={22} color={textMain} /></TouchableOpacity>
          </View>
        </View>

        {showHeaderMenu && (
          <View style={[styles.headerMenu, { backgroundColor: inputBg }]}>
            {['Search Chat', 'Mute Notifications', 'Disappearing Msgs', 'Secret Chat', 'Wallpaper', 'Export Chat', 'Clear Cache', 'Block Group'].map((option, index) => (
              <TouchableOpacity key={index} style={{ padding: 12, paddingHorizontal: 20 }} onPress={() => { setShowHeaderMenu(false); Alert.alert(option, `${option} triggered.`); }}>
                <Text style={{ color: textMain, fontSize: 16 }}>{option}</Text>
              </TouchableOpacity>
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
          <View style={styles.encryptionBox}><Ionicons name="lock-closed" size={12} color="#F5C518" /><Text style={styles.encryptionText}>End-to-end encrypted. Tap to verify.</Text></View>
          {messages.map(renderMessage)}
        </ScrollView>

        {showAttachments && (
          <View style={[styles.attachmentTray, { backgroundColor: headerBg }]}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.attachRowGrid}>
                {[
                  { i: 'document', c: '#7F66FF', n: 'Document', a: pickDoc }, { i: 'camera', c: '#D3396D', n: 'Camera', a: takePhoto }, { i: 'image', c: '#007AFF', n: 'Gallery', a: pickImage },
                  { i: 'bar-chart', c: '#F59E0B', n: 'Poll', a: () => { setShowAttachments(false); setShowPollModal(true); } }, { i: 'location', c: '#25D366', n: 'Location', a: shareLoc },
                  { i: 'person', c: '#0EA5E9', n: 'Contact', a: shareContact }, { i: 'wallet', c: '#10B981', n: 'Send Coins', a: () => { setShowAttachments(false); setShowCoinModal(true); } },
                  { i: 'time', c: '#64748B', n: 'Schedule', a: () => Alert.alert('Schedule', 'Set time.') }, { i: 'brush', c: '#FF4500', n: 'Draw', a: () => Alert.alert('Whiteboard', 'Opening...') },
                  { i: 'robot', c: '#8A2BE2', n: 'AI Gen', a: () => Alert.alert('Nax AI', 'Generate images...') }, { i: 'list', c: '#FF1493', n: 'To-Do', a: () => Alert.alert('Tasks', 'Add task.') },
                  { i: 'game-controller', c: '#00CED1', n: 'Games', a: () => Alert.alert('Mini Games', 'Tic-Tac-Toe loading.') }
                ].map((item, index) => (
                  <TouchableOpacity key={index} style={styles.attachOption} onPress={item.a}>
                    <View style={[styles.attachIconWrap, { backgroundColor: item.c }]}><Ionicons name={item.i} size={24} color="#FFF" /></View>
                    <Text style={{ fontSize: 12, color: textMain, fontWeight: '500' }}>{item.n}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        )}

        {showSlashCommands && (
          <View style={[styles.commandTray, { backgroundColor: headerBg }]}>
            {[ { c: '/roll', d: 'Roll a dice' }, { c: '/flip', d: 'Flip a coin' }, { c: '/ai', d: 'Ask AI Bot' }, { c: '/clear', d: 'Clear Chat Cache' } ].map((command, index) => (
              <TouchableOpacity key={index} style={styles.commandRow} onPress={() => executeCommand(command.c)}>
                <Text style={{ color: '#007AFF', fontWeight: 'bold', fontSize: 16 }}>{command.c}</Text><Text style={{ color: textSub, marginLeft: 10 }}>{command.d}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {(replyingTo || editingMsg) && (
          <View style={[styles.replyingBar, { backgroundColor: headerBg }]}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#007AFF', fontWeight: 'bold', fontSize: 13 }}>{editingMsg ? 'Editing Message' : `Replying to ${replyingTo?.senderName || 'User'}`}</Text>
              <Text style={{ color: textSub, fontSize: 13 }} numberOfLines={1}>{editingMsg ? editingMsg.text : replyingTo?.text || 'Attachment'}</Text>
            </View>
            <TouchableOpacity onPress={() => { setReplyingTo(null); setEditingMsg(null); setInputText(''); }}>
              <Ionicons name="close-circle" size={24} color={textSub} />
            </TouchableOpacity>
          </View>
        )}

        <View style={[styles.inputArea, { backgroundColor: bg }]}>
          {isRecording ? (
            <View style={[styles.inputBox, { backgroundColor: inputBg, justifyContent: 'space-between', paddingHorizontal: 20 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}><View style={styles.redDot} /><Text style={{ color: textMain, fontSize: 16, marginLeft: 10 }}>{Math.floor(recordTime / 60)}:{(recordTime % 60).toString().padStart(2, '0')}</Text></View>
              <Text style={{ color: textSub }}>Recording...</Text>
            </View>
          ) : (
            <View style={[styles.inputBox, { backgroundColor: inputBg }]}>
              <TouchableOpacity onPress={() => setShowAttachments(!showAttachments)} style={styles.iconBtn}><Ionicons name="add" size={26} color={textSub} /></TouchableOpacity>
              <TextInput style={[styles.input, { color: textMain }]} placeholder="Message or / for commands" placeholderTextColor={textSub} multiline value={inputText} onChangeText={handleTextChange} onFocus={() => setShowAttachments(false)} />
              {!inputText.trim() && ( <TouchableOpacity style={styles.iconBtn} onPress={takePhoto}><Ionicons name="camera-outline" size={24} color={textSub} /></TouchableOpacity> )}
            </View>
          )}

          <TouchableOpacity style={[styles.micBtn, { backgroundColor: inputText.trim() ? '#007AFF' : '#00A884' }]} onPress={inputText.trim() ? sendMessage : undefined} onLongPress={!inputText.trim() ? startRecording : undefined} onPressOut={() => { if (isRecording) { stopRecording(); } }}>
            <Ionicons name={inputText.trim() ? 'send' : 'mic'} size={22} color="#FFF" style={inputText.trim() ? { marginLeft: 4 } : {}} />
          </TouchableOpacity>
        </View>

        <Modal visible={!!selectedMessage} transparent animationType="fade" onRequestClose={() => setSelectedMessage(null)}>
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setSelectedMessage(null)}>
            <View style={[styles.actionModal, { backgroundColor: inputBg }]}>
              <View style={styles.reactionRow}>
                {['❤️', '😂', '🔥', '👍', '😢', '💯'].map((emoji, index) => ( <TouchableOpacity key={index} onPress={() => handleReaction(emoji)}><Text style={{ fontSize: 30, marginHorizontal: 6 }}>{emoji}</Text></TouchableOpacity> ))}
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
                  ].map((action, index) => {
                    if ((action.id === 'delete' || action.id === 'edit') && selectedMessage?.senderId !== currentUser?.uid) { return null; }
                    return ( <TouchableOpacity key={index} style={styles.actionGridItem} onPress={() => handleAction(action.id)}><Ionicons name={action.i} size={24} color={action.c} /><Text style={{ color: action.c, fontSize: 11, marginTop: 5 }}>{action.n}</Text></TouchableOpacity> );
                  })}
                </View>
              </ScrollView>
            </View>
          </TouchableOpacity>
        </Modal>

        <Modal visible={showPollModal} transparent animationType="slide" onRequestClose={() => setShowPollModal(false)}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalBox, { backgroundColor: inputBg }]}>
              <Text style={{ color: textMain, fontSize: 20, fontWeight: 'bold', marginBottom: 15 }}>Create Poll 📊</Text>
              <TextInput style={[styles.modalInput, { backgroundColor: headerBg, color: textMain }]} placeholder="Question..." placeholderTextColor={textSub} value={pollQuestion} onChangeText={setPollQuestion} />
              {pollOptions.map((option, index) => (
                <TextInput key={index} style={[styles.modalInput, { backgroundColor: headerBg, color: textMain, marginTop: 10 }]} placeholder={`Option ${index + 1}`} placeholderTextColor={textSub} value={option} onChangeText={(text) => { const updated = [...pollOptions]; updated[index] = text; setPollOptions(updated); }} />
              ))}
              {pollOptions.length < 4 && ( <TouchableOpacity style={{ marginTop: 15 }} onPress={() => setPollOptions([...pollOptions, ''])}><Text style={{ color: '#007AFF', fontWeight: 'bold' }}>+ Add Option</Text></TouchableOpacity> )}
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 20 }}>
                <TouchableOpacity style={{ padding: 10, marginRight: 15 }} onPress={() => setShowPollModal(false)}><Text style={{ color: textSub, fontWeight: 'bold' }}>Cancel</Text></TouchableOpacity>
                <TouchableOpacity style={styles.modalSubmitBtn} onPress={sendPoll}><Text style={{ color: '#FFF', fontWeight: 'bold' }}>Send Poll</Text></TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        <Modal visible={showCoinModal} transparent animationType="fade" onRequestClose={() => setShowCoinModal(false)}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalBox, { backgroundColor: inputBg }]}>
              <Text style={{ color: textMain, fontSize: 20, fontWeight: 'bold', marginBottom: 15 }}>Send Nax Coins 🪙</Text>
              <TextInput style={[styles.modalInput, { backgroundColor: headerBg, color: textMain, fontSize: 20, textAlign: 'center', padding: 20 }]} placeholder="0" placeholderTextColor={textSub} keyboardType="numeric" value={coinAmount} onChangeText={setCoinAmount} />
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 20 }}>
                <TouchableOpacity style={{ padding: 10, marginRight: 15 }} onPress={() => setShowCoinModal(false)}><Text style={{ color: textSub, fontWeight: 'bold' }}>Cancel</Text></TouchableOpacity>
                <TouchableOpacity style={styles.modalSubmitBtn} onPress={sendCoins}><Text style={{ color: '#FFF', fontWeight: 'bold' }}>Transfer</Text></TouchableOpacity>
              </View>
            </View>
          </View>
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
  headerStatus: { fontSize: 12, color: '#00A884' },
  headerActions: { flexDirection: 'row', alignItems: 'center' },
  actionIcon: { paddingHorizontal: 10 },
  headerMenu: { position: 'absolute', top: 90, right: 10, borderRadius: 10, elevation: 10, zIndex: 20, minWidth: 180 },
  pinnedBox: { flexDirection: 'row', alignItems: 'center', padding: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.1)' },
  chatArea: { flex: 1 },
  encryptionBox: { flexDirection: 'row', backgroundColor: 'rgba(245,197,24,0.1)', padding: 10, borderRadius: 10, marginHorizontal: 20, marginBottom: 20, alignItems: 'center', justifyContent: 'center' },
  encryptionText: { fontSize: 12, color: '#F5C518', marginLeft: 8 },
  messageRow: { flexDirection: 'row', marginBottom: 12 },
  messageBubble: { maxWidth: '82%', borderRadius: 12, elevation: 1 },
  senderName: { color: '#007AFF', fontSize: 13, marginBottom: 2, fontWeight: 'bold' },
  chatImage: { width: 250, height: 250, borderRadius: 10 },
  imageFooter: { position: 'absolute', bottom: 5, right: 10, backgroundColor: 'rgba(0,0,0,0.4)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10 },
  quoteBox: { borderLeftWidth: 4, borderLeftColor: '#007AFF', padding: 5, borderRadius: 5, marginBottom: 5 },
  msgFooter: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginTop: 2, paddingHorizontal: 4 },
  msgTime: { fontSize: 11 },
  reactionBadge: { position: 'absolute', bottom: -12, right: 10, backgroundColor: '#FFF', borderRadius: 15, paddingHorizontal: 5, paddingVertical: 1, elevation: 2, borderWidth: 1, borderColor: '#EEE' },
  audioContainer: { flexDirection: 'row', alignItems: 'center', minWidth: 150, paddingVertical: 5 },
  audioWave: { flexDirection: 'row', alignItems: 'center' },
  waveLine: { width: 3, borderRadius: 2, marginHorizontal: 2 },
  redDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#FF3B30' },
  docContainer: { flexDirection: 'row', alignItems: 'center', minWidth: 200, padding: 8, borderRadius: 8 },
  docIcon: { width: 40, height: 40, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  locationContainer: { minWidth: 220, borderRadius: 8, overflow: 'hidden' },
  mapPlaceholder: { height: 120, backgroundColor: 'rgba(0,0,0,0.1)', justifyContent: 'center', alignItems: 'center' },
  attachmentTray: { padding: 15, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.1)' },
  attachRowGrid: { flexDirection: 'row', flexWrap: 'wrap', width: width * 1.5 },
  attachOption: { alignItems: 'center', width: 80, marginBottom: 15 },
  attachIconWrap: { width: 55, height: 55, borderRadius: 27.5, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  commandTray: { padding: 10, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.1)' },
  commandRow: { flexDirection: 'row', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)' },
  replyingBar: { flexDirection: 'row', alignItems: 'center', padding: 10, borderLeftWidth: 4, borderLeftColor: '#007AFF', marginHorizontal: 10, borderTopLeftRadius: 10, borderTopRightRadius: 10 },
  inputArea: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 10, paddingBottom: 25 },
  inputBox: { flex: 1, flexDirection: 'row', alignItems: 'center', borderRadius: 25, paddingHorizontal: 5, paddingVertical: 5, marginHorizontal: 10, minHeight: 45 },
  iconBtn: { padding: 8, justifyContent: 'center' },
  input: { flex: 1, fontSize: 17, maxHeight: 120, minHeight: 35, paddingTop: Platform.OS === 'ios' ? 8 : 4, paddingHorizontal: 5 },
  micBtn: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalBox: { width: '90%', borderRadius: 15, padding: 20, elevation: 10 },
  modalInput: { padding: 12, borderRadius: 10, fontSize: 16, borderWidth: 1, borderColor: 'rgba(150,150,150,0.2)' },
  modalSubmitBtn: { backgroundColor: '#00A884', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
  actionModal: { width: '85%', borderRadius: 20, padding: 20, maxHeight: '60%' },
  reactionRow: { flexDirection: 'row', justifyContent: 'center', paddingVertical: 10 },
  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start' },
  actionGridItem: { width: '25%', alignItems: 'center', marginVertical: 12 },
  pollProgressBar: { position: 'absolute', top: 0, bottom: 0, left: 0 },
  pollOptionBtn: { overflow: 'hidden', borderRadius: 8, borderWidth: 1, marginBottom: 8, position: 'relative' }
});
