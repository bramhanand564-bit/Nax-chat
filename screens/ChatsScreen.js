import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, 
  TextInput, Modal, Alert, ActivityIndicator, SafeAreaView, Platform 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { db, auth } from '../firebaseConfig';
import { collection, query, where, getDocs, setDoc, doc, onSnapshot } from 'firebase/firestore';

export default function ChatsScreen({ navigation }) {
  const { isDark } = useTheme();
  const currentUser = auth.currentUser;

  // States
  const [privateChats, setPrivateChats] = useState([]);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  
  const [showIdModal, setShowIdModal] = useState(false);
  const [myUniqueId, setMyUniqueId] = useState('');
  const [tempId, setTempId] = useState('');

  // Colors (Glassy Water Bubble Theme)
  const bg = isDark ? '#0A1520' : '#E8F1F5';
  const textMain = isDark ? '#F0F4F8' : '#1A2C3A';
  const textSub = isDark ? '#8AA2B5' : '#6A8296';
  const glassPanel = isDark ? 'rgba(20, 35, 50, 0.75)' : 'rgba(255, 255, 255, 0.85)';
  const glassBorder = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.5)';

  useEffect(() => {
    checkAndSetUniqueId();
    loadPrivateChats();
  }, []);

  // 1. Check if user has an ID, if not, force them to make one
  const checkAndSetUniqueId = async () => {
    const savedId = await AsyncStorage.getItem('nax_unique_id');
    if (savedId) {
      setMyUniqueId(savedId);
    } else {
      setShowIdModal(true); // Ask for ID on first login
    }
  };

  // 2. Save ID to Firebase so friends can search it
  const saveMyIdToFirebase = async () => {
    if (!tempId.trim()) return;
    const formattedId = `@${tempId.trim().toLowerCase().replace(/@|\s+/g, '')}`;
    
    try {
      // Save to Firebase 'users' collection
      await setDoc(doc(db, 'users', currentUser.uid), {
        uniqueId: formattedId,
        name: currentUser.displayName || 'Nax User',
        email: currentUser.email,
        uid: currentUser.uid,
        avatar: currentUser.photoURL || `https://ui-avatars.com/api/?name=${currentUser.displayName || 'U'}&background=007AFF&color=fff`
      }, { merge: true });

      await AsyncStorage.setItem('nax_unique_id', formattedId);
      setMyUniqueId(formattedId);
      setShowIdModal(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(()=>{});
      Alert.alert("Welcome!", `Your Nax ID is ${formattedId}. Give this to your friends so they can message you!`);
    } catch (error) {
      Alert.alert("Error", "Failed to save ID.");
    }
  };

  // 3. Search Friend in Firebase
  const searchFriend = async () => {
    let queryId = searchQuery.trim().toLowerCase();
    if (!queryId) return;
    if (!queryId.startsWith('@')) queryId = `@${queryId}`;
    
    if (queryId === myUniqueId) {
      Alert.alert("Oops!", "You cannot search for yourself.");
      return;
    }

    setIsSearching(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(()=>{});

    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('uniqueId', '==', queryId));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        Alert.alert("Not Found ❌", `No user found with ID ${queryId}. Check the spelling.`);
      } else {
        // Friend Found! Create a private Chat ID
        const friendData = querySnapshot.docs[0].data();
        const chatRoomId = currentUser.uid < friendData.uid 
            ? `${currentUser.uid}_${friendData.uid}` 
            : `${friendData.uid}_${currentUser.uid}`;

        setShowSearchModal(false);
        setSearchQuery('');
        
        // Navigate to ChatRoom with specific ID
        navigation.navigate('ChatRoom', { 
          chatId: chatRoomId, 
          chatName: friendData.name, 
          friendId: queryId 
        });
      }
    } catch (error) {
      Alert.alert("Error", "Search failed. Check connection.");
    }
    setIsSearching(false);
  };

  // Load active chats (Mocked for UI, ideally fetched from a 'user_chats' collection)
  const loadPrivateChats = () => {
    // For now, we will just show the Global Room and Assistant
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]}>
      
      {/* ================= HEADER ================= */}
      <View style={[styles.header, { backgroundColor: glassPanel, borderBottomColor: glassBorder }]}>
        <Text style={[styles.headerTitle, { color: textMain }]}>Nax Chat</Text>
        <View style={styles.headerIcons}>
          <TouchableOpacity onPress={() => setShowSearchModal(true)} style={styles.iconBtn}>
            <Ionicons name="search" size={26} color={textMain} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => Alert.alert("My ID", `Your ID is: ${myUniqueId}`)} style={styles.iconBtn}>
            <Ionicons name="qr-code-outline" size={24} color={textMain} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ================= CHAT LIST ================= */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: 10 }}>
        
        {/* Global Room (Always Pinned) */}
        <TouchableOpacity style={styles.chatCard} onPress={() => navigation.navigate('ChatRoom', { chatId: 'global_chats', chatName: 'Global Nax Room' })}>
          <Image source={{ uri: 'https://ui-avatars.com/api/?name=Global&background=007AFF&color=fff' }} style={styles.avatar} />
          <View style={styles.chatInfo}>
            <Text style={[styles.chatName, { color: textMain }]}>Global Nax Room</Text>
            <Text style={{ color: textSub, fontSize: 13, marginTop: 2 }}>Public community chat...</Text>
          </View>
          <View style={styles.chatMeta}>
            <Text style={{ color: textSub, fontSize: 12 }}>Now</Text>
            <View style={styles.unreadBadge}><Text style={styles.unreadText}>9+</Text></View>
          </View>
        </TouchableOpacity>

        {/* AI Assistant */}
        <TouchableOpacity style={styles.chatCard} onPress={() => Alert.alert("Nax Assistant", "Coming soon!")}>
          <Image source={{ uri: 'https://ui-avatars.com/api/?name=Nax+AI&background=10B981&color=fff' }} style={styles.avatar} />
          <View style={styles.chatInfo}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={[styles.chatName, { color: textMain }]}>Nax Assistant</Text>
              <Ionicons name="checkmark-circle" size={14} color="#10B981" style={{ marginLeft: 5 }} />
            </View>
            <Text style={{ color: textSub, fontSize: 13, marginTop: 2 }}>How can I help you today?</Text>
          </View>
        </TouchableOpacity>

      </ScrollView>

      {/* ================= SEARCH FRIEND MODAL ================= */}
      <Modal visible={showSearchModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: glassPanel, borderColor: glassBorder }]}>
            <View style={styles.modalHeader}><View style={[styles.modalIconBg, { backgroundColor: 'rgba(52,199,89,0.1)' }]}><Ionicons name="search" size={32} color="#34C759" /></View></View>
            <Text style={{ color: textMain, fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginBottom: 5 }}>Find Friend</Text>
            <Text style={{ color: textSub, textAlign: 'center', marginBottom: 20, fontSize: 13 }}>Enter your friend's @UniqueID to start a private chat & call.</Text>
            
            <View style={[styles.inputContainer, { backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : '#FFF', borderColor: glassBorder }]}>
              <Text style={{ color: textSub, fontSize: 18, fontWeight: 'bold', marginRight: 5 }}>@</Text>
              <TextInput style={{ flex: 1, color: textMain, fontSize: 18 }} placeholder="username" placeholderTextColor={textSub} value={searchQuery} onChangeText={setSearchQuery} autoCapitalize="none" autoCorrect={false} />
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 25 }}>
              <TouchableOpacity style={{ flex: 1, padding: 14, alignItems: 'center' }} onPress={() => setShowSearchModal(false)}><Text style={{ color: textSub, fontWeight: 'bold', fontSize: 16 }}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.modalSubmitBtn, { flex: 1, alignItems: 'center', backgroundColor: '#34C759' }]} onPress={searchFriend}>
                {isSearching ? <ActivityIndicator color="#FFF" /> : <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 16 }}>Chat Now</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ================= CREATE ID MODAL (For New Users) ================= */}
      <Modal visible={showIdModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: glassPanel, borderColor: glassBorder }]}>
            <View style={styles.modalHeader}><View style={[styles.modalIconBg, { backgroundColor: 'rgba(0,122,255,0.1)' }]}><Ionicons name="at" size={32} color="#007AFF" /></View></View>
            <Text style={{ color: textMain, fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginBottom: 5 }}>Create Your Nax ID</Text>
            <Text style={{ color: textSub, textAlign: 'center', marginBottom: 20, fontSize: 13 }}>Create a unique username so your friends can search and message you.</Text>
            
            <View style={[styles.inputContainer, { backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : '#FFF', borderColor: glassBorder }]}>
              <Text style={{ color: textSub, fontSize: 18, fontWeight: 'bold', marginRight: 5 }}>@</Text>
              <TextInput style={{ flex: 1, color: textMain, fontSize: 18 }} placeholder="your_name" placeholderTextColor={textSub} value={tempId} onChangeText={setTempId} autoCapitalize="none" maxLength={15} />
            </View>

            <TouchableOpacity style={[styles.modalSubmitBtn, { marginTop: 25, alignItems: 'center' }]} onPress={saveMyIdToFirebase}>
              <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 16 }}>Save & Continue</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 10 : 45, paddingBottom: 15, borderBottomWidth: 1 },
  headerTitle: { fontSize: 28, fontWeight: '800' },
  headerIcons: { flexDirection: 'row' },
  iconBtn: { marginLeft: 20 },
  
  chatCard: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12 },
  avatar: { width: 56, height: 56, borderRadius: 28 },
  chatInfo: { flex: 1, marginLeft: 15, justifyContent: 'center' },
  chatName: { fontSize: 17, fontWeight: '600' },
  chatMeta: { alignItems: 'flex-end' },
  unreadBadge: { backgroundColor: '#007AFF', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, marginTop: 5 },
  unreadText: { color: '#FFF', fontSize: 11, fontWeight: 'bold' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  modalBox: { width: '85%', borderRadius: 28, padding: 25, borderWidth: 1 },
  modalHeader: { alignItems: 'center', marginBottom: 15 },
  modalIconBg: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center' },
  inputContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 16, paddingHorizontal: 15, paddingVertical: 12 },
  modalSubmitBtn: { backgroundColor: '#007AFF', paddingVertical: 14, borderRadius: 16 }
});
