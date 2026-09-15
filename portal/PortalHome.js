// ==========================================
// FILE: portal/PortalHome.js
// NAX SUPER APP — PORTAL HOME
// ==========================================

import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { MiniAppAPI } from '../api/MiniAppAPI';
import { BotAPI } from '../api/BotAPI';
import PortalCard from './PortalCard';

const PortalHome = ({ navigation }) => {
  const [apps, setApps] = useState([]);
  const [bots, setBots] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchPortalData = useCallback(async () => {
    setError('');

    try {
      const [publicAppsResult, publicBotsResult] = await Promise.all([
        MiniAppAPI.getPublicMiniApps(),
        BotAPI.searchBots(''),
      ]);

      const publicApps = Array.isArray(publicAppsResult)
        ? publicAppsResult
        : [];

      const publicBots = Array.isArray(publicBotsResult)
        ? publicBotsResult
        : [];

      setApps(publicApps);
      setBots(publicBots);
    } catch (err) {
      console.log('PortalHome fetch error:', err);
      setError('Unable to load Portal right now.');
      setApps([]);
      setBots([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  React.useEffect(() => {
    fetchPortalData();
  }, [fetchPortalData]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchPortalData();
  };

  const ecosystemItems = [
    ...bots.map((bot) => ({
      ...bot,
      type: 'Bot',
      entryType: 'bot',
    })),
    ...apps.map((app) => ({
      ...app,
      type: 'MiniApp',
      entryType:
        app.entryType || (app.url ? 'web' : 'declarative'),
    })),
  ];

  const handleOpenSearch = () => {
    navigation.navigate('PortalSearch');
  };

  const handleOpenCategories = () => {
    navigation.navigate('PortalCategories');
  };

  const handleOpenFeatured = () => {
    navigation.navigate('PortalFeatured');
  };

  const handleOpenTrending = () => {
    navigation.navigate('PortalTrending');
  };

  const handleOpenStudio = () => {
    navigation.navigate('StudioHome');
  };

  const renderItem = ({ item }) => (
    <PortalCard
      item={item}
      navigation={navigation}
    />
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>
          Fetching ecosystem...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Nax Portal</Text>
          <Text style={styles.subtitle}>
            Apps, Bots, Games & Tools
          </Text>
        </View>

        <TouchableOpacity
          style={styles.refreshButton}
          onPress={handleRefresh}
        >
          <Text style={styles.refreshText}>↻</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.actionRow}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleOpenSearch}
        >
          <Text style={styles.actionText}>Search</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleOpenCategories}
        >
          <Text style={styles.actionText}>Categories</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.actionRow}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleOpenFeatured}
        >
          <Text style={styles.actionText}>Featured</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleOpenTrending}
        >
          <Text style={styles.actionText}>Trending</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.studioButton}
        onPress={handleOpenStudio}
      >
        <Text style={styles.studioTitle}>
          Nax Studio
        </Text>

        <Text style={styles.studioSubtitle}>
          Create your own Mini-App with AI
        </Text>
      </TouchableOpacity>

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>
            {error}
          </Text>

          <TouchableOpacity
            style={styles.retryButton}
            onPress={fetchPortalData}
          >
            <Text style={styles.retryText}>
              Retry
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>
          Latest Ecosystem
        </Text>

        <Text style={styles.countText}>
          {ecosystemItems.length} items
        </Text>
      </View>

      {ecosystemItems.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>
            No apps or bots yet
          </Text>

          <Text style={styles.emptyText}>
            Create something using Nax Studio.
          </Text>

          <TouchableOpacity
            style={styles.createButton}
            onPress={handleOpenStudio}
          >
            <Text style={styles.createButtonText}>
              Create Mini-App
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={ecosystemItems}
          keyExtractor={(item, index) =>
            String(item.id || item.uid || item.slug || index)
          }
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingTop: 16,
  },

  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },

  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: '#666',
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },

  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111',
  },

  subtitle: {
    marginTop: 4,
    fontSize: 14,
    color: '#777',
  },

  refreshButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f1f1',
  },

  refreshText: {
    fontSize: 24,
    color: '#222',
  },

  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },

  actionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: '#f2f2f2',
  },

  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#222',
  },

  studioButton: {
    marginTop: 4,
    marginBottom: 20,
    padding: 16,
    borderRadius: 14,
    backgroundColor: '#111',
  },

  studioTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },

  studioSubtitle: {
    marginTop: 5,
    fontSize: 13,
    color: '#ccc',
  },

  errorBox: {
    padding: 14,
    borderRadius: 12,
    marginBottom: 16,
    backgroundColor: '#fff1f1',
  },

  errorText: {
    fontSize: 14,
    color: '#b00020',
  },

  retryButton: {
    alignSelf: 'flex-start',
    marginTop: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#b00020',
  },

  retryText: {
    color: '#fff',
    fontWeight: '600',
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111',
  },

  countText: {
    fontSize: 13,
    color: '#777',
  },

  listContent: {
    paddingBottom: 30,
  },

  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
  },

  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#222',
  },

  emptyText: {
    marginTop: 6,
    fontSize: 14,
    color: '#777',
    textAlign: 'center',
  },

  createButton: {
    marginTop: 18,
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 10,
    backgroundColor: '#111',
  },

  createButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});

export default PortalHome;
