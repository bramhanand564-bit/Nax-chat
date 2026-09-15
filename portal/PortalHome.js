// ==========================================
// FILE: portal/PortalHome.js
// ==========================================
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Platform,
  RefreshControl,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

// 🚀 IMPORT BOTH APIs
import { MiniAppAPI } from '../api/MiniAppAPI';
import { BotAPI } from '../api/BotAPI';
import PortalCard from './PortalCard';

const CATEGORIES = [
  { id: 'c1', name: 'AI Bots', icon: 'hardware-chip', color: '#AF52DE' },
  { id: 'c2', name: 'Games', icon: 'game-controller', color: '#FF9500' },
  { id: 'c3', name: 'Tools', icon: 'hammer', color: '#34C759' },
  { id: 'c4', name: 'Media', icon: 'play-circle', color: '#FF3B30' },
  { id: 'c5', name: 'Finance', icon: 'wallet', color: '#087EFF' },
];

export default function PortalHome({ navigation }) {
  const { isDark } = useTheme();

  // STATE
  const [apps, setApps] = useState([]);
  const [bots, setBots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // --- COLORS ---
  const bg = isDark ? '#050A10' : '#F3F7FA';
  const headerBg = isDark ? '#0B1824' : '#FFFFFF';
  const cardBg = isDark ? '#101A26' : '#FFFFFF';
  const inputBg = isDark ? '#14202E' : '#EEF3F7';
  const textMain = isDark ? '#F4F7FA' : '#142532';
  const textSub = isDark ? '#8FA6B9' : '#6C8494';
  const border = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
  const blue = '#087EFF';
  const purple = '#AF52DE';

  // --- 🚀 FETCH REAL DATA (APPS + BOTS CONCURRENTLY) ---
  const fetchPortalData = useCallback(async () => {
    try {
      setLoading(true); // 🚀 FIX: Ensure loading is set to true when fetching starts
      const [publicApps, publicBots] = await Promise.all([
        MiniAppAPI.getPublicMiniApps(),
        BotAPI.searchBots('') 
      ]);
      
      setApps(publicApps || []);
      setBots(publicBots || []);
    } catch (error) {
      console.log('Error loading portal ecosystem:', error);
    } finally {
      // 🚀 FIX: This MUST run to stop the spinner even if there's an error
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchPortalData();
  }, [fetchPortalData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchPortalData();
  };

  // Combine both into one ecosystem list
  const ecosystemItems = [...bots, ...apps];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]}>
      
      {/* HEADER */}
      <View style={[styles.header, { backgroundColor: headerBg, borderBottomColor: border }]}>
        <View style={styles.headerTop}>
          <Text style={[styles.title, { color: textMain }]}>Discover</Text>
          <TouchableOpacity 
            style={[styles.studioBtn, { backgroundColor: `${purple}20`, borderColor: purple }]}
            onPress={() => navigation.navigate('StudioHome')}
          >
            <Ionicons name="sparkles" size={16} color={purple} />
            <Text style={[styles.studioBtnText, { color: purple }]}>Studio</Text>
          </TouchableOpacity>
        </View>

        {/* SEARCH TRIGGER */}
        <TouchableOpacity 
          activeOpacity={0.85} 
          style={[styles.searchBox, { backgroundColor: inputBg }]} 
          onPress={() => navigation.navigate('PortalSearch')}
        >
          <Ionicons name="search" size={20} color={textSub} />
          <Text style={[styles.searchText, { color: textSub }]}>Search bots, mini-apps, tools...</Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={blue} />}
      >
        
        {/* HERO BANNER: NAX STUDIO */}
        <TouchableOpacity 
          activeOpacity={0.9} 
          style={[styles.heroBanner, { backgroundColor: purple }]}
          onPress={() => navigation.navigate('StudioHome')}
        >
          <View style={styles.heroContent}>
            <View style={styles.badge}><Text style={styles.badgeText}>AI APP BUILDER</Text></View>
            <Text style={styles.heroTitle}>Build your own Mini-App</Text>
            <Text style={styles.heroDesc}>Type what you want and AI will build a safe app instantly.</Text>
          </View>
          <Ionicons name="color-wand" size={48} color="#FFF" style={styles.heroIcon} />
        </TouchableOpacity>

        {/* CATEGORIES SECTION */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: textMain }]}>Categories</Text>
            <TouchableOpacity onPress={() => navigation.navigate('PortalCategories', { category: 'All' })}>
              <Text style={{ color: blue, fontWeight: '700' }}>See All</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catList}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity 
                key={cat.id} 
                style={[styles.catCard, { backgroundColor: cardBg, borderColor: border }]}
                onPress={() => navigation.navigate('PortalCategories', { category: cat.name })}
              >
                <View style={[styles.catIconBox, { backgroundColor: `${cat.color}20` }]}>
                  <Ionicons name={cat.icon} size={24} color={cat.color} />
                </View>
                <Text style={[styles.catName, { color: textMain }]}>{cat.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* 🚀 COMBINED LATEST ECOSYSTEM SECTION */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: textMain }]}>Latest Ecosystem</Text>
            <TouchableOpacity onPress={onRefresh}>
              <Ionicons name="refresh" size={18} color={blue} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loaderBox}>
              <ActivityIndicator size="small" color={blue} />
              <Text style={[styles.loaderText, { color: textSub }]}>Fetching ecosystem...</Text>
            </View>
          ) : ecosystemItems.length > 0 ? (
            ecosystemItems.map((item) => (
              <PortalCard 
                key={item.id} 
                item={item} 
                navigation={navigation} 
              />
            ))
          ) : (
            <View style={[styles.emptyBox, { backgroundColor: cardBg, borderColor: border }]}>
              <Ionicons name="grid-outline" size={40} color={textSub} />
              <Text style={[styles.emptyTitle, { color: textMain }]}>No apps or bots found</Text>
              <Text style={[styles.emptyDesc, { color: textSub }]}>
                Be the first! Use Nax Studio to generate and publish an app.
              </Text>
            </View>
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 18, paddingTop: Platform.OS === 'ios' ? 10 : 15, paddingBottom: 15, borderBottomWidth: 1 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  title: { fontSize: 28, fontWeight: '900' },
  studioBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, gap: 5 },
  studioBtnText: { fontSize: 13, fontWeight: '800' },
  searchBox: { height: 44, borderRadius: 14, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14 },
  searchText: { fontSize: 15, marginLeft: 10 },
  scrollContent: { padding: 18 },
  heroBanner: { borderRadius: 20, padding: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 25, overflow: 'hidden' },
  heroContent: { flex: 1, marginRight: 10 },
  badge: { backgroundColor: 'rgba(0,0,0,0.25)', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginBottom: 8 },
  badgeText: { color: '#FFF', fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
  heroTitle: { color: '#FFF', fontSize: 18, fontWeight: '900', marginBottom: 4 },
  heroDesc: { color: 'rgba(255,255,255,0.85)', fontSize: 12, lineHeight: 16 },
  heroIcon: { opacity: 0.9 },
  section: { marginBottom: 25 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '800' },
  catList: { gap: 12 },
  catCard: { width: 95, height: 100, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center', padding: 8 },
  catIconBox: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  catName: { fontSize: 12, fontWeight: '700' },
  loaderBox: { paddingVertical: 30, alignItems: 'center' },
  loaderText: { marginTop: 8, fontSize: 13 },
  emptyBox: { alignItems: 'center', justifyContent: 'center', padding: 30, borderRadius: 18, borderWidth: 1 },
  emptyTitle: { fontSize: 16, fontWeight: '800', marginTop: 10 },
  emptyDesc: { fontSize: 13, textAlign: 'center', marginTop: 4, lineHeight: 18 }
});
