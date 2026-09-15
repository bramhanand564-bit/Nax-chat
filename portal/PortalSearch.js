// ==========================================
// FILE: portal/PortalSearch.js
// ==========================================
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList,
  SafeAreaView, Platform, Keyboard, ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

// 🚀 IMPORT OUR APIS & PORTAL CARD
import { MiniAppAPI } from '../api/MiniAppAPI';
import { BotAPI } from '../api/BotAPI';
import PortalCard from './PortalCard';

const TRENDING_TAGS = ['AI Bots', 'Games', 'Productivity', 'Finance'];

export default function PortalSearch({ navigation }) {
  const { isDark } = useTheme();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [recentSearches, setRecentSearches] = useState(['Translator', 'Tic Tac Toe']);
  
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

  useEffect(() => {
    setTimeout(() => { inputRef.current?.focus(); }, 300);
  }, []);

  // 🚀 LIVE COMBINED SEARCH (Bots + Apps)
  const handleSearch = async (text) => {
    setSearchQuery(text);
    
    if (text.trim().length === 0) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);

    try {
      // Fire both API calls simultaneously for speed
      const [appResults, botResults] = await Promise.all([
        MiniAppAPI.searchMiniApps(text),
        BotAPI.searchBots(text)
      ]);

      // Combine and shuffle/sort if necessary
      const combinedResults = [...botResults, ...appResults];
      setResults(combinedResults);
    } catch (error) {
      console.log("Search error:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleClear = () => {
    setSearchQuery('');
    setResults([]);
    inputRef.current?.focus();
  };

  const handleSuggestionPress = (term) => {
    handleSearch(term);
  };

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
                <TouchableOpacity key={index} style={styles.recentItem} onPress={() => handleSuggestionPress(term)}>
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
                <TouchableOpacity key={index} style={[styles.tag, { backgroundColor: cardBg, borderColor: border }]} onPress={() => handleSuggestionPress(tag)}>
                  <Ionicons name="trending-up" size={14} color={blue} />
                  <Text style={[styles.tagText, { color: textMain }]}>{tag}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          {isSearching && results.length === 0 ? (
            <ActivityIndicator size="large" color={blue} style={{ marginTop: 40 }} />
          ) : (
            <FlatList
              data={results}
              keyExtractor={(item) => item.id}
              // 🚀 REUSING PORTAL CARD FOR ROUTING
              renderItem={({ item }) => <PortalCard item={item} navigation={navigation} />}
              contentContainerStyle={styles.listContent}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={
                !isSearching && (
                  <View style={styles.emptyState}>
                    <Ionicons name="search-outline" size={50} color={textSub} />
                    <Text style={[styles.emptyText, { color: textSub }]}>No bots or apps found for "{searchQuery}"</Text>
                  </View>
                )
              }
            />
          )}
        </View>
      )}

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingTop: Platform.OS === 'ios' ? 10 : 15, paddingBottom: 15, borderBottomWidth: 1 },
  backBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  searchBox: { flex: 1, height: 42, borderRadius: 12, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, marginRight: 10 },
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
  emptyState: { alignItems: 'center', justifyContent: 'center', marginTop: 60 },
  emptyText: { marginTop: 15, fontSize: 15 }
});
