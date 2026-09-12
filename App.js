import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView } from 'react-native';

// 1. Navigation Tools
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// 2. Context & Themes
import { ThemeProvider, useTheme } from './context/ThemeContext';

// 3. All Screens
import ChatsScreen from './screens/ChatsScreen';
import PortalsScreen from './screens/PortalsScreen';
import MomentsScreen from './screens/MomentsScreen';
import WalletScreen from './screens/WalletScreen';
import ChatRoomScreen from './screens/ChatRoomScreen'; // नई चैट रूम स्क्रीन

const Stack = createNativeStackNavigator();

// 4. Main App Content (Bottom Tabs + Switching)
function MainAppTabs({ navigation }) {
  const [activeTab, setActiveTab] = useState('Chats');
  const { isDark } = useTheme();

  const renderScreen = () => {
    // यहाँ हमने ChatsScreen को 'navigation' पास किया है ताकि वो आगे छलांग लगा सके
    if (activeTab === 'Chats') return <ChatsScreen navigation={navigation} />;
    if (activeTab === 'Portals') return <PortalsScreen />;
    if (activeTab === 'Moments') return <MomentsScreen />;
    if (activeTab === 'Wallet') return <WalletScreen />;
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#121212' : '#F5F5F7' }]}>
      <View style={styles.content}>
        {renderScreen()}
      </View>
      
      {/* Bottom Floating Nav Bar */}
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

// 5. App Component (Stack Navigator wrap)
export default function App() {
  return (
    <ThemeProvider>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          
          {/* Pehli screen (Jisme 4 tabs hain) */}
          <Stack.Screen name="HomeTabs" component={MainAppTabs} />
          
          {/* Dusri screen (Chat ke andar jane wali) */}
          <Stack.Screen name="ChatRoom" component={ChatRoomScreen} />
          
        </Stack.Navigator>
      </NavigationContainer>
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
