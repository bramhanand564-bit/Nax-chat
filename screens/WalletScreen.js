import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, TextInput, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

// Firebase Auth
import { auth } from '../firebaseConfig';
import { signOut, updateProfile } from 'firebase/auth';

export default function WalletScreen() {
  const { isDark, themeMode, changeTheme } = useTheme();
  
  // करेंट (Logged in) यूज़र का डेटा निकालना
  const user = auth.currentUser;

  // States (नाम एडिट करने के लिए)
  const [isEditing, setIsEditing] = useState(false);
  const [newName, setNewName] = useState(user?.displayName || '');
  const [loading, setLoading] = useState(false);

  // कलर्स
  const bg = isDark ? '#121212' : '#F5F5F7';
  const textMain = isDark ? '#FFFFFF' : '#000000';
  const textSub = isDark ? '#888888' : '#666666';
  const cardBg = isDark ? '#1E1E1E' : '#FFFFFF';
  const borderCol = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';

  // नाम सेव करने का फंक्शन
  const saveProfile = async () => {
    if (!newName.trim()) return;
    setLoading(true);
    try {
      await updateProfile(user, { displayName: newName });
      setIsEditing(false);
    } catch (error) {
      console.log(error);
    }
    setLoading(false);
  };

  // डायनामिक प्रोफाइल अवतार (नाम के पहले अक्षर से अपने आप फोटो बनेगी)
  const avatarUrl = `https://ui-avatars.com/api/?name=${user?.displayName || 'User'}&background=007AFF&color=fff&size=120`;

  return (
    <ScrollView style={[styles.container, { backgroundColor: bg }]} contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
      <Text style={[styles.headerTitle, { color: textMain }]}>Settings</Text>
      
      {/* 1. Real Profile Section */}
      <View style={[styles.profileCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
        <View style={styles.profileInfo}>
          <Image source={{ uri: avatarUrl }} style={styles.avatar} />
          
          <View style={styles.nameWrap}>
            {isEditing ? (
              <View style={styles.editBox}>
                <TextInput 
                  style={[styles.nameInput, { color: textMain, borderColor: borderCol }]} 
                  value={newName} 
                  onChangeText={setNewName} 
                  placeholder="Enter Name..."
                  placeholderTextColor={textSub}
                />
                <TouchableOpacity onPress={saveProfile} style={styles.saveBtn}>
                  {loading ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={styles.saveBtnText}>Save</Text>}
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <Text style={[styles.userName, { color: textMain }]} numberOfLines={1}>
                  {user?.displayName || 'Set Your Name'}
                </Text>
                <Text style={[styles.userStatus, { color: textSub }]} numberOfLines={1}>
                  {user?.email}
                </Text>
              </>
            )}
          </View>
        </View>
        
        {/* Edit Button (Pencil) */}
        {!isEditing && (
          <TouchableOpacity style={styles.editBtn} onPress={() => setIsEditing(true)}>
            <Ionicons name="pencil" size={20} color="#007AFF" />
          </TouchableOpacity>
        )}
      </View>

      {/* 2. Appearance Theme */}
      <Text style={[styles.sectionTitle, { color: textSub }]}>APPEARANCE</Text>
      <View style={[styles.themeCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
        <View style={styles.themeRow}>
          {['system', 'light', 'dark'].map((mode) => (
            <TouchableOpacity 
              key={mode} 
              style={[styles.themeBtn, themeMode === mode ? styles.themeBtnActive : { borderColor: isDark ? '#333' : '#ddd' }]}
              onPress={() => changeTheme(mode)}
            >
              <Text style={{ color: themeMode === mode ? '#fff' : (isDark ? '#aaa' : '#555'), textTransform: 'capitalize', fontWeight: themeMode === mode ? 'bold' : 'normal' }}>
                {mode === 'system' ? 'Auto' : mode}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* 3. Account Settings */}
      <Text style={[styles.sectionTitle, { color: textSub }]}>ACCOUNT SETTINGS</Text>
      
      <TouchableOpacity style={[styles.settingItem, { backgroundColor: cardBg, borderColor: borderCol }]}>
        <View style={[styles.iconWrap, { backgroundColor: '#34C759' }]}>
          <Ionicons name="notifications" size={20} color="#FFF" />
        </View>
        <Text style={[styles.settingText, { color: textMain }]}>Notifications</Text>
        <Ionicons name="chevron-forward" size={20} color={textSub} style={{ marginLeft: 10 }} />
      </TouchableOpacity>

      <TouchableOpacity style={[styles.settingItem, { backgroundColor: cardBg, borderColor: borderCol }]}>
        <View style={[styles.iconWrap, { backgroundColor: '#5856D6' }]}>
          <Ionicons name="lock-closed" size={20} color="#FFF" />
        </View>
        <Text style={[styles.settingText, { color: textMain }]}>Privacy & Security</Text>
        <Ionicons name="chevron-forward" size={20} color={textSub} style={{ marginLeft: 10 }} />
      </TouchableOpacity>

      {/* 4. Log Out Button */}
      <TouchableOpacity 
        style={[styles.settingItem, { backgroundColor: cardBg, borderColor: borderCol, borderBottomWidth: 0, marginBottom: 40 }]}
        onPress={() => signOut(auth)}
      >
        <View style={[styles.iconWrap, { backgroundColor: '#FF3B30' }]}>
          <Ionicons name="log-out" size={20} color="#FFF" />
        </View>
        <Text style={[styles.settingText, { color: textMain }]}>Log Out</Text>
      </TouchableOpacity>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 40 },
  headerTitle: { fontSize: 28, fontWeight: 'bold', marginBottom: 20 },
  
  profileCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderRadius: 15, borderWidth: 1, marginBottom: 25 },
  profileInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  avatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#ccc' },
  nameWrap: { marginLeft: 15, flex: 1 },
  userName: { fontSize: 20, fontWeight: 'bold', marginBottom: 4 },
  userStatus: { fontSize: 13 },
  
  editBtn: { padding: 8, backgroundColor: 'rgba(0,122,255,0.1)', borderRadius: 50 },
  
  editBox: { flexDirection: 'row', alignItems: 'center', flex: 1, paddingRight: 10 },
  nameInput: { flex: 1, height: 40, borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, marginRight: 10 },
  saveBtn: { backgroundColor: '#007AFF', paddingHorizontal: 15, height: 40, justifyContent: 'center', borderRadius: 8 },
  saveBtnText: { color: '#FFF', fontWeight: 'bold' },

  sectionTitle: { fontSize: 13, fontWeight: 'bold', marginLeft: 10, marginBottom: 10, letterSpacing: 1 },
  settingItem: { flexDirection: 'row', alignItems: 'center', padding: 15, borderRadius: 15, borderWidth: 1, marginBottom: 15 },
  iconWrap: { width: 34, height: 34, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  settingText: { flex: 1, fontSize: 16, fontWeight: '500' },
  
  themeCard: { padding: 15, borderRadius: 15, borderWidth: 1, marginBottom: 25 },
  themeRow: { flexDirection: 'row', justifyContent: 'space-between' },
  themeBtn: { flex: 1, paddingVertical: 10, marginHorizontal: 5, borderWidth: 1, borderRadius: 8, alignItems: 'center' },
  themeBtnActive: { backgroundColor: '#007AFF', borderColor: '#007AFF' },
});
