import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

export default function WebPortalScreen({ route, navigation }) {
  // जो भी बॉट या वेबसाइट का लिंक मिलेगा, वो यहाँ से निकलेगा
  const { title, url } = route.params;
  const { isDark } = useTheme();
  
  const bg = isDark ? '#121212' : '#F5F5F7';
  const textMain = isDark ? '#FFFFFF' : '#000000';
  const borderCol = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      {/* Custom Header */}
      <View style={[styles.header, { borderBottomColor: borderCol }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="close" size={28} color={textMain} />
        </TouchableOpacity>
        <View style={styles.titleWrap}>
          <Text style={[styles.headerTitle, { color: textMain }]} numberOfLines={1}>{title}</Text>
          <Text style={styles.subText}>Nax Secure Portal</Text>
        </View>
        <TouchableOpacity style={styles.backBtn}>
          <Ionicons name="ellipsis-vertical" size={24} color={textMain} />
        </TouchableOpacity>
      </View>

      {/* Website/Bot Engine */}
      <WebView 
        source={{ uri: url }} 
        style={{ flex: 1, backgroundColor: bg }} 
        startInLoadingState={true}
        renderLoading={() => (
          <View style={[StyleSheet.absoluteFill, { justifyContent: 'center', alignItems: 'center', backgroundColor: bg }]}>
            <ActivityIndicator size="large" color="#007AFF" />
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 45, paddingBottom: 10, paddingHorizontal: 15, borderBottomWidth: 1 },
  backBtn: { padding: 5 },
  titleWrap: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  subText: { fontSize: 11, color: '#007AFF', marginTop: 2 }
});
