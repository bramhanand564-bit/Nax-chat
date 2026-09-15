// ==========================================
// FILE: components/chat/ChatInput.js
// ==========================================
import React from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, Platform, KeyboardAvoidingView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';

export default function ChatInput({ value, onChangeText, onSend, sending, onAttach }) {
  const { isDark } = useTheme();

  const headerBg = isDark ? '#0B1824' : '#FFFFFF';
  const textMain = isDark ? '#F4F7FA' : '#142532';
  const textSub = isDark ? '#8FA6B9' : '#6C8494';
  const border = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
  const inputBg = isDark ? '#14202E' : '#EEF3F7';
  const sendActiveBg = '#087EFF';
  const sendInactiveBg = isDark ? '#1A2A3A' : '#E0E0E0';

  const canSend = value.trim().length > 0 && !sending;

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 25}
    >
      <View style={[styles.inputContainer, { backgroundColor: headerBg, borderTopColor: border }]}>
        <TouchableOpacity style={styles.attachBtn} onPress={onAttach}>
          <Ionicons name="add" size={26} color={textSub} />
        </TouchableOpacity>
        
        <View style={[styles.inputBox, { backgroundColor: inputBg }]}>
          <TextInput
            style={[styles.input, { color: textMain }]}
            placeholder="Type a message..."
            placeholderTextColor={textSub}
            value={value}
            onChangeText={onChangeText}
            multiline
          />
        </View>

        <TouchableOpacity 
          style={[styles.sendBtn, { backgroundColor: canSend ? sendActiveBg : sendInactiveBg }]}
          onPress={onSend}
          disabled={!canSend}
        >
          <Ionicons name="send" size={16} color={canSend ? '#FFF' : textSub} style={{ marginLeft: 2 }} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  inputContainer: { flexDirection: 'row', alignItems: 'flex-end', padding: 10, borderTopWidth: 1, paddingBottom: Platform.OS === 'ios' ? 25 : 10 },
  attachBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 2 },
  inputBox: { flex: 1, minHeight: 40, maxHeight: 100, borderRadius: 20, paddingHorizontal: 15, justifyContent: 'center', paddingVertical: Platform.OS === 'ios' ? 10 : 8, marginHorizontal: 8 },
  input: { fontSize: 16, maxHeight: 90 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 2 }
});
