import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Image, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

// Firebase Imports
import { db, auth } from '../firebaseConfig';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp } from 'firebase/firestore';

export default function ChatRoomScreen({ navigation }) {
  const { isDark } = useTheme();
  
  // States
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const scrollViewRef = useRef();

  const currentUser = auth.currentUser;

  // Colors
  const bg = isDark ? '#121212' : '#F5F5F7';
  const textMain = isDark ? '#FFFFFF' : '#000000';
  const textSub = isDark ? '#888888' : '#666666';
  const inputBg = isDark ? '#1E1E1E' : '#FFFFFF';
  const borderCol = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';

  // 1. Firebase से लाइव मैसेजेस मंगाना (Real-time Listener)
  useEffect(() => {
    const q = query(collection(db, 'global_chats'), orderBy('createdAt', 'asc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setMessages(msgs);
    });

    return unsubscribe; // Cleanup when leaving screen
  }, []);

  // 2. Firebase में नया मैसेज भेजना
  const sendMessage = async () => {
    if (inputText.trim() === '') return;
    
    const textToSend = inputText;
    setInputText(''); // तुरंत इनपुट खाली करें ताकि फ़ास्ट लगे
    
    try {
      await addDoc(collection(db, 'global_chats'), {
        text: textToSend,
        senderEmail: currentUser?.email || 'Unknown',
        senderId: currentUser?.uid,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      console.log("Error sending msg: ", error);
    }
  };

  // मैसेज को स्क्रीन पर रेंडर करना
  const renderMessage = (msg) => {
    const isMe = msg.senderId === currentUser?.uid;
    
    return (
      <View key={msg.id} style={[styles.messageRow, { justifyContent: isMe ? 'flex-end' : 'flex-start' }]}>
        <View style={[
          styles.messageBubble, 
          isMe ? styles.msgSent : [styles.msgReceived, { backgroundColor: isDark ? '#1E1E1E' : '#E9E9EB' }]
        ]}>
          {!isMe && <Text style={{ color: '#007AFF', fontSize: 11, marginBottom: 3, fontWeight: 'bold' }}>{msg.senderEmail.split('@')[0]}</Text>}
          <Text style={{ color: isMe ? '#FFF' : textMain, fontSize: 16 }}>{msg.text}</Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.container, { backgroundColor: bg }]}>
        
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: borderCol, backgroundColor: bg }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={28} color="#007AFF" />
          </TouchableOpacity>
          <Image source={{ uri: 'https://ui-avatars.com/api/?name=Global+Chat&background=007AFF&color=fff' }} style={styles.avatar} />
          <View style={styles.headerInfo}>
            <Text style={[styles.headerName, { color: textMain }]}>Global Nax Room</Text>
            <Text style={[styles.headerStatus, { color: '#007AFF' }]}>Online (Live)</Text>
          </View>
        </View>

        {/* Messages Area */}
        <ScrollView 
          style={styles.chatArea} 
          contentContainerStyle={{ padding: 15, paddingBottom: 20 }}
          ref={scrollViewRef}
          onContentSizeChange={() => scrollViewRef.current.scrollToEnd({ animated: true })} // नया मैसेज आने पर अपने आप नीचे स्क्रॉल होगा
        >
          {messages.length === 0 ? (
            <Text style={{ textAlign: 'center', color: textSub, marginTop: 50 }}>Say hi to start the chat! 👋</Text>
          ) : (
            messages.map(renderMessage)
          )}
        </ScrollView>

        {/* Input Area */}
        <View style={[styles.inputArea, { backgroundColor: bg, borderTopColor: borderCol }]}>
          <TouchableOpacity style={styles.attachBtn}>
            <Ionicons name="add" size={28} color={textSub} />
          </TouchableOpacity>
          
          <View style={[styles.inputBox, { backgroundColor: inputBg }]}>
            <TextInput 
              style={[styles.input, { color: textMain }]} 
              placeholder="Type a message..." 
              placeholderTextColor={textSub}
              multiline
              value={inputText}
              onChangeText={setInputText}
            />
          </View>
          
          {/* Send Button */}
          <TouchableOpacity 
            style={[styles.micBtn, { backgroundColor: inputText.trim() ? '#007AFF' : '#555' }]}
            onPress={sendMessage}
            disabled={!inputText.trim()}
          >
            <Ionicons name={inputText.trim() ? "send" : "mic"} size={20} color="#FFF" style={inputText.trim() ? {marginLeft: 4} : {}} />
          </TouchableOpacity>
        </View>

      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: 45, paddingBottom: 10, paddingHorizontal: 10, borderBottomWidth: 1, zIndex: 10 },
  backBtn: { padding: 5, marginRight: 5 },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  headerInfo: { flex: 1, marginLeft: 12 },
  headerName: { fontSize: 18, fontWeight: 'bold' },
  headerStatus: { fontSize: 13, marginTop: 2 },
  chatArea: { flex: 1 },
  messageRow: { flexDirection: 'row', marginBottom: 15 },
  messageBubble: { maxWidth: '80%', padding: 12, borderRadius: 18 },
  msgReceived: { borderBottomLeftRadius: 4 },
  msgSent: { backgroundColor: '#007AFF', borderBottomRightRadius: 4 },
  inputArea: { flexDirection: 'row', alignItems: 'flex-end', padding: 10, borderTopWidth: 1, paddingBottom: 25 },
  attachBtn: { padding: 10, paddingBottom: 12 },
  inputBox: { flex: 1, flexDirection: 'row', alignItems: 'flex-end', borderRadius: 20, paddingHorizontal: 15, paddingVertical: 8, marginHorizontal: 10 },
  input: { flex: 1, fontSize: 16, maxHeight: 100, minHeight: 30, paddingTop: 5 },
  micBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginBottom: 4 }
});
