import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Image } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';

export default function CallScreen({ route, navigation }) {
  const { type, name } = route.params; // 'video' या 'voice'
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState('front');
  const [isMuted, setIsMuted] = useState(false);
  const [timer, setTimer] = useState(0);

  // कॉल का टाइमर चालू करना और परमिशन मांगना
  useEffect(() => {
    if (!permission?.granted) requestPermission();
    const interval = setInterval(() => setTimer(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, [permission]);

  const formatTime = (time) => {
    const m = Math.floor(time / 60).toString().padStart(2, '0');
    const s = (time % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const toggleCamera = () => setFacing(current => (current === 'back' ? 'front' : 'back'));
  const endCall = () => navigation.goBack();

  // ================= VIDEO CALL UI =================
  if (type === 'video') {
    if (!permission) return <View style={styles.container} />;
    if (!permission.granted) return <View style={styles.container}><Text style={{color: '#FFF'}}>Camera access denied</Text></View>;

    return (
      <View style={styles.container}>
        <CameraView style={styles.camera} facing={facing} mute={isMuted}>
          <View style={styles.videoOverlay}>
            
            {/* Top Bar */}
            <View style={styles.header}>
              <TouchableOpacity onPress={endCall} style={styles.iconBtn}>
                <Ionicons name="chevron-down" size={30} color="#FFF" />
              </TouchableOpacity>
              <View style={styles.secureBox}>
                <Ionicons name="lock-closed" size={12} color="#FFF" />
                <Text style={styles.secureText}>End-to-end encrypted</Text>
              </View>
              <TouchableOpacity style={styles.iconBtn}>
                <Ionicons name="person-add" size={22} color="#FFF" />
              </TouchableOpacity>
            </View>
            
            {/* User Info */}
            <View style={styles.userInfo}>
              <Text style={styles.callerName}>{name}</Text>
              <Text style={styles.timerText}>{formatTime(timer)}</Text>
            </View>

            {/* Call Controls */}
            <View style={styles.controls}>
              <TouchableOpacity style={styles.controlBtn} onPress={toggleCamera}>
                <Ionicons name="camera-reverse" size={28} color="#FFF" />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.controlBtn, isMuted && { backgroundColor: '#FFF' }]} onPress={() => setIsMuted(!isMuted)}>
                <Ionicons name={isMuted ? "mic-off" : "mic"} size={28} color={isMuted ? "#000" : "#FFF"} />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.controlBtn, { backgroundColor: '#FF3B30', width: 65, height: 65, borderRadius: 32.5 }]} onPress={endCall}>
                <Ionicons name="call" size={32} color="#FFF" style={{ transform: [{ rotate: '135deg' }] }} />
              </TouchableOpacity>
            </View>

          </View>
        </CameraView>
      </View>
    );
  }

  // ================= VOICE CALL UI =================
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: '#121212' }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={endCall} style={styles.iconBtn}>
          <Ionicons name="chevron-down" size={30} color="#FFF" />
        </TouchableOpacity>
        <View style={styles.secureBox}>
          <Ionicons name="lock-closed" size={12} color="#FFF" />
          <Text style={styles.secureText}>End-to-end encrypted</Text>
        </View>
        <TouchableOpacity style={styles.iconBtn}>
          <Ionicons name="person-add" size={22} color="#FFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.voiceInfo}>
        <Text style={styles.callerName}>{name}</Text>
        <Text style={styles.timerText}>{formatTime(timer)}</Text>
      </View>

      <View style={styles.voiceAvatarContainer}>
        <Image source={{ uri: `https://ui-avatars.com/api/?name=${name.replace(' ', '+')}&background=007AFF&color=fff&size=200` }} style={styles.voiceAvatar} />
      </View>

      <View style={styles.voiceControls}>
        <TouchableOpacity style={styles.controlBtn}>
          <Ionicons name="volume-high" size={28} color="#FFF" />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.controlBtn, isMuted && { backgroundColor: '#FFF' }]} onPress={() => setIsMuted(!isMuted)}>
          <Ionicons name={isMuted ? "mic-off" : "mic"} size={28} color={isMuted ? "#000" : "#FFF"} />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.controlBtn, { backgroundColor: '#FF3B30', width: 65, height: 65, borderRadius: 32.5 }]} onPress={endCall}>
          <Ionicons name="call" size={32} color="#FFF" style={{ transform: [{ rotate: '135deg' }] }} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1 },
  videoOverlay: { flex: 1, justifyContent: 'space-between', backgroundColor: 'rgba(0,0,0,0.2)', paddingTop: 40, paddingBottom: 30 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 10 },
  iconBtn: { padding: 5 },
  secureBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.4)', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 15 },
  secureText: { color: '#FFF', fontSize: 12, marginLeft: 5 },
  userInfo: { alignItems: 'center', marginTop: 20 },
  callerName: { color: '#FFF', fontSize: 26, fontWeight: 'bold', textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: {width: 1, height: 1}, textShadowRadius: 3 },
  timerText: { color: '#FFF', fontSize: 16, marginTop: 5, textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: {width: 1, height: 1}, textShadowRadius: 2 },
  controls: { flexDirection: 'row', justifyContent: 'space-evenly', alignItems: 'center', marginBottom: 20 },
  controlBtn: { width: 55, height: 55, borderRadius: 27.5, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  
  // Voice Styles
  voiceInfo: { alignItems: 'center', marginTop: 40 },
  voiceAvatarContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  voiceAvatar: { width: 160, height: 160, borderRadius: 80 },
  voiceControls: { flexDirection: 'row', justifyContent: 'space-evenly', alignItems: 'center', paddingBottom: 50, backgroundColor: '#1E1E1E' }
});
