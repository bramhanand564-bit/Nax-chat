// ==========================================
// FILE: screens/ChatRoomScreen.js
// ==========================================
import React, { useRef, useEffect } from 'react';
import { View, FlatList, StyleSheet, SafeAreaView, ActivityIndicator, Animated } from 'react-native';
import { auth } from '../firebaseConfig';
import { useTheme } from '../context/ThemeContext';

// --- CUSTOM HOOK ---
import useChatRoomLogic from '../hooks/useChatRoomLogic';

// --- COMPONENTS ---
import ChatHeader from '../components/chat/ChatHeader';
import MessageBubble from '../components/chat/MessageBubble';
import ChatInput from '../components/chat/ChatInput';

export default function ChatRoomScreen({ route, navigation }) {
  const { isDark } = useTheme();
  const { chatId = 'global', chatName = 'Global Room', friendId, friendAvatar } = route.params || {};
  const isGlobal = chatId === 'global';

  // 🚀 USE OUR NEW HOOK
  const { 
    messages, inputText, setInputText, loading, sending, 
    handleSend, handleMediaPick, handleDocumentPick, initiateCall 
  } = useChatRoomLogic(chatId, isGlobal, friendId, chatName, navigation);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const bg = isDark ? '#050A10' : '#F3F7FA';

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, []);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]}>
      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        
        {/* 🚀 HEADER (WITH CALL & VIDEO CALL ENABLED) */}
        <ChatHeader 
          chatName={chatName} 
          friendAvatar={friendAvatar}
          isGlobal={isGlobal} 
          onBack={() => navigation.goBack()} 
          onInfoPress={() => {}} 
          onCall={() => initiateCall('voice')}
          onVideoCall={() => initiateCall('video')}
        />

        {/* 💬 CHAT AREA */}
        <View style={styles.chatArea}>
          {loading ? (
            <ActivityIndicator size="large" color="#087EFF" style={{ marginTop: 30 }} />
          ) : (
            <FlatList
              data={messages}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <MessageBubble item={item} isMe={item.senderId === auth.currentUser?.uid} isGlobal={isGlobal} />
              )}
              inverted={true}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>

        {/* ⌨️ INPUT AREA (WITH ATTACHMENTS ENABLED) */}
        <ChatInput 
          value={inputText}
          onChangeText={setInputText}
          onSend={handleSend}
          sending={sending}
          onAttachImage={() => handleMediaPick('image')}
          onAttachVideo={() => handleMediaPick('video')}
          onAttachDocument={handleDocumentPick}
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
