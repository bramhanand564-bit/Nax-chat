import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

// --- MOCK TRENDING DATABASE ---
const TRENDING_LIST = [
  { id: 't1', name: '2048 Game', type: 'Mini App', category: 'Games', icon: 'grid', color: '#FF9500', tag: '🔥 Top 1 Today', users: '24.5K' },
  { id: 't2', name: 'Web Translator', type: 'Mini App', category: 'Productivity', icon: 'language', color: '#087EFF', tag: '📈 Rising Fast', users: '18.2K' },
  { id: 't3', name: 'Nax AI Assistant', type: 'Bot', category: 'AI Bots', username: '@nax_ai', icon: 'hardware-chip', color: '#AF52DE', tag: '⭐ Most Active', users: '15.9K' },
  { id: 't4', name: 'Code Master', type: 'Bot', category: 'Developer', username: '@code_master', icon: 'code-slash', color: '#34C759', tag: 'Popular', users: '12.1K' },
  { id: 't5', name: 'Tic Tac Toe', type: 'Mini App', category: 'Games', icon: 'close-circle', color: '#FF3B30', tag: 'Classic', users: '10.4K' },
  { id: 't6', name: 'Weather Radar', type: 'Mini App', category: 'Tools', icon: 'partly-sunny', color: '#32ADE6', tag: 'Trending', users: '8.7K' },
  { id: 't7', name: 'Finance Tracker', type: 'Mini App', category: 'Tools', icon: 'wallet', color: '#18A66A', tag: 'New Hit', users: '5.2K' }
];

export default function PortalTrending({ navigation }) {
  const { isDark } = useTheme();

  // --- COLORS ---
  const bg = isDark ? '#050A10' : '#F3F7FA';
  const headerBg = isDark ? '#0B1824' : '#FFFFFF';
  const cardBg = isDark ? '#101A26' : '#FFFFFF';
  const textMain = isDark ? '#F4F7FA' : '#142532';
  const textSub = isDark ? '#8FA6B9' : '#6C8494';
  const border = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
  const blue = '#087EFF';

  // --- HANDLERS ---
  const handleItemPress = (item) => {
    if (item.type === 'Bot') {
      navigation.navigate('ChatRoom', { 
        friendId: item.id, 
        chatName: item.name, 
        friendUsername: item.username 
      });
    } else {
      navigation.navigate('MiniAppInstall', { app: item });
    }
  };

  // --- RENDER RANKING STYLES ---
  const getRankStyle = (index) => {
    if (index === 0) return { color: '#FFD700', fontSize: 24 }; // Gold for Rank 1
    if (index === 1) return { color: '#C0C0C0', fontSize: 22 }; // Silver for Rank 2
    if (index === 2) return { color: '#CD7F32', fontSize: 20 }; // Bronze for Rank 3
    return { color: textSub, fontSize: 16 }; // Normal for the rest
  };

  // --- RENDER TRENDING CARD ---
  const renderTrendingCard = ({ item, index }) => (
    <TouchableOpacity 
      activeOpacity={0.8}
      style={[styles.trendingCard, { backgroundColor: cardBg, borderColor: border }]}
      onPress={() => handleItemPress(item)}
    >
      {/* Rank Indicator */}
      <View style={styles.rankContainer}>
        <Text style={[styles.rankText, getRankStyle(index)]}>{index + 1}</Text>
      </View>

      {/* App Icon */}
      <View style={[styles.iconBox, { backgroundColor: `${item.color}20` }]}>
        <Ionicons name={item.icon} size={28} color={item.color} />
      </View>
      
      {/* App Details */}
      <View style={styles.appInfo}>
        <Text style={[styles.appName, { color: textMain }]} numberOfLines={1}>{item.name}</Text>
        <Text style={[styles.appSub, { color: textSub }]}>
          {item.type === 'Bot' ? item.username : item.category}
        </Text>
        <View style={styles.metricsRow}>
          <Text style={[styles.tagText, { color: item.color }]}>{item.tag}</Text>
          <Text style={[styles.usersText, { color: textSub }]}> • {item.users} users</Text>
        </View>
      </View>

      {/* Action Button */}
      <TouchableOpacity 
        style={[styles.getBtn, { backgroundColor: `${blue}15` }]}
        onPress={() => handleItemPress(item)}
      >
        <Text style={[styles.getBtnText, { color: blue }]}>Get</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]}>
      
      {/* HEADER */}
      <View style={[styles.header, { backgroundColor: headerBg, borderBottomColor: border }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={textMain} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={[styles.headerTitle, { color: textMain }]}>Top Charts</Text>
          <Text style={[styles.headerSubtitle, { color: textSub }]}>Most popular this week</Text>
        </View>
        <TouchableOpacity style={styles.iconBtn}>
          <Ionicons name="filter" size={22} color={textMain} />
        </TouchableOpacity>
      </View>

      {/* LIST OF TRENDING APPS */}
      <FlatList
        data={TRENDING_LIST}
        keyExtractor={(item) => item.id}
        renderItem={renderTrendingCard}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

    </SafeAreaView>
  );
}

// --- STYLES ---
const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    paddingHorizontal: 10, 
    paddingTop: Platform.OS === 'ios' ? 10 : 15, 
    paddingBottom: 12, 
    borderBottomWidth: 1 
  },
  backBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  iconBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  headerTitleContainer: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800' },
  headerSubtitle: { fontSize: 12, marginTop: 2, fontWeight: '500' },
  
  listContent: { padding: 15, paddingBottom: 40 },
  
  trendingCard: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 16, 
    borderRadius: 18, 
    borderWidth: 1, 
    marginBottom: 12 
  },
  rankContainer: { width: 35, alignItems: 'center', justifyContent: 'center', marginRight: 5 },
  rankText: { fontWeight: '900' },
  
  iconBox: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  
  appInfo: { flex: 1, marginLeft: 15, marginRight: 10 },
  appName: { fontSize: 16, fontWeight: '800' },
  appSub: { fontSize: 12, fontWeight: '600', marginTop: 3, marginBottom: 6 },
  
  metricsRow: { flexDirection: 'row', alignItems: 'center' },
  tagText: { fontSize: 11, fontWeight: '800' },
  usersText: { fontSize: 11, fontWeight: '500' },
  
  getBtn: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 14 },
  getBtnText: { fontWeight: '800', fontSize: 14 }
});
