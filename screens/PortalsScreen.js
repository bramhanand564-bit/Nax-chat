import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function PortalsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Portals 🌀</Text>
      <Text style={styles.sub}>Your Mini-Apps Ecosystem</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d0d12', justifyContent: 'center', alignItems: 'center' },
  title: { color: '#00e5ff', fontSize: 28, fontWeight: 'bold' },
  sub: { color: '#666', marginTop: 10 }
});
