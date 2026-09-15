import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import { useTheme } from '../context/ThemeContext';

export default function MiniAppViewer({ route, navigation }) {
  const { isDark } = useTheme();

  // Params passed when opening a mini-app (from Portal or Bots)
  const params = route?.params || {};
  const appTitle = params.title || 'Nax Mini App';
  const appUrl = params.url || 'https://google.com';

  const [loading, setLoading] = useState(true);

  // --- COLORS ---
  const bg = isDark ? '#050A10' : '#F3F7FA';
  const headerBg = isDark ? '#0B1824' : '#FFFFFF';
  const textMain = isDark ? '#F4F7FA' : '#142532';
  const textSub = isDark ? '#8FA6B9' : '#6C8494';
  const border = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
  const blue = '#087EFF';

  // Helper to extract domain name for the subtitle
  const getDomain = (url) => {
    try {
      return url.split('/')[2];
    } catch (e) {
      return url;
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: headerBg }]}>
      
      {/* HEADER (Secure Browser Look) */}
      <View style={[styles.header, { backgroundColor: headerBg, borderBottomColor: border }]}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={26} color={textMain} />
        </TouchableOpacity>

        <View style={styles.headerInfo}>
          <Text style={[styles.headerTitle, { color: textMain }]} numberOfLines={1}>
            {appTitle}
          </Text>
          <Text style={[styles.headerSubtitle, { color: textSub }]} numberOfLines={1}>
            {getDomain(appUrl)}
          </Text>
        </View>

        <TouchableOpacity style={styles.iconBtn} onPress={() => { /* Option menu placeholder */ }}>
          <Ionicons name="ellipsis-horizontal" size={22} color={textMain} />
        </TouchableOpacity>
      </View>

      {/* WEBVIEW CONTAINER */}
      <View style={[styles.webContainer, { backgroundColor: bg }]}>
        {loading && (
          <View style={[styles.loaderBox, { backgroundColor: bg }]}>
            <ActivityIndicator size="large" color={blue} />
            <Text style={[styles.loaderText, { color: textSub }]}>Loading {appTitle}...</Text>
          </View>
        )}

        {/* Note: Requires 'react-native-webview' package */}
        <WebView
          source={{ uri: appUrl }}
          style={styles.webview}
          onLoadEnd={() => setLoading(false)}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          startInLoadingState={false}
          bounces={false}
        />
      </View>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    paddingTop: Platform.OS === 'ios' ? 0 : 5
  },
  iconBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  headerInfo: { flex: 1, marginHorizontal: 8, alignItems: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '800' },
  headerSubtitle: { fontSize: 11, marginTop: 2, fontWeight: '500' },
  webContainer: { flex: 1, position: 'relative' },
  webview: { flex: 1, backgroundColor: 'transparent' },
  loaderBox: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    zIndex: 10,
    justifyContent: 'center',
    alignItems: 'center'
  },
  loaderText: { marginTop: 12, fontSize: 14, fontWeight: '600' }
});
