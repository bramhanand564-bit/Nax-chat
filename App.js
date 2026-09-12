import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export default function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Welcome to Nax Chat! 🚀</Text>
      <Text style={styles.subText}>The Ultimate Super App Ecosystem</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#0a0a0a', 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  text: { 
    color: '#00FF7F', 
    fontSize: 28, 
    fontWeight: 'bold' 
  },
  subText: { 
    color: '#888888', 
    fontSize: 16, 
    marginTop: 10 
  }
});
