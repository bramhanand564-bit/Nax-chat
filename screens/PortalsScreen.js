import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { db } from '../firebaseConfig';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';

const MY_PORTALS = [
  { id: 'm1', title: 'Tic-Tac-Toe', users: 'Native App', icon: 'https://cdn-icons-png.flaticon.com/128/2076/2076261.png', action: 'TicTacToe' },
];

export default function PortalsScreen({ navigation }) {
  const { isDark } = useTheme();
  const [customBots, setCustomBots] = useState([]);

  // Super Glassy & Futuristic Color Palette (Zero Neon)
  const bg = isDark ? '#0A0A0C' : '#F2F2F7';
  const textMain = isDark ? '#F5F5F7' : '#1C1C1E';
  const textSub = isDark ? '#8E8E93' : '#6C6C70';
  const cardBg = isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(255, 255, 255, 0.75)';
  const cardBorder = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)';
  const buttonBg = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 122, 255, 0.1)';
  const buttonText = isDark ? '#FFFFFF' : '#007AFF';

  // Firebase से यूज़र्स के बनाए बॉट्स मंगाना (Original Logic Intact)
  useEffect(() => {
    const q = query(collection(db, 'custom_bots'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const bots = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCustomBots(bots);
    });
    return unsubscribe;
  }, []);

  const handleOpenBot = (bot) => {
    navigation.navigate('BotChat', { 
      botName: bot.botName, 
      botRules: bot.rules, 
      creatorName: bot.creatorName 
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      
      {/* Sleek Futuristic Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.headerSubtitle, { color: textSub }]}>EXPLORE</Text>
          <Text style={[styles.headerTitle, { color: textMain }]}>Ecosystem</Text>
        </View>
        <TouchableOpacity 
          style={[styles.addBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#000000' }]} 
          onPress={() => navigation.navigate('NaxStudio')}
          activeOpacity={0.8}
        >
          <Ionicons name="code-slash" size={18} color="#FFF" />
          <Text style={styles.addBtnText}>Nax Studio</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 120, paddingTop: 10 }} showsVerticalScrollIndicator={false}>
        
        {/* User Created Bots */}
        <Text style={[styles.sectionTitle, { color: textMain }]}>Community Bots</Text>
        {customBots.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
            <Ionicons name="hardware-chip-outline" size={32} color={textSub} style={{ marginBottom: 8 }} />
            <Text style={[styles.emptyText, { color: textSub }]}>Open Nax Studio to create the first Bot!</Text>
          </View>
        ) : (
          customBots.map((bot) => (
            <TouchableOpacity 
              key={bot.id} 
              style={[styles.botCard, { backgroundColor: cardBg, borderColor: cardBorder }]}
              onPress={() => handleOpenBot(bot)}
              activeOpacity={0.85}
            >
              <Image source={{ uri: `https://ui-avatars.com/api/?name=${bot.botName.replace(' ', '+')}&background=random&color=fff` }} style={styles.botIcon} />
              <View style={styles.botInfo}>
                <Text style={[styles.botTitle, { color: textMain }]} numberOfLines={1}>{bot.botName}</Text>
                <Text style={[styles.botCreator, { color: textSub }]}>@{bot.creatorName || 'creator'}</Text>
              </View>
              <TouchableOpacity 
                style={[styles.chatBtn, { backgroundColor: buttonBg }]} 
                onPress={() => handleOpenBot(bot)}
                activeOpacity={0.8}
              >
                <Text style={[styles.chatBtnText, { color: buttonText }]}>Chat</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          ))
        )}

        {/* Built-in Apps */}
        <Text style={[styles.sectionTitle, { color: textMain, marginTop: 32 }]}>My Native Portals</Text>
        <View style={styles.gridContainer}>
          {MY_PORTALS.map((portal) => (
            <TouchableOpacity 
              key={portal.id} 
              style={[styles.gridItem, { backgroundColor: cardBg, borderColor: cardBorder }]}
              onPress={() => navigation.navigate('TicTacToe')}
              activeOpacity={0.85}
            >
              <Image source={{ uri: portal.icon }} style={styles.gridIcon} />
              <Text style={[styles.gridTitle, { color: textMain }]} numberOfLines={1}>{portal.title}</Text>
              <TouchableOpacity 
                style={[styles.openBtn, { backgroundColor: buttonBg }]} 
                onPress={() => navigation.navigate('TicTacToe')}
                activeOpacity={0.8}
              >
                <Text style={[styles.openBtnText, { color: buttonText }]}>Play</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          ))}
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 50 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingHorizontal: 24, paddingBottom: 16 },
  headerSubtitle: { fontSize: 11, fontWeight: '700', letterSpacing: 1.5, marginBottom: 2 },
  headerTitle: { fontSize: 30, fontWeight: '800', letterSpacing: -0.5 },
  addBtn: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 4 },
  addBtnText: { color: '#FFF', fontWeight: '700', fontSize: 13, marginLeft: 6 },
  
  sectionTitle: { fontSize: 17, fontWeight: '700', marginLeft: 24, marginTop: 16, marginBottom: 16, letterSpacing: -0.3 },
  
  emptyCard: { marginHorizontal: 20, padding: 28, borderRadius: 24, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 14, fontWeight: '500', textAlign: 'center' },

  botCard: { flexDirection: 'row', alignItems: 'center', padding: 16, marginHorizontal: 20, marginBottom: 12, borderRadius: 24, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.04, shadowRadius: 16, elevation: 2 },
  botIcon: { width: 48, height: 48, borderRadius: 14, marginRight: 16 },
  botInfo: { flex: 1 },
  botTitle: { fontSize: 16, fontWeight: '700', marginBottom: 3, letterSpacing: -0.2 },
  botCreator: { fontSize: 12, fontWeight: '500' },
  chatBtn: { paddingHorizontal: 18, paddingVertical: 9, borderRadius: 14 },
  chatBtnText: { fontWeight: '700', fontSize: 13 },

  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 20, justifyContent: 'space-between' },
  gridItem: { width: '48%', padding: 20, borderRadius: 24, borderWidth: 1, alignItems: 'center', marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.04, shadowRadius: 16, elevation: 2 },
  gridIcon: { width: 48, height: 48, marginBottom: 12 },
  gridTitle: { fontSize: 15, fontWeight: '700', marginBottom: 14, letterSpacing: -0.2 },
  openBtn: { paddingVertical: 8, paddingHorizontal: 24, borderRadius: 14, width: '100%', alignItems: 'center' },
  openBtnText: { fontSize: 13, fontWeight: '700' }
});
