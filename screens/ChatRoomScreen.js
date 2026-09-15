// ==========================================
// FILE: screens/ChatRoomScreen.js
// ==========================================
import React, { useState, useEffect, useRef } from 'react';
import { View, FlatList, StyleSheet, SafeAreaView, ActivityIndicator, Alert, Animated } from 'react-native';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';
import { useTheme } from '../context/ThemeContext';

import ChatHeader from '../components/chat/ChatHeader';
import MessageBubble from '../components/chat/MessageBubble';
import ChatInput from '../components/chat/ChatInput';

export default function ChatRoomScreen({ route, navigation }) {
  const { isDark } = useTheme();
  const { chatId = 'global', chatName = 'Global Room', friendId } = route.params || {};

  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const isGlobal = chatId === 'global';
  const bg = isDark ? '#050A10' : '#F3F7FA';

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();

    if (!auth.currentUser) return;

    const q = query(collection(db, 'chats', chatId, 'messages'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMessages(msgs);
      setLoading(false);
    }, (error) => {
      console.log("Chat fetch error:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [chatId]);

  const handleSend = async () => {
    if (!inputText.trim() || !auth.currentUser) return;
    
    const msgText = inputText.trim();
    setInputText('');
    setSending(true);

    try {
      if (!isGlobal) {
        await setDoc(doc(db, 'chats', chatId), { 
          lastUpdated: serverTimestamp(),
          participants: [auth.currentUser.uid, friendId].filter(Boolean)
        }, { merge: true });
      }

      await addDoc(collection(db, 'chats', chatId, 'messages'), {
        text: msgText,
        senderId: auth.currentUser.uid,
        senderName: auth.currentUser.email?.split('@')[0] || 'User',
        createdAt: serverTimestamp(),
        type: 'text'
      });
    } catch (error) {
      console.log('Send Error:', error);
      Alert.alert('Error', 'Message send failed. Please check your connection.');
    } finally {
      setSending(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]}>
      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        <ChatHeader 
          chatName={chatName} 
          isGlobal={isGlobal} 
          onBack={() => navigation.goBack()} 
          onInfoPress={() => {}} 
        />

        <View style={styles.chatArea}>
          {loading ? (
            <ActivityIndicator size="large" color="#087EFF" style={{ marginTop: 30 }} />
          ) : (
            <FlatList
              data={messages}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <MessageBubble 
                  item={item} 
                  isMe={item.senderId === auth.currentUser?.uid} 
                  isGlobal={isGlobal} 
                />
              )}
              inverted={true}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>

        <ChatInput 
          value={inputText}
          onChangeText={setInputText}
          onSend={handleSend}
          sending={sending}
          onAttach={() => {}}
        />
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  chatArea: { flex: 1 },
  listContent: { paddingHorizontal: 15, paddingBottom: 15, paddingTop: 10 }
});
