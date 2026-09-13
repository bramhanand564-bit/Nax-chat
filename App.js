import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Image, KeyboardAvoidingView, Platform, Alert, Modal, Clipboard } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
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
  const [pinnedMessage, setPinnedMessage] = useState("Welcome to Global Nax Room! Be respectful.");
  
  const scrollViewRef = useRef();
  const currentUser = auth.currentUser;

  const bg = isDark ? '#0B141A' : '#EFEAE2'; 
  const textMain = isDark ? '#E9EDEF' : '#111B21';
  const textSub = isDark ? '#8696A0' : '#667781';
  const inputBg = isDark ? '#202C33' : '#FFFFFF';
  const headerBg = isDark ? '#202C33' : '#F0F2F5';
  const myMsgBg = isDark ? '#005C4B' : '#D9FDD3';
  const otherMsgBg = isDark ? '#202C33' : '#FFFFFF';

  useEffect(() => {
    const q = query(collection(db, 'global_chats'), orderBy('createdAt', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMessages(msgs);
    });
    return unsubscribe;
  }, []);

  const sendMessage = async () => {
    if (inputText.trim() === '') return;
    const textToSend = inputText;
    setInputText(''); 
    setShowAttachments(false);
    
    const msgData = {
      text: textToSend,
      senderEmail: currentUser?.email || 'Unknown',
      senderName: currentUser?.displayName || 'User',
      senderId: currentUser?.uid,
      type: 'text',
      reaction: null,
      replyTo: replyingTo ? replyingTo.text : null,
      replyToSender: replyingTo ? replyingTo.senderName : null,
      createdAt: serverTimestamp()
    };
    setReplyingTo(null);

    try {
      await addDoc(collection(db, 'global_chats'), msgData);
    } catch (error) {
      console.log("Error: ", error);
    }
  };

  const handleDelete = async () => {
    if (selectedMessage) {
      await deleteDoc(doc(db, 'global_chats', selectedMessage.id));
      setSelectedMessage(null);
    }
  };

  const handleAction = (action) => {
    if (action === 'copy') {
      Clipboard.setString(selectedMessage.text);
      Alert.alert("Copied", "Text copied to clipboard");
    } else if (action === 'reply') {
      setReplyingTo(selectedMessage);
    } else if (action === 'pin') {
      setPinnedMessage(selectedMessage.text);
    }
    setSelectedMessage(null);
  };

  const handleReaction = async (emoji) => {
    if (selectedMessage) {
      await updateDoc(doc(db, 'global_chats', selectedMessage.id), { reaction: emoji });
      setSelectedMessage(null);
    }
  };

  const renderMessage = (msg) => {
    const isMe = msg.senderId === currentUser?.uid;
    const msgTime = msg.createdAt ? new Date(msg.createdAt.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '...';
    
    return (
      <View key={msg.id} style={[styles.messageRow, { justifyContent: isMe ? 'flex-end' : 'flex-start' }]}>
        <TouchableOpacity 
          activeOpacity={0.8}
          onLongPress={() => setSelectedMessage(msg)}
          style={[styles.messageBubble, { backgroundColor: isMe ? myMsgBg : otherMsgBg }]}
        >
          {!isMe && <Text style={styles.senderName}>{msg.senderName || 'User'}</Text>}
          
          {msg.replyTo && (
            <View style={[styles.quoteBox, { backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.05)' }]}>
              <Text style={{ color: '#007AFF', fontSize: 12, fontWeight: 'bold' }}>{msg.replyToSender}</Text>
              <Text style={{ color: textSub, fontSize: 13 }} numberOfLines={2}>{msg.replyTo}</Text>
            </View>
          )}

          <Text style={{ color: textMain, fontSize: 16 }}>{msg.text}</Text>
          
          <View style={styles.msgFooter}>
            <Text style={[styles.msgTime, { color: textSub }]}>{msgTime}</Text>
            {isMe && <Ionicons name="checkmark-done" size={15} color="#53bdeb" style={{ marginLeft: 4 }} />}
          </View>

          {msg.reaction && (
            <View style={styles.reactionBadge}>
              <Text style={{ fontSize: 12 }}>{msg.reaction}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.container, { backgroundColor: bg }]}>
        
        {/* ================= HEADER ================= */}
        <View style={[styles.header, { backgroundColor: headerBg }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={textMain} />
          </TouchableOpacity>
          <Image source={{ uri: 'https://ui-avatars.com/api/?name=Nax+Room&background=007AFF&color=fff' }} style={styles.avatar} />
          
          <View style={styles.headerInfo}>
            <Text style={[styles.headerName, { color: textMain }]} numberOfLines={1}>Global Nax Room</Text>
            <Text style={styles.headerStatus}>10.5K members, 120 online</Text>
          </View>

          <View style={styles.headerActions}>
            {/* 🔴 NEW: REAL VIDEO CALL BUTTON 🔴 */}
            <TouchableOpacity onPress={() => navigation.navigate('Call', { type: 'video', name: 'Global Nax Room' })} style={styles.actionIcon}>
              <Ionicons name="videocam" size={22} color={textMain} />
            </TouchableOpacity>
            
            {/* 🔴 NEW: REAL VOICE CALL BUTTON 🔴 */}
            <TouchableOpacity onPress={() => navigation.navigate('Call', { type: 'voice', name: 'Global Nax Room' })} style={styles.actionIcon}>
              <Ionicons name="call" size={20} color={textMain} />
            </TouchableOpacity>
            
            <TouchableOpacity onPress={() => setShowHeaderMenu(!showHeaderMenu)} style={styles.actionIcon}>
              <Ionicons name="ellipsis-vertical" size={22} color={textMain} />
            </TouchableOpacity>
          </View>
        </View>

        {showHeaderMenu && (
          <View style={[styles.headerMenu, { backgroundColor: inputBg }]}>
            {['Search', 'Mute Notifications', 'Wallpaper', 'Export Chat', 'Clear Chat'].map((opt, i) => (
              <TouchableOpacity key={i} style={styles.headerMenuOption} onPress={() => { setShowHeaderMenu(false); Alert.alert(opt, `${opt} config opening...`); }}>
                <Text style={{ color: textMain, fontSize: 16 }}>{opt}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {pinnedMessage && (
          <View style={[styles.pinnedBox, { backgroundColor: headerBg }]}>
            <Ionicons name="pin" size={16} color="#007AFF" style={{ marginRight: 10 }} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#007AFF', fontSize: 12, fontWeight: 'bold' }}>Pinned Message</Text>
              <Text style={{ color: textSub, fontSize: 13 }} numberOfLines={1}>{pinnedMessage}</Text>
            </View>
            <TouchableOpacity onPress={() => setPinnedMessage(null)}>
              <Ionicons name="close" size={18} color={textSub} />
            </TouchableOpacity>
          </View>
        )}

        <ScrollView 
          style={styles.chatArea} 
          contentContainerStyle={{ padding: 10, paddingBottom: 20 }}
          ref={scrollViewRef}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
        >
          <View style={styles.encryptionBox}>
            <Ionicons name="lock-closed" size={12} color="#F5C518" />
            <Text style={styles.encryptionText}>Messages and calls are end-to-end encrypted.</Text>
          </View>

          {messages.map(renderMessage)}
        </ScrollView>

        {showAttachments && (
          <View style={[styles.attachmentTray, { backgroundColor: headerBg }]}>
            <View style={styles.attachGrid}>
              {[
                { icon: 'document', color: '#7F66FF', name: 'Document' },
                { icon: 'camera', color: '#D3396D', name: 'Camera' },
                { icon: 'image', color: '#007AFF', name: 'Gallery' },
                { icon: 'headset', color: '#FF9500', name: 'Audio' },
                { icon: 'location', color: '#25D366', name: 'Location' },
                { icon: 'person', color: '#0EA5E9', name: 'Contact' },
                { icon: 'bar-chart', color: '#F59E0B', name: 'Poll' },
                { icon: 'wallet', color: '#10B981', name: 'Payment' },
                { icon: 'time', color: '#64748B', name: 'Schedule' },
              ].map((item, i) => (
                <TouchableOpacity key={i} style={styles.attachOption} onPress={() => Alert.alert(item.name, `${item.name} API Linking...`)}>
                  <View style={[styles.attachIconWrap, { backgroundColor: item.color }]}>
                    <Ionicons name={item.icon} size={24} color="#FFF" />
                  </View>
                  <Text style={[styles.attachText, { color: textMain }]}>{item.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {replyingTo && (
          <View style={[styles.replyingBar, { backgroundColor: headerBg }]}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#007AFF', fontWeight: 'bold', fontSize: 13 }}>Replying to {replyingTo.senderName}</Text>
              <Text style={{ color: textSub, fontSize: 13 }} numberOfLines={1}>{replyingTo.text}</Text>
            </View>
            <TouchableOpacity onPress={() => setReplyingTo(null)}>
              <Ionicons name="close-circle" size={24} color={textSub} />
            </TouchableOpacity>
          </View>
        )}

        <View style={[styles.inputArea, { backgroundColor: bg }]}>
          <View style={[styles.inputBox, { backgroundColor: inputBg }]}>
            <TouchableOpacity onPress={() => setShowAttachments(!showAttachments)} style={styles.iconBtn}>
              <Ionicons name="add" size={26} color={textSub} />
            </TouchableOpacity>
            
            <TextInput 
              style={[styles.input, { color: textMain }]} 
              placeholder="Message" 
              placeholderTextColor={textSub}
              multiline
              value={inputText}
              onChangeText={setInputText}
              onFocus={() => setShowAttachments(false)}
            />
            
            {!inputText.trim() && (
              <>
                <TouchableOpacity style={styles.iconBtn}><Ionicons name="camera-outline" size={24} color={textSub} /></TouchableOpacity>
                <TouchableOpacity style={styles.iconBtn}><Ionicons name="cash-outline" size={22} color={textSub} /></TouchableOpacity>
              </>
            )}
          </View>
          
          <TouchableOpacity 
            style={[styles.micBtn, { backgroundColor: inputText.trim() ? '#007AFF' : '#00A884' }]}
            onPress={inputText.trim() ? sendMessage : () => Alert.alert("Voice Record", "Hold to record audio")}
          >
            <Ionicons name={inputText.trim() ? "send" : "mic"} size={20} color="#FFF" style={inputText.trim() ? {marginLeft: 4} : {}} />
          </TouchableOpacity>
        </View>

        <Modal visible={!!selectedMessage} transparent={true} animationType="fade">
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setSelectedMessage(null)}>
            <View style={[styles.modalContent, { backgroundColor: inputBg }]}>
              
              <View style={styles.reactionRow}>
                {['❤️', '😂', '🔥', '👍', '😢'].map((emoji, index) => (
                  <TouchableOpacity key={index} onPress={() => handleReaction(emoji)}>
                    <Text style={{ fontSize: 30, marginHorizontal: 8 }}>{emoji}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={{ height: 1, backgroundColor: 'rgba(150,150,150,0.2)', marginVertical: 10 }} />

              <View style={styles.actionGrid}>
                {[
                  { id: 'reply', icon: 'arrow-undo-outline', name: 'Reply', color: textMain },
                  { id: 'copy', icon: 'copy-outline', name: 'Copy', color: textMain },
                  { id: 'forward', icon: 'arrow-redo-outline', name: 'Forward', color: textMain },
                  { id: 'star', icon: 'star-outline', name: 'Star', color: textMain },
                  { id: 'pin', icon: 'pin-outline', name: 'Pin', color: textMain },
                  { id: 'translate', icon: 'language-outline', name: 'Translate', color: textMain },
                  { id: 'edit', icon: 'pencil-outline', name: 'Edit', color: textMain },
                  { id: 'delete', icon: 'trash-outline', name: 'Delete', color: '#FF3B30' }
                ].map((act, i) => {
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
  headerMenu: { position: 'absolute', top: 90, right: 10, borderRadius: 10, paddingVertical: 5, elevation: 10, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 5, zIndex: 20, minWidth: 180 },
  headerMenuOption: { paddingVertical: 12, paddingHorizontal: 20 },
  pinnedBox: { flexDirection: 'row', alignItems: 'center', padding: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.1)' },
  chatArea: { flex: 1 },
  encryptionBox: { flexDirection: 'row', backgroundColor: 'rgba(245, 197, 24, 0.1)', padding: 10, borderRadius: 10, marginHorizontal: 20, marginBottom: 20, alignItems: 'center', justifyContent: 'center' },
  encryptionText: { fontSize: 12, color: '#F5C518', marginLeft: 8, textAlign: 'center', flex: 1 },
  messageRow: { flexDirection: 'row', marginBottom: 12 },
  messageBubble: { maxWidth: '80%', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, elevation: 1 },
  senderName: { color: '#007AFF', fontSize: 13, marginBottom: 2, fontWeight: 'bold' },
  quoteBox: { borderLeftWidth: 4, borderLeftColor: '#007AFF', padding: 5, borderRadius: 5, marginBottom: 5 },
  msgFooter: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginTop: 2 },
  msgTime: { fontSize: 11 },
  reactionBadge: { position: 'absolute', bottom: -12, right: 10, backgroundColor: '#FFF', borderRadius: 15, paddingHorizontal: 5, paddingVertical: 1, elevation: 2, borderWidth: 1, borderColor: '#EEE' },
  attachmentTray: { padding: 20, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.1)' },
  attachGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  attachOption: { alignItems: 'center', width: '30%', marginBottom: 20 },
  attachIconWrap: { width: 55, height: 55, borderRadius: 27.5, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  attachText: { fontSize: 13, fontWeight: '500' },
  replyingBar: { flexDirection: 'row', alignItems: 'center', padding: 10, borderLeftWidth: 4, borderLeftColor: '#007AFF', marginHorizontal: 10, borderTopLeftRadius: 10, borderTopRightRadius: 10 },
  inputArea: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 10, paddingVertical: 10, paddingBottom: 25 },
  inputBox: { flex: 1, flexDirection: 'row', alignItems: 'flex-end', borderRadius: 25, paddingHorizontal: 5, paddingVertical: 5, marginHorizontal: 10 },
  iconBtn: { padding: 8, justifyContent: 'center' },
  input: { flex: 1, fontSize: 17, maxHeight: 120, minHeight: 35, paddingTop: 8, paddingHorizontal: 5 },
  micBtn: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 2 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '85%', borderRadius: 20, padding: 20, elevation: 10 },
  reactionRow: { flexDirection: 'row', justifyContent: 'center', paddingVertical: 10 },
  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start' },
  actionGridItem: { width: '25%', alignItems: 'center', marginVertical: 12 }
});
