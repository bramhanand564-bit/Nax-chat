import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

// 1. Dummy Data for Mini-Apps (Portals)
const CATEGORIES = [
  { id: '1', title: 'Games', icon: 'game-controller' },
  { id: '2', title: 'Utilities', icon: 'calculator' },
  { id: '3', title: 'AI Tools', icon: 'hardware-chip' },
  { id: '4', title: 'Finance', icon: 'wallet' },
];

const TRENDING_PORTALS = [
  { id: 't1', title: 'Space Shooter', subtitle: 'HTML5 3D Game', image: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=400&q=80' },
  { id: 't2', title: 'AI Image Gen', subtitle: 'Create with Text', image: 'https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?w=400&q=80' },
];

const MY_PORTALS = [
  { id: 'm1', title: 'Expense Tracker', users: '1.2M', icon: 'https://cdn-icons-png.flaticon.com/128/2953/2953363.png' },
  { id: 'm2', title: 'PDF Converter', users: '850K', icon: 'https://cdn-icons-png.flaticon.com/128/3143/3143460.png' },
  { id: 'm3', title: 'Crypto Watch', users: '2.1M', icon: 'https://cdn-icons-png.flaticon.com/128/1490/1490989.png' },
  { id: 'm4', title: 'Translator', users: '5M+', icon: 'https://cdn-icons-png.flaticon.com/128/3132/3132225.png' },
];

export default function PortalsScreen() {
  const { isDark } = useTheme();

  // 2. Colors based on Theme
  const bg = isDark ? '#121212' : '#F5F5F7';
  const textMain = isDark ? '#FFFFFF' : '#000000';
  const textSub = isDark ? '#888888' : '#666666';
  const cardBg = isDark ? '#1E1E1E' : '#FFFFFF';
  const borderCol = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      
      {/* 3. Top Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: textMain }]}>Portals Ecosystem</Text>
        <TouchableOpacity style={styles.searchBtn}>
          <Ionicons name="search" size={24} color={textMain} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        
        {/* 4. Trending/Featured Banners (Horizontal Scroll) */}
        <Text style={[styles.sectionTitle, { color: textMain }]}>Trending Now</Text>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={TRENDING_PORTALS}
          keyExtractor={item => item.id}
          contentContainerStyle={{ paddingLeft: 20 }}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.trendingCard}>
              <Image source={{ uri: item.image }} style={styles.trendingImg} />
              <View style={styles.trendingOverlay}>
                <Text style={styles.trendingTitle}>{item.title}</Text>
                <Text style={styles.trendingSub}>{item.subtitle}</Text>
              </View>
            </TouchableOpacity>
          )}
        />

        {/* 5. Categories (WeChat Style Round Icons) */}
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

        {/* 6. My Installed Portals (Grid View) */}
        <View style={styles.myPortalsHeader}>
          <Text style={[styles.sectionTitle, { color: textMain, marginTop: 0 }]}>My Portals</Text>
          <TouchableOpacity>
            <Text style={{ color: '#007AFF', fontWeight: '600' }}>See All</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.gridContainer}>
          {MY_PORTALS.map((portal) => (
            <TouchableOpacity 
              key={portal.id} 
              style={[styles.gridItem, { backgroundColor: cardBg, borderColor: borderCol }]}
            >
              <Image source={{ uri: portal.icon }} style={styles.gridIcon} />
              <Text style={[styles.gridTitle, { color: textMain }]} numberOfLines={1}>{portal.title}</Text>
              <Text style={styles.gridUsers}>{portal.users} users</Text>
              <TouchableOpacity style={styles.openBtn}>
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
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingBottom: 10,
  },
  headerTitle: { fontSize: 26, fontWeight: 'bold' },
  searchBtn: { padding: 5 },
  
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginLeft: 20, marginTop: 20, marginBottom: 15 },
  
  // Trending Cards
  trendingCard: { width: 280, height: 150, borderRadius: 15, marginRight: 15, overflow: 'hidden' },
  trendingImg: { width: '100%', height: '100%' },
  trendingOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0, 
    backgroundColor: 'rgba(0,0,0,0.6)', padding: 10
  },
  trendingTitle: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  trendingSub: { color: '#DDD', fontSize: 12 },

  // Categories
  categoriesRow: { flexDirection: 'row', justifyContent: 'space-evenly', marginTop: 30, paddingHorizontal: 10 },
  catItem: { alignItems: 'center' },
  catIconWrap: { width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', elevation: 2, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5 },
  catText: { marginTop: 8, fontSize: 13, fontWeight: '500' },

  // Grid
  myPortalsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingRight: 20, marginTop: 30 },
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 15, justifyContent: 'space-between' },
  gridItem: { 
    width: '48%', padding: 15, borderRadius: 15, borderWidth: 1, 
    alignItems: 'center', marginBottom: 15,
    elevation: 1, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 3
  },
  gridIcon: { width: 50, height: 50, marginBottom: 10 },
  gridTitle: { fontSize: 15, fontWeight: '600', marginBottom: 4 },
  gridUsers: { fontSize: 12, color: '#888', marginBottom: 12 },
  openBtn: { backgroundColor: '#007AFF', paddingVertical: 6, paddingHorizontal: 20, borderRadius: 20 },
  openBtnText: { color: '#FFF', fontSize: 12, fontWeight: 'bold' }
});
