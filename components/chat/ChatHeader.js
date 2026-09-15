// ==========================================
// FILE: components/chat/ChatHeader.js
// ==========================================
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';

export default function ChatHeader({ chatName, isGlobal, onBack, onInfoPress }) {
  const { isDark } = useTheme();

  const headerBg = isDark ? '#0B1824' : '#FFFFFF';
  const textMain = isDark ? '#F4F7FA' : '#142532';
  const textSub = isDark ? '#8FA6B9' : '#6C8494';
  const border = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';

  return (
    <View style={[styles.header, { backgroundColor: headerBg, borderBottomColor: border }]}>
      <TouchableOpacity style={styles.backBtn} onPress={onBack}>
        <Ionicons name="arrow-back" size={24} color={textMain} />
      </TouchableOpacity>
      <View style={styles.headerInfo}>
        <Text style={[styles.headerTitle, { color: textMain }]} numberOfLines={1}>{chatName}</Text>
        <Text style={[styles.headerSub, { color: textSub }]}>
          {isGlobal ? 'Public Community Room' : 'Private Secure Chat'}
        </Text>
      </View>
      <TouchableOpacity style={styles.headerAction} onPress={onInfoPress}>
        <Ionicons name="information-circle-outline" size={24} color={textMain} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', height: 60, borderBottomWidth: 1, paddingHorizontal: 5 },
  backBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  headerInfo: { flex: 1, marginLeft: 5 },
  headerTitle: { fontSize: 17, fontWeight: '800' },
  headerSub: { fontSize: 12, marginTop: 2, fontWeight: '500' },
  headerAction: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' }
});
