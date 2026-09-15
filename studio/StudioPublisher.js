import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Platform,
  TextInput,
  KeyboardAvoidingView,
  ActivityIndicator,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

const CATEGORIES = ['Games', 'Productivity', 'Tools', 'AI Bots', 'Finance', 'Media'];

export default function StudioPublisher({ route, navigation }) {
  const { isDark } = useTheme();

  // Retrieve the generated config passed from Preview/Tester
  const { appConfig } = route.params || {};

  // Form State
  const [appName, setAppName] = useState(appConfig?.name || 'My New App');
  const [appDesc, setAppDesc] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Productivity');
  const [isPublishing, setIsPublishing] = useState(false);

  // --- COLORS ---
  const bg = isDark ? '#050A10' : '#F3F7FA';
  const headerBg = isDark ? '#0B1824' : '#FFFFFF';
  const cardBg = isDark ? '#101A26' : '#FFFFFF';
  const inputBg = isDark ? '#14202E' : '#EEF3F7';
  const textMain = isDark ? '#F4F7FA' : '#142532';
  const textSub = isDark ? '#8FA6B9' : '#6C8494';
  const border = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
  const purple = '#AF52DE'; 
  const blue = '#087EFF';
  const appColor = appConfig?.color || purple;

  // --- PUBLISH HANDLER ---
  const handlePublish = () => {
    if (!appName.trim()) {
      Alert.alert('Required', 'Please provide an app name.');
      return;
    }

    setIsPublishing(true);

    // Simulate network delay for publishing to Firebase
    setTimeout(() => {
      setIsPublishing(false);
      
      Alert.alert(
        "🎉 App Published!", 
        `"${appName}" is now live on the Nax Portal. Users can now discover and install your app.`,
        [
          { 
            text: "Go to Portal", 
            onPress: () => navigation.navigate('PortalsScreen') // Route back to main Portal
          }
        ]
      );
    }, 2000);
  };

  if (!appConfig) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: bg, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: textMain }}>No App Configuration found.</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 20 }}>
          <Text style={{ color: blue }}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]}>
      
      {/* HEADER */}
      <View style={[styles.header, { backgroundColor: headerBg, borderBottomColor: border }]}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={textMain} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: textMain }]}>Publish App</Text>
        <View style={{ width: 44 }} />
      </View>

      <KeyboardAvoidingView 
        style={styles.flex} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          
          {/* APP ICON & IDENTITY PREVIEW */}
          <View style={styles.identitySection}>
            <View style={[styles.bigIconBox, { backgroundColor: `${appColor}20` }]}>
              <Ionicons name={appConfig.icon || 'apps'} size={48} color={appColor} />
            </View>
            <Text style={[styles.identityName, { color: textMain }]}>{appName || 'App Name'}</Text>
            <Text style={[styles.identitySub, { color: textSub }]}>By Nax Studio Builder</Text>
          </View>

          {/* FORM: APP NAME */}
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: textMain }]}>App Name</Text>
            <View style={[styles.inputWrapper, { backgroundColor: inputBg, borderColor: border }]}>
              <TextInput
                style={[styles.input, { color: textMain }]}
                value={appName}
                onChangeText={setAppName}
                placeholder="Enter app name"
                placeholderTextColor={textSub}
              />
            </View>
          </View>

          {/* FORM: DESCRIPTION */}
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: textMain }]}>Short Description</Text>
            <View style={[styles.inputWrapper, { backgroundColor: inputBg, borderColor: border, height: 100, alignItems: 'flex-start' }]}>
              <TextInput
                style={[styles.input, { color: textMain, height: '100%', textAlignVertical: 'top' }]}
                value={appDesc}
                onChangeText={setAppDesc}
                placeholder="What does this app do?"
                placeholderTextColor={textSub}
                multiline
              />
            </View>
          </View>

          {/* FORM: CATEGORY */}
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: textMain }]}>Category</Text>
            <View style={styles.categoriesWrapper}>
              {CATEGORIES.map((cat, idx) => {
                const isSelected = selectedCategory === cat;
                return (
                  <TouchableOpacity 
                    key={idx} 
                    style={[
                      styles.catPill, 
                      { 
                        backgroundColor: isSelected ? purple : cardBg,
                        borderColor: isSelected ? purple : border 
                      }
                    ]}
                    onPress={() => setSelectedCategory(cat)}
                  >
                    <Text style={[
                      styles.catText, 
                      { color: isSelected ? '#FFF' : textSub }
                    ]}>
                      {cat}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>

      {/* PUBLISH BUTTON */}
      <View style={[styles.bottomBar, { backgroundColor: headerBg, borderTopColor: border }]}>
        <TouchableOpacity 
          style={[styles.publishBtn, { backgroundColor: purple, opacity: isPublishing ? 0.7 : 1 }]}
          disabled={isPublishing}
          onPress={handlePublish}
        >
          {isPublishing ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <Ionicons name="rocket" size={20} color="#FFF" style={{ marginRight: 8 }} />
              <Text style={styles.publishBtnText}>Publish to Nax Portal</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

    </SafeAreaView>
  );
}

// --- STYLES ---
const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    paddingHorizontal: 10, 
    paddingTop: Platform.OS === 'ios' ? 10 : 15, 
    paddingBottom: 15, 
    borderBottomWidth: 1 
  },
  iconBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800' },
  
  scrollContent: { padding: 20, paddingBottom: 40 },
  
  identitySection: { alignItems: 'center', marginBottom: 30 },
  bigIconBox: { width: 90, height: 90, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: 15 },
  identityName: { fontSize: 22, fontWeight: '900', marginBottom: 4 },
  identitySub: { fontSize: 13, fontWeight: '500' },
  
  inputGroup: { marginBottom: 25 },
  inputLabel: { fontSize: 14, fontWeight: '700', marginBottom: 10, marginLeft: 4 },
  inputWrapper: { height: 50, borderRadius: 14, borderWidth: 1, paddingHorizontal: 15, justifyContent: 'center' },
  input: { flex: 1, fontSize: 16 },
  
  categoriesWrapper: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  catPill: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1 },
  catText: { fontSize: 14, fontWeight: '600' },

  bottomBar: { padding: 15, paddingBottom: Platform.OS === 'ios' ? 25 : 15, borderTopWidth: 1 },
  publishBtn: { height: 56, borderRadius: 28, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  publishBtnText: { color: '#FFF', fontSize: 17, fontWeight: '800' }
});
