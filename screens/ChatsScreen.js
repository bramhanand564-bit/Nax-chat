import React from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

// 1. ये कुछ डमी चैट्स हैं ताकि स्क्रीन खाली न लगे
const DUMMY_CHATS = [
  { id: '1', name: 'Aisha', msg: 'Kal wali PDF bhej dena bhai.', time: '10:45 AM', unread: 2, avatar: 'https://randomuser.me/api/portraits/women/44.jpg' },
  { id: '2', name: 'Rahul Kumar', msg: 'Movie chalega aaj raat ko?', time: '09:30 AM', unread: 0, avatar: 'https://randomuser.me/api/portraits/men/32.jpg' },
  { id: '3', name: 'College Group 🎓', msg: 'Sharma Ji: Notes share kar diye.', time: 'Yesterday', unread: 15, avatar: 'https://ui-avatars.com/api/?name=CG&background=007AFF&color=fff' },
  { id: '4', name: 'Priya', msg: 'Thanks for the help! 😊', time: 'Yesterday', unread: 0, avatar: 'https://randomuser.me/api/portraits/women/68.jpg' },
  { id: '5', name: 'Aman Tech', msg: 'Bhai GitHub pe repo push kar di.', time: 'Monday', unread: 1, avatar: 'https://randomuser.me/api/portraits/men/46.jpg' },
];

export default function ChatsScreen() {
  const { isDark } = useTheme();

  // 2. कलर्स जो डार्क/लाइट मोड के हिसाब से बदलेंगे
  const bg = isDark ? '#121212' : '#F5F5F7';
  const textMain = isDark ? '#FFFFFF' : '#000000';
  const textSub = isDark ? '#888888' : '#666666';
  const borderCol = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';

  // 3. सिंगल चैट का डिज़ाइन (List Item)
  const renderChatItem = ({ item }) => (
    <TouchableOpacity style={[styles.chatItem, { borderBottomColor: borderCol }]}>
      {/* प्रोफाइल फोटो */}
      <Image source={{ uri: item.avatar }} style={styles.avatar} />
      
      {/* नाम और मैसेज */}
      <View style={styles.chatDetails}>
        <Text style={[styles.chatName, { color: textMain }]} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={[styles.chatMsg, { color: textSub }]} numberOfLines={1}>
          {item.msg}
        </Text>
      </View>

      {/* टाइम और अनरीड बैज */}
      <View style={styles.chatMeta}>
        <Text style={[styles.chatTime, { color: item.unread > 0 ? '#007AFF' : textSub }]}>
          {item.time}
        </Text>
        {item.unread > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{item.unread}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      {/* 4. टॉप हेडर डिज़ाइन */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: textMain }]}>Nax Chat</Text>
        <View style={styles.headerIcons}>
          <TouchableOpacity style={styles.iconBtn}>
            <Ionicons name="search" size={24} color={textMain} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn}>
            <Ionicons name="ellipsis-vertical" size={24} color={textMain} />
          </TouchableOpacity>
        </View>
      </View>

      {/* 5. चैट्स की लिस्ट */}
      <FlatList
        data={DUMMY_CHATS}
        keyExtractor={(item) => item.id}
        renderItem={renderChatItem}
        contentContainerStyle={{ paddingBottom: 100 }} // नेविगेशन बार के लिए नीचे जगह छोड़ी है
        showsVerticalScrollIndicator={false}
      />
      
      {/* Floating Action Button (नया मैसेज लिखने के लिए) */}
      <TouchableOpacity style={styles.fab}>
        <Ionicons name="chatbubble-ellipses" size={24} color="#FFF" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 40 }, // StatusBar से नीचे रखने के लिए
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingBottom: 15,
  },
  headerTitle: { fontSize: 28, fontWeight: 'bold' },
  headerIcons: { flexDirection: 'row' },
  iconBtn: { marginLeft: 15 },
  
  chatItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12, paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  avatar: { width: 55, height: 55, borderRadius: 27.5, backgroundColor: '#ddd' },
  chatDetails: { flex: 1, marginLeft: 15, justifyContent: 'center' },
  chatName: { fontSize: 17, fontWeight: '600', marginBottom: 4 },
  chatMsg: { fontSize: 14 },
  chatMeta: { alignItems: 'flex-end', justifyContent: 'center' },
  chatTime: { fontSize: 12, marginBottom: 6, fontWeight: '500' },
  badge: {
    backgroundColor: '#007AFF', // Premium Blue
    borderRadius: 12, minWidth: 24, height: 24,
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6,
  },
  badgeText: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },
  
  fab: {
    position: 'absolute', right: 20, bottom: 100, // नेविगेशन बार के ठीक ऊपर
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: '#007AFF',
    justifyContent: 'center', alignItems: 'center',
    elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 5,
  }
});
