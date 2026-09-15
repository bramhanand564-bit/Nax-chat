import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  SafeAreaView,
  Platform,
  TextInput
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

// --- MOCK DATA (Will be moved to Firebase/API later) ---
const FEATURED_ITEM = {
  id: 'f1',
  name: 'Nax AI Assistant',
  desc: 'Your ultimate personal AI companion for writing, coding, and daily tasks.',
  color: '#AF52DE',
  image: 'https://ui-avatars.com/api/?name=AI&background=AF52DE&color=fff&size=200'
};

const CATEGORIES = [
  { id: 'c1', name: 'AI Bots', icon: 'hardware-chip', color: '#AF52DE' },
  { id: 'c2', name: 'Games', icon: 'game-controller', color: '#FF9500' },
  { id: 'c3', name: 'Tools', icon: 'hammer', color: '#34C759' },
  { id: 'c4', name: 'Media', icon: 'play-circle', color: '#FF3B30' },
  { id: 'c5', name: 'Finance', icon: 'wallet', color: '#087EFF' },
];

const TRENDING_APPS = [
  { id: 't1', name: '2048', type: 'Mini App', category: 'Games', icon: 'grid', color: '#FF9500' },
  { id: 't2', name: '@translator', type: 'Bot', category: 'Productivity', icon: 'language', color: '#087EFF' },
  { id: 't3', name: 'Weather', type: 'Mini App', category: 'Tools', icon: 'partly-sunny', color: '#32ADE6' },
];

export default function PortalHome({ navigation }) {
  const { isDark } = useTheme();

  // --- COLORS ---
  const bg = isDark ? '#050A10' : '#F3F7FA';
  const headerBg = isDark ? '#0B1824' : '#FFFFFF';
  const cardBg = isDark ? '#101A26' : '#FFFFFF';
  const inputBg = isDark ? '#14202E' : '#EEF3F7';
  const textMain = isDark ? '#F4F7FA' : '#142532';
  const textSub = isDark ? '#8FA6B9' : '#6C8494';
  const border = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
  const blue = '#087EFF';

  // Navigate to Search Screen (Step 2 of Phase 5)
  const openSearch = () => {
    // navigation.navigate('PortalSearch'); 
    console.log('Open Portal Search');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]}>
      
      {/* HEADER */}
      <View style={[styles.header, { backgroundColor: headerBg, borderBottomColor: border }]}>
        <View style={styles.headerTop}>
          <Text style={[styles.title, { color: textMain }]}>Discover</Text>
          <TouchableOpacity style={[styles.profileBtn, { backgroundColor: inputBg }]}>
            <Ionicons name="notifications-outline" size={22} color={textMain} />
          </TouchableOpacity>
        </View>

        {/* FAKE SEARCH BAR (Acts as a button to open PortalSearch) */}
        <TouchableOpacity activeOpacity={0.9} style={[styles.searchBox, { backgroundColor: inputBg }]} onPress={openSearch}>
          <Ionicons name="search" size={20} color={textSub} />
          <Text style={[styles.searchText, { color: textSub }]}>Search bots, apps, games...</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* HERO / FEATURED BANNER */}
        <TouchableOpacity activeOpacity={0.85} style={[styles.heroCard, { backgroundColor: FEATURED_ITEM.color }]}>
          <View style={styles.heroContent}>
            <View style={styles.heroBadge}><Text style={styles.heroBadgeText}>FEATURED</Text></View>
            <Text style={styles.heroTitle}>{FEATURED_ITEM.name}</Text>
            <Text style={styles.heroDesc} numberOfLines={2}>{FEATURED_ITEM.desc}</Text>
            <View style={styles.heroBtn}>
              <Text style={[styles.heroBtnText, { color: FEATURED_ITEM.color }]}>Try Now</Text>
            </View>
          </View>
          <Image source={{ uri: FEATURED_ITEM.image }} style={styles.heroImage} />
        </TouchableOpacity>

        {/* CATEGORIES (Horizontal) */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: textMain }]}>Categories</Text>
            <TouchableOpacity><Text style={{ color: blue, fontWeight: '600' }}>See All</Text></TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hList}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity key={cat.id} style={[styles.catCard, { backgroundColor: cardBg, borderColor: border }]}>
                <View style={[styles.catIconBox, { backgroundColor: `${cat.color}20` }]}>
                  <Ionicons name={cat.icon} size={26} color={cat.color} />
                </View>
                <Text style={[styles.catName, { color: textMain }]}>{cat.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* TRENDING SECTION (Vertical List) */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: textMain, marginBottom: 15 }]}>Trending Now</Text>
          {TRENDING_APPS.map((item, index) => (
            <TouchableOpacity key={item.id} style={[styles.trendingCard, { backgroundColor: cardBg, borderColor: border }]}>
              <Text style={[styles.trendingRank, { color: textSub }]}>{index + 1}</Text>
              <View style={[styles.trendingIconBox, { backgroundColor: `${item.color}20` }]}>
                <Ionicons name={item.icon} size={24} color={item.color} />
              </View>
              <View style={styles.trendingInfo}>
                <Text style={[styles.trendingName, { color: textMain }]} numberOfLines={1}>{item.name}</Text>
                <Text style={[styles.trendingSub, { color: textSub }]}>{item.category} • {item.type}</Text>
              </View>
              <TouchableOpacity style={[styles.getBtn, { backgroundColor: `${blue}15` }]}>
                <Text style={[styles.getBtnText, { color: blue }]}>Get</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

    </SafeAreaView>
  );
}

// --- STYLES ---
const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 10 : 20, paddingBottom: 15, borderBottomWidth: 1 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  title: { fontSize: 32, fontWeight: '800' },
  profileBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  searchBox: { height: 48, borderRadius: 12, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15 },
  searchText: { fontSize: 16, marginLeft: 10 },
  scrollContent: { paddingTop: 20, paddingHorizontal: 20 },
  
  heroCard: { borderRadius: 24, padding: 20, flexDirection: 'row', overflow: 'hidden', marginBottom: 30, height: 180 },
  heroContent: { flex: 1, justifyContent: 'center', zIndex: 2 },
  heroBadge: { backgroundColor: 'rgba(0,0,0,0.3)', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginBottom: 10 },
  heroBadgeText: { color: '#FFF', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  heroTitle: { color: '#FFF', fontSize: 22, fontWeight: '900', marginBottom: 6 },
  heroDesc: { color: 'rgba(255,255,255,0.85)', fontSize: 13, marginBottom: 15, lineHeight: 18 },
  heroBtn: { backgroundColor: '#FFF', alignSelf: 'flex-start', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 14 },
  heroBtnText: { fontWeight: '800', fontSize: 13 },
  heroImage: { position: 'absolute', right: -30, bottom: -20, width: 140, height: 140, opacity: 0.9, zIndex: 1, borderRadius: 70 },
  
  section: { marginBottom: 30 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  sectionTitle: { fontSize: 20, fontWeight: '800' },
  
  hList: { paddingRight: 20, gap: 12 },
  catCard: { width: 105, height: 115, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center', padding: 10 },
  catIconBox: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  catName: { fontSize: 14, fontWeight: '700' },
  
  trendingCard: { flexDirection: 'row', alignItems: 'center', padding: 15, borderRadius: 18, borderWidth: 1, marginBottom: 12 },
  trendingRank: { fontSize: 16, fontWeight: '800', width: 25, textAlign: 'center' },
  trendingIconBox: { width: 50, height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginLeft: 5 },
  trendingInfo: { flex: 1, marginLeft: 15, marginRight: 10 },
  trendingName: { fontSize: 16, fontWeight: '800' },
  trendingSub: { fontSize: 12, marginTop: 3, fontWeight: '500' },
  getBtn: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 16 },
  getBtnText: { fontWeight: '800', fontSize: 14 }
});
