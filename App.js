import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView } from 'react-native';
import { ThemeProvider, useTheme } from './context/ThemeContext';

import ChatsScreen from './screens/ChatsScreen';
import PortalsScreen from './screens/PortalsScreen';
import MomentsScreen from './screens/MomentsScreen';
import WalletScreen from './screens/WalletScreen';

function MainApp() {
  const [activeTab, setActiveTab] = useState('Chats');
  const { isDark } = useTheme();

  const renderScreen = () => {
    if (activeTab === 'Chats') return <ChatsScreen />;
    if (activeTab === 'Portals') return <PortalsScreen />;
    if (activeTab === 'Moments') return <MomentsScreen />;
    if (activeTab === 'Wallet') return <WalletScreen />;
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#121212' : '#F5F5F7' }]}>
      <View style={styles.content}>
        {renderScreen()}
      </View>
      <View style={[
        styles.glassNavBar, 
        { 
          backgroundColor: isDark ? 'rgba(30, 30, 30, 0.85)' : 'rgba(255, 255, 255, 0.85)',
          borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)'
        }
      ]}>
        {['Chats', 'Portals', 'Moments', 'Wallet'].map((tab) => (
          <TouchableOpacity key={tab} onPress={() => setActiveTab(tab)} style={styles.navItem}>
            <Text style={[
              styles.navText, 
              { color: activeTab === tab ? (isDark ? '#FFFFFF' : '#000000') : '#888888' },
              activeTab === tab && styles.activeText
            ]}>
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <MainApp />
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1 },
  glassNavBar: {
    flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center',
    position: 'absolute', bottom: 20, left: 20, right: 20, height: 65,
    borderRadius: 20, borderWidth: 1, elevation: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.1, shadowRadius: 10,
  },
  navItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  navText: { fontSize: 15, fontWeight: '500' },
  activeText: { fontWeight: 'bold' }
});
