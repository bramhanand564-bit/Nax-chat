import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

export default function BotChatScreen({ route, navigation }) {
  // Portals स्क्रीन से बॉट का डेटा यहाँ आएगा
  const { botName, botRules, creatorName } = route.params;
  const { isDark } = useTheme();
  
  // डिफ़ॉल्ट वेलकम मैसेज
  const [messages, setMessages] = useState([
    { id: '1', text: `Hi! I am ${botName} 🤖\nCreated by @${creatorName}.\nSay hello to start!`, sender: 'bot' }
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollViewRef = useRef();

  const bg = isDark ? '#121212' : '#F5F5F7';
  const textMain = isDark ? '#FFFFFF' : '#000000';
  const textSub = isDark ? '#888888' : '#666666';
  const inputBg = isDark ? '#1E1E1E' : '#FFFFFF';
  const borderCol = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';

  const botAvatar = `https://ui-avatars.com/api/?name=${botName.replace(' ', '+')}&background=007AFF&color=fff`;

  // मैसेज भेजने और बॉट का रिप्लाई जनरेट करने का लॉजिक
  const sendMessage = () => {
    if (!inputText.trim()) return;
    const userText = inputText.trim();
    setInputText('');

    // 1. यूज़र का मैसेज स्क्रीन पर दिखाओ
    const newMsg = { id: Date.now().toString(), text: userText, sender: 'user' };
    setMessages(prev => [...prev, newMsg]);
    setIsTyping(true);

    // 2. बॉट का ऑटोमैटिक रिप्लाई (1 सेकंड के डिले के साथ ताकि असली लगे)
    setTimeout(() => {
      let replyText = "I'm still learning! I didn't understand that command. 🤔"; // डिफ़ॉल्ट रिप्लाई
      
      // चेक करो कि यूज़र के मैसेज में कोई 'Trigger Word' है या नहीं
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
        <View style={[styles.messageBubble, isMe ? styles.msgSent : [styles.msgReceived, { backgroundColor: isDark ? '#1E1E1E' : '#E9E9EB' }]]}>
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
          <Image source={{ uri: botAvatar }} style={styles.headerAvatar} />
          <View style={styles.headerInfo}>
            <Text style={[styles.headerName, { color: textMain }]}>{botName}</Text>
            <Text style={[styles.headerStatus, { color: '#34C759' }]}>{isTyping ? 'typing...' : 'Bot • Online'}</Text>
          </View>
        </View>

        {/* Messages */}
        <ScrollView 
          style={styles.chatArea} 
          contentContainerStyle={{ padding: 15, paddingBottom: 20 }}
          ref={scrollViewRef}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
        >
          {messages.map(renderMessage)}
          {isTyping && <Text style={{ color: textSub, marginLeft: 50, fontSize: 12, marginTop: -5, fontStyle: 'italic' }}>{botName} is typing...</Text>}
        </ScrollView>

        {/* Input Box */}
        <View style={[styles.inputArea, { backgroundColor: bg, borderTopColor: borderCol }]}>
          <View style={[styles.inputBox, { backgroundColor: inputBg }]}>
            <TextInput 
              style={[styles.input, { color: textMain }]} 
              placeholder="Message the bot..." 
              placeholderTextColor={textSub}
              value={inputText}
              onChangeText={setInputText}
            />
          </View>
          <TouchableOpacity 
            style={[styles.sendBtn, { backgroundColor: inputText.trim() ? '#007AFF' : '#555' }]}
            onPress={sendMessage}
            disabled={!inputText.trim()}
          >
            <Ionicons name="send" size={18} color="#FFF" style={{ marginLeft: 3 }} />
          </TouchableOpacity>
        </View>

      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: 45, paddingBottom: 10, paddingHorizontal: 10, borderBottomWidth: 1 },
  backBtn: { padding: 5, marginRight: 5 },
  headerAvatar: { width: 40, height: 40, borderRadius: 20 },
  headerInfo: { flex: 1, marginLeft: 12 },
  headerName: { fontSize: 18, fontWeight: 'bold' },
  headerStatus: { fontSize: 13, marginTop: 2 },
  chatArea: { flex: 1 },
  messageRow: { flexDirection: 'row', marginBottom: 15, alignItems: 'flex-end' },
  msgAvatar: { width: 30, height: 30, borderRadius: 15, marginRight: 8 },
  messageBubble: { maxWidth: '75%', padding: 12, borderRadius: 18 },
  msgReceived: { borderBottomLeftRadius: 4 },
  msgSent: { backgroundColor: '#007AFF', borderBottomRightRadius: 4 },
  inputArea: { flexDirection: 'row', alignItems: 'center', padding: 10, borderTopWidth: 1, paddingBottom: 25 },
  inputBox: { flex: 1, flexDirection: 'row', alignItems: 'center', borderRadius: 20, paddingHorizontal: 15, height: 45, marginHorizontal: 10 },
  input: { flex: 1, fontSize: 16 },
  sendBtn: { width: 45, height: 45, borderRadius: 22.5, justifyContent: 'center', alignItems: 'center' }
});
