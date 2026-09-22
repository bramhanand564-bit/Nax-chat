import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

// Firebase Imports
import { db, auth } from '../firebaseConfig';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export default function NaxStudioScreen({ navigation }) {
  const { isDark } = useTheme();
  const user = auth.currentUser;

  // States for Bot Builder
  const [botName, setBotName] = useState('');
  const [triggerWord, setTriggerWord] = useState('');
  const [botReply, setBotReply] = useState('');
  const [loading, setLoading] = useState(false);

  // Super Glassy, No-Neon, Futuristic Palette
  const bg = isDark ? '#0A0A0C' : '#F2F2F7';
  const textMain = isDark ? '#F5F5F7' : '#1C1C1E';
  const textSub = isDark ? '#8E8E93' : '#6C6C70';
  const cardBg = isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(255, 255, 255, 0.85)';
  const cardBorder = isDark ? 'rgba(255, 255, 255, 0.07)' : 'rgba(0, 0, 0, 0.04)';
  const inputBg = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';
  const buttonBg = isDark ? '#FFFFFF' : '#1C1C1E';
  const buttonText = isDark ? '#000000' : '#FFFFFF';

  // बॉट को Firebase में सेव करने का फंक्शन (Original Logic Intact)
  const handlePublishBot = async () => {
    if (!botName.trim() || !triggerWord.trim() || !botReply.trim()) {
      Alert.alert("Incomplete", "Please fill all fields to create your bot.");
      return;
    }

    setLoading(true);
    try {
      await addDoc(collection(db, 'custom_bots'), {
        botName: botName,
        creatorId: user?.uid,
        creatorName: user?.displayName || 'Unknown',
        rules: [
          { trigger: triggerWord.toLowerCase(), reply: botReply }
        ],
        type: 'custom',
        installs: 0,
        createdAt: serverTimestamp()
      });
      
      Alert.alert("Success! 🎉", `${botName} is now live in the Ecosystem!`);
      setBotName('');
      setTriggerWord('');
      setBotReply('');
      navigation.goBack();
    } catch (error) {
      Alert.alert("Error", error.message);
    }
    setLoading(false);
  };

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor: bg }]} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Sleek Futuristic Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color={textMain} />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Text style={[styles.headerSubtitle, { color: textSub }]}>BUILDER</Text>
          <Text style={[styles.headerTitle, { color: textMain }]}>Nax Studio</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Section 1: Template Installer */}
        <Text style={[styles.sectionTitle, { color: textMain }]}>Templates</Text>
        <Text style={[styles.subText, { color: textSub, marginBottom: 16 }]}>Start with a pre-built logic framework</Text>
        
        <View style={[styles.templateCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
          <View style={styles.templateInfo}>
            <View style={[styles.templateIconBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}>
              <Ionicons name="film-outline" size={22} color={textMain} />
            </View>
            <View>
              <Text style={[styles.templateName, { color: textMain }]}>MovieBot Engine</Text>
              <Text style={{ color: textSub, fontSize: 12, marginTop: 2 }}>Search & link indexing logic</Text>
            </View>
          </View>
          <TouchableOpacity 
            style={[styles.installBtn, { backgroundColor: inputBg }]} 
            onPress={() => Alert.alert("Coming Soon", "Template cloning will open the code editor!")}
          >
            <Text style={[styles.installText, { color: textMain }]}>Clone</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.divider, { backgroundColor: cardBorder }]} />

        {/* Section 2: Custom Bot Builder */}
        <Text style={[styles.sectionTitle, { color: textMain }]}>Custom Bot</Text>
        <Text style={[styles.subText, { color: textSub, marginBottom: 24 }]}>Deploy a new bot to the global ecosystem</Text>

        <Text style={[styles.inputLabel, { color: textMain }]}>Bot Name</Text>
        <TextInput 
          style={[styles.input, { backgroundColor: inputBg, color: textMain, borderColor: cardBorder }]}
          placeholder="e.g. Workflow Assistant"
          placeholderTextColor={textSub}
          value={botName}
          onChangeText={setBotName}
        />

        {/* Frosted Logic Box */}
        <View style={[styles.logicBox, { backgroundColor: cardBg, borderColor: cardBorder }]}>
          <View style={styles.logicHeader}>
            <Ionicons name="git-network-outline" size={16} color={textMain} style={{ marginRight: 6 }} />
            <Text style={[styles.logicTitle, { color: textMain }]}>CORE LOGIC</Text>
          </View>
          
          <Text style={[styles.inputLabel, { color: textSub, fontSize: 12 }]}>Trigger (If user says):</Text>
          <TextInput 
            style={[styles.input, { backgroundColor: inputBg, color: textMain, borderColor: cardBorder, marginBottom: 16 }]}
            placeholder="e.g. /help"
            placeholderTextColor={textSub}
            autoCapitalize="none"
            value={triggerWord}
            onChangeText={setTriggerWord}
          />

          <Text style={[styles.inputLabel, { color: textSub, fontSize: 12 }]}>Action (Bot will reply):</Text>
          <TextInput 
            style={[styles.input, styles.textArea, { backgroundColor: inputBg, color: textMain, borderColor: cardBorder }]}
            placeholder="e.g. How can I assist you today?"
            placeholderTextColor={textSub}
            multiline
            value={botReply}
            onChangeText={setBotReply}
          />
        </View>

        <TouchableOpacity 
          style={[styles.publishBtn, { backgroundColor: buttonBg }]} 
          onPress={handlePublishBot} 
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color={buttonText} />
          ) : (
            <Text style={[styles.publishBtnText, { color: buttonText }]}>Deploy to Ecosystem</Text>
          )}
        </TouchableOpacity>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 40 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 16 },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitleWrap: { alignItems: 'center' },
  headerSubtitle: { fontSize: 10, fontWeight: '700', letterSpacing: 1.5, marginBottom: 2 },
  headerTitle: { fontSize: 20, fontWeight: '800', letterSpacing: -0.5 },
  scrollContent: { padding: 24, paddingBottom: 100 },
  
  sectionTitle: { fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
  subText: { fontSize: 13, marginTop: 4, fontWeight: '500' },
  
  templateCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderRadius: 20, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 10, elevation: 1 },
  templateInfo: { flexDirection: 'row', alignItems: 'center' },
  templateIconBox: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  templateName: { fontSize: 16, fontWeight: '700', letterSpacing: -0.3 },
  installBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12 },
  installText: { fontWeight: '700', fontSize: 13 },
  
  divider: { height: 1, marginVertical: 32 },
  
  inputLabel: { fontSize: 13, fontWeight: '600', marginBottom: 8, marginLeft: 4, letterSpacing: -0.2 },
  input: { height: 52, borderRadius: 16, borderWidth: 1, paddingHorizontal: 16, marginBottom: 20, fontSize: 15, fontWeight: '500' },
  textArea: { height: 100, paddingTop: 16, textAlignVertical: 'top' },
  
  logicBox: { padding: 20, borderRadius: 24, borderWidth: 1, marginBottom: 32, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.04, shadowRadius: 16, elevation: 2 },
  logicHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  logicTitle: { fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  
  publishBtn: { height: 56, borderRadius: 18, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 16, elevation: 5 },
  publishBtnText: { fontSize: 16, fontWeight: '800', letterSpacing: -0.3 }
});
