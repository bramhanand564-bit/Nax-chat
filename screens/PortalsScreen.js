import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

const CATEGORIES = [
  { id: '1', title: 'Games', icon: 'game-controller' },
  { id: '2', title: 'Utilities', icon: 'calculator' },
  { id: '3', title: 'AI Tools', icon: 'hardware-chip' },
  { id: '4', title: 'Finance', icon: 'wallet' },
];

const MY_PORTALS = [
  { id: 'm1', title: 'Tic-Tac-Toe', users: 'Play Now', icon: 'https://cdn-icons-png.flaticon.com/128/2076/2076261.png', action: 'TicTacToe' },
  { id: 'm2', title: 'Expense Tracker', users: '1.2M', icon: 'https://cdn-icons-png.flaticon.com/128/2953/2953363.png', action: 'ComingSoon' },
  { id: 'm3', title: 'PDF Converter', users: '850K', icon: 'https://cdn-icons-png.flaticon.com/128/3143/3143460.png', action: 'ComingSoon' },
  { id: 'm4', title: 'Translator', users: '5M+', icon: 'https://cdn-icons-png.flaticon.com/128/3132/3132225.png', action: 'ComingSoon' },
];

export default function PortalsScreen({ navigation }) {
  const { isDark } = useTheme();

  const bg = isDark ? '#121212' : '#F5F5F7';
  const textMain = isDark ? '#FFFFFF' : '#000000';
  const textSub = isDark ? '#888888' : '#666666';
  const cardBg = isDark ? '#1E1E1E' : '#FFFFFF';
  const borderCol = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';

  const handleOpenPortal = (action) => {
    if (action === 'TicTacToe') {
      navigation.navigate('TicTacToe');
    } else {
      alert("This portal is under construction! 🚀");
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: textMain }]}>Portals Ecosystem</Text>
        <TouchableOpacity style={styles.searchBtn}>
          <Ionicons name="search" size={24} color={textMain} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        
        <View style={styles.categoriesRow}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity key={cat.id} style={styles.catItem}>
              <View style={[styles.catIconWrap, { backgroundColor: cardBg }]}>
                <Ionicons name={cat.icon} size={28} color="#007AFF" />
              </View>
              <Text style={[styles.catText, { color: textSub }]}>{cat.title}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.myPortalsHeader}>
          <Text style={[styles.sectionTitle, { color: textMain }]}>My Installed Portals</Text>
        </View>

        <View style={styles.gridContainer}>
          {MY_PORTALS.map((portal) => (
            <TouchableOpacity 
              key={portal.id} 
              style={[styles.gridItem, { backgroundColor: cardBg, borderColor: borderCol }]}
              onPress={() => handleOpenPortal(portal.action)}
            >
              <Image source={{ uri: portal.icon }} style={styles.gridIcon} />
              <Text style={[styles.gridTitle, { color: textMain }]} numberOfLines={1}>{portal.title}</Text>
              <Text style={styles.gridUsers}>{portal.users}</Text>
              <TouchableOpacity style={styles.openBtn} onPress={() => handleOpenPortal(portal.action)}>
                <Text style={styles.openBtnText}>Open</Text>
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
  searchBtn: { padding: 5 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginLeft: 20, marginTop: 30, marginBottom: 15 },
  categoriesRow: { flexDirection: 'row', justifyContent: 'space-evenly', marginTop: 20, paddingHorizontal: 10 },
  catItem: { alignItems: 'center' },
  catIconWrap: { width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', elevation: 2, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5 },
  catText: { marginTop: 8, fontSize: 13, fontWeight: '500' },
  myPortalsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingRight: 20 },
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 15, justifyContent: 'space-between' },
  gridItem: { width: '48%', padding: 15, borderRadius: 15, borderWidth: 1, alignItems: 'center', marginBottom: 15 },
  gridIcon: { width: 50, height: 50, marginBottom: 10 },
  gridTitle: { fontSize: 15, fontWeight: '600', marginBottom: 4 },
  gridUsers: { fontSize: 12, color: '#888', marginBottom: 12 },
  openBtn: { backgroundColor: '#007AFF', paddingVertical: 6, paddingHorizontal: 20, borderRadius: 20 },
  openBtnText: { color: '#FFF', fontSize: 12, fontWeight: 'bold' }
});
