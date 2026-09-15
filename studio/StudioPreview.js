import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Platform,
  TextInput
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

export default function StudioPreview({ route, navigation }) {
  const { isDark } = useTheme();

  // Retrieve the AI-generated config from StudioGenerator
  const { appConfig } = route.params || {};

  // --- COLORS ---
  const bg = isDark ? '#050A10' : '#F3F7FA';
  const headerBg = isDark ? '#0B1824' : '#FFFFFF';
  const previewBg = isDark ? '#101A26' : '#FFFFFF';
  const textMain = isDark ? '#F4F7FA' : '#142532';
  const textSub = isDark ? '#8FA6B9' : '#6C8494';
  const border = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
  const blue = '#087EFF';
  const purple = '#AF52DE'; // AI Theme color

  // Fallback if no config is found
  if (!appConfig) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: bg, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: textMain }}>No App Configuration Found.</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 20 }}>
          <Text style={{ color: blue }}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // --- DECLARATIVE UI RENDERER ---
  // Safely converts JSON objects into React Native components
  const renderDynamicComponent = (comp, index) => {
    switch (comp.type) {
      case 'header':
        return <Text key={index} style={[styles.compHeader, { color: textMain }]}>{comp.text}</Text>;
      
      case 'text':
        return <Text key={index} style={[styles.compText, { color: textSub }]}>{comp.text}</Text>;
      
      case 'input':
        return (
          <TextInput 
            key={index} 
            style={[styles.compInput, { borderColor: border, color: textMain, backgroundColor: isDark ? '#14202E' : '#EEF3F7' }]} 
            placeholder={comp.placeholder || 'Enter text...'} 
            placeholderTextColor={textSub}
            editable={false} // Disabled in preview mode
          />
        );
      
      case 'button':
        return (
          <TouchableOpacity 
            key={index} 
            style={[styles.compButton, { backgroundColor: appConfig.color || blue }]}
            activeOpacity={0.9}
          >
            <Text style={styles.compButtonText}>{comp.label || 'Submit'}</Text>
          </TouchableOpacity>
        );

      default:
        return <Text key={index} style={{ color: 'red' }}>Unknown Component: {comp.type}</Text>;
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]}>
      
      {/* HEADER */}
      <View style={[styles.header, { backgroundColor: headerBg, borderBottomColor: border }]}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={textMain} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: textMain }]}>Preview</Text>
        <TouchableOpacity style={styles.iconBtn}>
          <Ionicons name="options-outline" size={24} color={textMain} />
        </TouchableOpacity>
      </View>

      {/* SUB-HEADER: APP INFO */}
      <View style={[styles.appMetaBar, { borderBottomColor: border }]}>
        <View style={[styles.appIconBox, { backgroundColor: `${appConfig.color || purple}20` }]}>
          <Ionicons name={appConfig.icon || 'apps'} size={24} color={appConfig.color || purple} />
        </View>
        <View style={styles.appMetaText}>
          <Text style={[styles.appName, { color: textMain }]}>{appConfig.name || 'Generated App'}</Text>
          <Text style={[styles.appPrompt, { color: textSub }]} numberOfLines={1}>
            "{appConfig.originalPrompt}"
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* PREVIEW FRAME (Looks like a phone screen boundary) */}
        <View style={styles.previewWrapper}>
          <Text style={[styles.previewLabel, { color: textSub }]}>LIVE UI PREVIEW</Text>
          
          <View style={[styles.previewFrame, { backgroundColor: previewBg, borderColor: border }]}>
            {/* Render AI generated components safely */}
            {appConfig.components && appConfig.components.length > 0 ? (
              appConfig.components.map((comp, index) => renderDynamicComponent(comp, index))
            ) : (
              <Text style={{ color: textSub, textAlign: 'center', marginTop: 20 }}>No UI components generated.</Text>
            )}
          </View>
        </View>

      </ScrollView>

      {/* BOTTOM ACTION BAR */}
      <View style={[styles.bottomBar, { backgroundColor: headerBg, borderTopColor: border }]}>
        <TouchableOpacity 
          style={[styles.actionBtn, styles.testBtn, { borderColor: border }]}
          onPress={() => navigation.navigate('StudioTester', { appConfig })}
        >
          <Ionicons name="bug-outline" size={20} color={textMain} style={{ marginRight: 6 }} />
          <Text style={[styles.actionBtnText, { color: textMain }]}>Test App</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.actionBtn, styles.publishBtn, { backgroundColor: purple }]}
          onPress={() => navigation.navigate('StudioPublisher', { appConfig })}
        >
          <Ionicons name="cloud-upload-outline" size={20} color="#FFF" style={{ marginRight: 6 }} />
          <Text style={[styles.actionBtnText, { color: '#FFF' }]}>Publish</Text>
        </TouchableOpacity>
      </View>

    </SafeAreaView>
  );
}

// --- STYLES ---
const styles = StyleSheet.create({
  container: { flex: 1 },
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
  
  appMetaBar: { flexDirection: 'row', alignItems: 'center', padding: 15, borderBottomWidth: 1 },
  appIconBox: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  appMetaText: { flex: 1, marginLeft: 15 },
  appName: { fontSize: 18, fontWeight: '800' },
  appPrompt: { fontSize: 13, fontStyle: 'italic', marginTop: 2 },
  
  scrollContent: { padding: 20, paddingBottom: 40 },
  
  previewWrapper: { marginTop: 10 },
  previewLabel: { fontSize: 12, fontWeight: '800', letterSpacing: 1, marginBottom: 10, marginLeft: 5 },
  previewFrame: { 
    minHeight: 400, 
    borderRadius: 24, 
    borderWidth: 1, 
    padding: 20,
    // Add shadow to make it look like a device frame
    shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 5
  },

  // Dynamic Component Styles
  compHeader: { fontSize: 24, fontWeight: '900', marginBottom: 15 },
  compText: { fontSize: 15, lineHeight: 22, marginBottom: 15 },
  compInput: { height: 50, borderWidth: 1, borderRadius: 12, paddingHorizontal: 15, fontSize: 16, marginBottom: 15 },
  compButton: { height: 52, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginTop: 10, marginBottom: 15 },
  compButtonText: { color: '#FFF', fontSize: 16, fontWeight: '800' },

  bottomBar: { flexDirection: 'row', padding: 15, paddingBottom: Platform.OS === 'ios' ? 25 : 15, borderTopWidth: 1, gap: 15 },
  actionBtn: { flex: 1, height: 54, borderRadius: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  testBtn: { borderWidth: 1 },
  publishBtn: {},
  actionBtnText: { fontSize: 16, fontWeight: '700' }
});
