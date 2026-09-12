import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function WalletScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Wallet 💳</Text>
      <Text style={styles.sub}>Zero Balance</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d0d12', justifyContent: 'center', alignItems: 'center' },
  title: { color: '#ffea00', fontSize: 28, fontWeight: 'bold' },
  sub: { color: '#666', marginTop: 10 }
});
