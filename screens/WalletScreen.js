import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Image,
  ScrollView, TextInput, ActivityIndicator, Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { auth, db } from '../firebaseConfig';
import { updateProfile } from 'firebase/auth';
import {
  collection, query, where, getDocs, doc, getDoc,
  setDoc, runTransaction, serverTimestamp
} from 'firebase/firestore';

// 🔥 NAYE MODULAR COMPONENTS IMPORT KIYE HAIN
import BackupSection from '../components/settings/BackupSection';
import AdvancedSettings from '../components/settings/AdvancedSettings';

export default function WalletScreen() {
  const { isDark } = useTheme();
  const user = auth.currentUser;

  const [isEditing, setIsEditing] = useState(false);
  const [newName, setNewName] = useState(user?.displayName || '');
  const [username, setUsername] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [usernameStatus, setUsernameStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [editingUsername, setEditingUsername] = useState(false);

  const bg = isDark ? '#121212' : '#F5F5F7';
  const textMain = isDark ? '#FFFFFF' : '#000000';
  const textSub = isDark ? '#888888' : '#666666';
  const cardBg = isDark ? '#1E1E1E' : '#FFFFFF';
  const borderCol = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';

  useEffect(() => { loadUserProfile(); }, []);

  const loadUserProfile = async () => {
    if (!user?.uid) return;
    const snapshot = await getDoc(doc(db, 'users', user.uid));
    if (snapshot.exists()) {
      const data = snapshot.data();
      setUsername(data.username || '');
      setNewUsername((data.username || '').replace(/^@/, ''));
      if (data.displayName && !user.displayName) setNewName(data.displayName);
    }
  };

  const normalizeUsername = (val) => val.replace(/^@/, '').toLowerCase().replace(/[^a-z0-9_]/g, '');

  const checkUsername = async () => {
    const clean = normalizeUsername(newUsername);
    if (clean.length < 3) { setUsernameStatus('Min 3 chars needed.'); return false; }
    if (clean === normalizeUsername(username)) { setUsernameStatus('✓ Current username.'); return true; }
    
    setCheckingUsername(true);
    setUsernameStatus('');
    try {
      const snap = await getDocs(query(collection(db, 'users'), where('usernameLower', '==', clean)));
      if (!snap.empty) { setUsernameStatus('❌ Username taken.'); return false; }
      setUsernameStatus('✓ Available.'); return true;
    } catch (e) { return false; } finally { setCheckingUsername(false); }
  };

  const saveUsername = async () => {
    if (!user?.uid) return;
    const clean = normalizeUsername(newUsername);
    if (clean === normalizeUsername(username)) { setEditingUsername(false); return; }
    
    setLoading(true);
    try {
      const available = await checkUsername();
      if (!available) return;

      await runTransaction(db, async (t) => {
        const newRef = doc(db, 'usernames', clean);
        const oldRef = username ? doc(db, 'usernames', normalizeUsername(username)) : null;
        
        const check = await t.get(newRef);
        if (check.exists() && check.data().uid !== user.uid) throw new Error('TAKEN');
        
        t.set(newRef, { uid: user.uid, username: `@${clean}`, createdAt: serverTimestamp() });
        t.set(doc(db, 'users', user.uid), { username: `@${clean}`, usernameLower: clean }, { merge: true });
        if (oldRef && oldRef.id !== clean) t.delete(oldRef);
      });

      setUsername(`@${clean}`); setNewUsername(clean);
      setEditingUsername(false); Alert.alert('Success', `Username updated to @${clean}`);
    } catch (e) { Alert.alert('Error', e.message); } finally { setLoading(false); }
  };

  const saveProfile = async () => {
    if (!newName.trim()) return;
    setLoading(true);
    try {
      await updateProfile(user, { displayName: newName.trim() });
      await setDoc(doc(db, 'users', user.uid), { displayName: newName.trim() }, { merge: true });
      setIsEditing(false);
    } catch (e) {} finally { setLoading(false); }
  };

  const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.displayName || 'User')}&background=007AFF&color=fff&size=120`;

  return (
    <ScrollView style={[styles.container, { backgroundColor: bg }]} contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
      <Text style={[styles.headerTitle, { color: textMain }]}>Settings</Text>

      {/* --- PURANA PROFILE CARD --- */}
      <View style={[styles.profileCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
        <View style={styles.profileInfo}>
          <Image source={{ uri: avatarUrl }} style={styles.avatar} />
          <View style={styles.nameWrap}>
            {isEditing ? (
              <View style={styles.editBox}>
                <TextInput style={[styles.nameInput, { color: textMain, borderColor: borderCol }]} value={newName} onChangeText={setNewName} />
                <TouchableOpacity onPress={saveProfile} style={styles.saveBtn} disabled={loading}>
                  {loading ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={styles.saveBtnText}>Save</Text>}
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <Text style={[styles.userName, { color: textMain }]}>{user?.displayName || 'Set Name'}</Text>
                <Text style={[styles.userHandle, { color: '#007AFF' }]}>{username || 'No username'}</Text>
                <Text style={[styles.userStatus, { color: textSub }]}>{user?.email}</Text>
              </>
            )}
          </View>
        </View>
        {!isEditing && (
          <TouchableOpacity style={styles.editBtn} onPress={() => setIsEditing(true)}>
            <Ionicons name="pencil" size={20} color="#007AFF" />
          </TouchableOpacity>
        )}
      </View>

      {/* --- PURANA IDENTITY CARD --- */}
      <Text style={[styles.sectionTitle, { color: textSub }]}>NAX IDENTITY</Text>
      <View style={[styles.usernameCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
        <View style={styles.usernameHeader}>
          <View style={[styles.identityIcon, { backgroundColor: 'rgba(0,122,255,0.12)' }]}><Ionicons name="at" size={22} color="#007AFF" /></View>
          <View style={styles.identityText}>
            <Text style={[styles.identityTitle, { color: textMain }]}>Username</Text>
            <Text style={[styles.identityValue, { color: username ? '#007AFF' : textSub }]}>{username || 'Create @username'}</Text>
          </View>
        </View>
        {!editingUsername ? (
          <TouchableOpacity style={styles.changeUsernameBtn} onPress={() => { setNewUsername(normalizeUsername(username)); setUsernameStatus(''); setEditingUsername(true); }}>
            <Ionicons name="create-outline" size={19} color="#FFF" />
            <Text style={styles.changeUsernameText}>Change Username</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.usernameEditor}>
            <View style={[styles.usernameInputBox, { borderColor: borderCol }]}>
              <Text style={[styles.atText, { color: textSub }]}>@</Text>
              <TextInput style={[styles.usernameInput, { color: textMain }]} value={newUsername} onChangeText={v => {setNewUsername(normalizeUsername(v)); setUsernameStatus('')}} autoCapitalize="none" maxLength={20} />
            </View>
            {!!usernameStatus && <Text style={[styles.usernameStatus, { color: usernameStatus.includes('✓') ? '#22C55E' : '#FF4D4F' }]}>{usernameStatus}</Text>}
            <View style={styles.usernameActions}>
              <TouchableOpacity style={[styles.cancelBtn, { borderColor: borderCol }]} onPress={() => setEditingUsername(false)}><Text style={{ color: textMain }}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={styles.checkUsernameBtn} onPress={checkUsername}><Text style={styles.checkUsernameText}>Check</Text></TouchableOpacity>
              <TouchableOpacity style={styles.saveUsernameBtn} onPress={saveUsername} disabled={loading}><Text style={styles.saveUsernameText}>Save</Text></TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* 🔥 DEKHO JADOO! 200 LINE KA CODE AB SIRF IN 2 LINES MEIN HAI 🔥 */}
      <BackupSection />
      <AdvancedSettings />

    </ScrollView>
  );
}

// STYLES
const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 40 },
  headerTitle: { fontSize: 28, fontWeight: 'bold', marginBottom: 20 },
  profileCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderRadius: 15, borderWidth: 1, marginBottom: 25 },
  profileInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  avatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#ccc' },
  nameWrap: { marginLeft: 15, flex: 1 },
  userName: { fontSize: 20, fontWeight: 'bold', marginBottom: 3 },
  userHandle: { fontSize: 14, fontWeight: '700', marginBottom: 3 },
  userStatus: { fontSize: 12 },
  editBtn: { padding: 8, backgroundColor: 'rgba(0,122,255,0.1)', borderRadius: 50 },
  editBox: { flexDirection: 'row', alignItems: 'center', flex: 1, paddingRight: 10 },
  nameInput: { flex: 1, height: 40, borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, marginRight: 10 },
  saveBtn: { backgroundColor: '#007AFF', paddingHorizontal: 15, height: 40, justifyContent: 'center', borderRadius: 8 },
  saveBtnText: { color: '#FFF', fontWeight: 'bold' },
  sectionTitle: { fontSize: 13, fontWeight: 'bold', marginLeft: 10, marginBottom: 10, letterSpacing: 1 },
  usernameCard: { padding: 16, borderRadius: 15, borderWidth: 1, marginBottom: 25 },
  usernameHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  identityIcon: { width: 42, height: 42, borderRadius: 13, justifyContent: 'center', alignItems: 'center' },
  identityText: { marginLeft: 12, flex: 1 },
  identityTitle: { fontSize: 15, fontWeight: '700', marginBottom: 3 },
  identityValue: { fontSize: 14, fontWeight: '600' },
  changeUsernameBtn: { height: 46, borderRadius: 11, backgroundColor: '#007AFF', flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  changeUsernameText: { color: '#FFF', fontSize: 15, fontWeight: '700', marginLeft: 8 },
  usernameEditor: { marginTop: 2 },
  usernameInputBox: { height: 50, borderRadius: 11, borderWidth: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14 },
  atText: { fontSize: 18, fontWeight: '700' },
  usernameInput: { flex: 1, fontSize: 16, marginLeft: 4 },
  usernameStatus: { fontSize: 13, fontWeight: '600', marginTop: 8 },
  usernameActions: { flexDirection: 'row', alignItems: 'center', marginTop: 13 },
  cancelBtn: { height: 42, paddingHorizontal: 12, borderRadius: 9, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  checkUsernameBtn: { height: 42, paddingHorizontal: 13, marginLeft: 7, borderRadius: 9, backgroundColor: '#5856D6', justifyContent: 'center', alignItems: 'center' },
  checkUsernameText: { color: '#FFF', fontSize: 13, fontWeight: '700' },
  saveUsernameBtn: { height: 42, paddingHorizontal: 13, marginLeft: 7, borderRadius: 9, backgroundColor: '#007AFF', justifyContent: 'center', alignItems: 'center' },
  saveUsernameText: { color: '#FFF', fontSize: 13, fontWeight: '700' }
});
