import React from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

export default function ChatRoomScreen() {
  const { isDark } = useTheme();

  const bg = isDark ? '#121212' : '#F5F5F7';
  const textMain = isDark ? '#FFFFFF' : '#000000';
  const textSub = isDark ? '#888888' : '#666666';
  const inputBg = isDark ? '#1E1E1E' : '#FFFFFF';
  const borderCol = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      
      {/* 1. Header (Profile Photo & Name) */}
      <View style={[styles.header, { borderBottomColor: borderCol, backgroundColor: bg }]}>
        <TouchableOpacity style={styles.backBtn}>
          <Ionicons name="chevron-back" size={28} color="#007AFF" />
        </TouchableOpacity>
        <Image source={{ uri: 'https://randomuser.me/api/portraits/women/44.jpg' }} style={styles.avatar} />
        <View style={styles.headerInfo}>
          <Text style={[styles.headerName, { color: textMain }]}>Aisha</Text>
          <Text style={[styles.headerStatus, { color: '#007AFF' }]}>Online</Text>
        </View>
        <View style={styles.headerIcons}>
          <TouchableOpacity style={styles.iconBtn}><Ionicons name="videocam-outline" size={24} color={textMain} /></TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn}><Ionicons name="call-outline" size={22} color={textMain} /></TouchableOpacity>
        </View>
      </View>

      {/* 2. Messages Area */}
      <ScrollView style={styles.chatArea} contentContainerStyle={{ padding: 15 }}>
        
        {/* Receiver Message */}
        <View style={styles.messageRow}>
          <View style={[styles.messageBubble, styles.msgReceived, { backgroundColor: isDark ? '#1E1E1E' : '#E9E9EB' }]}>
            <Text style={{ color: textMain, fontSize: 16 }}>Bhai, Super App ka UI kaisa chal raha hai? 🔥</Text>
            <Text style={styles.msgTime}>10:42 AM</Text>
          </View>
        </View>

        {/* Sender Message */}
        <View style={[styles.messageRow, { justifyContent: 'flex-end' }]}>
          <View style={[styles.messageBubble, styles.msgSent]}>
            <Text style={{ color: '#FFF', fontSize: 16 }}>Ekdam mast! Profile aur Settings page bhi ban gaya. 🚀</Text>
            <Text style={[styles.msgTime, { color: 'rgba(255,255,255,0.7)' }]}>10:45 AM  ✓✓</Text>
          </View>
        </View>

      </ScrollView>

      {/* 3. Input Box (Type a message...) */}
      <View style={[styles.inputArea, { backgroundColor: bg, borderTopColor: borderCol }]}>
        <TouchableOpacity style={styles.attachBtn}>
          <Ionicons name="add" size={28} color={textSub} />
        </TouchableOpacity>
        
        <View style={[styles.inputBox, { backgroundColor: inputBg }]}>
          <TextInput 
            style={[styles.input, { color: textMain }]} 
            placeholder="Type a message..." 
            placeholderTextColor={textSub}
            multiline
          />
          <TouchableOpacity style={styles.smileyBtn}>
            <Ionicons name="happy-outline" size={24} color={textSub} />
          </TouchableOpacity>
        </View>
        
        <TouchableOpacity style={styles.micBtn}>
          <Ionicons name="mic" size={22} color="#FFF" />
        </TouchableOpacity>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: 45, paddingBottom: 10, paddingHorizontal: 10, borderBottomWidth: 1, zIndex: 10 },
  backBtn: { padding: 5, marginRight: 5 },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  headerInfo: { flex: 1, marginLeft: 12 },
  headerName: { fontSize: 18, fontWeight: 'bold' },
  headerStatus: { fontSize: 13, marginTop: 2 },
  headerIcons: { flexDirection: 'row' },
  iconBtn: { padding: 10, marginLeft: 5 },

  chatArea: { flex: 1 },
  messageRow: { flexDirection: 'row', marginBottom: 15 },
  messageBubble: { maxWidth: '80%', padding: 12, borderRadius: 18 },
  msgReceived: { borderBottomLeftRadius: 4 },
  msgSent: { backgroundColor: '#007AFF', borderBottomRightRadius: 4 },
  msgTime: { fontSize: 11, color: '#888', alignSelf: 'flex-end', marginTop: 5 },

  inputArea: { flexDirection: 'row', alignItems: 'flex-end', padding: 10, borderTopWidth: 1, paddingBottom: 25 },
  attachBtn: { padding: 10, paddingBottom: 12 },
  inputBox: { flex: 1, flexDirection: 'row', alignItems: 'flex-end', borderRadius: 20, paddingHorizontal: 15, paddingVertical: 8, marginHorizontal: 10 },
  input: { flex: 1, fontSize: 16, maxHeight: 100, minHeight: 30, paddingTop: 5 },
  smileyBtn: { padding: 5, paddingBottom: 2 },
  micBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#007AFF', justifyContent: 'center', alignItems: 'center', marginBottom: 4 }
});
