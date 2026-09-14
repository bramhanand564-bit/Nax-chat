import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

export default function ChatItem({ item, currentUser, onPress }) {
  const { isDark } = useTheme();

  // Colors
  const cardBg = isDark ? '#132B3B' : '#FFFFFF';
  const textMain = isDark ? '#F5F9FC' : '#142532';
  const textSub = isDark ? '#8EAABD' : '#6C8494';
  const border = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';

  // Helpers
  const normalizeUsername = (value) => {
    let username = String(value || '').trim().toLowerCase();
    if (username.startsWith('@')) username = username.substring(1);
    return username;
  };

  const getChatName = () => item.friendName || item.name || item.displayName || item.friendUsername || item.username || 'Nax User';

  const getLastMessage = () => {
    if (item.lastMessage !== undefined) return item.lastMessage || 'No messages yet';
    if (item.message) return item.message;
    if (item.lastText) return item.lastText;
    const username = item.friendUsername || item.username;
    if (username) return `@${normalizeUsername(username)}`;
    return 'Start chatting';
  };

  const getUnread = () => {
    if (item.unread && typeof item.unread === 'object') return item.unread[currentUser?.uid] || 0;
    if (item.unreadCount && typeof item.unreadCount === 'object') return item.unreadCount[currentUser?.uid] || 0;
    if (typeof item.unread === 'number') return item.unread;
    if (typeof item.unreadCount === 'number') return item.unreadCount;
    return 0;
  };

  const getAvatar = () => {
    const avatar = item.friendAvatar || item.avatar || item.photoURL;
    if (avatar) return { uri: avatar };
    const name = encodeURIComponent(getChatName());
    return { uri: `https://ui-avatars.com/api/?name=${name}&background=1687FF&color=ffffff` };
  };

  const getTime = (value) => {
    if (!value) return 0;
    if (typeof value.toMillis === 'function') return value.toMillis();
    if (typeof value.seconds === 'number') return value.seconds * 1000;
    if (typeof value === 'number') return value;
    return 0;
  };

  const formatDate = (value) => {
    const time = getTime(value);
    if (!time) return '';
    const date = new Date(time);
    const now = new Date();
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { day: 'numeric', month: 'short' });
  };

  const chatName = getChatName();
  const lastMessage = getLastMessage();
  const unread = getUnread();

  return (
    <TouchableOpacity activeOpacity={0.82} style={[styles.chatCard, { backgroundColor: cardBg, borderColor: border }]} onPress={() => onPress(item)}>
      <Image source={getAvatar()} style={styles.avatar} />
      <View style={styles.chatInfo}>
        <View style={styles.chatTop}>
          <Text style={[styles.chatName, { color: textMain }]} numberOfLines={1}>{chatName}</Text>
          <Text style={[styles.chatTime, { color: textSub }]}>{formatDate(item.lastMessageTime || item.updatedAt)}</Text>
        </View>
        <View style={styles.chatBottom}>
          <Text style={[styles.chatMessage, { color: textSub }]} numberOfLines={1}>{lastMessage}</Text>
          {unread > 0 && (
            <View style={styles.unread}>
              <Text style={styles.unreadText}>{unread > 99 ? '99+' : unread}</Text>
            </View>
          )}
        </View>
      </View>
      <Ionicons name="chevron-forward" size={18} color={textSub} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chatCard: { minHeight: 76, padding: 12, borderRadius: 17, borderWidth: 1, marginBottom: 10, flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 52, height: 52, borderRadius: 26 },
  chatInfo: { flex: 1, marginLeft: 13, marginRight: 8 },
  chatTop: { flexDirection: 'row', alignItems: 'center' },
  chatName: { flex: 1, fontSize: 16, fontWeight: '800' },
  chatTime: { fontSize: 11, marginLeft: 6 },
  chatBottom: { flexDirection: 'row', alignItems: 'center', marginTop: 5 },
  chatMessage: { flex: 1, fontSize: 14 },
  unread: { minWidth: 20, height: 20, paddingHorizontal: 5, borderRadius: 10, backgroundColor: '#1687FF', alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
  unreadText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800' }
});
