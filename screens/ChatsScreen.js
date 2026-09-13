import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, TextInput, SafeAreaView, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { auth, db } from '../firebaseConfig';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';

const STATUS_DUMMY = [
  { id: '1', name: 'My Status', img: 'https://ui-avatars.com/api/?name=Me&background=000&color=fff', isMe: true },
  { id: '2', name: 'Rahul', img: 'https://ui-avatars.com/api/?name=Rahul&background=random' },
  { id: '3', name: 'Priya', img: 'https://ui-avatars.com/api/?name=Priya&background=random' },
  { id: '4', name: 'Aman', img: 'https://ui-avatars.com/api/?name=Aman&background=random' },
  { id: '5', name: 'Neha', img: 'https://ui-avatars.com/api/?name=Neha&background=random' },
];

export default function ChatsScreen({ navigation }) {
  const { isDark } = useTheme();
  const [activeTab, setActiveTab] = useState('All');
  const [lastGlobalMsg, setLastGlobalMsg] = useState('Welcome to Nax Chat!');
  const [lastMsgTime, setLastMsgTime] = useState('');
  
  const currentUser = auth.currentUser;

  const bg = isDark ? '#0B141A' : '#FFFFFF';
  const textMain = isDark ? '#E9EDEF' : '#111B21';
  const textSub = isDark ? '#8696A0' : '#667781';
  const headerBg = isDark ? '#202C33' : '#008069'; // WhatsApp Green for light mode
  const headerText = isDark ? '#E9EDEF' : '#FFFFFF';
  const tabBg = isDark ? '#202C33' : '#F0F2F5';
  const activeTabBg = isDark ? 'rgba(0,168,132,0.2)' : '#D9FDD3';
  const activeTabColor = isDark ? '#00A884' : '#008069';

  // Global Room का आख़िरी मैसेज फेच करना
  useEffect(() => {
    const q = query(collection(db, 'global_chats'), orderBy('createdAt', 'desc'), limit(1));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const msg = snapshot.docs[0].data();
        setLastGlobalMsg(msg.text || '📷 Photo');
        if (msg.createdAt) {
          setLastMsgTime(new Date(msg.createdAt.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        }
      }
    });
    return unsubscribe;
  }, []);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]}>
      <StatusBar backgroundColor={headerBg} barStyle={isDark ? 'light-content' : 'light-content'} />
      
      {/* 1. TOP HEADER */}
      <View style={[styles.header, { backgroundColor: headerBg }]}>
        <Text style={[styles.headerTitle, { color: headerText }]}>Nax Chat</Text>
        <View style={styles.headerIcons}>
          <TouchableOpacity style={styles.iconBtn}><Ionicons name="camera-outline" size={24} color={headerText} /></TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn}><Ionicons name="search-outline" size={24} color={headerText} /></TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn}><Ionicons name="ellipsis-vertical" size={24} color={headerText} /></TouchableOpacity>
        </View>
      </View>

      {/* 2. STORIES / MOMENTS BAR */}
      <View style={[styles.storiesContainer, { borderBottomColor: isDark ? '#202C33' : '#F0F2F5' }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 15 }}>
          {STATUS_DUMMY.map((status) => (
            <TouchableOpacity key={status.id} style={styles.storyItem}>
              <View style={[styles.storyRing, { borderColor: status.isMe ? '#888' : '#00A884' }]}>
                <Image source={{ uri: status.img }} style={styles.storyImg} />
                {status.isMe && (
                  <View style={styles.addStoryBtn}>
                    <Ionicons name="add" size={14} color="#FFF" />
                  </View>
                )}
              </View>
              <Text style={[styles.storyName, { color: textMain }]} numberOfLines={1}>{status.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* 3. TELEGRAM-STYLE FOLDERS (TABS) */}
      <View style={styles.tabsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 15 }}>
          {['All', 'Unread', 'Groups', 'Bots', 'Enterprise'].map((tab) => (
            <TouchableOpacity 
              key={tab} 
              style={[styles.tabBtn, { backgroundColor: activeTab === tab ? activeTabBg : tabBg }]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, { color: activeTab === tab ? activeTabColor : textSub }]}>{tab}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* 4. CHAT LIST */}
      <ScrollView style={styles.chatList} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        
        {/* Global Chat Room (Pinned) */}
        <TouchableOpacity 
          style={styles.chatCard} 
          activeOpacity={0.7} 
          onPress={() => navigation.navigate('ChatRoom')}
        >
          <Image source={{ uri: 'https://ui-avatars.com/api/?name=Global+Chat&background=007AFF&color=fff' }} style={styles.chatAvatar} />
          
          <View style={[styles.chatInfo, { borderBottomColor: isDark ? '#202C33' : '#F0F2F5' }]}>
            <View style={styles.chatHeaderRow}>
              <Text style={[styles.chatName, { color: textMain }]}>Global Nax Room</Text>
              <Text style={[styles.chatTime, { color: '#00A884' }]}>{lastMsgTime || 'Now'}</Text>
            </View>
            
            <View style={styles.chatMessageRow}>
              <Text style={[styles.chatMessage, { color: textSub }]} numberOfLines={1}>
                {lastGlobalMsg}
              </Text>
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadText}>9+</Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>

        {/* Nax Assistant Bot */}
        <TouchableOpacity 
          style={styles.chatCard} 
          activeOpacity={0.7}
          onPress={() => navigation.navigate('BotChat', { botName: 'Nax Assistant', creatorName: 'System', botRules: [] })}
        >
          <Image source={{ uri: 'https://ui-avatars.com/api/?name=Nax+Bot&background=00A884&color=fff' }} style={styles.chatAvatar} />
          
          <View style={[styles.chatInfo, { borderBottomColor: isDark ? '#202C33' : '#F0F2F5' }]}>
            <View style={styles.chatHeaderRow}>
              <Text style={[styles.chatName, { color: textMain }]}>Nax Assistant <Ionicons name="checkmark-circle" size={14} color="#00A884" /></Text>
              <Text style={[styles.chatTime, { color: textSub }]}>Yesterday</Text>
            </View>
            
            <View style={styles.chatMessageRow}>
              <Text style={[styles.chatMessage, { color: textSub }]} numberOfLines={1}>
                <Ionicons name="checkmark-done" size={16} color="#53bdeb" /> How can I help you today?
              </Text>
            </View>
          </View>
        </TouchableOpacity>

      </ScrollView>

      {/* 5. FLOATING ACTION BUTTON (FAB) */}
      <TouchableOpacity style={[styles.fab, { backgroundColor: activeTabColor }]}>
        <Ionicons name="chatbubble-ellipses" size={24} color="#FFF" />
      </TouchableOpacity>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 15, paddingVertical: 12, elevation: 4 },
  headerTitle: { fontSize: 22, fontWeight: 'bold' },
  headerIcons: { flexDirection: 'row' },
  iconBtn: { marginLeft: 15 },

  storiesContainer: { paddingVertical: 12, borderBottomWidth: 1 },
  storyItem: { alignItems: 'center', marginRight: 15, position: 'relative' },
  storyRing: { width: 64, height: 64, borderRadius: 32, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  storyImg: { width: 56, height: 56, borderRadius: 28 },
  addStoryBtn: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#00A884', borderRadius: 10, width: 20, height: 20, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#FFF' },
  storyName: { fontSize: 12, marginTop: 5, fontWeight: '500' },

  tabsContainer: { paddingVertical: 10 },
  tabBtn: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, marginRight: 10 },
  tabText: { fontSize: 14, fontWeight: '600' },

  chatList: { flex: 1 },
  chatCard: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, marginTop: 10 },
  chatAvatar: { width: 50, height: 50, borderRadius: 25, marginRight: 15 },
  chatInfo: { flex: 1, paddingVertical: 12, borderBottomWidth: 1 },
  chatHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 },
  chatName: { fontSize: 16, fontWeight: 'bold' },
  chatTime: { fontSize: 12, fontWeight: '500' },
  chatMessageRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  chatMessage: { fontSize: 14, flex: 1, paddingRight: 10 },
  unreadBadge: { backgroundColor: '#00A884', borderRadius: 10, minWidth: 20, height: 20, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 5 },
  unreadText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },

  fab: { position: 'absolute', bottom: 90, right: 20, width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', elevation: 5, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } }
});
