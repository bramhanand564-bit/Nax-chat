import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, Image,
  ActivityIndicator, Alert, SafeAreaView, Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { db, auth } from '../firebaseConfig';
import { collection, query, where, getDocs, onSnapshot, doc, setDoc, serverTimestamp } from 'firebase/firestore';

// --- COMPONENT IMPORTS ---
import ChatItem from '../components/ChatItem';
import NewChatModal from '../components/NewChatModal';

export default function ChatsScreen({ navigation }) {
  const { isDark } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [privateChats, setPrivateChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [openingChat, setOpeningChat] = useState(false);
  const [searchResult, setSearchResult] = useState(null);
  const [showNewMenu, setShowNewMenu] = useState(false);

  const currentUser = auth.currentUser;

  // Colors
  const bg = isDark ? '#071521' : '#F3F7FA';
  const headerBg = isDark ? '#0D2635' : '#FFFFFF';
  const cardBg = isDark ? '#132B3B' : '#FFFFFF';
  const inputBg = isDark ? '#1A3447' : '#EEF3F7';
  const textMain = isDark ? '#F5F9FC' : '#142532';
  const textSub = isDark ? '#8EAABD' : '#6C8494';
  const border = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
  const blue = '#1687FF';

  // --- REALTIME CHATS ---
  useEffect(() => {
    if (!currentUser?.uid) { setPrivateChats([]); setLoading(false); return; }
    setLoading(true);
    const chatsRef = collection(db, 'users', currentUser.uid, 'user_chats');
    const chatsQuery = query(chatsRef, where('type', '==', 'private'));

    const unsubscribe = onSnapshot(chatsQuery, (snapshot) => {
      const chats = [];
      snapshot.forEach((item) => chats.push({ id: item.id, ...item.data() }));
      chats.sort((a, b) => getTime(b.lastMessageTime || b.updatedAt) - getTime(a.lastMessageTime || a.updatedAt));
      setPrivateChats(chats);
      setLoading(false);
    }, (error) => {
      console.log('User chats error:', error);
      setLoading(false);
      Alert.alert('Chat Error', 'Chat list load nahi ho paayi.');
    });

    return () => unsubscribe();
  }, [currentUser?.uid]);

  // --- HELPERS ---
  const normalizeUsername = (value) => {
    let username = String(value || '').trim().toLowerCase();
    if (username.startsWith('@')) username = username.substring(1);
    return username;
  };

  const getBasicAvatar = (name, avatarUrl) => {
    if (avatarUrl) return { uri: avatarUrl };
    const encodedName = encodeURIComponent(name || 'Nax User');
    return { uri: `https://ui-avatars.com/api/?name=${encodedName}&background=1687FF&color=ffffff` };
  };

  // --- SEARCH USER OR BOT ---
  const handleSearch = async () => {
    const username = normalizeUsername(searchQuery);
    if (!username) return Alert.alert('Username required', 'Pehle @username enter karo.');
    if (!currentUser?.uid) return Alert.alert('Login required', 'Pehle login karo.');
    if (username.length < 3) return Alert.alert('Invalid username', 'Username kam se kam 3 characters ka hona chahiye.');

    Keyboard.dismiss();
    setSearching(true);
    setSearchResult(null);

    try {
      let foundData = null;
      let isBot = false;

      // 1. Check in Users Collection
      const usersRef = collection(db, 'users');
      const userQuery = query(usersRef, where('usernameLower', '==', username));
      const snapshot = await getDocs(userQuery);

      if (!snapshot.empty) {
        const userDoc = snapshot.docs[0];
        foundData = userDoc.data();
        foundData.uid = foundData.uid || userDoc.id;
      } else {
        // 2. If not a User, Check in Bots Collection
        const botsRef = collection(db, 'bots');
        const botQuery = query(botsRef, where('username', '==', username));
        const botSnap = await getDocs(botQuery);

        if (!botSnap.empty) {
          const botDoc = botSnap.docs[0];
          foundData = botDoc.data();
          foundData.uid = botDoc.id; // Bots use their document ID as UID
          isBot = true;
        }
      }

      if (!foundData) {
        Alert.alert('Not Found', `@${username} nahi mila.`);
        setSearching(false); return;
      }

      if (foundData.uid === currentUser.uid) {
        Alert.alert('Oops!', 'Tum khud ko chat nahi kar sakte.');
        setSearching(false); return;
      }

      setSearchResult({
        uid: foundData.uid,
        username: foundData.username || `@${username}`,
        name: foundData.name || foundData.displayName || foundData.username || `@${username}`,
        avatar: foundData.avatar || foundData.photoURL || '',
        isBot: isBot
      });
    } catch (error) {
      console.log('Search error:', error);
      Alert.alert('Search Error', 'User search nahi ho paayi.');
    }
    setSearching(false);
  };

  // --- CHAT ACTIONS ---
  const createPrivateChat = async (friend) => {
    if (!currentUser?.uid || !friend?.uid) return null;
    const myId = currentUser.uid;
    const friendId = friend.uid;
    const chatId = myId < friendId ? `${myId}_${friendId}` : `${friendId}_${myId}`;

    const myUsername = normalizeUsername(currentUser.displayName || currentUser.email || 'user');
    let myProfile = null;

    try {
      const myProfileSnap = await getDocs(query(collection(db, 'users'), where('uid', '==', myId)));
      if (!myProfileSnap.empty) myProfile = myProfileSnap.docs[0].data();
    } catch (error) { console.log('My profile lookup error:', error); }

    const myName = myProfile?.name || myProfile?.displayName || currentUser.displayName || currentUser.email || 'Nax User';
    const myUsernameValue = myProfile?.username || `@${myUsername}`;

    const myChatRef = doc(db, 'users', myId, 'user_chats', chatId);
    const friendChatRef = doc(db, 'users', friendId, 'user_chats', chatId);

    await Promise.all([
      setDoc(myChatRef, {
        chatId, type: 'private', friendId, friendName: friend.name || 'Nax User', friendUsername: friend.username || '', friendAvatar: friend.avatar || '', updatedAt: serverTimestamp()
      }, { merge: true }),
      
      // We also update the friend's list (even if it's a bot, it won't hurt, bots can have user_chats subcollection)
      setDoc(friendChatRef, {
        chatId, type: 'private', friendId: myId, friendName: myName, friendUsername: myUsernameValue, friendAvatar: myProfile?.avatar || myProfile?.photoURL || '', updatedAt: serverTimestamp()
      }, { merge: true }),
    ]);

    return chatId;
  };

  const openNewChat = async (friend) => {
    if (openingChat || !currentUser?.uid || !friend?.uid) return;
    setOpeningChat(true);

    try {
      const chatId = await createPrivateChat(friend);
      if (!chatId) throw new Error('Chat ID create nahi hua.');

      setSearchResult(null);
      setSearchQuery('');
      setShowNewMenu(false);

      navigation.navigate('ChatRoom', { chatId, chatName: friend.name, friendId: friend.uid, friendUsername: friend.username, friendAvatar: friend.avatar });
    } catch (error) {
      console.log('Open new chat error:', error);
      Alert.alert('Chat Error', 'Private chat start nahi ho paayi.');
    }
    setOpeningChat(false);
  };

  const openChat = (item) => {
    const friendId = item.friendId || item.otherUserId || item.userId || '';
    const chatId = item.chatId || item.id;
    navigation.navigate('ChatRoom', {
      chatId, chatName: item.friendName || item.name || item.displayName || item.username || 'Nax User',
      friendId, friendUsername: item.friendUsername || item.username || '', friendAvatar: item.friendAvatar || item.avatar || ''
    });
  };

  // --- RENDERING ---
  const renderSearchResult = () => {
    if (!searchResult) return null;
    return (
      <View style={[styles.resultBox, { backgroundColor: cardBg, borderColor: border }]}>
        <View style={styles.resultHeader}>
          <Text style={[styles.resultTitle, { color: textMain }]}>Result Found</Text>
          <TouchableOpacity onPress={() => setSearchResult(null)}><Ionicons name="close" size={22} color={textSub} /></TouchableOpacity>
        </View>
        <TouchableOpacity activeOpacity={0.8} style={styles.resultUser} onPress={() => openNewChat(searchResult)} disabled={openingChat}>
          <Image source={getBasicAvatar(searchResult.name, searchResult.avatar)} style={styles.resultAvatar} />
          
          <View style={styles.resultInfo}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={[styles.resultName, { color: textMain }]} numberOfLines={1}>{searchResult.name}</Text>
              {/* BOT BADGE */}
              {searchResult.isBot && (
                <View style={styles.botBadge}><Text style={styles.botBadgeText}>BOT</Text></View>
              )}
            </View>
            <Text style={[styles.resultUsername, { color: blue }]}>{searchResult.username?.startsWith('@') ? searchResult.username : `@${searchResult.username}`}</Text>
          </View>
          
          <View style={styles.chatButton}>
            {openingChat ? <ActivityIndicator size="small" color="#FFFFFF" /> : <><Ionicons name="chatbubble" size={17} color="#FFFFFF" /><Text style={styles.chatButtonText}>Chat</Text></>}
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  const renderGlobalCard = () => (
    <TouchableOpacity activeOpacity={0.84} style={[styles.globalCard, { backgroundColor: isDark ? '#10362E' : '#EAF8F2', borderColor: isDark ? 'rgba(60,220,150,0.18)' : 'rgba(24,166,106,0.12)' }]} onPress={() => { setShowNewMenu(false); navigation.navigate('ChatRoom', { chatId: 'global_chats', chatName: 'Global Room' }); }}>
      <View style={[styles.globalIcon, { backgroundColor: '#18A66A' }]}><Ionicons name="earth" size={27} color="#FFFFFF" /></View>
      <View style={styles.globalInfo}>
        <Text style={[styles.globalTitle, { color: textMain }]}>Global Chat</Text>
        <Text style={[styles.globalText, { color: textSub }]} numberOfLines={2}>Chat with everyone on Nax Chat</Text>
      </View>
      <View style={styles.globalArrow}><Ionicons name="arrow-forward" size={20} color="#18A66A" /></View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]}>
      
      {/* HEADER */}
      <View style={[styles.header, { backgroundColor: headerBg, borderBottomColor: border }]}>
        <View style={styles.titleRow}>
          <View>
            <Text style={[styles.title, { color: textMain }]}>Chats</Text>
            <Text style={[styles.subtitle, { color: textSub }]}>Your private conversations</Text>
          </View>
          <TouchableOpacity activeOpacity={0.8} style={styles.newButton} onPress={() => setShowNewMenu(true)}>
            <Ionicons name="add" size={21} color="#FFFFFF" />
            <Text style={styles.newText}>New</Text>
          </TouchableOpacity>
        </View>

        {/* SEARCH BOX */}
        <View style={[styles.searchBox, { backgroundColor: inputBg }]}>
          <Ionicons name="search" size={21} color={textSub} />
          <TextInput
            style={[styles.searchInput, { color: textMain }]} placeholder="@username search..." placeholderTextColor={textSub}
            value={searchQuery} onChangeText={(text) => { setSearchQuery(text); setSearchResult(null); }}
            onSubmitEditing={handleSearch} autoCapitalize="none" autoCorrect={false} returnKeyType="search"
          />
          {searchQuery.length > 0 && <TouchableOpacity style={styles.clearButton} onPress={() => { setSearchQuery(''); setSearchResult(null); }}><Ionicons name="close-circle" size={20} color={textSub} /></TouchableOpacity>}
          {searching && <ActivityIndicator size="small" color={blue} style={styles.searchLoader} />}
        </View>
      </View>

      {/* MAIN CONTENT */}
      {loading ? (
        <View style={styles.loading}><ActivityIndicator size="large" color={blue} /><Text style={[styles.loadingText, { color: textSub }]}>Loading chats...</Text></View>
      ) : (
        <FlatList
          data={privateChats}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <ChatItem item={item} currentUser={currentUser} onPress={openChat} />}
          ListHeaderComponent={<View>{renderSearchResult()}{privateChats.length > 0 && <Text style={[styles.sectionTitle, { color: textSub }]}>PRIVATE CHATS</Text>}</View>}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View style={[styles.emptyIcon, { backgroundColor: isDark ? '#122B3B' : '#E5F1FB' }]}><Ionicons name="chatbubbles-outline" size={52} color={blue} /></View>
              <Text style={[styles.emptyTitle, { color: textMain }]}>No Private Chats Yet</Text>
              <Text style={[styles.emptyText, { color: textSub }]}>Search a friend or bot by @username and start chatting.</Text>
              <TouchableOpacity activeOpacity={0.8} style={styles.emptyButton} onPress={() => setShowNewMenu(true)}><Ionicons name="add" size={20} color="#FFFFFF" /><Text style={styles.emptyButtonText}>Start New Chat</Text></TouchableOpacity>
            </View>
          }
          ListFooterComponent={<View style={styles.globalSection}>{renderGlobalCard()}</View>}
          contentContainerStyle={styles.chatList}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        />
      )}

      {/* NEW MENU MODAL COMPONENT */}
      <NewChatModal
        visible={showNewMenu}
        onClose={() => setShowNewMenu(false)}
        onStartPrivateChat={() => { setShowNewMenu(false); Alert.alert('New Chat', 'Upar @username search karo aur user/bot ko select karo.'); }}
        onOpenGlobalRoom={() => { setShowNewMenu(false); navigation.navigate('ChatRoom', { chatId: 'global_chats', chatName: 'Global Room' }); }}
        onCreateBot={() => { setShowNewMenu(false); navigation.navigate('BotCreate'); }}
      />

    </SafeAreaView>
  );
}

// Global Helper
function getTime(value) {
  if (!value) return 0;
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (typeof value.seconds === 'number') return value.seconds * 1000;
  if (typeof value === 'number') return value;
  return 0;
}

// --- STYLES ---
const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 18, paddingHorizontal: 18, paddingBottom: 15, borderBottomWidth: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  title: { fontSize: 30, fontWeight: '800' },
  subtitle: { marginTop: 2, fontSize: 12 },
  newButton: { height: 42, paddingHorizontal: 14, borderRadius: 21, backgroundColor: '#1687FF', flexDirection: 'row', alignItems: 'center', gap: 5 },
  newText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  searchBox: { height: 50, borderRadius: 15, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center' },
  searchInput: { flex: 1, height: '100%', fontSize: 16, marginLeft: 10 },
  clearButton: { padding: 4 },
  searchLoader: { marginLeft: 8 },
  sectionTitle: { fontSize: 11, fontWeight: '800', letterSpacing: 1, marginTop: 3, marginBottom: 10 },
  resultBox: { marginBottom: 14, padding: 14, borderRadius: 18, borderWidth: 1 },
  resultHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  resultTitle: { fontSize: 15, fontWeight: '800' },
  resultUser: { flexDirection: 'row', alignItems: 'center' },
  resultAvatar: { width: 54, height: 54, borderRadius: 27 },
  resultInfo: { flex: 1, marginLeft: 12 },
  resultName: { fontSize: 16, fontWeight: '800' },
  
  // BOT BADGE STYLES
  botBadge: { backgroundColor: '#AF52DE', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginLeft: 8 },
  botBadgeText: { color: '#FFF', fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },

  resultUsername: { marginTop: 3, fontSize: 14, fontWeight: '600' },
  chatButton: { minWidth: 68, height: 38, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, backgroundColor: '#1687FF', paddingHorizontal: 12, borderRadius: 19 },
  chatButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
  chatList: { padding: 14, paddingBottom: 115 },
  globalSection: { marginTop: 5 },
  globalCard: { minHeight: 82, padding: 13, borderRadius: 19, borderWidth: 1, flexDirection: 'row', alignItems: 'center' },
  globalIcon: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  globalInfo: { flex: 1, marginLeft: 13 },
  globalTitle: { fontSize: 17, fontWeight: '800' },
  globalText: { marginTop: 4, fontSize: 13 },
  globalArrow: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(24,166,106,0.10)', alignItems: 'center', justifyContent: 'center' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: 10, fontSize: 14 },
  emptyState: { minHeight: 390, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 35, paddingTop: 35 },
  emptyIcon: { width: 92, height: 92, borderRadius: 46, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  emptyTitle: { fontSize: 21, fontWeight: '800', textAlign: 'center' },
  emptyText: { marginTop: 9, fontSize: 15, lineHeight: 22, textAlign: 'center' },
  emptyButton: { marginTop: 22, flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: '#1687FF', paddingHorizontal: 18, paddingVertical: 12, borderRadius: 23 },
  emptyButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' }
});
