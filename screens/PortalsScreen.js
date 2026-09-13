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

  const bg = isDark ? '#121212' : '#F5F5F7';
  const textMain = isDark ? '#FFFFFF' : '#000000';
  const textSub = isDark ? '#888888' : '#666666';
  const cardBg = isDark ? '#1E1E1E' : '#FFFFFF';
  const borderCol = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';

  // Firebase से यूज़र्स के बनाए बॉट्स मंगाना
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
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: textMain }]}>Ecosystem</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => navigation.navigate('NaxStudio')}>
          <Ionicons name="code-slash" size={20} color="#FFF" />
          <Text style={styles.addBtnText}>Nax Studio</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        
        {/* User Created Bots */}
        <Text style={[styles.sectionTitle, { color: textMain }]}>Community Bots</Text>
        {customBots.length === 0 ? (
          <Text style={{ textAlign: 'center', color: textSub, marginTop: 10, marginBottom: 20 }}>Open Nax Studio to create the first Bot! 🤖</Text>
        ) : (
          customBots.map((bot) => (
            <TouchableOpacity 
              key={bot.id} 
              style={[styles.botCard, { backgroundColor: cardBg, borderColor: borderCol }]}
              onPress={() => handleOpenBot(bot)}
            >
              <Image source={{ uri: `https://ui-avatars.com/api/?name=${bot.botName.replace(' ', '+')}&background=random&color=fff` }} style={styles.botIcon} />
              <View style={styles.botInfo}>
                <Text style={[styles.botTitle, { color: textMain }]} numberOfLines={1}>{bot.botName}</Text>
                <Text style={[styles.botCreator, { color: textSub }]}>Created by @{bot.creatorName}</Text>
              </View>
              <TouchableOpacity style={styles.chatBtn} onPress={() => handleOpenBot(bot)}>
                <Text style={styles.chatBtnText}>Chat</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          ))
        )}

        {/* Built-in Apps */}
        <Text style={[styles.sectionTitle, { color: textMain, marginTop: 30 }]}>My Native Portals</Text>
        <View style={styles.gridContainer}>
          {MY_PORTALS.map((portal) => (
            <TouchableOpacity 
              key={portal.id} 
              style={[styles.gridItem, { backgroundColor: cardBg, borderColor: borderCol }]}
              onPress={() => navigation.navigate('TicTacToe')}
            >
              <Image source={{ uri: portal.icon }} style={styles.gridIcon} />
              <Text style={[styles.gridTitle, { color: textMain }]} numberOfLines={1}>{portal.title}</Text>
              <TouchableOpacity style={styles.openBtn} onPress={() => navigation.navigate('TicTacToe')}>
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
  addBtn: { flexDirection: 'row', backgroundColor: '#007AFF', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 15, alignItems: 'center' },
  addBtnText: { color: '#FFF', fontWeight: 'bold', marginLeft: 5 },
  
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginLeft: 20, marginTop: 15, marginBottom: 15 },
  
  botCard: { flexDirection: 'row', alignItems: 'center', padding: 15, marginHorizontal: 15, marginBottom: 12, borderRadius: 15, borderWidth: 1 },
  botIcon: { width: 45, height: 45, borderRadius: 10, marginRight: 15 },
  botInfo: { flex: 1 },
  botTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  botCreator: { fontSize: 13 },
  chatBtn: { backgroundColor: 'rgba(0,122,255,0.1)', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 12 },
  chatBtnText: { color: '#007AFF', fontWeight: 'bold', fontSize: 14 },

  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 15, justifyContent: 'space-between' },
  gridItem: { width: '48%', padding: 15, borderRadius: 15, borderWidth: 1, alignItems: 'center', marginBottom: 15 },
  gridIcon: { width: 50, height: 50, marginBottom: 10 },
  gridTitle: { fontSize: 15, fontWeight: '600', marginBottom: 12 },
  openBtn: { backgroundColor: '#007AFF', paddingVertical: 6, paddingHorizontal: 25, borderRadius: 20 },
  openBtnText: { color: '#FFF', fontSize: 12, fontWeight: 'bold' }
});
