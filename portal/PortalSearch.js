import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  Platform,
  Keyboard
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

// --- MOCK SEARCH DATA (Combined Bots & Apps) ---
const MOCK_DATABASE = [
  { id: '1', name: 'Nax AI Assistant', type: 'Bot', username: '@nax_ai', icon: 'hardware-chip', color: '#AF52DE' },
  { id: '2', name: '2048 Game', type: 'Mini App', category: 'Games', icon: 'game-controller', color: '#FF9500' },
  { id: '3', name: 'Web Translator', type: 'Mini App', category: 'Productivity', icon: 'language', color: '#087EFF' },
  { id: '4', name: 'Code Helper', type: 'Bot', username: '@code_bot', icon: 'code-slash', color: '#34C759' },
  { id: '5', name: 'Weather Radar', type: 'Mini App', category: 'Tools', icon: 'partly-sunny', color: '#32ADE6' },
];

const TRENDING_TAGS = ['AI Bots', 'Games', 'Productivity', 'Finance'];

export default function PortalSearch({ navigation }) {
  const { isDark } = useTheme();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState([]);
  const [recentSearches, setRecentSearches] = useState(['Calculator', 'Translator', 'Tic Tac Toe']);
  
  const inputRef = useRef(null);

  // --- COLORS ---
  const bg = isDark ? '#050A10' : '#F3F7FA';
  const headerBg = isDark ? '#0B1824' : '#FFFFFF';
  const cardBg = isDark ? '#101A26' : '#FFFFFF';
  const inputBg = isDark ? '#14202E' : '#EEF3F7';
  const textMain = isDark ? '#F4F7FA' : '#142532';
  const textSub = isDark ? '#8FA6B9' : '#6C8494';
  const border = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
  const blue = '#087EFF';

  // --- AUTO FOCUS SEARCH ON LOAD ---
  useEffect(() => {
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  }, []);

  // --- HANDLE SEARCH LIVE FILTERING ---
  const handleSearch = (text) => {
    setSearchQuery(text);
    if (text.trim().length === 0) {
      setResults([]);
      return;
    }
    const lowerQ = text.toLowerCase();
    const filtered = MOCK_DATABASE.filter(item => 
      item.name.toLowerCase().includes(lowerQ) || 
      (item.username && item.username.toLowerCase().includes(lowerQ))
    );
    setResults(filtered);
  };

  const handleClear = () => {
    setSearchQuery('');
    setResults([]);
    inputRef.current?.focus();
  };

  const handleItemPress = (item) => {
    Keyboard.dismiss();
    // Add to recent searches (simplified)
    if (!recentSearches.includes(item.name)) {
      setRecentSearches(prev => [item.name, ...prev].slice(0, 5));
    }
    
    // Routing logic
    if (item.type === 'Bot') {
      navigation.navigate('ChatRoom', { 
        friendId: item.id, 
        chatName: item.name, 
        friendUsername: item.username 
      });
    } else {
      // It's a Mini App -> Go to Install/Details page
      navigation.navigate('MiniAppInstall', { app: item });
    }
  };

  // --- RENDERERS ---
  const renderResultItem = ({ item }) => (
    <TouchableOpacity 
      style={[styles.resultCard, { backgroundColor: cardBg, borderColor: border }]}
      onPress={() => handleItemPress(item)}
    >
      <View style={[styles.iconBox, { backgroundColor: `${item.color}20` }]}>
        <Ionicons name={item.icon} size={24} color={item.color} />
      </View>
      <View style={styles.resultInfo}>
        <Text style={[styles.resultName, { color: textMain }]}>{item.name}</Text>
        <Text style={[styles.resultSub, { color: textSub }]}>
          {item.type === 'Bot' ? item.username : item.category} • {item.type}
        </Text>
      </View>
      <Ionicons name="arrow-forward" size={20} color={textSub} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]}>
      
      {/* HEADER WITH INPUT */}
      <View style={[styles.header, { backgroundColor: headerBg, borderBottomColor: border }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={textMain} />
        </TouchableOpacity>
        
        <View style={[styles.searchBox, { backgroundColor: inputBg }]}>
          <TextInput
            ref={inputRef}
            style={[styles.searchInput, { color: textMain }]}
            placeholder="Search Nax Portal..."
            placeholderTextColor={textSub}
            value={searchQuery}
            onChangeText={handleSearch}
            returnKeyType="search"
            autoCapitalize="none"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity style={styles.clearBtn} onPress={handleClear}>
              <Ionicons name="close-circle" size={18} color={textSub} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* SEARCH STATES */}
      {searchQuery.length === 0 ? (
        <View style={styles.idleState}>
          {/* RECENT SEARCHES */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: textMain }]}>Recent Searches</Text>
              <TouchableOpacity onPress={() => setRecentSearches([])}>
                <Text style={{ color: textSub, fontSize: 13 }}>Clear</Text>
              </TouchableOpacity>
            </View>
            {recentSearches.length > 0 ? (
              recentSearches.map((term, index) => (
                <TouchableOpacity key={index} style={styles.recentItem} onPress={() => handleSearch(term)}>
                  <Ionicons name="time-outline" size={20} color={textSub} />
                  <Text style={[styles.recentText, { color: textMain }]}>{term}</Text>
                  <Ionicons name="search" size={16} color={textSub} />
                </TouchableOpacity>
              ))
            ) : (
              <Text style={{ color: textSub, marginTop: 10 }}>No recent searches.</Text>
            )}
          </View>

          {/* TRENDING TAGS */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: textMain, marginBottom: 15 }]}>Trending Now</Text>
            <View style={styles.tagsContainer}>
              {TRENDING_TAGS.map((tag, index) => (
                <TouchableOpacity key={index} style={[styles.tag, { backgroundColor: cardBg, borderColor: border }]} onPress={() => handleSearch(tag)}>
                  <Ionicons name="trending-up" size={14} color={blue} />
                  <Text style={[styles.tagText, { color: textMain }]}>{tag}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          renderItem={renderResultItem}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="search-outline" size={50} color={textSub} />
              <Text style={[styles.emptyText, { color: textSub }]}>No results found for "{searchQuery}"</Text>
            </View>
          }
        />
      )}

    </SafeAreaView>
  );
}

// --- STYLES ---
const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 10, 
    paddingTop: Platform.OS === 'ios' ? 10 : 15, 
    paddingBottom: 15, 
    borderBottomWidth: 1 
  },
  backBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  searchBox: { 
    flex: 1, 
    height: 42, 
    borderRadius: 12, 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 12,
    marginRight: 10
  },
  searchInput: { flex: 1, fontSize: 16, height: '100%' },
  clearBtn: { padding: 5 },
  
  idleState: { padding: 20 },
  section: { marginBottom: 30 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  sectionTitle: { fontSize: 18, fontWeight: '800' },
  recentItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)' },
  recentText: { flex: 1, fontSize: 16, marginLeft: 12 },
  
  tagsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tag: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16, borderWidth: 1, gap: 6 },
  tagText: { fontSize: 14, fontWeight: '600' },

  listContent: { padding: 15 },
  resultCard: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 16, borderWidth: 1, marginBottom: 10 },
  iconBox: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  resultInfo: { flex: 1, marginLeft: 12, marginRight: 10 },
  resultName: { fontSize: 16, fontWeight: '800' },
  resultSub: { fontSize: 13, marginTop: 2, fontWeight: '500' },

  emptyState: { alignItems: 'center', justifyContent: 'center', marginTop: 60 },
  emptyText: { marginTop: 15, fontSize: 15 }
});
