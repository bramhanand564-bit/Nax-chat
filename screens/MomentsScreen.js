import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function MomentsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Moments 📸</Text>
      <Text style={styles.sub}>Secure & Private Feed</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d0d12', justifyContent: 'center', alignItems: 'center' },
  title: { color: '#ff007f', fontSize: 28, fontWeight: 'bold' },
  sub: { color: '#666', marginTop: 10 }
});
