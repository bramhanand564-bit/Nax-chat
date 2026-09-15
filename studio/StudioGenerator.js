import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Animated,
  Easing,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

const LOADING_PHASES = [
  "Analyzing your prompt...",
  "Structuring database & logic...",
  "Designing user interface...",
  "Generating safe declarative UI...",
  "Assembling Nax Mini-App...",
  "Finalizing components..."
];

export default function StudioGenerator({ route, navigation }) {
  const { isDark } = useTheme();
  
  // The user's input prompt from the previous screen
  const { prompt } = route.params || { prompt: 'A new mini app' };
  
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  
  // Animations
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  // --- COLORS ---
  const bg = isDark ? '#050A10' : '#F3F7FA';
  const cardBg = isDark ? '#101A26' : '#FFFFFF';
  const textMain = isDark ? '#F4F7FA' : '#142532';
  const textSub = isDark ? '#8FA6B9' : '#6C8494';
  const border = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
  const purple = '#AF52DE'; // AI Theme color

  useEffect(() => {
    // 1. Start UI Animations (Pulsing & Rotating AI Icon)
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.2, duration: 800, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true, easing: Easing.inOut(Easing.ease) })
      ])
    ).start();

    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 4000,
        easing: Easing.linear,
        useNativeDriver: true
      })
    ).start();

    // 2. Simulate AI Generation Phases
    const totalDuration = 5000; // 5 seconds of "fake" generation time
    const phaseInterval = totalDuration / LOADING_PHASES.length;

    const phaseTimer = setInterval(() => {
      setPhaseIndex((prev) => {
        if (prev < LOADING_PHASES.length - 1) return prev + 1;
        return prev;
      });
    }, phaseInterval);

    // 3. Simulate Progress Bar Fill
    let prog = 0;
    const progressTimer = setInterval(() => {
      prog += 2; // Add 2% every 100ms
      setProgress(prog > 100 ? 100 : prog);
    }, 100);

    // 4. Finish Generation & Navigate to Preview
    const finishTimer = setTimeout(() => {
      clearInterval(phaseTimer);
      clearInterval(progressTimer);
      
      // MOCK GENERATED APP CONFIG (Safe Declarative JSON format - No Eval JS)
      const generatedAppConfig = {
        id: `gen_${Date.now()}`,
        name: "Generated App", // In a real app, AI will extract this from prompt
        icon: "apps",
        color: purple,
        originalPrompt: prompt,
        components: [
          { type: 'header', text: 'Welcome to your App' },
          { type: 'button', label: 'Click Me', action: 'alert' }
        ]
      };

      // Navigate to Step 4: StudioPreview
      navigation.replace('StudioPreview', { appConfig: generatedAppConfig });
    }, totalDuration);

    return () => {
      clearInterval(phaseTimer);
      clearInterval(progressTimer);
      clearTimeout(finishTimer);
    };
  }, []);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg']
  });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]}>
      <View style={styles.content}>
        
        {/* ANIMATED AI CORE */}
        <View style={styles.coreWrapper}>
          <Animated.View style={[styles.glowRing, { borderColor: purple, transform: [{ scale: pulseAnim }] }]} />
          <Animated.View style={[styles.dashedRing, { borderColor: purple, transform: [{ rotate: spin }] }]} />
          
          <View style={[styles.iconBox, { backgroundColor: purple }]}>
            <Ionicons name="hardware-chip" size={48} color="#FFF" />
          </View>
        </View>

        {/* STATUS TEXT */}
        <Text style={[styles.title, { color: textMain }]}>Building with AI...</Text>
        <Text style={[styles.phaseText, { color: purple }]}>{LOADING_PHASES[phaseIndex]}</Text>

        {/* PROGRESS BAR */}
        <View style={[styles.progressContainer, { backgroundColor: cardBg, borderColor: border }]}>
          <View style={[styles.progressBar, { backgroundColor: purple, width: `${progress}%` }]} />
        </View>
        <Text style={[styles.percentText, { color: textSub }]}>{progress}% Complete</Text>

        {/* PROMPT REMINDER */}
        <View style={[styles.promptBox, { backgroundColor: cardBg, borderColor: border }]}>
          <Ionicons name="information-circle-outline" size={16} color={textSub} style={{ marginRight: 6 }} />
          <Text style={[styles.promptText, { color: textSub }]} numberOfLines={2}>
            "{prompt}"
          </Text>
        </View>

      </View>
    </SafeAreaView>
  );
}

// --- STYLES ---
const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30 },
  
  coreWrapper: { width: 160, height: 160, alignItems: 'center', justifyContent: 'center', marginBottom: 40 },
  glowRing: { position: 'absolute', width: 140, height: 140, borderRadius: 70, borderWidth: 4, opacity: 0.3 },
  dashedRing: { position: 'absolute', width: 160, height: 160, borderRadius: 80, borderWidth: 2, borderStyle: 'dashed', opacity: 0.5 },
  iconBox: { width: 90, height: 90, borderRadius: 30, alignItems: 'center', justifyContent: 'center', elevation: 10, shadowColor: '#AF52DE', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.4, shadowRadius: 15 },
  
  title: { fontSize: 24, fontWeight: '900', marginBottom: 10 },
  phaseText: { fontSize: 16, fontWeight: '700', marginBottom: 40, textAlign: 'center' },
  
  progressContainer: { width: '100%', height: 12, borderRadius: 6, borderWidth: 1, overflow: 'hidden', marginBottom: 10 },
  progressBar: { height: '100%', borderRadius: 6 },
  percentText: { fontSize: 13, fontWeight: '600', marginBottom: 40 },
  
  promptBox: { flexDirection: 'row', alignItems: 'center', padding: 15, borderRadius: 16, borderWidth: 1, width: '100%' },
  promptText: { flex: 1, fontSize: 13, fontStyle: 'italic', lineHeight: 18 }
});
