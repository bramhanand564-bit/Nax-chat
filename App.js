import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView, Platform } from 'react-native';

// हमारी अलग-अलग फाइल्स को यहाँ लिंक (Import) कर रहे हैं
import ChatsScreen from './screens/ChatsScreen';
import PortalsScreen from './screens/PortalsScreen';
import MomentsScreen from './screens/MomentsScreen';
import WalletScreen from './screens/WalletScreen';

export default function App() {
  const [activeTab, setActiveTab] = useState('Chats');

  // जो टैब सेलेक्ट होगा, सिर्फ वही फाइल स्क्रीन पर दिखेगी
  const renderScreen = () => {
    if (activeTab === 'Chats') return <ChatsScreen />;
    if (activeTab === 'Portals') return <PortalsScreen />;
    if (activeTab === 'Moments') return <MomentsScreen />;
    if (activeTab === 'Wallet') return <WalletScreen />;
  };

  return (
    <SafeAreaView style={styles.container}>
      
      {/* Main Feature Screen */}
      <View style={styles.content}>
        {renderScreen()}
      </View>

      {/* Floating Glassy Bottom Navigation Bar (Non-Apple Style) */}
      <View style={styles.glassNavBar}>
        {['Chats', 'Portals', 'Moments', 'Wallet'].map((tab) => (
          <TouchableOpacity 
            key={tab} 
            onPress={() => setActiveTab(tab)} 
            style={styles.navItem}
          >
            <Text style={[styles.navText, activeTab === tab && styles.activeText]}>
              {tab}
            </Text>
            {activeTab === tab && <View style={styles.activeDot} />}
          </TouchableOpacity>
        ))}
      </View>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#0d0d12' // Dark Premium Background
  },
  content: { 
    flex: 1 
  },
  glassNavBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    position: 'absolute',
    bottom: 25, // हवा में तैरता हुआ
    left: 20,
    right: 20,
    height: 70,
    backgroundColor: 'rgba(255, 255, 255, 0.05)', // Glassy effect (हल्का पारदर्शी)
    borderRadius: 25,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)', // Glass की चमक (Border)
    elevation: 15,
  },
  navItem: { 
    alignItems: 'center', 
    justifyContent: 'center',
    width: 70
  },
  navText: { 
    color: '#666666', 
    fontSize: 12, 
    fontWeight: '600' 
  },
  activeText: { 
    color: '#00FF7F', // Neon Green Accent
    fontSize: 14, 
    fontWeight: 'bold',
    marginBottom: 4
  },
  activeDot: {
    width: 6,
    height: 6,
    backgroundColor: '#00FF7F',
    borderRadius: 3,
    shadowColor: '#00FF7F',
    shadowOpacity: 0.8,
    shadowRadius: 5
  }
});
