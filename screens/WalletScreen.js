import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

export default function WalletScreen() {
  const { isDark, themeMode, changeTheme } = useTheme();

  const bg = isDark ? '#121212' : '#F5F5F7';
  const textMain = isDark ? '#FFFFFF' : '#000000';
  const textSub = isDark ? '#888888' : '#666666';
  const cardBg = isDark ? '#1E1E1E' : '#FFFFFF';
  const borderCol = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';

  return (
    <ScrollView style={[styles.container, { backgroundColor: bg }]} contentContainerStyle={{ paddingBottom: 100 }}>
      <Text style={[styles.headerTitle, { color: textMain }]}>Settings</Text>
      
      {/* 1. Profile Section */}
      <View style={[styles.profileCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
        <View style={styles.profileInfo}>
          <Image source={{ uri: 'https://randomuser.me/api/portraits/men/90.jpg' }} style={styles.avatar} />
          <View style={styles.nameWrap}>
            <Text style={[styles.userName, { color: textMain }]}>Bramhanand</Text>
            <Text style={[styles.userStatus, { color: textSub }]}>Vibe Coding the Future 🚀</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.editBtn}>
          <Ionicons name="qr-code-outline" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>

      {/* 2. Wallet & Economy */}
      <Text style={[styles.sectionTitle, { color: textSub }]}>ECONOMY</Text>
      <TouchableOpacity style={[styles.settingItem, { backgroundColor: cardBg, borderColor: borderCol }]}>
        <View style={[styles.iconWrap, { backgroundColor: '#ffea00' }]}>
          <Ionicons name="wallet" size={20} color="#000" />
        </View>
        <Text style={[styles.settingText, { color: textMain }]}>Nax Wallet</Text>
        <Text style={{ color: '#007AFF', fontWeight: 'bold' }}>$0.00</Text>
        <Ionicons name="chevron-forward" size={20} color={textSub} style={{ marginLeft: 10 }} />
      </TouchableOpacity>

      {/* 3. Theme Settings (Jo humne pehle banaya tha) */}
      <Text style={[styles.sectionTitle, { color: textSub }]}>APPEARANCE</Text>
      <View style={[styles.themeCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
        <View style={styles.themeRow}>
          {['system', 'light', 'dark'].map((mode) => (
            <TouchableOpacity 
              key={mode} 
              style={[
                styles.themeBtn, 
                themeMode === mode ? styles.themeBtnActive : { borderColor: isDark ? '#333' : '#ddd' }
              ]}
              onPress={() => changeTheme(mode)}
            >
              <Text style={{ 
                color: themeMode === mode ? '#fff' : (isDark ? '#aaa' : '#555'),
                textTransform: 'capitalize', fontWeight: themeMode === mode ? 'bold' : 'normal'
              }}>
                {mode === 'system' ? 'Auto' : mode}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* 4. Other Options */}
      <Text style={[styles.sectionTitle, { color: textSub }]}>ACCOUNT</Text>
      <TouchableOpacity style={[styles.settingItem, { backgroundColor: cardBg, borderColor: borderCol, borderBottomWidth: 0 }]}>
        <View style={[styles.iconWrap, { backgroundColor: '#FF3B30' }]}>
          <Ionicons name="log-out" size={20} color="#FFF" />
        </View>
        <Text style={[styles.settingText, { color: textMain }]}>Log Out</Text>
      </TouchableOpacity>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 40 },
  headerTitle: { fontSize: 28, fontWeight: 'bold', marginBottom: 20 },
  
  profileCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderRadius: 15, borderWidth: 1, marginBottom: 25 },
  profileInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  avatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#ccc' },
  nameWrap: { marginLeft: 15, flex: 1 },
  userName: { fontSize: 20, fontWeight: 'bold', marginBottom: 4 },
  userStatus: { fontSize: 14 },
  editBtn: { padding: 10, backgroundColor: 'rgba(0,122,255,0.1)', borderRadius: 50 },

  sectionTitle: { fontSize: 13, fontWeight: 'bold', marginLeft: 10, marginBottom: 10, letterSpacing: 1 },
  
  settingItem: { flexDirection: 'row', alignItems: 'center', padding: 15, borderRadius: 15, borderWidth: 1, marginBottom: 25 },
  iconWrap: { width: 34, height: 34, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  settingText: { flex: 1, fontSize: 16, fontWeight: '500' },
  
  themeCard: { padding: 15, borderRadius: 15, borderWidth: 1, marginBottom: 25 },
  themeRow: { flexDirection: 'row', justifyContent: 'space-between' },
  themeBtn: { flex: 1, paddingVertical: 10, marginHorizontal: 5, borderWidth: 1, borderRadius: 8, alignItems: 'center' },
  themeBtnActive: { backgroundColor: '#007AFF', borderColor: '#007AFF' },
});
