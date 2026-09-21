import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
// Firebase auth इम्पोर्ट कर रहे हैं ताकि मिनी-ऐप को यूज़र की डिटेल दे सकें
import { auth } from '../firebaseConfig'; 

export default function WebPortalScreen({ route, navigation }) {
  // जो भी बॉट या वेबसाइट का लिंक मिलेगा, वो यहाँ से निकलेगा
  const { title, url, isPremium = false } = route.params;
  const { isDark } = useTheme();
  const user = auth?.currentUser;
  
  const bg = isDark ? '#121212' : '#F5F5F7';
  const textMain = isDark ? '#FFFFFF' : '#000000';
  const borderCol = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';

  // 🧠 THE SUPER BRIDGE: Nax Data & Local AI Hardware Check (Naya Feature)
  const injectedCode = `
    window.NaxPortal = {
      user: {
        uid: "${user?.uid || 'guest'}",
        name: "${user?.displayName || 'User'}",
        isPremium: ${isPremium}
      },
      theme: "${isDark ? 'dark' : 'light'}",
      hardware: {
        // फोन की RAM चेक करके AI सजेस्ट करना
        ram: navigator.deviceMemory || "Unknown",
        cores: navigator.hardwareConcurrency || "Unknown",
        suggestedAI: (navigator.deviceMemory >= 6) ? "Local AI (Llama.cpp)" : "Cloud API (BYOK)"
      },
      // मिनी-ऐप से Nax Chat को मैसेज भेजने का फंक्शन
      sendAction: function(action, data) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ action, data }));
      }
    };
    true;
  `;

  // 🔥 ACTION RECEIVER (Tokens, Watch Party, AI Settings)
  const handleMessage = (event) => {
    try {
      const message = JSON.parse(event.nativeEvent.data);
      console.log("Mini-App Action Received:", message);

      if (message.action === 'REQUEST_PAYMENT') {
        Alert.alert("Token Request 🪙", `${title} needs ${message.data.amount} Nax Tokens.`, [
          { text: "Cancel", style: "cancel" },
          { text: "Pay", onPress: () => Alert.alert("Success", "Tokens Sent!") }
        ]);
      } else if (message.action === 'OPEN_AI_SETTINGS') {
        Alert.alert("AI Engine", "Hardware Limit Reached. Please enter your API Key to use Premium Cloud AI.");
      } else if (message.action === 'JOIN_WATCH_PARTY') {
        Alert.alert("Watch Party 🎬", "Connecting to P2P Video Sync...");
      }
    } catch (e) {
      console.error("Bridge Error:", e);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      {/* Custom Header (तुम्हारी ओरिजिनल स्टाइलिंग) */}
      <View style={[styles.header, { borderBottomColor: borderCol }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="close" size={28} color={textMain} />
        </TouchableOpacity>
        
        <View style={styles.titleWrap}>
          <Text style={[styles.headerTitle, { color: textMain }]} numberOfLines={1}>{title}</Text>
          <Text style={styles.subText}>⚡ Nax Secure Sandbox</Text>
        </View>

        <TouchableOpacity style={styles.backBtn} onPress={() => Alert.alert("Menu", "Portal Settings")}>
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
            <Text style={{ color: textMain, marginTop: 10, fontSize: 12, fontWeight: 'bold' }}>Initializing Sandbox...</Text>
          </View>
        )}
        // 🚀 SUPER APP FEATURES (Added here)
        injectedJavaScriptBeforeContentLoaded={injectedCode}
        onMessage={handleMessage}
        allowsInlineMediaPlayback={true} // Netflix/Video Playback Support
        mediaPlaybackRequiresUserAction={false}
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
  subText: { fontSize: 11, color: '#007AFF', marginTop: 2, fontWeight: '600' }
});
