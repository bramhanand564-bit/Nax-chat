import React, { useState } from 'react';
import { View, Text, Switch, TouchableOpacity, ActivityIndicator, Alert, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { auth, db } from '../../firebaseConfig';
import { collection, getDocs, query, where } from 'firebase/firestore'; // 🔥 Firestore Imports
import { uploadBackupToDrive } from '../../utils/googleDriveBackup';

export default function BackupSection() {
  const { isDark } = useTheme();
  const [includeMedia, setIncludeMedia] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const user = auth.currentUser;

  const cardBg = isDark ? '#1E1E1E' : '#FFFFFF';
  const textMain = isDark ? '#FFFFFF' : '#000000';
  const textSub = isDark ? '#888888' : '#666666';
  const borderCol = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';

  const handleBackup = async () => {
    if (!user) return Alert.alert("Error", "Please login first!");
    setIsBackingUp(true);

    try {
      // 🔥 1. असली डेटाबेस (Firestore) से यूज़र की सारी चैट्स निकालना
      const chatsRef = collection(db, 'chats'); 
      const q = query(chatsRef, where('participants', 'array-contains', user.uid));
      const querySnapshot = await getDocs(q);
      
      const realChats = [];
      querySnapshot.forEach((doc) => {
        realChats.push({ id: doc.id, ...doc.data() });
      });

      // 🔥 2. असली बैकअप फाइल तैयार करना
      const realBackupData = {
        userId: user.uid,
        email: user.email,
        timestamp: new Date().toISOString(),
        settings: { includeMedia },
        totalChats: realChats.length,
        chats: realChats // असली चैट्स यहाँ जा रही हैं!
      };

      // 🔥 3. Drive में अपलोड करना
      const result = await uploadBackupToDrive(realBackupData, includeMedia);
      Alert.alert("Backup Successful! ✅", `${realChats.length} Chats securely saved to Google Drive.`);
      
    } catch (error) {
      console.error("Backup Error:", error);
      Alert.alert("Backup Failed ❌", "Could not save data to Google Drive.");
    } finally {
      setIsBackingUp(false);
    }
  };

  return (
    <View style={{ marginTop: 15 }}>
      <Text style={[styles.sectionTitle, { color: textSub }]}>CHAT BACKUP</Text>
      <View style={[styles.themeCard, { backgroundColor: cardBg, borderColor: borderCol, padding: 0, overflow: 'hidden' }]}>
        <View style={[styles.settingItem, { borderBottomWidth: 1, borderBottomColor: borderCol, borderRadius: 0 }]}>
          <View style={[styles.iconWrap, { backgroundColor: '#FF9500' }]}><Ionicons name="cloud-upload" size={20} color="#FFF" /></View>
          <View style={{ flex: 1, paddingRight: 10 }}>
            <Text style={[styles.settingText, { color: textMain }]}>Include Media</Text>
            <Text style={{ fontSize: 12, color: textSub, marginTop: 2 }}>Photos & videos (Uses Drive Storage)</Text>
          </View>
          <Switch value={includeMedia} onValueChange={setIncludeMedia} trackColor={{ false: isDark ? "#333" : "#e5e5ea", true: "#34C759" }} thumbColor={"#fff"} />
        </View>
        <TouchableOpacity style={[styles.settingItem, { borderRadius: 0 }]} onPress={handleBackup} disabled={isBackingUp}>
          <View style={[styles.iconWrap, { backgroundColor: '#007AFF' }]}>
            {isBackingUp ? <ActivityIndicator size="small" color="#FFF" /> : <Ionicons name="sync" size={20} color="#FFF" />}
          </View>
          <Text style={[styles.settingText, { color: textMain }]}>{isBackingUp ? 'Backing up Real Data...' : 'Back up now'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionTitle: { fontSize: 13, fontWeight: 'bold', marginLeft: 10, marginBottom: 10, letterSpacing: 1 },
  themeCard: { borderRadius: 15, borderWidth: 1, marginBottom: 10 },
  settingItem: { flexDirection: 'row', alignItems: 'center', padding: 15 },
  iconWrap: { width: 34, height: 34, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  settingText: { flex: 1, fontSize: 16, fontWeight: '500' }
});
