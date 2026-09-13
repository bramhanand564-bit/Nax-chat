import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { auth } from './firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';

import ChatsScreen from './screens/ChatsScreen';
import PortalsScreen from './screens/PortalsScreen';
import MomentsScreen from './screens/MomentsScreen';
import WalletScreen from './screens/WalletScreen';
import ChatRoomScreen from './screens/ChatRoomScreen';
import AuthScreen from './screens/AuthScreen';
import TicTacToeScreen from './screens/TicTacToeScreen';
import NaxStudioScreen from './screens/NaxStudioScreen';
import BotChatScreen from './screens/BotChatScreen';
import CallScreen from './screens/CallScreen';

const Stack = createNativeStackNavigator();

function MainAppTabs({ navigation }) {
  const [activeTab, setActiveTab] = useState('Chats');
  const { isDark } = useTheme();

  const renderScreen = () => {
    if (activeTab === 'Chats') return <ChatsScreen navigation={navigation} />;
    if (activeTab === 'Portals') return <PortalsScreen navigation={navigation} />; 
    if (activeTab === 'Moments') return <MomentsScreen />;
    if (activeTab === 'Settings') return <WalletScreen />; 
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#121212' : '#F5F5F7' }]}>
      <View style={styles.content}>{renderScreen()}</View>
      <View style={[styles.glassNavBar, { backgroundColor: isDark ? 'rgba(30,30,30,0.85)' : 'rgba(255,255,255,0.85)', borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
        {['Chats', 'Portals', 'Moments', 'Settings'].map((tab) => (
          <TouchableOpacity key={tab} onPress={() => setActiveTab(tab)} style={styles.navItem}>
            <Text style={[styles.navText, { color: activeTab === tab ? (isDark ? '#FFFFFF' : '#000000') : '#888888' }, activeTab === tab && styles.activeText]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}

function AppNavigator() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const { isDark } = useTheme();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', backgroundColor: isDark ? '#121212' : '#F5F5F7' }]}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <>
            <Stack.Screen name="HomeTabs" component={MainAppTabs} />
            <Stack.Screen name="ChatRoom" component={ChatRoomScreen} />
            <Stack.Screen name="TicTacToe" component={TicTacToeScreen} />
            <Stack.Screen name="NaxStudio" component={NaxStudioScreen} />
            <Stack.Screen name="BotChat" component={BotChatScreen} />
            <Stack.Screen name="Call" component={CallScreen} />
          </>
        ) : (
          <Stack.Screen name="Auth" component={AuthScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppNavigator />
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1 },
  glassNavBar: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', position: 'absolute', bottom: 20, left: 20, right: 20, height: 65, borderRadius: 20, borderWidth: 1, elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.1, shadowRadius: 10 },
  navItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  navText: { fontSize: 15, fontWeight: '500' },
  activeText: { fontWeight: 'bold' }
});
