// ==========================================
// FILE: components/chat/MessageBubble.js
// ==========================================
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

export default function MessageBubble({ item, isMe, isGlobal }) {
  const { isDark } = useTheme();

  const bubbleMe = '#087EFF';
  const bubbleOther = isDark ? '#1A2A3A' : '#FFFFFF';
  const textOther = isDark ? '#F4F7FA' : '#142532';
  const textSub = isDark ? '#8FA6B9' : '#6C8494';
  const border = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';

  return (
    <View style={[styles.messageWrapper, isMe ? styles.messageWrapperMe : styles.messageWrapperOther]}>
      {!isMe && isGlobal && (
        <Text style={[styles.senderName, { color: textSub }]}>@{item.senderName}</Text>
      )}
      <View style={[
        styles.messageBubble,
        isMe 
          ? { backgroundColor: bubbleMe, borderBottomRightRadius: 4 } 
          : { backgroundColor: bubbleOther, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: border }
      ]}>
        <Text style={[styles.messageText, { color: isMe ? '#FFF' : textOther }]}>{item.text}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  messageWrapper: { marginBottom: 15, maxWidth: '82%' },
  messageWrapperMe: { alignSelf: 'flex-end' },
  messageWrapperOther: { alignSelf: 'flex-start' },
  senderName: { fontSize: 11, marginBottom: 5, marginLeft: 4, fontWeight: '700' },
  messageBubble: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 20 },
  messageText: { fontSize: 15, lineHeight: 22 }
});
