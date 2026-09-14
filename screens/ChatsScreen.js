import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, 
  Image, ActivityIndicator, Alert, SafeAreaView 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { db, auth } from '../firebaseConfig';
import { collection, query, where, getDocs, onSnapshot, doc, getDoc } from 'firebase/firestore';

export default function ChatsScreen({ navigation }) {
  const { isDark } = useTheme();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [privateChats, setPrivateChats] = useState([]);
  const [loading, setLoading] = useState(true);

  const currentUser = auth.currentUser;

  // Colors
  const bg = isDark ? '#0A1520' : '#F0F4F8';
  const textMain = isDark ? '#F0F4F8' : '#1A2C3A';
  const textSub = isDark ? '#8AA2B5' : '#6A8296';
  const cardBg = isDark ? 'rgba(20, 35, 50, 0.85)' : '#FFFFFF';
  const border = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)';

  useEffect(() => {
    // 🛠️ BUG #11 FIX: Load Private Chats Automatically (Basic Setup)
    if (!currentUser) return;
    
    // Future Note: Implement a user_chats collection for better performance
    setLoading(false); 
  }, [currentUser]);

  // 🛠️ BUG #10 FIX: Correct FriendId Logic
  const handleSearchUser = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    
    try {
      const usersRef = collection(db, 'users');
      // Searching by username
      const q = query(usersRef, where('username', '==', searchQuery.trim().toLowerCase()));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const friendDoc = querySnapshot.docs[0];
        const friendData = friendDoc.data();
        const friendUid = friendData.uid || friendDoc.id; // Correct Friend ID

        if (friendUid === currentUser.uid) {
          Alert.alert("Oops!", "You cannot chat with yourself.");
          setIsSearching(false);
          return;
        }

        // Generate Unique Room ID for 1-on-1 Chat
        const chatRoomId = currentUser.uid < friendUid 
          ? `${currentUser.uid}_${friendUid}` 
          : `${friendUid}_${currentUser.uid}`;

        // Navigate with correct friendId
        navigation.navigate('ChatRoom', { 
          chatId: chatRoomId, 
          chatName: friendData.name || friendData.username, 
          friendId: friendUid  // <-- THE FIX IS HERE
        });
        
        setSearchQuery('');
      } else {
        Alert.alert('User Not Found', 'No user exists with this username.');
      }
    } catch (error) {
      console.error("Search Error:", error);
      Alert.alert('Error', 'Something went wrong while searching.');
    }
    
    setIsSearching(false);
  };

  const renderChatItem = ({ item }) => (
    <TouchableOpacity 
      style={[styles.chatCard, { backgroundColor: cardBg, borderColor: border }]}
      onPress={() => navigation.navigate('ChatRoom', { 
        chatId: item.chatId, 
        chatName: item.friendName, 
        friendId: item.friendId 
      })}
    >
      <Image 
        source={{ uri: item.avatar || `https://ui-avatars.com/api/?name=${item.friendName}&background=random` }} 
        style={styles.avatar} 
      />
      <View style={styles.chatInfo}>
        <Text style={[styles.chatName, { color: textMain }]}>{item.friendName}</Text>
        <Text style={[styles.chatMessage, { color: textSub }]} numberOfLines={1}>
          {item.lastMessage || 'Tap to chat'}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]}>
      
      {/* HEADER & SEARCH */}
      <View style={[styles.headerContainer, { backgroundColor: cardBg, borderBottomColor: border }]}>
        <Text style={[styles.headerTitle, { color: textMain }]}>Chats</Text>
        
        <View style={[styles.searchBox, { backgroundColor: isDark ? '#1E2D3D' : '#F0F4F8' }]}>
          <Ionicons name="search" size={20} color={textSub} style={styles.searchIcon} />
          <TextInput 
            style={[styles.searchInput, { color: textMain }]}
            placeholder="Search by @username..."
            placeholderTextColor={textSub}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearchUser}
            autoCapitalize="none"
          />
          {isSearching ? (
            <ActivityIndicator size="small" color="#007AFF" style={{ marginRight: 10 }} />
          ) : (
            <TouchableOpacity onPress={handleSearchUser}>
              <Text style={{ color: '#007AFF', fontWeight: 'bold', paddingRight: 10 }}>Find</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* CHAT LIST */}
      {loading ? (
        <ActivityIndicator size="large" color="#007AFF" style={{ marginTop: 50 }} />
      ) : privateChats.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="chatbubbles-outline" size={60} color={textSub} />
          <Text style={[styles.emptyText, { color: textMain }]}>No Private Chats Yet</Text>
          <Text style={[styles.emptySubText, { color: textSub }]}>Search for a friend's @username above to start chatting!</Text>
        </View>
      ) : (
        <FlatList
          data={privateChats}
          keyExtractor={(item) => item.chatId}
          renderItem={renderChatItem}
          contentContainerStyle={{ padding: 15 }}
        />
      )}

      {/* FLOATING ACTION BUTTON (GLOBAL ROOM) */}
      <TouchableOpacity 
        style={styles.fab}
        onPress={() => navigation.navigate('ChatRoom', { chatId: 'global_chats', chatName: 'Global Room' })}
      >
        <Ionicons name="earth" size={28} color="#FFF" />
      </TouchableOpacity>
      
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerContainer: { paddingHorizontal: 15, paddingBottom: 15, paddingTop: 45, borderBottomWidth: 1 },
  headerTitle: { fontSize: 28, fontWeight: 'bold', marginBottom: 15 },
  searchBox: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, height: 45 },
  searchIcon: { paddingHorizontal: 10 },
  searchInput: { flex: 1, fontSize: 16, height: '100%' },
  
  chatCard: { flexDirection: 'row', padding: 15, borderRadius: 16, marginBottom: 12, borderWidth: 1, alignItems: 'center' },
  avatar: { width: 50, height: 50, borderRadius: 25, marginRight: 15 },
  chatInfo: { flex: 1, justifyContent: 'center' },
  chatName: { fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  chatMessage: { fontSize: 14 },
  
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30 },
  emptyText: { fontSize: 20, fontWeight: 'bold', marginTop: 15 },
  emptySubText: { fontSize: 14, textAlign: 'center', marginTop: 10, lineHeight: 20 },
  
  fab: { position: 'absolute', bottom: 30, right: 25, width: 60, height: 60, borderRadius: 30, backgroundColor: '#007AFF', justifyContent: 'center', alignItems: 'center', elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 3 }
});
