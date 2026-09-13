import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { auth } from '../firebaseConfig';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { useTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

export default function AuthScreen() {
  const { isDark } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);

  const bg = isDark ? '#121212' : '#F5F5F7';
  const textMain = isDark ? '#FFFFFF' : '#000000';
  const textSub = isDark ? '#888888' : '#666666';
  const inputBg = isDark ? '#1E1E1E' : '#FFFFFF';

  const handleAuth = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }
    setLoading(true);
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
    } catch (error) {
      Alert.alert('Oops!', error.message);
    }
    setLoading(false);
  };

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <Text style={[styles.title, { color: textMain }]}>Nax Chat</Text>
      <Text style={[styles.subtitle, { color: textSub }]}>
        {isLogin ? 'Welcome back! Sign in to continue.' : 'Create a new account to get started.'}
      </Text>

      <View style={[styles.inputContainer, { backgroundColor: inputBg }]}>
        <Ionicons name="mail-outline" size={20} color={textSub} style={styles.icon} />
        <TextInput
          style={[styles.input, { color: textMain }]}
          placeholder="Email address"
          placeholderTextColor={textSub}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
      </View>

      <View style={[styles.inputContainer, { backgroundColor: inputBg }]}>
        <Ionicons name="lock-closed-outline" size={20} color={textSub} style={styles.icon} />
        <TextInput
          style={[styles.input, { color: textMain }]}
          placeholder="Password"
          placeholderTextColor={textSub}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
      </View>

      <TouchableOpacity style={styles.mainBtn} onPress={handleAuth} disabled={loading}>
        {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.mainBtnText}>{isLogin ? 'Login' : 'Sign Up'}</Text>}
      </TouchableOpacity>

      <TouchableOpacity style={styles.googleBtn} onPress={() => Alert.alert('Coming Soon', 'Google Login requires backend key setup. Please use Email for now.')}>
        <Ionicons name="logo-google" size={20} color={textMain} />
        <Text style={[styles.googleBtnText, { color: textMain }]}>Continue with Google</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => setIsLogin(!isLogin)} style={styles.switchBtn}>
        <Text style={[styles.switchText, { color: textSub }]}>
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <Text style={{ color: '#007AFF', fontWeight: 'bold' }}>{isLogin ? 'Sign Up' : 'Login'}</Text>
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', paddingHorizontal: 25 },
  title: { fontSize: 36, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' },
  subtitle: { fontSize: 16, marginBottom: 40, textAlign: 'center' },
  inputContainer: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, marginBottom: 15, paddingHorizontal: 15, height: 55, borderWidth: 1, borderColor: 'rgba(150,150,150,0.1)' },
  icon: { marginRight: 10 },
  input: { flex: 1, fontSize: 16 },
  mainBtn: { backgroundColor: '#007AFF', height: 55, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: 10, elevation: 3, shadowColor: '#007AFF', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 5 },
  mainBtnText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  googleBtn: { flexDirection: 'row', height: 55, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: 15, borderWidth: 1, borderColor: 'rgba(150,150,150,0.3)' },
  googleBtnText: { fontSize: 16, fontWeight: '600', marginLeft: 10 },
  switchBtn: { marginTop: 30, alignItems: 'center' },
  switchText: { fontSize: 14 }
});
