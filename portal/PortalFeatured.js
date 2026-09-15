import React from 'react';
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

// --- MOCK FEATURED DATABASE ---
const FEATURED_LIST = [
  { 
    id: 'f1', name: 'Nax AI Assistant', type: 'Bot', category: 'Productivity', 
    username: '@nax_ai', color: '#AF52DE', 
    desc: 'Your ultimate personal AI companion for writing, coding, and daily tasks. Powered by advanced Nax AI.',
    bannerUrl: 'https://ui-avatars.com/api/?name=AI&background=AF52DE&color=fff&size=400'
  },
  { 
    id: 'f2', name: 'Web Translator Pro', type: 'Mini App', category: 'Tools', 
    icon: 'language', color: '#087EFF', 
    desc: 'Instantly translate webpages, text, and voice across 100+ languages without leaving the app.',
    bannerUrl: 'https://ui-avatars.com/api/?name=Translate&background=087EFF&color=fff&size=400'
  },
  { 
    id: 'f3', name: 'Code Master', type: 'Bot', category: 'Developer', 
    username: '@code_master', color: '#34C759', 
    desc: 'Stuck on a bug? Code Master helps you write, debug, and optimize your code in seconds.',
    bannerUrl: 'https://ui-avatars.com/api/?name=Code&background=34C759&color=fff&size=400'
  },
  { 
    id: 'f4', name: '2048 Ultimate', type: 'Mini App', category: 'Games', 
    icon: 'grid', color: '#FF9500', 
    desc: 'The classic 2048 puzzle game with a modern UI, undo moves, and high score tracking.',
    bannerUrl: 'https://ui-avatars.com/api/?name=2048&background=FF9500&color=fff&size=400'
  }
];

export default function PortalFeatured({ navigation }) {
  const { isDark } = useTheme();

  // --- COLORS ---
  const bg = isDark ? '#050A10' : '#F3F7FA';
  const headerBg = isDark ? '#0B1824' : '#FFFFFF';
  const cardBg = isDark ? '#101A26' : '#FFFFFF';
  const textMain = isDark ? '#F4F7FA' : '#142532';
  const textSub = isDark ? '#8FA6B9' : '#6C8494';
  const border = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';

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

  // --- RENDER FEATURED CARD ---
  const renderFeaturedCard = ({ item }) => (
    <TouchableOpacity 
      activeOpacity={0.9}
      style={[styles.featuredCard, { backgroundColor: cardBg, borderColor: border }]}
      onPress={() => handleItemPress(item)}
    >
      {/* Big Banner Image */}
      <View style={[styles.bannerContainer, { backgroundColor: `${item.color}20` }]}>
        <Image source={{ uri: item.bannerUrl }} style={styles.bannerImage} />
        <View style={styles.badge}>
          <Text style={styles.badgeText}>EDITOR'S CHOICE</Text>
        </View>
      </View>
      
      {/* Details Section */}
      <View style={styles.detailsContainer}>
        <View style={styles.titleRow}>
          <Text style={[styles.appName, { color: textMain }]} numberOfLines={1}>{item.name}</Text>
          <View style={[styles.typePill, { backgroundColor: `${item.color}20` }]}>
            <Text style={[styles.typeText, { color: item.color }]}>{item.type}</Text>
          </View>
        </View>
        
        <Text style={[styles.appSub, { color: textSub }]}>
          {item.type === 'Bot' ? item.username : item.category}
        </Text>
        
        <Text style={[styles.appDesc, { color: textSub }]} numberOfLines={2}>
          {item.desc}
        </Text>

        <TouchableOpacity 
          style={[styles.actionBtn, { backgroundColor: item.color }]}
          onPress={() => handleItemPress(item)}
        >
          <Text style={styles.actionBtnText}>{item.type === 'Bot' ? 'Chat Now' : 'Get App'}</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]}>
      
      {/* HEADER */}
      <View style={[styles.header, { backgroundColor: headerBg, borderBottomColor: border }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={textMain} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: textMain }]}>Featured</Text>
        <View style={{ width: 44 }} /> {/* Spacer for balance */}
      </View>

      {/* LIST OF FEATURED APPS */}
      <FlatList
        data={FEATURED_LIST}
        keyExtractor={(item) => item.id}
        renderItem={renderFeaturedCard}
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
    paddingBottom: 15, 
    borderBottomWidth: 1 
  },
  backBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800' },
  
  listContent: { padding: 16, paddingBottom: 40 },
  
  featuredCard: { 
    borderRadius: 24, 
    borderWidth: 1, 
    marginBottom: 20,
    overflow: 'hidden'
  },
  bannerContainer: {
    height: 180,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative'
  },
  bannerImage: {
    width: '100%',
    height: '100%',
    opacity: 0.9,
    resizeMode: 'cover'
  },
  badge: {
    position: 'absolute',
    top: 15,
    left: 15,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  badgeText: { color: '#FFF', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  
  detailsContainer: { padding: 16 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  appName: { fontSize: 20, fontWeight: '900', flex: 1, marginRight: 10 },
  typePill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  typeText: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  
  appSub: { fontSize: 13, fontWeight: '600', marginTop: 4, marginBottom: 8 },
  appDesc: { fontSize: 14, lineHeight: 20, marginBottom: 16 },
  
  actionBtn: { 
    width: '100%', 
    paddingVertical: 14, 
    borderRadius: 16, 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  actionBtnText: { color: '#FFF', fontSize: 15, fontWeight: '800' }
});
