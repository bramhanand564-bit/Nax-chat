import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, TextInput, ActivityIndicator, Keyboard } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

// Firebase Imports
import { db, auth } from '../firebaseConfig';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp } from 'firebase/firestore';

export default function MomentsScreen() {
  const { isDark } = useTheme();
  
  // States
  const [posts, setPosts] = useState([]);
  const [postText, setPostText] = useState('');
  const [loading, setLoading] = useState(false);
  
  const user = auth.currentUser;

  // Colors
  const bg = isDark ? '#121212' : '#F5F5F7';
  const textMain = isDark ? '#FFFFFF' : '#000000';
  const textSub = isDark ? '#888888' : '#666666';
  const cardBg = isDark ? '#1E1E1E' : '#FFFFFF';
  const borderCol = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';

  // 1. Firebase से लाइव पोस्ट मंगाना
  useEffect(() => {
    const q = query(collection(db, 'moments'), orderBy('createdAt', 'desc')); // desc मतलब नई पोस्ट सबसे ऊपर
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedPosts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setPosts(fetchedPosts);
    });
    return unsubscribe;
  }, []);

  // 2. नई पोस्ट Firebase में डालना
  const handlePost = async () => {
    if (!postText.trim()) return;
    setLoading(true);
    Keyboard.dismiss(); // कीबोर्ड बंद करें
    try {
      await addDoc(collection(db, 'moments'), {
        content: postText,
        userName: user?.displayName || 'Nax User', // अगर नाम नहीं है तो Nax User
        userEmail: user?.email,
        likes: 0,
        comments: 0,
        createdAt: serverTimestamp()
      });
      setPostText(''); // इनपुट खाली करें
    } catch (error) {
      console.log("Error posting: ", error);
    }
    setLoading(false);
  };

  // 3. सिंगल पोस्ट का डिज़ाइन
  const renderPost = ({ item }) => {
    const avatarUrl = `https://ui-avatars.com/api/?name=${item.userName}&background=random&color=fff`;

    return (
      <View style={[styles.postCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
        <View style={styles.postHeader}>
          <Image source={{ uri: avatarUrl }} style={styles.avatar} />
          <View style={styles.headerTextWrap}>
            <Text style={[styles.userName, { color: textMain }]}>{item.userName}</Text>
            <Text style={styles.timeText}>Just now</Text>
          </View>
          <TouchableOpacity>
            <Ionicons name="ellipsis-horizontal" size={20} color={textSub} />
          </TouchableOpacity>
        </View>

        <Text style={[styles.postContent, { color: textMain }]}>{item.content}</Text>

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
  };

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      
      {/* Top Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: textMain }]}>Moments</Text>
        <TouchableOpacity style={styles.cameraBtn}>
          <Ionicons name="camera" size={24} color={textMain} />
        </TouchableOpacity>
      </View>

      {/* Create Post Section */}
      <View style={[styles.createPostArea, { backgroundColor: cardBg, borderBottomColor: borderCol }]}>
        <Image 
          source={{ uri: `https://ui-avatars.com/api/?name=${user?.displayName || 'User'}&background=007AFF&color=fff` }} 
          style={styles.myAvatar} 
        />
        <TextInput 
          style={[styles.postInput, { color: textMain }]}
          placeholder="What's on your mind?"
          placeholderTextColor={textSub}
          value={postText}
          onChangeText={setPostText}
          multiline
        />
        <TouchableOpacity 
          style={[styles.postBtn, { backgroundColor: postText.trim() ? '#007AFF' : '#555' }]}
          onPress={handlePost}
          disabled={!postText.trim() || loading}
        >
          {loading ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={styles.postBtnText}>Post</Text>}
        </TouchableOpacity>
      </View>

      {/* Feed List */}
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={renderPost}
        contentContainerStyle={{ paddingBottom: 100, paddingTop: 10 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={<Text style={{ textAlign: 'center', color: textSub, marginTop: 50 }}>No moments yet. Be the first to post! ✨</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 10 },
  headerTitle: { fontSize: 28, fontWeight: 'bold' },
  cameraBtn: { padding: 5 },
  
  createPostArea: { flexDirection: 'row', alignItems: 'center', padding: 15, borderBottomWidth: 1, elevation: 2 },
  myAvatar: { width: 40, height: 40, borderRadius: 20, marginRight: 10 },
  postInput: { flex: 1, fontSize: 16, maxHeight: 80, minHeight: 40 },
  postBtn: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, marginLeft: 10, justifyContent: 'center' },
  postBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },

  postCard: { marginBottom: 15, borderTopWidth: 1, borderBottomWidth: 1, paddingTop: 15 },
  postHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, marginBottom: 12 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#ddd' },
  headerTextWrap: { flex: 1, marginLeft: 10 },
  userName: { fontSize: 16, fontWeight: '600' },
  timeText: { fontSize: 12, color: '#888', marginTop: 2 },
  postContent: { fontSize: 15, lineHeight: 22, paddingHorizontal: 15, marginBottom: 12 },
  actionRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, paddingVertical: 12, borderTopWidth: 1 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', marginRight: 25 },
  actionText: { fontSize: 14, marginLeft: 6, fontWeight: '500' },
});
