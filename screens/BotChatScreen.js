import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, Image, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

export default function BotChatScreen({ route, navigation }) {
  // Portals स्क्रीन से बॉट का डेटा यहाँ आएगा (Original Logic)
  const { botName, botRules, creatorName } = route.params;
  const { isDark } = useTheme();
  
  const [messages, setMessages] = useState([
    { id: '1', text: `Hi! I am ${botName} 🤖\nCreated by @${creatorName || 'creator'}.\nSay hello to start!`, sender: 'bot' }
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollViewRef = useRef();

  // Super Glassy, No-Neon, Futuristic Palette
  const bg = isDark ? '#0A0A0C' : '#F2F2F7';
  const textMain = isDark ? '#F5F5F7' : '#1C1C1E';
  const textSub = isDark ? '#8E8E93' : '#6C6C70';
  const headerBg = isDark ? 'rgba(10, 10, 12, 0.85)' : 'rgba(242, 242, 247, 0.85)';
  const borderCol = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)';
  
  // Chat Bubble Colors (High Contrast)
  const botBubbleBg = isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(255, 255, 255, 0.8)';
  const userBubbleBg = isDark ? '#FFFFFF' : '#1C1C1E';
  const userTextCol = isDark ? '#000000' : '#FFFFFF';
  
  // Input Area
  const inputBg = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)';
  const sendBtnBg = isDark ? '#FFFFFF' : '#1C1C1E';
  const sendBtnIcon = isDark ? '#000000' : '#FFFFFF';

  const botAvatar = `https://ui-avatars.com/api/?name=${botName?.replace(' ', '+')}&background=random&color=fff`;

  // मैसेज भेजने और बॉट का रिप्लाई जनरेट करने का लॉजिक (Untouched / Safe)
  const sendMessage = () => {
    if (!inputText.trim()) return;
    const userText = inputText.trim();
    setInputText('');

    // 1. यूज़र का मैसेज स्क्रीन पर दिखाओ
    const newMsg = { id: Date.now().toString(), text: userText, sender: 'user' };
    setMessages(prev => [...prev, newMsg]);
    setIsTyping(true);

    // 2. बॉट का ऑटोमैटिक रिप्लाई (1.2 सेकंड के डिले के साथ)
    setTimeout(() => {
      let replyText = "I'm still learning! I didn't understand that command. 🤔"; 
      
      if (botRules && botRules.length > 0) {
        const matchedRule = botRules.find(r => userText.toLowerCase().includes(r.trigger.toLowerCase()));
        if (matchedRule) {
          replyText = matchedRule.reply;
        }
      }

      const botReplyMsg = { id: (Date.now() + 1).toString(), text: replyText, sender: 'bot' };
      setMessages(prev => [...prev, botReplyMsg]);
      setIsTyping(false);
    }, 1200);
  };

  const renderMessage = (msg) => {
    const isMe = msg.sender === 'user';
    return (
      <View key={msg.id} style={[styles.messageRow, { justifyContent: isMe ? 'flex-end' : 'flex-start' }]}>
        {!isMe && <Image source={{ uri: botAvatar }} style={styles.msgAvatar} />}
        <View 
          style={[
            styles.messageBubble, 
            isMe 
              ? [styles.msgSent, { backgroundColor: userBubbleBg }] 
              : [styles.msgReceived, { backgroundColor: botBubbleBg, borderColor: borderCol, borderWidth: 1 }]
          ]}
        >
          <Text style={{ color: isMe ? userTextCol : textMain, fontSize: 15, fontWeight: '500', lineHeight: 22 }}>
            {msg.text}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bg }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        
        {/* 🌟 Sleek Glassy Header */}
        <View style={[styles.header, { borderBottomColor: borderCol, backgroundColor: headerBg }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={26} color={textMain} />
          </TouchableOpacity>
          <Image source={{ uri: botAvatar }} style={styles.headerAvatar} />
          <View style={styles.headerInfo}>
            <Text style={[styles.headerName, { color: textMain }]} numberOfLines={1}>{botName}</Text>
            <View style={styles.statusRow}>
              {isTyping ? (
                <Text style={[styles.headerStatus, { color: '#007AFF', fontStyle: 'italic' }]}>typing...</Text>
              ) : (
                <>
                  <View style={styles.onlineDot} />
                  <Text style={[styles.headerStatus, { color: textSub }]}>Bot • Online</Text>
                </>
              )}
            </View>
          </View>
          <TouchableOpacity style={styles.menuBtn}>
            <Ionicons name="ellipsis-horizontal" size={24} color={textMain} />
          </TouchableOpacity>
        </View>

        {/* 🌟 Messages Area */}
        <ScrollView 
          style={styles.chatArea} 
          contentContainerStyle={{ padding: 20, paddingBottom: 30 }}
          ref={scrollViewRef}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
          showsVerticalScrollIndicator={false}
        >
          {messages.map(renderMessage)}
          
          {/* Subtle Typing Indicator */}
          {isTyping && (
            <View style={styles.typingContainer}>
              <Image source={{ uri: botAvatar }} style={[styles.msgAvatar, { width: 20, height: 20, opacity: 0.5 }]} />
              <Text style={{ color: textSub, fontSize: 12, fontWeight: '600', fontStyle: 'italic' }}>is typing...</Text>
            </View>
          )}
        </ScrollView>

        {/* 🌟 Futuristic Input Box */}
        <View style={[styles.inputArea, { backgroundColor: bg, borderTopColor: borderCol }]}>
          <View style={[styles.inputBox, { backgroundColor: inputBg, borderColor: borderCol }]}>
            <TextInput 
              style={[styles.input, { color: textMain }]} 
              placeholder="Message..." 
              placeholderTextColor={textSub}
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={200}
            />
          </View>
          <TouchableOpacity 
            style={[
              styles.sendBtn, 
              { backgroundColor: inputText.trim() ? sendBtnBg : inputBg }
            ]}
            onPress={sendMessage}
            disabled={!inputText.trim()}
            activeOpacity={0.8}
          >
            <Ionicons 
              name="arrow-up" 
              size={20} 
              color={inputText.trim() ? sendBtnIcon : textSub} 
            />
          </TouchableOpacity>
        </View>

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1, zIndex: 10 },
  backBtn: { padding: 4, marginRight: 8, marginLeft: -4 },
  headerAvatar: { width: 42, height: 42, borderRadius: 16 },
  headerInfo: { flex: 1, marginLeft: 14 },
  headerName: { fontSize: 17, fontWeight: '700', letterSpacing: -0.3, marginBottom: 2 },
  statusRow: { flexDirection: 'row', alignItems: 'center' },
  onlineDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#34C759', marginRight: 6 },
  headerStatus: { fontSize: 12, fontWeight: '500' },
  menuBtn: { padding: 8 },
  
  chatArea: { flex: 1 },
  messageRow: { flexDirection: 'row', marginBottom: 20, alignItems: 'flex-end' },
  msgAvatar: { width: 28, height: 28, borderRadius: 10, marginRight: 10, marginBottom: 4 },
  messageBubble: { maxWidth: '80%', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 20 },
  msgReceived: { borderBottomLeftRadius: 6 },
  msgSent: { borderBottomRightRadius: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 2 },
  
  typingContainer: { flexDirection: 'row', alignItems: 'center', marginLeft: 4, marginTop: -5, opacity: 0.8 },
  
  inputArea: { flexDirection: 'row', alignItems: 'flex-end', padding: 12, paddingHorizontal: 16, borderTopWidth: 1, paddingBottom: Platform.OS === 'ios' ? 10 : 20 },
  inputBox: { flex: 1, flexDirection: 'row', alignItems: 'center', borderRadius: 24, paddingHorizontal: 16, minHeight: 48, maxHeight: 120, borderWidth: 1, marginRight: 12, paddingVertical: 10 },
  input: { flex: 1, fontSize: 15, fontWeight: '500' },
  sendBtn: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 2 }
});
