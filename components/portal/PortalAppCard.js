import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';

export default function PortalAppCard({ appData, onPress }) {
  const { isDark } = useTheme();
  
  // Dynamic Colors
  const cardBg = isDark ? '#1A222C' : '#FFFFFF';
  const textMain = isDark ? '#FFFFFF' : '#000000';
  const textSub = isDark ? '#888888' : '#666666';
  const borderCol = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
  const accentCol = '#087EFF'; // Nax Blue

  // Agar appData pass nahi hua, toh dummy data dikhayega (Testing ke liye)
  const data = appData || {
    name: 'Nax Ludo Multi',
    developer: '@brahmanand',
    icon: 'https://via.placeholder.com/150/087EFF/FFFFFF?text=Ludo',
    rating: '4.8',
    users: '12K',
    type: 'Game'
  };

  return (
    <TouchableOpacity 
      activeOpacity={0.7} 
      style={[styles.card, { backgroundColor: cardBg, borderColor: borderCol }]}
      onPress={() => onPress && onPress(data)}
    >
      {/* 🖼️ Mini-App Icon */}
      <Image source={{ uri: data.icon }} style={styles.appIcon} />
      
      {/* 📝 Mini-App Details */}
      <View style={styles.infoContainer}>
        <Text style={[styles.appName, { color: textMain }]} numberOfLines={1}>
          {data.name}
        </Text>
        <Text style={[styles.developer, { color: textSub }]} numberOfLines={1}>
          By {data.developer} • {data.type}
        </Text>
        
        {/* ⭐ Rating & Users */}
        <View style={styles.statsRow}>
          <View style={styles.ratingBox}>
            <Ionicons name="star" size={12} color="#FF9500" />
            <Text style={styles.ratingText}>{data.rating}</Text>
          </View>
          <Text style={[styles.usersText, { color: textSub }]}>• {data.users} players</Text>
        </View>
      </View>

      {/* 🚀 Open / Play Button */}
      <View style={[styles.playButton, { backgroundColor: 'rgba(8, 126, 255, 0.1)' }]}>
        <Text style={[styles.playText, { color: accentCol }]}>Open</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 12,
    marginHorizontal: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  appIcon: {
    width: 60,
    height: 60,
    borderRadius: 16,
    marginRight: 15,
  },
  infoContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  appName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  developer: {
    fontSize: 12,
    marginBottom: 6,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingBox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FF9500',
    marginLeft: 4,
  },
  usersText: {
    fontSize: 11,
    marginLeft: 8,
  },
  playButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  playText: {
    fontSize: 13,
    fontWeight: 'bold',
  }
});
