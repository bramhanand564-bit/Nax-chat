import React from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

// 1. डमी सोशल पोस्ट्स का डेटा
const DUMMY_POSTS = [
  {
    id: 'p1',
    userName: 'Aisha',
    userAvatar: 'https://randomuser.me/api/portraits/women/44.jpg',
    time: '2 hours ago',
    content: 'Just finished setting up my new workspace! 💻✨ What do you guys think?',
    image: 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=800&q=80',
    likes: 124,
    comments: 18,
  },
  {
    id: 'p2',
    userName: 'Rahul Kumar',
    userAvatar: 'https://randomuser.me/api/portraits/men/32.jpg',
    time: '5 hours ago',
    content: 'Can anyone suggest a good JavaScript framework for building 3D games in the browser? 🎮',
    image: null, // इस पोस्ट में कोई फोटो नहीं है, सिर्फ टेक्स्ट है
    likes: 45,
    comments: 32,
  },
  {
    id: 'p3',
    userName: 'Priya',
    userAvatar: 'https://randomuser.me/api/portraits/women/68.jpg',
    time: 'Yesterday',
    content: 'Coffee and coding. The perfect weekend combination. ☕❤️',
    image: 'https://images.unsplash.com/photo-1555680202-c86f0e12f086?w=800&q=80',
    likes: 210,
    comments: 40,
  }
];

export default function MomentsScreen() {
  const { isDark } = useTheme();

  // 2. थीम के हिसाब से कलर्स
  const bg = isDark ? '#121212' : '#F5F5F7';
  const textMain = isDark ? '#FFFFFF' : '#000000';
  const textSub = isDark ? '#888888' : '#666666';
  const cardBg = isDark ? '#1E1E1E' : '#FFFFFF';
  const borderCol = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';

  // 3. सिंगल पोस्ट का डिज़ाइन
  const renderPost = ({ item }) => (
    <View style={[styles.postCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
      
      {/* पोस्ट हेडर (प्रोफाइल और नाम) */}
      <View style={styles.postHeader}>
        <Image source={{ uri: item.userAvatar }} style={styles.avatar} />
        <View style={styles.headerTextWrap}>
          <Text style={[styles.userName, { color: textMain }]}>{item.userName}</Text>
          <Text style={styles.timeText}>{item.time}</Text>
        </View>
        <TouchableOpacity>
          <Ionicons name="ellipsis-horizontal" size={20} color={textSub} />
        </TouchableOpacity>
      </View>

      {/* पोस्ट का टेक्स्ट */}
      <Text style={[styles.postContent, { color: textMain }]}>{item.content}</Text>

      {/* पोस्ट की फोटो (अगर है तो) */}
      {item.image && (
        <Image source={{ uri: item.image }} style={styles.postImage} resizeMode="cover" />
      )}

      {/* लाइक, कमेंट, और शेयर बटन */}
      <View style={[styles.actionRow, { borderTopColor: borderCol }]}>
        <TouchableOpacity style={styles.actionBtn}>
          <Ionicons name="heart-outline" size={22} color={textSub} />
          <Text style={[styles.actionText, { color: textSub }]}>{item.likes}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.actionBtn}>
          <Ionicons name="chatbubble-outline" size={20} color={textSub} />
          <Text style={[styles.actionText, { color: textSub }]}>{item.comments}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.actionBtn}>
          <Ionicons name="share-social-outline" size={22} color={textSub} />
        </TouchableOpacity>
      </View>
      
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      
      {/* 4. टॉप हेडर */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: textMain }]}>Moments</Text>
        <TouchableOpacity style={styles.cameraBtn}>
          <Ionicons name="camera" size={24} color={textMain} />
        </TouchableOpacity>
      </View>

      {/* 5. पोस्ट्स की लिस्ट */}
      <FlatList
        data={DUMMY_POSTS}
        keyExtractor={(item) => item.id}
        renderItem={renderPost}
        contentContainerStyle={{ paddingBottom: 100, paddingTop: 10 }}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 40 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingBottom: 10,
  },
  headerTitle: { fontSize: 28, fontWeight: 'bold' },
  cameraBtn: { padding: 5 },
  
  postCard: {
    marginBottom: 15,
    borderTopWidth: 1, borderBottomWidth: 1,
    paddingTop: 15,
  },
  postHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 15, marginBottom: 12,
  },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#ddd' },
  headerTextWrap: { flex: 1, marginLeft: 10 },
  userName: { fontSize: 16, fontWeight: '600' },
  timeText: { fontSize: 12, color: '#888', marginTop: 2 },
  
  postContent: {
    fontSize: 15, lineHeight: 22,
    paddingHorizontal: 15, marginBottom: 12,
  },
  postImage: {
    width: '100%', height: 300,
    backgroundColor: '#333',
  },
  actionRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 15, paddingVertical: 12,
    borderTopWidth: 1,
  },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center',
    marginRight: 25,
  },
  actionText: { fontSize: 14, marginLeft: 6, fontWeight: '500' },
});
