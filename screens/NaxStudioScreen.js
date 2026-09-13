import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Alert, ActivityIndicator } from 'react-native';
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

  const bg = isDark ? '#121212' : '#F5F5F7';
  const textMain = isDark ? '#FFFFFF' : '#000000';
  const textSub = isDark ? '#888888' : '#666666';
  const cardBg = isDark ? '#1E1E1E' : '#FFFFFF';
  const borderCol = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
  const inputBg = isDark ? '#2C2C2E' : '#E5E5EA';

  // बॉट को Firebase में सेव करने का फंक्शन
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
    <View style={[styles.container, { backgroundColor: bg }]}>
      <View style={[styles.header, { borderBottomColor: borderCol }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={28} color={textMain} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: textMain }]}>Nax Studio</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
        
        {/* Section 1: Template Installer (For Customization) */}
        <Text style={[styles.sectionTitle, { color: textMain }]}>Special Bot Templates</Text>
        <Text style={[styles.subText, { color: textSub, marginBottom: 15 }]}>Install a template and customize its logic</Text>
        
        <View style={[styles.templateCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
          <View style={styles.templateInfo}>
            <Ionicons name="film" size={28} color="#FF3B30" style={{ marginRight: 15 }} />
            <View>
              <Text style={[styles.templateName, { color: textMain }]}>MovieBot Template</Text>
              <Text style={{ color: textSub, fontSize: 12 }}>Contains search & link logic</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.installBtn} onPress={() => Alert.alert("Coming Soon", "Template cloning will open the code editor!")}>
            <Text style={styles.installText}>Install & Edit</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.divider} />

        {/* Section 2: Custom Bot Builder */}
        <Text style={[styles.sectionTitle, { color: textMain }]}>Build Custom Bot</Text>
        <Text style={[styles.subText, { color: textSub, marginBottom: 20 }]}>Create a bot with your own logic & responses</Text>

        <Text style={[styles.inputLabel, { color: textMain }]}>Bot Name</Text>
        <TextInput 
          style={[styles.input, { backgroundColor: inputBg, color: textMain }]}
          placeholder="e.g. My Helper Bot"
          placeholderTextColor={textSub}
          value={botName}
          onChangeText={setBotName}
        />

        <View style={[styles.logicBox, { backgroundColor: 'rgba(0,122,255,0.05)', borderColor: '#007AFF', borderWidth: 1 }]}>
          <Text style={{ color: '#007AFF', fontWeight: 'bold', marginBottom: 10 }}>BOT LOGIC / RULES</Text>
          
          <Text style={[styles.inputLabel, { color: textMain }]}>If user says (Trigger Word):</Text>
          <TextInput 
            style={[styles.input, { backgroundColor: inputBg, color: textMain }]}
            placeholder="e.g. Hello"
            placeholderTextColor={textSub}
            value={triggerWord}
            onChangeText={setTriggerWord}
          />

          <Text style={[styles.inputLabel, { color: textMain }]}>Bot will reply with:</Text>
          <TextInput 
            style={[styles.input, { backgroundColor: inputBg, color: textMain, height: 80 }]}
            placeholder="e.g. Hi there! How can I help you today?"
            placeholderTextColor={textSub}
            multiline
            value={botReply}
            onChangeText={setBotReply}
          />
        </View>

        <TouchableOpacity style={styles.publishBtn} onPress={handlePublishBot} disabled={loading}>
          {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.publishBtnText}>Deploy Bot to Ecosystem 🚀</Text>}
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 45, paddingBottom: 15, paddingHorizontal: 15, borderBottomWidth: 1 },
  backBtn: { padding: 5 },
  headerTitle: { fontSize: 20, fontWeight: 'bold' },
  sectionTitle: { fontSize: 22, fontWeight: 'bold' },
  subText: { fontSize: 13, marginTop: 4 },
  
  templateCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, borderRadius: 15, borderWidth: 1 },
  templateInfo: { flexDirection: 'row', alignItems: 'center' },
  templateName: { fontSize: 16, fontWeight: 'bold' },
  installBtn: { backgroundColor: 'rgba(0,122,255,0.1)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  installText: { color: '#007AFF', fontWeight: 'bold', fontSize: 13 },
  
  divider: { height: 1, backgroundColor: 'rgba(150,150,150,0.2)', marginVertical: 30 },
  
  inputLabel: { fontSize: 14, fontWeight: '600', marginBottom: 8, marginLeft: 4 },
  input: { height: 50, borderRadius: 10, paddingHorizontal: 15, marginBottom: 15, fontSize: 15 },
  
  logicBox: { padding: 15, borderRadius: 15, marginBottom: 25 },
  
  publishBtn: { backgroundColor: '#007AFF', height: 55, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
  publishBtnText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' }
});
