import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Dimensions, Modal, Animated, TextInput, Alert, SafeAreaView, Platform } from 'react-native';
import { Ionicons, MaterialCommunityIcons, FontAwesome5, Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../context/ThemeContext';

const { width, height } = Dimensions.get('window');

// Dummy Data
const DUMMY_STORIES = [
  { id: 'me', name: 'Your Story', img: 'https://ui-avatars.com/api/?name=You&background=000&color=fff', hasStory: false },
  { id: '1', name: 'Priya', img: 'https://ui-avatars.com/api/?name=Priya&background=random', hasStory: true, isPremium: true },
  { id: '2', name: 'Rahul', img: 'https://ui-avatars.com/api/?name=Rahul&background=random', hasStory: true },
  { id: '3', name: 'Aman', img: 'https://ui-avatars.com/api/?name=Aman&background=random', hasStory: true },
  { id: '4', name: 'Neha', img: 'https://ui-avatars.com/api/?name=Neha&background=random', hasStory: true },
  { id: '5', name: 'Simran', img: 'https://ui-avatars.com/api/?name=Simran&background=random', hasStory: true },
];

const DUMMY_FEED = [
  { id: '101', user: 'Nax Official', verified: true, time: '2h ago', content: 'Building the ultimate Super App! 🚀🔥', likes: '12.4K', comments: '840', isVideo: true },
  { id: '102', user: 'Design Hub', verified: false, time: '5h ago', content: 'New UI concepts for the chat interface. Thoughts? 🎨', likes: '4.2K', comments: '120', isVideo: false },
  { id: '103', user: 'Tech Insider', verified: true, time: '1d ago', content: 'AI is taking over everything. Here is what you need to know. 🤖', likes: '89K', comments: '5.6K', isVideo: true },
];

export default function MomentsScreen() {
  const { isDark } = useTheme();
  
  // UI States
  const [activeTab, setActiveTab] = useState('For You');
  
  // Viewer States
  const [viewingStory, setViewingStory] = useState(null);
  const [storyIndex, setStoryIndex] = useState(0);
  const progressAnim = useRef(new Animated.Value(0)).current;

  // Creator States
  const [showCreator, setShowCreator] = useState(false);
  const [creatorMode, setCreatorMode] = useState('Camera'); // Camera, Text, Audio, Live

  // Colors
  const bg = isDark ? '#0B141A' : '#F5F5F7';
  const textMain = isDark ? '#E9EDEF' : '#111B21';
  const textSub = isDark ? '#8696A0' : '#667781';
  const cardBg = isDark ? '#1C2730' : '#FFFFFF';
  const headerBg = isDark ? '#202C33' : '#FFFFFF';

  // ================= STORY VIEWER LOGIC =================
  const openStory = (story) => {
    if(story.id === 'me' && !story.hasStory) { setShowCreator(true); return; }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setViewingStory(story);
    startStoryTimer();
  };

  const startStoryTimer = () => {
    progressAnim.setValue(0);
    Animated.timing(progressAnim, { toValue: 1, duration: 5000, useNativeDriver: false }).start(({ finished }) => {
      if (finished) closeStory();
    });
  };

  const handleStoryTap = (e) => {
    const x = e.nativeEvent.locationX;
    if (x < width / 3) {
      // Prev logic (Mock)
      Haptics.selectionAsync(); progressAnim.setValue(0); startStoryTimer();
    } else {
      // Next logic (Mock)
      Haptics.selectionAsync(); closeStory();
    }
  };

  const closeStory = () => { setViewingStory(null); progressAnim.setValue(0); };

  // ================= CREATOR LOGIC =================
  const launchCamera = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    let r = await ImagePicker.launchCameraAsync({ quality: 0.5 });
    if(!r.canceled) Alert.alert("Captured!", "Opening pro editor with 100+ tools...");
  };

  const openCreator = (mode) => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setCreatorMode(mode); setShowCreator(true); };

  // ================= RENDERERS =================
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]}>
      
      {/* MEGA HEADER */}
      <View style={[styles.header, { backgroundColor: headerBg }]}>
        <Text style={[styles.headerTitle, { color: textMain }]}>Moments</Text>
        <View style={styles.headerIcons}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => Alert.alert("Archive", "Your past memories & highlights")}><Ionicons name="time-outline" size={26} color={textMain} /></TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={() => Alert.alert("Activity", "Likes & Mentions")}><Ionicons name="heart-outline" size={26} color={textMain} /></TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={() => Alert.alert("Settings", "Privacy & Close Friends")}><Ionicons name="settings-outline" size={24} color={textMain} /></TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        
        {/* STORY RINGS (HORIZONTAL) */}
        <View style={styles.storySection}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 15 }}>
            {DUMMY_STORIES.map((s, i) => (
              <TouchableOpacity key={i} style={styles.storyItem} onPress={() => openStory(s)}>
                <View style={[styles.storyRing, { borderColor: s.hasStory ? (s.isPremium ? '#F59E0B' : '#D3396D') : borderCol }]}>
                  <Image source={{ uri: s.img }} style={styles.storyImg} />
                  {s.id === 'me' && !s.hasStory && <View style={styles.addStoryBtn}><Ionicons name="add" size={16} color="#FFF" /></View>}
                  {s.isPremium && <View style={styles.premiumBadge}><Ionicons name="star" size={10} color="#FFF" /></View>}
                </View>
                <Text style={[styles.storyName, { color: textMain }]} numberOfLines={1}>{s.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* FEED TABS */}
        <View style={styles.tabsContainer}>
          {['For You', 'Following', 'Live', 'Exclusive 🪙'].map((tab) => (
            <TouchableOpacity key={tab} style={[styles.tabBtn, activeTab === tab && { borderBottomColor: '#007AFF', borderBottomWidth: 2 }]} onPress={() => { Haptics.selectionAsync(); setActiveTab(tab); }}>
              <Text style={[styles.tabText, { color: activeTab === tab ? '#007AFF' : textSub, fontWeight: activeTab === tab ? 'bold' : '500' }]}>{tab}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* INFINITE VERTICAL FEED */}
        {DUMMY_FEED.map((post) => (
          <View key={post.id} style={[styles.feedCard, { backgroundColor: cardBg }]}>
            <View style={styles.feedHeader}>
              <Image source={{ uri: `https://ui-avatars.com/api/?name=${post.user}&background=random` }} style={styles.feedAvatar} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={[styles.feedUser, { color: textMain }]}>{post.user}</Text>
                  {post.verified && <Ionicons name="checkmark-circle" size={14} color="#007AFF" style={{ marginLeft: 4 }} />}
                </View>
                <Text style={{ color: textSub, fontSize: 12 }}>{post.time} • 🌎 Public</Text>
              </View>
              <TouchableOpacity><Ionicons name="ellipsis-horizontal" size={20} color={textSub} /></TouchableOpacity>
            </View>

            <Text style={[styles.feedText, { color: textMain }]}>{post.content}</Text>
            
            <View style={[styles.feedMediaPlaceholder, { backgroundColor: isDark ? '#000' : '#E0E0E0' }]}>
              {post.isVideo ? <Ionicons name="play-circle" size={60} color="rgba(255,255,255,0.7)" /> : <Ionicons name="image-outline" size={50} color={textSub} />}
            </View>

            {/* 10+ Feed Actions */}
            <View style={styles.feedActions}>
              <View style={{ flexDirection: 'row' }}>
                <TouchableOpacity style={styles.feedActionBtn} onPress={() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)}>
                  <Ionicons name="heart-outline" size={26} color={textMain} /><Text style={{ color: textMain, marginLeft: 5 }}>{post.likes}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.feedActionBtn}>
                  <Ionicons name="chatbubble-outline" size={24} color={textMain} /><Text style={{ color: textMain, marginLeft: 5 }}>{post.comments}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.feedActionBtn}>
                  <Feather name="send" size={24} color={textMain} />
                </TouchableOpacity>
              </View>
              <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center' }} onPress={() => Alert.alert("Tip Jar", "Send Nax Coins to creator")}>
                <FontAwesome5 name="coins" size={20} color="#F59E0B" /><Text style={{ color: '#F59E0B', marginLeft: 5, fontWeight: 'bold' }}>Tip</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* ================= FLOATING ACTION BUTTONS (FABs) ================= */}
      <View style={styles.fabContainer}>
        <TouchableOpacity style={[styles.fabMini, { backgroundColor: '#7F66FF' }]} onPress={() => openCreator('Text')}>
          <Ionicons name="pencil" size={20} color="#FFF" />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.fabMini, { backgroundColor: '#10B981' }]} onPress={() => openCreator('Audio')}>
          <Ionicons name="mic" size={20} color="#FFF" />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.fabMain, { backgroundColor: '#D3396D' }]} onPress={launchCamera}>
          <Ionicons name="camera" size={28} color="#FFF" />
        </TouchableOpacity>
      </View>

      {/* ================= PRO STORY VIEWER MODAL ================= */}
      <Modal visible={!!viewingStory} transparent={false} animationType="fade" onRequestClose={closeStory}>
        <View style={styles.viewerContainer}>
          <TouchableOpacity activeOpacity={1} style={styles.viewerTapArea} onPress={handleStoryTap} onLongPress={() => { progressAnim.stopAnimation(); Haptics.selectionAsync(); }} onPressOut={startStoryTimer}>
            
            {/* Story Image Placeholder */}
            <Image source={{ uri: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1000&auto=format&fit=crop' }} style={StyleSheet.absoluteFillObject} blurRadius={10} />
            <View style={styles.viewerOverlay}>
              <Ionicons name="image" size={100} color="rgba(255,255,255,0.3)" />
              <Text style={{ color: '#FFF', fontSize: 24, fontWeight: 'bold', marginTop: 20 }}>{viewingStory?.name}'s Story</Text>
            </View>

            {/* Top Progress Bar & Header */}
            <SafeAreaView style={styles.viewerHeader}>
              <View style={styles.progressBarBg}>
                <Animated.View style={[styles.progressBarFill, { width: progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]} />
              </View>
              <View style={styles.viewerUserInfo}>
                <Image source={{ uri: viewingStory?.img }} style={styles.viewerAvatar} />
                <Text style={styles.viewerName}>{viewingStory?.name}</Text>
                <Text style={styles.viewerTime}>4h</Text>
                <View style={{ flex: 1 }} />
                <TouchableOpacity onPress={closeStory} style={{ padding: 5 }}><Ionicons name="close" size={28} color="#FFF" /></TouchableOpacity>
              </View>
            </SafeAreaView>

            {/* Bottom Reply Bar */}
            <SafeAreaView style={styles.viewerFooter}>
              <TouchableOpacity style={styles.viewerReplyBox} onPress={() => Alert.alert("Reply", "Keyboard opens...")}>
                <Text style={{ color: '#FFF', fontSize: 15 }}>Send message...</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ marginHorizontal: 10 }} onPress={() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)}><Ionicons name="heart" size={32} color="#FF3B30" /></TouchableOpacity>
              <TouchableOpacity><Ionicons name="paper-plane-outline" size={30} color="#FFF" /></TouchableOpacity>
            </SafeAreaView>

          </TouchableOpacity>
        </View>
      </Modal>

      {/* ================= MEGA STORY CREATOR MODAL (100+ TOOLS) ================= */}
      <Modal visible={showCreator} animationType="slide" transparent={false} onRequestClose={() => setShowCreator(false)}>
        <SafeAreaView style={[styles.creatorContainer, { backgroundColor: '#000' }]}>
          
          {/* Top Actions */}
          <View style={styles.creatorHeader}>
            <TouchableOpacity onPress={() => setShowCreator(false)}><Ionicons name="close" size={32} color="#FFF" /></TouchableOpacity>
            <View style={styles.creatorPills}>
              <TouchableOpacity style={styles.pillBtn}><Ionicons name="musical-notes" size={16} color="#FFF" /><Text style={styles.pillText}>Audio</Text></TouchableOpacity>
              <TouchableOpacity style={styles.pillBtn}><Text style={styles.pillText}>Aa</Text></TouchableOpacity>
              <TouchableOpacity style={styles.pillBtn}><Ionicons name="color-palette" size={16} color="#FFF" /></TouchableOpacity>
              <TouchableOpacity style={styles.pillBtn}><Ionicons name="happy-outline" size={16} color="#FFF" /></TouchableOpacity>
            </View>
          </View>

          {/* Canvas Area */}
          <View style={styles.creatorCanvas}>
            <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 24, textAlign: 'center' }}>
              {creatorMode === 'Text' ? 'Type something...\n\n(100+ Fonts, Colors, Alignments available)' : 'Camera Preview\n\n(AR Filters, Boomerang, Superzoom enabled)'}
            </Text>
          </View>

          {/* Right Sidebar Tools */}
          <View style={styles.sidebarTools}>
            {['text', 'sticker-circle', 'location', 'bar-chart', 'time', 'link', 'flash'].map((icon, i) => (
              <TouchableOpacity key={i} style={styles.sidebarBtn} onPress={() => Haptics.selectionAsync()}><MaterialCommunityIcons name={icon} size={28} color="#FFF" /></TouchableOpacity>
            ))}
          </View>

          {/* Bottom Controls */}
          <View style={styles.creatorFooter}>
            <View style={styles.modeSelector}>
              {['Post', 'Story', 'Reel', 'Live'].map((mode) => (
                <TouchableOpacity key={mode} style={{ paddingHorizontal: 15 }}><Text style={{ color: mode === 'Story' ? '#FFF' : '#888', fontWeight: mode === 'Story' ? 'bold' : 'normal', fontSize: 16 }}>{mode}</Text></TouchableOpacity>
              ))}
            </View>
            
            <View style={styles.bottomActions}>
              <TouchableOpacity style={styles.galleryBtn}><Ionicons name="images" size={24} color="#FFF" /></TouchableOpacity>
              <TouchableOpacity style={styles.captureBtn} onLongPress={() => Alert.alert("Recording", "Video started...")}><View style={styles.captureInner} /></TouchableOpacity>
              <TouchableOpacity style={styles.flipBtn}><Ionicons name="camera-reverse" size={28} color="#FFF" /></TouchableOpacity>
            </View>
          </View>

        </SafeAreaView>
      </Modal>

    </SafeAreaView>
  );
}

// ================= STYLES =================
const borderCol = 'rgba(150,150,150,0.2)';

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 45, paddingBottom: 15, elevation: 4 },
  headerTitle: { fontSize: 28, fontWeight: '900', letterSpacing: 0.5 },
  headerIcons: { flexDirection: 'row', alignItems: 'center' },
  iconBtn: { marginLeft: 18 },

  storySection: { paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: borderCol },
  storyItem: { alignItems: 'center', marginRight: 18, position: 'relative' },
  storyRing: { width: 72, height: 72, borderRadius: 36, borderWidth: 3, justifyContent: 'center', alignItems: 'center', padding: 2 },
  storyImg: { width: 62, height: 62, borderRadius: 31 },
  addStoryBtn: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#007AFF', borderRadius: 12, width: 24, height: 24, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#FFF' },
  premiumBadge: { position: 'absolute', bottom: -5, backgroundColor: '#F59E0B', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10, borderWidth: 1, borderColor: '#FFF' },
  storyName: { fontSize: 12, marginTop: 6, fontWeight: '600' },

  tabsContainer: { flexDirection: 'row', justifyContent: 'space-around', borderBottomWidth: 1, borderBottomColor: borderCol },
  tabBtn: { paddingVertical: 12, paddingHorizontal: 15 },
  tabText: { fontSize: 15 },

  feedCard: { marginTop: 10, paddingVertical: 15, borderBottomWidth: 8, borderBottomColor: borderCol },
  feedHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, marginBottom: 10 },
  feedAvatar: { width: 44, height: 44, borderRadius: 22 },
  feedUser: { fontSize: 16, fontWeight: 'bold' },
  feedText: { fontSize: 15, paddingHorizontal: 15, marginBottom: 10, lineHeight: 22 },
  feedMediaPlaceholder: { width: '100%', height: 350, justifyContent: 'center', alignItems: 'center' },
  feedActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 15, paddingTop: 12 },
  feedActionBtn: { flexDirection: 'row', alignItems: 'center', marginRight: 20 },

  fabContainer: { position: 'absolute', bottom: 90, right: 20, alignItems: 'center' },
  fabMini: { width: 46, height: 46, borderRadius: 23, justifyContent: 'center', alignItems: 'center', marginBottom: 12, elevation: 5, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  fabMain: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', elevation: 8, shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 5, shadowOffset: { width: 0, height: 3 } },

  // Viewer Styles
  viewerContainer: { flex: 1, backgroundColor: '#000' },
  viewerTapArea: { flex: 1 },
  viewerOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  viewerHeader: { position: 'absolute', top: Platform.OS === 'ios' ? 50 : 20, left: 0, right: 0, zIndex: 10 },
  progressBarBg: { height: 3, backgroundColor: 'rgba(255,255,255,0.3)', marginHorizontal: 10, borderRadius: 2, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#FFF' },
  viewerUserInfo: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, paddingTop: 15 },
  viewerAvatar: { width: 36, height: 36, borderRadius: 18, marginRight: 10 },
  viewerName: { color: '#FFF', fontSize: 16, fontWeight: 'bold', textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 3 },
  viewerTime: { color: 'rgba(255,255,255,0.7)', fontSize: 14, marginLeft: 10, textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 3 },
  viewerFooter: { position: 'absolute', bottom: Platform.OS === 'ios' ? 40 : 20, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, zIndex: 10 },
  viewerReplyBox: { flex: 1, height: 50, borderRadius: 25, borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)', justifyContent: 'center', paddingHorizontal: 20, backgroundColor: 'rgba(0,0,0,0.3)' },

  // Creator Styles
  creatorContainer: { flex: 1 },
  creatorHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 50 : 20, zIndex: 10 },
  creatorPills: { flexDirection: 'row' },
  pillBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginLeft: 10 },
  pillText: { color: '#FFF', fontWeight: 'bold', marginLeft: 5 },
  creatorCanvas: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1C1C1E', marginVertical: 10, borderRadius: 20, marginHorizontal: 10 },
  sidebarTools: { position: 'absolute', right: 15, top: 120, alignItems: 'center' },
  sidebarBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
  creatorFooter: { paddingBottom: Platform.OS === 'ios' ? 40 : 20, paddingTop: 10 },
  modeSelector: { flexDirection: 'row', justifyContent: 'center', marginBottom: 20 },
  bottomActions: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingHorizontal: 30 },
  galleryBtn: { width: 44, height: 44, borderRadius: 10, borderWidth: 2, borderColor: '#FFF', justifyContent: 'center', alignItems: 'center' },
  captureBtn: { width: 80, height: 80, borderRadius: 40, borderWidth: 4, borderColor: '#FFF', justifyContent: 'center', alignItems: 'center' },
  captureInner: { width: 66, height: 66, borderRadius: 33, backgroundColor: '#FFF' },
  flipBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' }
});
