import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function ChatsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Chats 💬</Text>
      <Text style={styles.sub}>No new messages...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d0d12', justifyContent: 'center', alignItems: 'center' },
  title: { color: '#ffffff', fontSize: 28, fontWeight: 'bold' },
  sub: { color: '#666', marginTop: 10 }
});
