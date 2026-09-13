import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

const MY_PORTALS = [
  { id: 'm1', title: 'Tic-Tac-Toe', users: 'Native App', icon: 'https://cdn-icons-png.flaticon.com/128/2076/2076261.png', action: 'TicTacToe' },
];

const COMMUNITY_BOTS = [
  { id: 'b1', title: '🍿 MovieFinder Bot', creator: '@vibe_coder', users: '12K Views', icon: 'https://cdn-icons-png.flaticon.com/128/3171/3171927.png', url: 'https://www.themoviedb.org/' },
  { id: 'b2', title: '🤖 AI Assistant', creator: '@nax_core', users: '50K Views', icon: 'https://cdn-icons-png.flaticon.com/128/8943/8943377.png', url: 'https://duckduckgo.com/?q=AI+Chat' },
  { id: 'b3', title: '🎮 Web Games', creator: '@gamer_boy', users: '5M Views', icon: 'https://cdn-icons-png.flaticon.com/128/3132/3132225.png', url: 'https://poki.com/' }
];

export default function PortalsScreen({ navigation }) {
  const { isDark } = useTheme();

  const bg = isDark ? '#121212' : '#F5F5F7';
  const textMain = isDark ? '#FFFFFF' : '#000000';
  const textSub = isDark ? '#888888' : '#666666';
  const cardBg = isDark ? '#1E1E1E' : '#FFFFFF';
  const borderCol = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';

  const handleOpenNative = (action) => {
    if (action === 'TicTacToe') navigation.navigate('TicTacToe');
  };

  const handleOpenWeb = (title, url) => {
    // यह वेबसाइट को ऐप के अंदर खोलेगा
    navigation.navigate('WebPortal', { title, url });
  };

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: textMain }]}>Ecosystem</Text>
        <TouchableOpacity style={styles.addBtn}>
          <Ionicons name="add" size={20} color="#FFF" />
          <Text style={styles.addBtnText}>Add Bot</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        
        {/* Community Bots Section */}
        <Text style={[styles.sectionTitle, { color: textMain, marginTop: 20 }]}>Community Bots & Apps</Text>
        
        {COMMUNITY_BOTS.map((bot) => (
          <TouchableOpacity 
            key={bot.id} 
            style={[styles.botCard, { backgroundColor: cardBg, borderColor: borderCol }]}
            onPress={() => handleOpenWeb(bot.title, bot.url)}
          >
            <Image source={{ uri: bot.icon }} style={styles.botIcon} />
            <View style={styles.botInfo}>
              <Text style={[styles.botTitle, { color: textMain }]} numberOfLines={1}>{bot.title}</Text>
              <Text style={[styles.botCreator, { color: textSub }]}>by {bot.creator} • {bot.users}</Text>
            </View>
            <Ionicons name="open-outline" size={24} color="#007AFF" />
          </TouchableOpacity>
        ))}

        {/* Native Mini Apps */}
        <Text style={[styles.sectionTitle, { color: textMain }]}>My Native Portals</Text>
        <View style={styles.gridContainer}>
          {MY_PORTALS.map((portal) => (
            <TouchableOpacity 
              key={portal.id} 
              style={[styles.gridItem, { backgroundColor: cardBg, borderColor: borderCol }]}
              onPress={() => handleOpenNative(portal.action)}
            >
              <Image source={{ uri: portal.icon }} style={styles.gridIcon} />
              <Text style={[styles.gridTitle, { color: textMain }]} numberOfLines={1}>{portal.title}</Text>
              <TouchableOpacity style={styles.openBtn} onPress={() => handleOpenNative(portal.action)}>
                <Text style={styles.openBtnText}>Play</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          ))}
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 10 },
  headerTitle: { fontSize: 26, fontWeight: 'bold' },
  addBtn: { flexDirection: 'row', backgroundColor: '#007AFF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 15, alignItems: 'center' },
  addBtnText: { color: '#FFF', fontWeight: 'bold', marginLeft: 5 },
  
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginLeft: 20, marginTop: 30, marginBottom: 15 },
  
  botCard: { flexDirection: 'row', alignItems: 'center', padding: 15, marginHorizontal: 15, marginBottom: 12, borderRadius: 15, borderWidth: 1 },
  botIcon: { width: 45, height: 45, borderRadius: 10, marginRight: 15 },
  botInfo: { flex: 1 },
  botTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  botCreator: { fontSize: 13 },

  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 15, justifyContent: 'space-between' },
  gridItem: { width: '48%', padding: 15, borderRadius: 15, borderWidth: 1, alignItems: 'center', marginBottom: 15 },
  gridIcon: { width: 50, height: 50, marginBottom: 10 },
  gridTitle: { fontSize: 15, fontWeight: '600', marginBottom: 12 },
  openBtn: { backgroundColor: '#007AFF', paddingVertical: 6, paddingHorizontal: 25, borderRadius: 20 },
  openBtnText: { color: '#FFF', fontSize: 12, fontWeight: 'bold' }
});
