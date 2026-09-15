import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

/**
 * PortalCard - Universal Reusable Component for Nax Super App
 * Handles both 'Bot' and 'Mini App' UI rendering.
 */
export default function PortalCard({ item, onPress, variant = 'default', rank = null }) {
  const { isDark } = useTheme();

  // --- COLORS ---
  const cardBg = isDark ? '#101A26' : '#FFFFFF';
  const textMain = isDark ? '#F4F7FA' : '#142532';
  const textSub = isDark ? '#8FA6B9' : '#6C8494';
  const border = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
  const blue = '#087EFF';
  const defaultColor = item.color || blue;

  // --- RENDER HELPERS ---
  const isBot = item.type === 'Bot';
  const subtitle = isBot ? item.username : item.category;
  const actionText = isBot ? 'Chat' : 'Get';

  // --- RANK STYLING (For Trending Variant) ---
  const getRankStyle = (index) => {
    if (index === 1) return { color: '#FFD700', fontSize: 24 }; // Gold
    if (index === 2) return { color: '#C0C0C0', fontSize: 22 }; // Silver
    if (index === 3) return { color: '#CD7F32', fontSize: 20 }; // Bronze
    return { color: textSub, fontSize: 16 };
  };

  return (
    <TouchableOpacity 
      activeOpacity={0.8}
      style={[
        styles.cardContainer, 
        { backgroundColor: cardBg, borderColor: border },
        variant === 'grid' && styles.gridCard // Changes layout if variant is 'grid'
      ]}
      onPress={() => onPress(item)}
    >
      {/* RANKING (Only if rank is provided) */}
      {rank !== null && (
        <View style={styles.rankBox}>
          <Text style={[styles.rankText, getRankStyle(rank)]}>{rank}</Text>
        </View>
      )}

      {/* ICON / AVATAR */}
      <View style={[styles.iconBox, { backgroundColor: `${defaultColor}20` }, variant === 'grid' && styles.gridIconBox]}>
        {item.icon ? (
          <Ionicons name={item.icon} size={variant === 'grid' ? 32 : 28} color={defaultColor} />
        ) : (
          <Image 
            source={{ uri: `https://ui-avatars.com/api/?name=${item.name}&background=${defaultColor.replace('#','')}&color=fff` }} 
            style={variant === 'grid' ? styles.gridAvatar : styles.listAvatar} 
          />
        )}
      </View>
      
      {/* APP DETAILS */}
      <View style={[styles.infoBox, variant === 'grid' && styles.gridInfoBox]}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={[styles.nameText, { color: textMain }]} numberOfLines={1}>{item.name}</Text>
          {isBot && <Ionicons name="hardware-chip" size={12} color="#AF52DE" style={{ marginLeft: 4 }} />}
        </View>
        <Text style={[styles.subText, { color: textSub }]} numberOfLines={1}>{subtitle}</Text>
        
        {/* Only show description in 'default' list view */}
        {variant === 'default' && item.desc && (
          <Text style={[styles.descText, { color: textSub }]} numberOfLines={1}>{item.desc}</Text>
        )}
      </View>

      {/* ACTION BUTTON */}
      <TouchableOpacity 
        style={[
          styles.actionBtn, 
          { backgroundColor: isBot ? '#AF52DE15' : `${blue}15` },
          variant === 'grid' && styles.gridActionBtn
        ]}
        onPress={() => onPress(item)}
      >
        <Text style={[
          styles.actionBtnText, 
          { color: isBot ? '#AF52DE' : blue }
        ]}>
          {actionText}
        </Text>
      </TouchableOpacity>

    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  // DEFAULT LIST STYLES
  cardContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 12,
  },
  rankBox: { width: 30, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  rankText: { fontWeight: '900' },
  iconBox: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  listAvatar: { width: 56, height: 56, borderRadius: 16 },
  infoBox: { flex: 1, marginLeft: 15, marginRight: 10, justifyContent: 'center' },
  nameText: { fontSize: 16, fontWeight: '800' },
  subText: { fontSize: 12, fontWeight: '600', marginTop: 3 },
  descText: { fontSize: 13, marginTop: 4, lineHeight: 18 },
  actionBtn: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  actionBtnText: { fontWeight: '800', fontSize: 14 },

  // GRID CARD OVERRIDES (For categories or horizontal scrolling)
  gridCard: {
    flexDirection: 'column',
    alignItems: 'center',
    width: 140,
    padding: 15,
    marginRight: 15,
    marginBottom: 0,
  },
  gridIconBox: { width: 64, height: 64, borderRadius: 20, marginBottom: 12 },
  gridAvatar: { width: 64, height: 64, borderRadius: 20 },
  gridInfoBox: { marginLeft: 0, marginRight: 0, alignItems: 'center', marginBottom: 12 },
  gridActionBtn: { width: '100%', paddingVertical: 10 }
});
