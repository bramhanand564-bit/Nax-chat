import React, { createContext, useState, useEffect, useContext } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const systemTheme = useColorScheme(); 
  const [themeMode, setThemeMode] = useState('system');

  // ऐप खुलते ही पुरानी सेव की हुई सेटिंग लोड करना
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem('appTheme');
        if (savedTheme) setThemeMode(savedTheme);
      } catch (error) { console.log(error); }
    };
    loadTheme();
  }, []);

  // जब यूज़र नया मोड चुने, तो उसे मेमोरी में सेव करना
  const changeTheme = async (mode) => {
    setThemeMode(mode);
    await AsyncStorage.setItem('appTheme', mode);
  };

  // असली थीम क्या होगी, इसका फैसला यहाँ होता है
  const isDark = themeMode === 'system' ? systemTheme === 'dark' : themeMode === 'dark';

  return (
    <ThemeContext.Provider value={{ themeMode, changeTheme, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
