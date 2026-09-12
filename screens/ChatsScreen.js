import React from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

const DUMMY_CHATS = [
  { id: '1', name: 'Aisha', msg: 'Kal wali PDF bhej dena bhai.', time: '10:45 AM', unread: 2, avatar: 'https://randomuser.me/api/portraits/women/44.jpg' },
  { id: '2', name: 'Rahul Kumar', msg: 'Movie chalega aaj raat ko?', time: '09:30 AM', unread: 0, avatar: 'https://randomuser.me/api/portraits/men/32.jpg' },
  { id: '3', name: 'College Group 🎓', msg: 'Sharma Ji: Notes share kar diye.', time: 'Yesterday', unread: 15, avatar: 'https://ui-avatars.com/api/?name=CG&background=007AFF&color=fff' },
];

// यहाँ हमने 'navigation' रिसीव किया है
export default function ChatsScreen({ navigation }) {
  const { isDark } = useTheme();
  const bg = isDark ? '#121212' : '#F5F5F7';
  const textMain = isDark ? '#FFFFFF' : '#000000';
  const textSub = isDark ? '#888888' : '#666666';
  const borderCol = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';

  const renderChatItem = ({ item }) => (
    <TouchableOpacity 
      style={[styles.chatItem, { borderBottomColor: borderCol }]}
      // यहाँ हमने जोड़ा है: जब टैप करें, तो "ChatRoom" वाली स्क्रीन पर चले जाएँ
      onPress={() => navigation.navigate('ChatRoom')}
    >
      <Image source={{ uri: item.avatar }} style={styles.avatar} />
      <View style={styles.chatDetails}>
        <Text style={[styles.chatName, { color: textMain }]} numberOfLines={1}>{item.name}</Text>
        <Text style={[styles.chatMsg, { color: textSub }]} numberOfLines={1}>{item.msg}</Text>
      </View>
      <View style={styles.chatMeta}>
        <Text style={[styles.chatTime, { color: item.unread > 0 ? '#007AFF' : textSub }]}>{item.time}</Text>
        {item.unread > 0 && (
          <View style={styles.badge}><Text style={styles.badgeText}>{item.unread}</Text></View>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: textMain }]}>Nax Chat</Text>
        <View style={styles.headerIcons}>
          <TouchableOpacity style={styles.iconBtn}><Ionicons name="search" size={24} color={textMain} /></TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn}><Ionicons name="ellipsis-vertical" size={24} color={textMain} /></TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={DUMMY_CHATS}
        keyExtractor={(item) => item.id}
        renderItem={renderChatItem}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      />
      
      <TouchableOpacity style={styles.fab}>
        <Ionicons name="chatbubble-ellipses" size={24} color="#FFF" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 15 },
  headerTitle: { fontSize: 28, fontWeight: 'bold' },
  headerIcons: { flexDirection: 'row' },
  iconBtn: { marginLeft: 15 },
  chatItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 20, borderBottomWidth: 1 },
  avatar: { width: 55, height: 55, borderRadius: 27.5, backgroundColor: '#ddd' },
  chatDetails: { flex: 1, marginLeft: 15, justifyContent: 'center' },
  chatName: { fontSize: 17, fontWeight: '600', marginBottom: 4 },
  chatMsg: { fontSize: 14 },
  chatMeta: { alignItems: 'flex-end', justifyContent: 'center' },
  chatTime: { fontSize: 12, marginBottom: 6, fontWeight: '500' },
  badge: { backgroundColor: '#007AFF', borderRadius: 12, minWidth: 24, height: 24, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6 },
  badgeText: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },
  fab: { position: 'absolute', right: 20, bottom: 100, width: 60, height: 60, borderRadius: 30, backgroundColor: '#007AFF', justifyContent: 'center', alignItems: 'center', elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 5 }
});
