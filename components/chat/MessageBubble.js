// ==========================================
// FILE: components/chat/MessageBubble.js
// ==========================================
import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';

export default function MessageBubble({ item, isMe, isGlobal }) {
  const { isDark } = useTheme();

  // --- ORIGINAL COLORS PRESERVED ---
  const bubbleMe = '#087EFF';
  const bubbleOther = isDark ? '#1A2A3A' : '#FFFFFF';
  const textOther = isDark ? '#F4F7FA' : '#142532';
  const textSub = isDark ? '#8FA6B9' : '#6C8494';
  const border = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';

  // 🕒 PREMIUM FEATURE: Time Formatter
  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <View style={[styles.messageWrapper, isMe ? styles.messageWrapperMe : styles.messageWrapperOther]}>
      
      {/* ORIGINAL SENDER NAME FOR GLOBAL CHAT */}
      {!isMe && isGlobal && (
        <Text style={[styles.senderName, { color: textSub }]}>@{item.senderName}</Text>
      )}
      
      <View style={[
        styles.messageBubble,
        isMe 
          ? { backgroundColor: bubbleMe, borderBottomRightRadius: 4 } 
          : { backgroundColor: bubbleOther, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: border }
      ]}>
        
        {/* 📷 PREMIUM: IMAGE RENDERING */}
        {item.type === 'image' && item.fileUri && (
          <Image source={{ uri: item.fileUri }} style={styles.mediaImage} resizeMode="cover" />
        )}

        {/* 🎥 PREMIUM: VIDEO RENDERING */}
        {item.type === 'video' && item.fileUri && (
          <TouchableOpacity activeOpacity={0.8} style={styles.mediaVideo}>
            <Ionicons name="play-circle" size={44} color="#FFF" />
            <Text style={{color: '#FFF', fontSize: 12, marginTop: 5, fontWeight: '600'}}>Play Video</Text>
          </TouchableOpacity>
        )}

        {/* 📄 PREMIUM: DOCUMENT RENDERING */}
        {item.type === 'file' && (
          <TouchableOpacity activeOpacity={0.8} style={[styles.mediaDocument, { backgroundColor: isMe ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.05)' }]}>
            <Ionicons name="document-text" size={28} color={isMe ? "#FFF" : "#087EFF"} />
            <Text style={[styles.docText, { color: isMe ? '#FFF' : textOther }]} numberOfLines={1}>
              {item.fileName || 'Document File'}
            </Text>
          </TouchableOpacity>
        )}

        {/* 💬 ORIGINAL TEXT RENDERING (Modified slightly to look good under images) */}
        {item.text ? (
          <Text style={[styles.messageText, { color: isMe ? '#FFF' : textOther, marginTop: (item.type && item.type !== 'text') ? 6 : 0 }]}>
            {item.text}
          </Text>
        ) : null}

        {/* 🕒 PREMIUM: MESSAGE TIMESTAMP */}
        <Text style={[styles.timestamp, { color: isMe ? 'rgba(255,255,255,0.7)' : textSub }]}>
          {formatTime(item.createdAt)}
        </Text>

      </View>
    </View>
  );
}

// --- ORIGINAL STYLES PRESERVED + MEDIA STYLES ADDED ---
const styles = StyleSheet.create({
  messageWrapper: { marginBottom: 15, maxWidth: '82%' },
  messageWrapperMe: { alignSelf: 'flex-end' },
  messageWrapperOther: { alignSelf: 'flex-start' },
  senderName: { fontSize: 11, marginBottom: 5, marginLeft: 4, fontWeight: '700' },
  messageBubble: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20 },
  messageText: { fontSize: 15, lineHeight: 22 },
  
  // Premium Features Styles
  timestamp: { fontSize: 10, alignSelf: 'flex-end', marginTop: 4 },
  mediaImage: { width: 220, height: 220, borderRadius: 12, marginBottom: 5 },
  mediaVideo: { width: 220, height: 150, backgroundColor: '#000', borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 5 },
  mediaDocument: { flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 10, marginBottom: 5, width: 220 },
  docText: { marginLeft: 10, fontSize: 14, fontWeight: '600', flex: 1 }
});
