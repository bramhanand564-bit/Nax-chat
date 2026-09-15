import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  Platform,
  Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

// --- MOCK CATEGORIES ---
const CATEGORIES = [
  { id: 'All', name: 'All Apps', icon: 'apps' },
  { id: 'AI Bots', name: 'AI Bots', icon: 'hardware-chip' },
  { id: 'Games', name: 'Games', icon: 'game-controller' },
  { id: 'Tools', name: 'Tools', icon: 'hammer' },
  { id: 'Productivity', name: 'Productivity', icon: 'briefcase' },
  { id: 'Media', name: 'Media', icon: 'play-circle' }
];

// --- MOCK DATABASE (Combined Apps & Bots) ---
const MOCK_DATABASE = [
  { id: '1', name: 'Nax AI Assistant', type: 'Bot', category: 'AI Bots', username: '@nax_ai', icon: 'hardware-chip', color: '#AF52DE', desc: 'Your personal AI companion.' },
  { id: '2', name: '2048 Game', type: 'Mini App', category: 'Games', icon: 'grid', color: '#FF9500', desc: 'Join numbers to reach 2048 tile.' },
  { id: '3', name: 'Web Translator', type: 'Mini App', category: 'Productivity', icon: 'language', color: '#087EFF', desc: 'Translate any text instantly.' },
  { id: '4', name: 'Code Helper', type: 'Bot', category: 'AI Bots', username: '@code_bot', icon: 'code-slash', color: '#34C759', desc: 'Get help with programming.' },
  { id: '5', name: 'Weather Radar', type: 'Mini App', category: 'Tools', icon: 'partly-sunny', color: '#32ADE6', desc: 'Check live weather updates.' },
  { id: '6', name: 'Tic Tac Toe', type: 'Mini App', category: 'Games', icon: 'close-circle', color: '#FF3B30', desc: 'Play classic Tic Tac Toe.' },
  { id: '7', name: 'Finance Tracker', type: 'Mini App', category: 'Productivity', icon: 'wallet', color: '#18A66A', desc: 'Manage your daily expenses.' }
];

export default function PortalCategories({ navigation, route }) {
  const { isDark } = useTheme();
  
  // Default category can be passed via navigation params, else 'All'
  const initialCategory = route?.params?.category || 'All';
  const [activeCategory, setActiveCategory] = useState(initialCategory);

  // --- COLORS ---
  const bg = isDark ? '#050A10' : '#F3F7FA';
  const headerBg = isDark ? '#0B1824' : '#FFFFFF';
  const cardBg = isDark ? '#101A26' : '#FFFFFF';
  const textMain = isDark ? '#F4F7FA' : '#142532';
  const textSub = isDark ? '#8FA6B9' : '#6C8494';
  const border = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
  const blue = '#087EFF';

  // --- FILTER LOGIC ---
  const filteredData = activeCategory === 'All' 
    ? MOCK_DATABASE 
    : MOCK_DATABASE.filter(item => item.category === activeCategory);

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

  // --- RENDER APP CARD ---
  const renderAppCard = ({ item }) => (
    <TouchableOpacity 
      activeOpacity={0.8}
      style={[styles.appCard, { backgroundColor: cardBg, borderColor: border }]}
      onPress={() => handleItemPress(item)}
    >
      <View style={[styles.iconBox, { backgroundColor: `${item.color}20` }]}>
        <Ionicons name={item.icon} size={30} color={item.color} />
      </View>
      
      <View style={styles.appInfo}>
        <Text style={[styles.appName, { color: textMain }]} numberOfLines={1}>{item.name}</Text>
        <Text style={[styles.appSub, { color: textSub }]}>
          {item.type === 'Bot' ? item.username : item.type}
        </Text>
        <Text style={[styles.appDesc, { color: textSub }]} numberOfLines={1}>{item.desc}</Text>
      </View>

      <TouchableOpacity style={[styles.getBtn, { backgroundColor: `${blue}15` }]} onPress={() => handleItemPress(item)}>
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
        <Text style={[styles.headerTitle, { color: textMain }]}>Categories</Text>
        <View style={{ width: 44 }} /> {/* Empty view for balance */}
      </View>

      {/* CATEGORY TABS (Horizontal Scroll) */}
      <View style={[styles.tabsContainer, { backgroundColor: headerBg, borderBottomColor: border }]}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={CATEGORIES}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.tabsList}
          renderItem={({ item }) => {
            const isActive = activeCategory === item.id;
            return (
              <TouchableOpacity
                style={[
                  styles.tabItem,
                  isActive && { backgroundColor: blue, borderColor: blue }
                ]}
                onPress={() => setActiveCategory(item.id)}
              >
                <Ionicons 
                  name={item.icon} 
                  size={16} 
                  color={isActive ? '#FFF' : textSub} 
                  style={{ marginRight: 6 }} 
                />
                <Text style={[
                  styles.tabText,
                  { color: isActive ? '#FFF' : textSub }
                ]}>
                  {item.name}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* LIST OF APPS */}
      <FlatList
        data={filteredData}
        keyExtractor={(item) => item.id}
        renderItem={renderAppCard}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="folder-open-outline" size={54} color={textSub} />
            <Text style={[styles.emptyTitle, { color: textMain }]}>No Apps Found</Text>
            <Text style={[styles.emptyText, { color: textSub }]}>Try selecting a different category.</Text>
          </View>
        }
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
    paddingBottom: 15, 
    borderBottomWidth: 1 
  },
  backBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800' },
  
  tabsContainer: { paddingBottom: 12, borderBottomWidth: 1 },
  tabsList: { paddingHorizontal: 15, gap: 10, paddingTop: 10 },
  tabItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 16, 
    paddingVertical: 10, 
    borderRadius: 20, 
    borderWidth: 1, 
    borderColor: 'rgba(128,150,165,0.2)' 
  },
  tabText: { fontSize: 14, fontWeight: '700' },

  listContent: { padding: 15, paddingBottom: 40 },
  appCard: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 16, 
    borderRadius: 18, 
    borderWidth: 1, 
    marginBottom: 12 
  },
  iconBox: { width: 60, height: 60, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  appInfo: { flex: 1, marginLeft: 15, marginRight: 10 },
  appName: { fontSize: 17, fontWeight: '800' },
  appSub: { fontSize: 12, fontWeight: '600', marginTop: 3, marginBottom: 4 },
  appDesc: { fontSize: 13, lineHeight: 18 },
  
  getBtn: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 14 },
  getBtnText: { fontWeight: '800', fontSize: 14 },

  emptyState: { alignItems: 'center', justifyContent: 'center', marginTop: 80 },
  emptyTitle: { fontSize: 18, fontWeight: '800', marginTop: 15 },
  emptyText: { fontSize: 14, marginTop: 5 }
});
