import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../context/ThemeContext';

export default function WalletScreen() {
  const { isDark, themeMode, changeTheme } = useTheme();

  const bg = isDark ? '#121212' : '#F5F5F7';
  const textCol = isDark ? '#FFFFFF' : '#000000';
  const cardBg = isDark ? '#1E1E1E' : '#FFFFFF';

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <Text style={[styles.title, { color: textCol }]}>Wallet & Settings ⚙️</Text>
      
      {/* Theme Settings Card */}
      <View style={[styles.card, { backgroundColor: cardBg }]}>
        <Text style={[styles.sectionTitle, { color: textCol }]}>Appearance Theme</Text>
        
        <View style={styles.row}>
          {['system', 'light', 'dark'].map((mode) => (
            <TouchableOpacity 
              key={mode} 
              style={[
                styles.btn, 
                themeMode === mode ? styles.btnActive : { borderColor: isDark ? '#333' : '#ddd' }
              ]}
              onPress={() => changeTheme(mode)}
            >
              <Text style={{ 
                color: themeMode === mode ? '#fff' : (isDark ? '#aaa' : '#555'),
                textTransform: 'capitalize',
                fontWeight: themeMode === mode ? 'bold' : 'normal'
              }}>
                {mode === 'system' ? 'Auto' : mode}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      <Text style={styles.sub}>Wallet Balance: $0.00</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', paddingTop: 80, paddingHorizontal: 20 },
  title: { fontSize: 26, fontWeight: '600', marginBottom: 30 },
  card: { width: '100%', padding: 20, borderRadius: 15, elevation: 2, marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 15 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  btn: { flex: 1, paddingVertical: 10, marginHorizontal: 5, borderWidth: 1, borderRadius: 8, alignItems: 'center' },
  btnActive: { backgroundColor: '#007AFF', borderColor: '#007AFF' },
  sub: { color: '#888', marginTop: 10 }
});
