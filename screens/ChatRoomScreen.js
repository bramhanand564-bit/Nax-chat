import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  memo,
} from 'react';

import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Modal,
  Dimensions,
  SafeAreaView,
  ActivityIndicator,
  Animated,
  Easing,
  Keyboard,
  Pressable,
  Share,
  Linking,
  PanResponder,
} from 'react-native';

import {
  Ionicons,
  MaterialCommunityIcons,
} from '@expo/vector-icons';

import { useTheme } from '../context/ThemeContext';

import * as ImagePicker from 'expo-image-picker';
import { Video, Audio } from 'expo-av';
import * as DocumentPicker from 'expo-document-picker';
import * as Haptics from 'expo-haptics';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import * as Location from 'expo-location';

import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  db,
  auth,
} from '../firebaseConfig';

import {
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  doc,
  updateDoc,
  setDoc,
  increment,
  limit,
  getDocs,
  where,
} from 'firebase/firestore';

const { width, height } = Dimensions.get('window');

const COLORS = {
  bg: '#050A10',
  surface: '#101A26',
  surface2: '#14202E',
  header: '#0B1824',
  bubbleMe: '#087EFF',
  bubbleOther: '#172433',
  text: '#F4F7FA',
  sub: '#8FA6B9',
  border: 'rgba(255,255,255,0.08)',
  success: '#34C759',
  danger: '#FF3B30',
  warning: '#FF9500',
  purple: '#AF52DE',
  pink: '#FF2D55',
  cyan: '#32ADE6',
  overlay: 'rgba(0,0,0,0.72)',
};

const REACTIONS = ['❤️', '😂', '👍', '😮', '😢', '🔥', '🎉'];

const formatTime = (seconds = 0) => {
  const s = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(s / 60);
  const secs = s % 60;

  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const getMessageTime = (createdAt) => {
  if (!createdAt) return '';

  try {
    const date = createdAt?.toDate
      ? createdAt.toDate()
      : new Date(createdAt);

    if (Number.isNaN(date.getTime())) return '';

    return date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
};

const getDateKey = (createdAt) => {
  if (!createdAt) return '';

  try {
    const date = createdAt?.toDate
      ? createdAt.toDate()
      : new Date(createdAt);

    return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
  } catch {
    return '';
  }
};

const getDateLabel = (createdAt) => {
  if (!createdAt) return '';

  try {
    const date = createdAt?.toDate
      ? createdAt.toDate()
      : new Date(createdAt);

    const today = new Date();

    const todayKey = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;

    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    const yesterdayKey = `${yesterday.getFullYear()}-${yesterday.getMonth()}-${yesterday.getDate()}`;

    const key = getDateKey(createdAt);

    if (key === todayKey) return 'Today';
    if (key === yesterdayKey) return 'Yesterday';

    return date.toLocaleDateString([], {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '';
  }
};

/* =========================================================
   MESSAGE COMPONENT
========================================================= */

const MessageBubble = memo(function MessageBubble({
  item,
  isMe,
  currentUserId,
  onLongPress,
  onDoubleTap,
  onMediaPress,
  onAudioPress,
  onReplyPress,
}) {
  const reactionCounts = {};

  if (item.reactions) {
    Object.values(item.reactions).forEach((reaction) => {
      reactionCounts[reaction] =
        (reactionCounts[reaction] || 0) + 1;
    });
  }

  const scale = useRef(new Animated.Value(1)).current;

  const animateMessage = () => {
    Animated.sequence([
      Animated.timing(scale, {
        toValue: 0.97,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        friction: 5,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const renderFooter = () => {
    return (
      <View style={styles.messageFooter}>
        {item.isEdited && (
          <Text style={styles.editedText}>edited</Text>
        )}

        <Text style={styles.timeText}>
          {getMessageTime(item.createdAt)}
        </Text>

        {isMe && (
          <Ionicons
            name="checkmark-done"
            size={15}
            color={
              item.read
                ? '#4FC3FF'
                : 'rgba(255,255,255,0.65)'
            }
            style={{ marginLeft: 4 }}
          />
        )}
      </View>
    );
  };

  if (item.isDeleted) {
    return (
      <View
        style={[
          styles.messageRow,
          {
            justifyContent: isMe
              ? 'flex-end'
              : 'flex-start',
          },
        ]}
      >
        <View style={styles.deletedBubble}>
          <Ionicons
            name="ban-outline"
            size={15}
            color={COLORS.sub}
          />

          <Text style={styles.deletedText}>
            This message was deleted
          </Text>
        </View>
      </View>
    );
  }

  return (
    <Animated.View
      style={[
        styles.messageRow,
        {
          justifyContent: isMe
            ? 'flex-end'
            : 'flex-start',
          transform: [{ scale }],
        },
      ]}
    >
      <TouchableOpacity
        activeOpacity={0.88}
        onPress={animateMessage}
        onLongPress={(event) =>
          onLongPress(event, item)
        }
        onPressIn={() => {}}
      >
        <View
          style={[
            styles.messageBubble,
            isMe
              ? styles.myBubble
              : styles.otherBubble,
          ]}
        >
          {!isMe && item.senderName && (
            <Text style={styles.senderName}>
              {item.senderName}
            </Text>
          )}

          {item.forwarded && (
            <View style={styles.forwardedRow}>
              <Ionicons
                name="return-up-forward-outline"
                size={14}
                color={COLORS.sub}
              />

              <Text style={styles.forwardedText}>
                Forwarded
              </Text>
            </View>
          )}

          {item.replyToId && (
            <TouchableOpacity
              style={styles.replyInside}
              onPress={() =>
                onReplyPress?.(item.replyToId)
              }
            >
              <View style={styles.replyAccent} />

              <View style={{ flex: 1 }}>
                <Text style={styles.replySender}>
                  {item.replyToSender || 'Message'}
                </Text>

                <Text
                  style={styles.replyText}
                  numberOfLines={1}
                >
                  {item.replyToText || 'Media'}
                </Text>
              </View>
            </TouchableOpacity>
          )}

          {item.type === 'text' && (
            <Text style={styles.messageText}>
              {item.text}
            </Text>
          )}

          {item.type === 'image' && (
            <TouchableOpacity
              onPress={() => onMediaPress(item)}
            >
              <Image
                source={{ uri: item.mediaUrl }}
                style={styles.mediaImage}
              />

              {item.isViewOnce && (
                <View style={styles.viewOnceOverlay}>
                  <Ionicons
                    name="eye-off-outline"
                    size={26}
                    color="#FFF"
                  />

                  <Text style={styles.viewOnceText}>
                    View once
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          )}

          {item.type === 'video' && (
            <TouchableOpacity
              onPress={() => onMediaPress(item)}
              style={styles.videoWrapper}
            >
              <Video
                source={{ uri: item.mediaUrl }}
                style={styles.mediaImage}
                resizeMode="cover"
                shouldPlay={false}
                isLooping={false}
              />

              <View style={styles.videoPlay}>
                <Ionicons
                  name="play"
                  size={28}
                  color="#FFF"
                />
              </View>
            </TouchableOpacity>
          )}

          {item.type === 'audio' && (
            <VoiceMessage
              item={item}
              isMe={isMe}
              onPlay={() => onAudioPress(item)}
            />
          )}

          {item.type === 'document' && (
            <DocumentMessage item={item} />
          )}

          {item.type === 'location' && (
            <LocationMessage item={item} />
          )}

          {item.type === 'poll' && (
            <PollMessage item={item} />
          )}

          {item.type === 'contact' && (
            <ContactMessage item={item} />
          )}

          {renderFooter()}
        </View>

        {Object.keys(reactionCounts).length > 0 && (
          <View
            style={[
              styles.reactionsBadge,
              isMe
                ? { right: 8 }
                : { left: 8 },
            ]}
          >
            {Object.entries(reactionCounts).map(
              ([emoji, count]) => (
                <Text
                  key={emoji}
                  style={styles.reactionSmall}
                >
                  {emoji}
                  {count > 1 ? ` ${count}` : ''}
                </Text>
              )
            )}
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
});

/* =========================================================
   VOICE MESSAGE
========================================================= */

function VoiceMessage({ item, isMe }) {
  const [playing, setPlaying] = useState(false);
  const soundRef = useRef(null);
  const progress = useRef(new Animated.Value(0)).current;

  const playAudio = async () => {
    try {
      if (!item.mediaUrl) return;

      if (soundRef.current) {
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }

      const { sound } =
        await Audio.Sound.createAsync(
          { uri: item.mediaUrl },
          {
            shouldPlay: true,
            progressUpdateIntervalMillis: 200,
          },
          (status) => {
            if (
              status.isLoaded &&
              status.durationMillis
            ) {
              progress.setValue(
                status.positionMillis /
                  status.durationMillis
              );
            }

            if (
              status.isLoaded &&
              status.didJustFinish
            ) {
              setPlaying(false);
              progress.setValue(0);
            }
          }
        );

      soundRef.current = sound;
      setPlaying(true);
    } catch {
      Alert.alert(
        'Audio',
        'Unable to play voice message.'
      );
    }
  };

  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, []);

  return (
    <View style={styles.voiceMessage}>
      <TouchableOpacity
        style={styles.voicePlay}
        onPress={playAudio}
      >
        <Ionicons
          name={playing ? 'pause' : 'play'}
          size={19}
          color="#FFF"
        />
      </TouchableOpacity>

      <View style={{ flex: 1 }}>
        <View style={styles.waveRow}>
          {Array.from({ length: 24 }).map(
            (_, index) => (
              <View
                key={index}
                style={[
                  styles.waveBar,
                  {
                    height:
                      5 +
                      ((index * 13) % 18),
                    opacity:
                      index / 24 <=
                      progress.__getValue?.()
                        ? 1
                        : 0.45,
                  },
                ]}
              />
            )
          )}
        </View>

        <Text
          style={[
            styles.voiceDuration,
            isMe && { color: 'rgba(255,255,255,.75)' },
          ]}
        >
          Voice message
        </Text>
      </View>

      <Text style={styles.voiceSpeed}>1x</Text>
    </View>
  );
}

/* =========================================================
   DOCUMENT
========================================================= */

function DocumentMessage({ item }) {
  const openDocument = async () => {
    if (!item.mediaUrl) return;

    try {
      await Linking.openURL(item.mediaUrl);
    } catch {
      Alert.alert(
        'File',
        'Unable to open this file.'
      );
    }
  };

  return (
    <TouchableOpacity
      style={styles.documentCard}
      onPress={openDocument}
    >
      <View style={styles.documentIcon}>
        <Ionicons
          name="document-text"
          size={27}
          color="#FFF"
        />
      </View>

      <View style={{ flex: 1 }}>
        <Text
          style={styles.documentName}
          numberOfLines={1}
        >
          {item.fileName || 'Document'}
        </Text>

        <Text style={styles.documentSize}>
          {item.fileSize || 'File'}
        </Text>
      </View>

      <Ionicons
        name="download-outline"
        size={22}
        color={COLORS.sub}
      />
    </TouchableOpacity>
  );
}

/* =========================================================
   LOCATION
========================================================= */

function LocationMessage({ item }) {
  const openLocation = () => {
    const lat = item.latitude;
    const lng = item.longitude;

    if (!lat || !lng) return;

    const url = Platform.select({
      ios: `maps:${lat},${lng}`,
      android: `geo:${lat},${lng}?q=${lat},${lng}`,
    });

    Linking.openURL(url).catch(() => {});
  };

  return (
    <TouchableOpacity
      style={styles.locationCard}
      onPress={openLocation}
    >
      <View style={styles.locationIcon}>
        <Ionicons
          name="location"
          size={28}
          color="#FFF"
        />
      </View>

      <View style={{ flex: 1 }}>
        <Text style={styles.locationTitle}>
          Location
        </Text>

        <Text style={styles.locationText}>
          {item.latitude?.toFixed?.(5)},{' '}
          {item.longitude?.toFixed?.(5)}
        </Text>
      </View>

      <Ionicons
        name="open-outline"
        size={20}
        color={COLORS.sub}
      />
    </TouchableOpacity>
  );
}

/* =========================================================
   CONTACT
========================================================= */

function ContactMessage({ item }) {
  return (
    <View style={styles.contactCard}>
      <View style={styles.contactAvatar}>
        <Ionicons
          name="person"
          size={24}
          color="#FFF"
        />
      </View>

      <View style={{ flex: 1 }}>
        <Text style={styles.contactName}>
          {item.contactName || 'Contact'}
        </Text>

        <Text style={styles.contactPhone}>
          {item.contactPhone || ''}
        </Text>
      </View>
    </View>
  );
}

/* =========================================================
   POLL
========================================================= */

function PollMessage({ item }) {
  const options = item.options || [];

  return (
    <View style={styles.pollCard}>
      <Text style={styles.pollTitle}>
        📊 {item.question || 'Poll'}
      </Text>

      {options.map((option, index) => {
        const votes =
          item.votes?.[index] || 0;

        const total =
          Object.values(item.votes || {}).reduce(
            (sum, value) =>
              sum + Number(value || 0),
            0
          );

        const percentage =
          total > 0
            ? Math.round((votes / total) * 100)
            : 0;

        return (
          <View
            key={`${option}-${index}`}
            style={styles.pollOption}
          >
            <View
              style={[
                styles.pollProgress,
                {
                  width: `${percentage}%`,
                },
              ]}
            />

            <Text style={styles.pollOptionText}>
              {option}
            </Text>

            <Text style={styles.pollPercent}>
              {percentage}%
            </Text>
          </View>
        );
      })}
    </View>
  );
}

/* =========================================================
   MAIN SCREEN
========================================================= */

export default function ChatRoomScreen({
  route,
  navigation,
}) {
  useTheme();

  const chatId =
    route.params?.chatId || 'global_chats';

  const chatTitle =
    route.params?.chatName || 'Global Room';

  const friendId =
    route.params?.friendId || null;

  const currentUser = auth.currentUser;

  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [myUniqueId, setMyUniqueId] =
    useState('');

  const [loading, setLoading] = useState(true);

  const [replyTo, setReplyTo] =
    useState(null);

  const [editMsgId, setEditMsgId] =
    useState(null);

  const [contextMenu, setContextMenu] =
    useState({
      visible: false,
      msg: null,
      yPos: 0,
    });

  const [showAttachments, setShowAttachments] =
    useState(false);

  const [showMoreMenu, setShowMoreMenu] =
    useState(false);

  const [fullScreenMedia, setFullScreenMedia] =
    useState(null);

  const [searchVisible, setSearchVisible] =
    useState(false);

  const [searchText, setSearchText] =
    useState('');

  const [showPoll, setShowPoll] =
    useState(false);

  const [showLocation, setShowLocation] =
    useState(false);

  const [uploadText, setUploadText] =
    useState('');

  const [recording, setRecording] =
    useState(null);

  const [recordingSeconds, setRecordingSeconds] =
    useState(0);

  const [online, setOnline] =
    useState(true);

  const [typing, setTyping] =
    useState(false);

  const [newMessageCount, setNewMessageCount] =
    useState(0);

  const [isAtBottom, setIsAtBottom] =
    useState(true);

  const [showEmoji, setShowEmoji] =
    useState(false);

  const [pollQuestion, setPollQuestion] =
    useState('');

  const [pollOptions, setPollOptions] =
    useState(['', '']);

  const [locationLoading, setLocationLoading] =
    useState(false);

  const flatListRef = useRef(null);

  const sendScale =
    useRef(new Animated.Value(1)).current;

  const attachAnim =
    useRef(new Animated.Value(height)).current;

  const headerAnim =
    useRef(new Animated.Value(0)).current;

  const recordingTimer =
    useRef(null);

  /* =====================================================
     INITIAL
  ===================================================== */

  useEffect(() => {
    AsyncStorage.getItem(
      'nax_unique_id'
    ).then((id) => {
      if (id) setMyUniqueId(id);
    });
  }, []);

  /* =====================================================
     HEADER ANIMATION
  ===================================================== */

  useEffect(() => {
    Animated.timing(headerAnim, {
      toValue: 1,
      duration: 450,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, []);

  /* =====================================================
     FIRESTORE LISTENER
  ===================================================== */

  useEffect(() => {
    setLoading(true);

    const collectionPath =
      chatId === 'global_chats'
        ? 'global_chats'
        : `chats/${chatId}/messages`;

    const q = query(
      collection(db, collectionPath),
      orderBy('createdAt', 'desc'),
      limit(150)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const msgs = snapshot.docs.map(
          (item) => ({
            id: item.id,
            ...item.data(),
          })
        );

        setMessages(msgs);
        setLoading(false);
      },
      () => {
        setLoading(false);
        Alert.alert(
          'Connection',
          'Unable to load messages.'
        );
      }
    );

    return () => unsubscribe();
  }, [chatId]);

  /* =====================================================
     RECORDING TIMER
  ===================================================== */

  useEffect(() => {
    if (!recording) {
      if (recordingTimer.current) {
        clearInterval(recordingTimer.current);
      }

      return;
    }

    recordingTimer.current =
      setInterval(() => {
        setRecordingSeconds(
          (seconds) => seconds + 1
        );
      }, 1000);

    return () => {
      if (recordingTimer.current) {
        clearInterval(
          recordingTimer.current
        );
      }
    };
  }, [recording]);

  /* =====================================================
     METADATA
  ===================================================== */

  const updateChatMetadata = async (
    lastMessage,
    type = 'text'
  ) => {
    if (
      chatId === 'global_chats' ||
      !friendId ||
      !currentUser
    ) {
      return;
    }

    try {
      const time = serverTimestamp();

      const myRef = doc(
        db,
        `users/${currentUser.uid}/user_chats`,
        chatId
      );

      const friendRef = doc(
        db,
        `users/${friendId}/user_chats`,
        chatId
      );

      const base = {
        chatId,
        lastMessage,
        lastMessageType: type,
        lastMessageTime: time,
        updatedAt: time,
      };

      await setDoc(
        myRef,
        {
          ...base,
          friendId,
          friendName: chatTitle,
        },
        { merge: true }
      );

      await setDoc(
        friendRef,
        {
          ...base,
          friendId: currentUser.uid,
          friendName:
            currentUser.displayName ||
            'User',
          unreadCount: increment(1),
        },
        { merge: true }
      );
    } catch (error) {
      console.log(
        'Metadata error:',
        error
      );
    }
  };

  /* =====================================================
     SEND ANIMATION
  ===================================================== */

  const animateSend = () => {
    Animated.sequence([
      Animated.timing(sendScale, {
        toValue: 0.82,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.spring(sendScale, {
        toValue: 1,
        friction: 4,
        tension: 100,
        useNativeDriver: true,
      }),
    ]).start();

    Haptics.impactAsync(
      Haptics.ImpactFeedbackStyle.Medium
    );
  };

  /* =====================================================
     SEND MESSAGE
  ===================================================== */

  const sendMessage = async () => {
    const text = inputText.trim();

    if (!text) return;

    animateSend();

    setInputText('');

    try {
      const collectionPath =
        chatId === 'global_chats'
          ? 'global_chats'
          : `chats/${chatId}/messages`;

      if (editMsgId) {
        await updateDoc(
          doc(
            db,
            collectionPath,
            editMsgId
          ),
          {
            text,
            isEdited: true,
            updatedAt:
              serverTimestamp(),
          }
        );

        setEditMsgId(null);

        return;
      }

      const message = {
        text,
        type: 'text',
        senderName:
          currentUser?.displayName ||
          'User',
        senderUniqueId:
          myUniqueId || '@user',
        senderId:
          currentUser?.uid || null,
        createdAt:
          serverTimestamp(),
        read: false,
        delivered: true,
        ...(replyTo && {
          replyToId: replyTo.id,
          replyToText:
            replyTo.text ||
            'Media',
          replyToSender:
            replyTo.senderName ||
            'User',
        }),
      };

      await addDoc(
        collection(db, collectionPath),
        message
      );

      await updateChatMetadata(
        text,
        'text'
      );

      setReplyTo(null);

      Haptics.notificationAsync(
        Haptics.NotificationFeedbackType
          .Success
      );
    } catch (error) {
      setInputText(text);

      Alert.alert(
        'Message Failed',
        'Could not send message.'
      );

      Haptics.notificationAsync(
        Haptics.NotificationFeedbackType
          .Error
      );
    }
  };

  /* =====================================================
     MEDIA UPLOAD
  ===================================================== */

  const uploadToCloud = async (
    file,
    messageType
  ) => {
    closeAttachmentMenu();

    setUploadText(
      'Sending media...'
    );

    try {
      const formData = new FormData();

      const extension =
        messageType === 'video'
          ? 'mp4'
          : messageType === 'audio'
          ? 'm4a'
          : 'jpg';

      formData.append('file', {
        uri:
          Platform.OS === 'android'
            ? file.uri
            : file.uri.replace(
                'file://',
                ''
              ),
        name:
          file.fileName ||
          `nax_${Date.now()}.${extension}`,
        type:
          file.mimeType ||
          (messageType === 'video'
            ? 'video/mp4'
            : messageType === 'audio'
            ? 'audio/mp4'
            : 'image/jpeg'),
      });

      /*
       IMPORTANT:
       Replace this temporary uploader with
       Firebase Storage before production.
      */

      const response = await fetch(
        'https://tmpfiles.org/api/v1/upload',
        {
          method: 'POST',
          body: formData,
          headers: {
            'Content-Type':
              'multipart/form-data',
          },
        }
      );

      const json =
        await response.json();

      if (
        json.status !== 'success'
      ) {
        throw new Error(
          'Upload failed'
        );
      }

      const directUrl =
        json.data.url.replace(
          'tmpfiles.org/',
          'tmpfiles.org/dl/'
        );

      const collectionPath =
        chatId === 'global_chats'
          ? 'global_chats'
          : `chats/${chatId}/messages`;

      const data = {
        mediaUrl: directUrl,
        fileName:
          file.fileName ||
          'Media',
        fileSize: file.size
          ? `${(
              file.size /
              1048576
            ).toFixed(2)} MB`
          : 'Media',
        senderName:
          currentUser?.displayName ||
          'User',
        senderUniqueId:
          myUniqueId || '@user',
        senderId:
          currentUser?.uid || null,
        type: messageType,
        createdAt:
          serverTimestamp(),
        read: false,
        ...(replyTo && {
          replyToId: replyTo.id,
          replyToText: 'Media',
          replyToSender:
            replyTo.senderName,
        }),
      };

      await addDoc(
        collection(db, collectionPath),
        data
      );

      await updateChatMetadata(
        messageType === 'video'
          ? '🎥 Video'
          : messageType === 'audio'
          ? '🎤 Voice message'
          : messageType === 'document'
          ? '📄 Document'
          : '📷 Photo',
        messageType
      );

      setReplyTo(null);

      Haptics.notificationAsync(
        Haptics.NotificationFeedbackType
          .Success
      );
    } catch (error) {
      Alert.alert(
        'Upload Failed',
        'Unable to upload media.'
      );
    }

    setUploadText('');
  };

  /* =====================================================
     GALLERY
  ===================================================== */

  const pickGallery = async () => {
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          'Permission',
          'Gallery permission is required.'
        );
        return;
      }

      const result =
        await ImagePicker.launchImageLibraryAsync(
          {
            mediaTypes:
              ImagePicker.MediaTypeOptions.All,
            allowsMultipleSelection: false,
            quality: 0.75,
          }
        );

      if (
        !result.canceled &&
        result.assets?.[0]
      ) {
        const asset =
          result.assets[0];

        const type =
          asset.type === 'video'
            ? 'video'
            : 'image';

        await uploadToCloud(
          asset,
          type
        );
      }
    } catch {
      Alert.alert(
        'Gallery',
        'Unable to open gallery.'
      );
    }
  };

  /* =====================================================
     CAMERA
  ===================================================== */

  const openCamera = async () => {
    try {
      const permission =
        await ImagePicker.requestCameraPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          'Permission',
          'Camera permission is required.'
        );
        return;
      }

      const result =
        await ImagePicker.launchCameraAsync(
          {
            mediaTypes:
              ImagePicker.MediaTypeOptions.All,
            quality: 0.8,
            videoMaxDuration: 60,
          }
        );

      if (
        !result.canceled &&
        result.assets?.[0]
      ) {
        const asset =
          result.assets[0];

        const type =
          asset.type === 'video'
            ? 'video'
            : 'image';

        await uploadToCloud(
          asset,
          type
        );
      }
    } catch {
      Alert.alert(
        'Camera',
        'Unable to open camera.'
      );
    }
  };

  /* =====================================================
     DOCUMENT
  ===================================================== */

  const pickDocument = async () => {
    try {
      const result =
        await DocumentPicker.getDocumentAsync(
          {
            type: '*/*',
            copyToCacheDirectory: true,
          }
        );

      if (
        !result.canceled &&
        result.assets?.[0]
      ) {
        await uploadToCloud(
          result.assets[0],
          'document'
        );
      }
    } catch {
      Alert.alert(
        'Document',
        'Unable to select document.'
      );
    }
  };

  /* =====================================================
     VOICE RECORDING
  ===================================================== */

  const startRecording = async () => {
    try {
      const permission =
        await Audio.requestPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          'Microphone',
          'Microphone permission is required.'
        );
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const {
        recording,
      } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets
          .HIGH_QUALITY
      );

      setRecording(recording);
      setRecordingSeconds(0);

      Haptics.impactAsync(
        Haptics.ImpactFeedbackStyle.Heavy
      );
    } catch (error) {
      Alert.alert(
        'Voice',
        'Could not start recording.'
      );
    }
  };

  const stopRecording = async (
    shouldSend = true
  ) => {
    try {
      if (!recording) return;

      await recording.stopAndUnloadAsync();

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });

      const uri =
        recording.getURI();

      const duration =
        recordingSeconds;

      setRecording(null);
      setRecordingSeconds(0);

      if (!uri || !shouldSend) {
        return;
      }

      await uploadToCloud(
        {
          uri,
          fileName: `voice_${Date.now()}.m4a`,
          mimeType: 'audio/m4a',
          size: 0,
        },
        'audio'
      );
    } catch {
      setRecording(null);
      setRecordingSeconds(0);

      Alert.alert(
        'Voice',
        'Recording failed.'
      );
    }
  };

  /* =====================================================
     LOCATION
  ===================================================== */

  const sendLocation = async () => {
    try {
      setLocationLoading(true);
      closeAttachmentMenu();

      const permission =
        await Location.requestForegroundPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          'Location',
          'Location permission is required.'
        );
        return;
      }

      const location =
        await Location.getCurrentPositionAsync(
          {
            accuracy:
              Location.Accuracy.Balanced,
          }
        );

      const {
        latitude,
        longitude,
      } = location.coords;

      const collectionPath =
        chatId === 'global_chats'
          ? 'global_chats'
          : `chats/${chatId}/messages`;

      await addDoc(
        collection(db, collectionPath),
        {
          type: 'location',
          latitude,
          longitude,
          senderId:
            currentUser?.uid || null,
          senderName:
            currentUser?.displayName ||
            'User',
          senderUniqueId:
            myUniqueId || '@user',
          createdAt:
            serverTimestamp(),
        }
      );

      await updateChatMetadata(
        '📍 Location',
        'location'
      );
    } catch {
      Alert.alert(
        'Location',
        'Unable to get location.'
      );
    } finally {
      setLocationLoading(false);
    }
  };

  /* =====================================================
     POLL
  ===================================================== */

  const createPoll = async () => {
    const question =
      pollQuestion.trim();

    const options =
      pollOptions
        .map((x) => x.trim())
        .filter(Boolean);

    if (!question) {
      Alert.alert(
        'Poll',
        'Enter a question.'
      );
      return;
    }

    if (options.length < 2) {
      Alert.alert(
        'Poll',
        'Add at least two options.'
      );
      return;
    }

    try {
      const collectionPath =
        chatId === 'global_chats'
          ? 'global_chats'
          : `chats/${chatId}/messages`;

      await addDoc(
        collection(db, collectionPath),
        {
          type: 'poll',
          question,
          options,
          votes: {},
          senderId:
            currentUser?.uid || null,
          senderName:
            currentUser?.displayName ||
            'User',
          createdAt:
            serverTimestamp(),
        }
      );

      await updateChatMetadata(
        `📊 ${question}`,
        'poll'
      );

      setPollQuestion('');
      setPollOptions(['', '']);
      setShowPoll(false);
    } catch {
      Alert.alert(
        'Poll',
        'Could not create poll.'
      );
    }
  };

  /* =====================================================
     REACTION
  ===================================================== */

  const handleReaction = async (
    emoji
  ) => {
    const message =
      contextMenu.msg;

    if (!message || !currentUser) {
      return;
    }

    try {
      const collectionPath =
        chatId === 'global_chats'
          ? 'global_chats'
          : `chats/${chatId}/messages`;

      const messageRef = doc(
        db,
        collectionPath,
        message.id
      );

      const reactions =
        message.reactions || {};

      const copy = {
        ...reactions,
      };

      if (
        copy[currentUser.uid] ===
        emoji
      ) {
        delete copy[currentUser.uid];
      } else {
        copy[currentUser.uid] =
          emoji;
      }

      await updateDoc(
        messageRef,
        {
          reactions: copy,
        }
      );

      setContextMenu({
        visible: false,
        msg: null,
        yPos: 0,
      });

      Haptics.impactAsync(
        Haptics.ImpactFeedbackStyle.Light
      );
    } catch {}
  };

  /* =====================================================
     DOUBLE TAP HEART
  ===================================================== */

  const doubleTapReaction = async (
    message
  ) => {
    if (!currentUser) return;

    try {
      const collectionPath =
        chatId === 'global_chats'
          ? 'global_chats'
          : `chats/${chatId}/messages`;

      const ref = doc(
        db,
        collectionPath,
        message.id
      );

      const reactions =
        message.reactions || {};

      await updateDoc(
        ref,
        {
          reactions: {
            ...reactions,
            [currentUser.uid]:
              '❤️',
          },
        }
      );

      Haptics.impactAsync(
        Haptics.ImpactFeedbackStyle.Light
      );
    } catch {}
  };

  /* =====================================================
     CONTEXT MENU
  ===================================================== */

  const openContextMenu = (
    event,
    message
  ) => {
    Keyboard.dismiss();

    const y =
      event.nativeEvent.pageY;

    setContextMenu({
      visible: true,
      msg: message,
      yPos: y,
    });

    Haptics.impactAsync(
      Haptics.ImpactFeedbackStyle.Heavy
    );
  };

  /* =====================================================
     MESSAGE ACTION
  ===================================================== */

  const messageAction = async (
    action
  ) => {
    const message =
      contextMenu.msg;

    if (!message) return;

    setContextMenu({
      visible: false,
      msg: null,
      yPos: 0,
    });

    if (action === 'reply') {
      setReplyTo(message);
      return;
    }

    if (action === 'edit') {
      setEditMsgId(message.id);
      setInputText(
        message.text || ''
      );
      return;
    }

    if (action === 'save') {
      try {
        const path =
          chatId === 'global_chats'
            ? 'global_chats'
            : `chats/${chatId}/messages`;

        await updateDoc(
          doc(
            db,
            path,
            message.id
          ),
          {
            savedBy: {
              ...(message.savedBy ||
                {}),
              [currentUser.uid]:
                true,
            },
          }
        );
      } catch {}
      return;
    }

    if (action === 'pin') {
      try {
        const path =
          chatId === 'global_chats'
            ? 'global_chats'
            : `chats/${chatId}/messages`;

        await updateDoc(
          doc(
            db,
            path,
            message.id
          ),
          {
            isPinned: true,
          }
        );

        Alert.alert(
          'Pinned',
          'Message pinned.'
        );
      } catch {}
      return;
    }

    if (action === 'delete') {
      Alert.alert(
        'Delete Message',
        'Delete this message?',
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Delete',
            style: 'destructive',
            onPress:
              async () => {
                try {
                  const path =
                    chatId ===
                    'global_chats'
                      ? 'global_chats'
                      : `chats/${chatId}/messages`;

                  await updateDoc(
                    doc(
                      db,
                      path,
                      message.id
                    ),
                    {
                      isDeleted:
                        true,
                      text: '',
                      mediaUrl:
                        null,
                    }
                  );
                } catch {}
              },
          },
        ]
      );
    }

    if (action === 'share') {
      try {
        await Share.share({
          message:
            message.text ||
            message.mediaUrl ||
            'Nax Chat message',
        });
      } catch {}
    }
  };

  /* =====================================================
     COPY
  ===================================================== */

  const copyMessage = async () => {
    const message =
      contextMenu.msg;

    setContextMenu({
      visible: false,
      msg: null,
      yPos: 0,
    });

    if (!message?.text) return;

    /*
      Native clipboard package is intentionally not
      required here. Share menu provides a safe
      cross-platform fallback with current dependencies.
    */

    try {
      await Share.share({
        message: message.text,
      });
    } catch {}
  };

  /* =====================================================
     ATTACHMENT SHEET
  ===================================================== */

  const openAttachmentMenu = () => {
    Keyboard.dismiss();

    setShowAttachments(true);

    Animated.spring(
      attachAnim,
      {
        toValue: 0,
        friction: 7,
        tension: 80,
        useNativeDriver: true,
      }
    ).start();

    Haptics.selectionAsync();
  };

  const closeAttachmentMenu = () => {
    Animated.timing(
      attachAnim,
      {
        toValue: height,
        duration: 230,
        easing:
          Easing.out(Easing.ease),
        useNativeDriver: true,
      }
    ).start(() => {
      setShowAttachments(false);
    });
  };

  /* =====================================================
     SEARCH
  ===================================================== */

  const filteredMessages =
    searchText.trim()
      ? messages.filter(
          (message) =>
            message.text
              ?.toLowerCase()
              .includes(
                searchText
                  .toLowerCase()
              )
        )
      : messages;

  /* =====================================================
     MEDIA VIEWER
  ===================================================== */

  const openMedia = (message) => {
    setFullScreenMedia({
      uri: message.mediaUrl,
      type: message.type,
    });
  };

  /* =====================================================
     SCROLL
  ===================================================== */

  const scrollToBottom = () => {
    flatListRef.current?.scrollToOffset(
      {
        offset: 0,
        animated: true,
      }
    );

    setNewMessageCount(0);
    setIsAtBottom(true);
  };

  /* =====================================================
     MESSAGE REPLY JUMP
  ===================================================== */

  const jumpToReply = (id) => {
    const index =
      messages.findIndex(
        (message) =>
          message.id === id
      );

    if (index < 0) return;

    flatListRef.current?.scrollToIndex(
      {
        index,
        animated: true,
      }
    );
  };

  /* =====================================================
     MESSAGE RENDER
  ===================================================== */

  const renderMessage = ({
    item,
    index,
  }) => {
    const isMe =
      item.senderId ===
      currentUser?.uid;

    const previous =
      messages[index + 1];

    const showDate =
      !previous ||
      getDateKey(
        item.createdAt
      ) !==
        getDateKey(
          previous.createdAt
        );

    return (
      <View>
        {showDate && (
          <View style={styles.dateDivider}>
            <Text style={styles.dateText}>
              {getDateLabel(
                item.createdAt
              )}
            </Text>
          </View>
        )}

        <MessageBubble
          item={item}
          isMe={isMe}
          currentUserId={
            currentUser?.uid
          }
          onLongPress={
            openContextMenu
          }
          onDoubleTap={
            doubleTapReaction
          }
          onMediaPress={
            openMedia
          }
          onAudioPress={() => {}}
          onReplyPress={
            jumpToReply
          }
        />
      </View>
    );
  };

  /* =====================================================
     HEADER
  ===================================================== */

  const headerTranslate =
    headerAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [-15, 0],
    });

  /* =====================================================
     RECORDING UI
  ===================================================== */

  if (recording) {
    return (
      <SafeAreaView
        style={styles.container}
      >
        <View style={styles.recordingScreen}>
          <View style={styles.recordingOrb}>
            <Ionicons
              name="mic"
              size={42}
              color="#FFF"
            />
          </View>

          <Text style={styles.recordingTitle}>
            Recording voice message
          </Text>

          <Text style={styles.recordingTimer}>
            {formatTime(
              recordingSeconds
            )}
          </Text>

          <View style={styles.recordingWave}>
            {Array.from({
              length: 30,
            }).map((_, index) => (
              <View
                key={index}
                style={[
                  styles.recordingBar,
                  {
                    height:
                      8 +
                      ((index * 17) %
                        42),
                  },
                ]}
              />
            ))}
          </View>

          <View style={styles.recordingActions}>
            <TouchableOpacity
              style={[
                styles.recordingAction,
                {
                  backgroundColor:
                    'rgba(255,59,48,.15)',
                },
              ]}
              onPress={() =>
                stopRecording(false)
              }
            >
              <Ionicons
                name="trash"
                size={25}
                color={COLORS.danger}
              />

              <Text style={styles.recordingActionText}>
                Cancel
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.recordingAction,
                {
                  backgroundColor:
                    COLORS.bubbleMe,
                },
              ]}
              onPress={() =>
                stopRecording(true)
              }
            >
              <Ionicons
                name="send"
                size={25}
                color="#FFF"
              />

              <Text style={styles.recordingActionText}>
                Send
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={styles.container}
    >
      {/* HEADER */}

      <Animated.View
        style={[
          styles.header,
          {
            transform: [
              {
                translateY:
                  headerTranslate,
              },
            ],
            opacity: headerAnim,
          },
        ]}
      >
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() =>
            navigation.goBack()
          }
        >
          <Ionicons
            name="chevron-back"
            size={28}
            color={COLORS.text}
          />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {}}
        >
          <Image
            source={{
              uri: `https://ui-avatars.com/api/?name=${encodeURIComponent(
                chatTitle
              )}&background=087EFF&color=fff`,
            }}
            style={styles.avatar}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.headerInfo}
          onPress={() => {}}
        >
          <Text
            style={styles.headerTitle}
            numberOfLines={1}
          >
            {chatTitle}
          </Text>

          <View style={styles.statusRow}>
            <View
              style={[
                styles.onlineDot,
                {
                  backgroundColor:
                    online
                      ? COLORS.success
                      : COLORS.sub,
                },
              ]}
            />

            <Text
              style={styles.headerStatus}
            >
              {typing
                ? 'typing...'
                : online
                ? 'online'
                : 'last seen recently'}
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.headerButton}
          onPress={() =>
            navigation.navigate(
              'Call',
              {
                friendId,
                chatId,
                callType: 'voice',
              }
            )
          }
        >
          <Ionicons
            name="call-outline"
            size={23}
            color={COLORS.text}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.headerButton}
          onPress={() =>
            navigation.navigate(
              'Call',
              {
                friendId,
                chatId,
                callType: 'video',
              }
            )
          }
        >
          <Ionicons
            name="videocam-outline"
            size={25}
            color={COLORS.text}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.headerButton}
          onPress={() =>
            setShowMoreMenu(true)
          }
        >
          <Ionicons
            name="ellipsis-vertical"
            size={23}
            color={COLORS.text}
          />
        </TouchableOpacity>
      </Animated.View>

      {/* SEARCH */}

      {searchVisible && (
        <View style={styles.searchBar}>
          <Ionicons
            name="search"
            size={20}
            color={COLORS.sub}
          />

          <TextInput
            style={styles.searchInput}
            placeholder="Search in chat..."
            placeholderTextColor={
              COLORS.sub
            }
            value={searchText}
            onChangeText={
              setSearchText
            }
            autoFocus
          />

          <TouchableOpacity
            onPress={() => {
              setSearchVisible(
                false
              );
              setSearchText('');
            }}
          >
            <Ionicons
              name="close-circle"
              size={21}
              color={COLORS.sub}
            />
          </TouchableOpacity>
        </View>
      )}

      {/* UPLOAD */}

      {uploadText ? (
        <View style={styles.uploadBanner}>
          <ActivityIndicator
            size="small"
            color="#FFF"
          />

          <Text
            style={
              styles.uploadBannerText
            }
          >
            {uploadText}
          </Text>
        </View>
      ) : null}

      {/* MESSAGES */}

      {loading ? (
        <View style={styles.loadingArea}>
          {Array.from({
            length: 5,
          }).map((_, index) => (
            <View
              key={index}
              style={[
                styles.skeleton,
                {
                  alignSelf:
                    index % 2 === 0
                      ? 'flex-start'
                      : 'flex-end',
                  width:
                    100 +
                    ((index * 43) %
                      140),
                },
              ]}
            />
          ))}
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={
            searchText
              ? filteredMessages
              : messages
          }
          keyExtractor={(item) =>
            item.id
          }
          renderItem={
            renderMessage
          }
          inverted
          contentContainerStyle={
            styles.messageList
          }
          showsVerticalScrollIndicator={
            false
          }
          onScroll={(event) => {
            const y =
              event.nativeEvent
                .contentOffset
                .y;

            const bottom =
              y < 80;

            setIsAtBottom(bottom);
          }}
          scrollEventThrottle={16}
          ListEmptyComponent={
            <View
              style={
                styles.emptyState
              }
            >
              <View
                style={
                  styles.emptyIcon
                }
              >
                <Ionicons
                  name="chatbubbles-outline"
                  size={42}
                  color={COLORS.cyan}
                />
              </View>

              <Text
                style={
                  styles.emptyTitle
                }
              >
                Start the conversation
              </Text>

              <Text
                style={
                  styles.emptyText
                }
              >
                Send a message, photo,
                voice note or anything
                you like.
              </Text>
            </View>
          }
        />
      )}

      {/* NEW MESSAGE BUTTON */}

      {!isAtBottom && (
        <TouchableOpacity
          style={
            styles.newMessageButton
          }
          onPress={
            scrollToBottom
          }
        >
          <Ionicons
            name="arrow-down"
            size={18}
            color="#FFF"
          />

          {newMessageCount >
            0 && (
            <Text
              style={
                styles.newMessageText
              }
            >
              {newMessageCount}
            </Text>
          )}
        </TouchableOpacity>
      )}

      {/* REPLY BAR */}

      {(replyTo || editMsgId) && (
        <View
          style={styles.replyBar}
        >
          <View
            style={
              styles.replyBarAccent
            }
          />

          <View
            style={{
              flex: 1,
              marginLeft: 10,
            }}
          >
            <Text
              style={
                styles.replyBarTitle
              }
            >
              {editMsgId
                ? 'Edit Message'
                : `Replying to ${
                    replyTo?.senderName ||
                    'User'
                  }`}
            </Text>

            <Text
              style={
                styles.replyBarText
              }
              numberOfLines={1}
            >
              {editMsgId
                ? inputText
                : replyTo?.text ||
                  'Media'}
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => {
              setReplyTo(null);
              setEditMsgId(null);
              setInputText('');
            }}
          >
            <Ionicons
              name="close-circle"
              size={25}
              color={COLORS.sub}
            />
          </TouchableOpacity>
        </View>
      )}

      {/* COMPOSER */}

      <KeyboardAvoidingView
        behavior={
          Platform.OS === 'ios'
            ? 'padding'
            : undefined
        }
      >
        <View
          style={styles.composer}
        >
          <TouchableOpacity
            style={styles.composerButton}
            onPress={
              openAttachmentMenu
            }
          >
            <Ionicons
              name="add-circle-outline"
              size={29}
              color={COLORS.sub}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.composerButton}
            onPress={() =>
              setShowEmoji(
                !showEmoji
              )
            }
          >
            <Ionicons
              name="happy-outline"
              size={25}
              color={COLORS.sub}
            />
          </TouchableOpacity>

          <View
            style={styles.inputContainer}
          >
            <TextInput
              style={styles.input}
              placeholder="Message..."
              placeholderTextColor={
                COLORS.sub
              }
              multiline
              value={inputText}
              onChangeText={(text) => {
                setInputText(text);
                setTyping(
                  text.length > 0
                );
              }}
              maxLength={4000}
            />
          </View>

          {inputText.trim().length >
          0 ? (
            <Animated.View
              style={{
                transform: [
                  {
                    scale: sendScale,
                  },
                ],
              }}
            >
              <TouchableOpacity
                style={
                  styles.sendButton
                }
                onPress={
                  sendMessage
                }
              >
                <Ionicons
                  name="send"
                  size={18}
                  color="#FFF"
                />
              </TouchableOpacity>
            </Animated.View>
          ) : (
            <TouchableOpacity
              style={
                styles.sendButton
              }
              onPress={
                startRecording
              }
            >
              <Ionicons
                name="mic"
                size={21}
                color="#FFF"
              />
            </TouchableOpacity>
          )}
        </View>

        {/* EMOJI BAR */}

        {showEmoji && (
          <View
            style={
              styles.emojiPanel
            }
          >
            {[
              '😀',
              '😂',
              '😍',
              '🥰',
              '😎',
              '😭',
              '😡',
              '👍',
              '❤️',
              '🔥',
              '🎉',
              '🙏',
              '💯',
              '✨',
              '🤣',
              '😮',
            ].map((emoji) => (
              <TouchableOpacity
                key={emoji}
                onPress={() =>
                  setInputText(
                    (text) =>
                      text + emoji
                  )
                }
              >
                <Text
                  style={
                    styles.emojiItem
                  }
                >
                  {emoji}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </KeyboardAvoidingView>

      {/* ATTACHMENT SHEET */}

      {showAttachments && (
        <View
          style={styles.overlay}
        >
          <TouchableOpacity
            style={{ flex: 1 }}
            onPress={
              closeAttachmentMenu
            }
          />

          <Animated.View
            style={[
              styles.attachmentSheet,
              {
                transform: [
                  {
                    translateY:
                      attachAnim,
                  },
                ],
              },
            ]}
          >
            <View
              style={
                styles.sheetHandle
              }
            />

            <Text
              style={
                styles.sheetTitle
              }
            >
              Share Content
            </Text>

            <View
              style={
                styles.attachGrid
              }
            >
              <AttachmentItem
                icon="camera"
                label="Camera"
                color="#FF3B30"
                onPress={
                  openCamera
                }
              />

              <AttachmentItem
                icon="image"
                label="Gallery"
                color="#34C759"
                onPress={
                  pickGallery
                }
              />

              <AttachmentItem
                icon="document"
                label="Document"
                color="#007AFF"
                onPress={
                  pickDocument
                }
              />

              <AttachmentItem
                icon="location"
                label="Location"
                color="#FF9500"
                onPress={
                  sendLocation
                }
              />

              <AttachmentItem
                icon="stats-chart"
                label="Poll"
                color="#AF52DE"
                onPress={() => {
                  closeAttachmentMenu();
                  setShowPoll(true);
                }}
              />

              <AttachmentItem
                icon="person"
                label="Contact"
                color="#32ADE6"
                onPress={() => {
                  closeAttachmentMenu();
                  Alert.alert(
                    'Contact',
                    'Contact picker can be connected with expo-contacts.'
                  );
                }}
              />
            </View>
          </Animated.View>
        </View>
      )}

      {/* CONTEXT MENU */}

      <Modal
        visible={
          contextMenu.visible
        }
        transparent
        animationType="fade"
        onRequestClose={() =>
          setContextMenu({
            visible: false,
            msg: null,
            yPos: 0,
          })
        }
      >
        <Pressable
          style={styles.overlay}
          onPress={() =>
            setContextMenu({
              visible: false,
              msg: null,
              yPos: 0,
            })
          }
        >
          <View
            style={[
              styles.contextMenu,
              {
                top: Math.min(
                  Math.max(
                    contextMenu.yPos -
                      70,
                    80
                  ),
                  height - 450
                ),
              },
            ]}
          >
            <View
              style={
                styles.reactionBar
              }
            >
              {REACTIONS.map(
                (emoji) => (
                  <TouchableOpacity
                    key={emoji}
                    onPress={() =>
                      handleReaction(
                        emoji
                      )
                    }
                  >
                    <Text
                      style={
                        styles.reactionEmoji
                      }
                    >
                      {emoji}
                    </Text>
                  </TouchableOpacity>
                )
              )}
            </View>

            <View
              style={
                styles.actionList
              }
            >
              <ActionItem
                label="Reply"
                icon="arrow-undo-outline"
                onPress={() =>
                  messageAction(
                    'reply'
                  )
                }
              />

              <ActionItem
                label="Share"
                icon="share-outline"
                onPress={() =>
                  messageAction(
                    'share'
                  )
                }
              />

              <ActionItem
                label="Copy / Share"
                icon="copy-outline"
                onPress={
                  copyMessage
                }
              />

              <ActionItem
                label="Save"
                icon="bookmark-outline"
                onPress={() =>
                  messageAction(
                    'save'
                  )
                }
              />

              <ActionItem
                label="Pin"
                icon="pin-outline"
                onPress={() =>
                  messageAction(
                    'pin'
                  )
                }
              />

              {contextMenu.msg
                ?.senderId ===
                currentUser?.uid && (
                <>
                  <ActionItem
                    label="Edit"
                    icon="pencil-outline"
                    onPress={() =>
                      messageAction(
                        'edit'
                      )
                    }
                  />

                  <ActionItem
                    label="Delete"
                    icon="trash-outline"
                    danger
                    onPress={() =>
                      messageAction(
                        'delete'
                      )
                    }
                  />
                </>
              )}
            </View>
          </View>
        </Pressable>
      </Modal>

      {/* POLL MODAL */}

      <Modal
        visible={showPoll}
        transparent
        animationType="slide"
        onRequestClose={() =>
          setShowPoll(false)
        }
      >
        <View
          style={styles.modalCenter}
        >
          <View
            style={styles.modalCard}
          >
            <Text
              style={
                styles.modalTitle
              }
            >
              Create Poll
            </Text>

            <TextInput
              style={
                styles.modalInput
              }
              placeholder="Ask a question..."
              placeholderTextColor={
                COLORS.sub
              }
              value={pollQuestion}
              onChangeText={
                setPollQuestion
              }
            />

            {pollOptions.map(
              (option, index) => (
                <TextInput
                  key={index}
                  style={
                    styles.modalInput
                  }
                  placeholder={`Option ${
                    index + 1
                  }`}
                  placeholderTextColor={
                    COLORS.sub
                  }
                  value={option}
                  onChangeText={(
                    text
                  ) => {
                    const copy = [
                      ...pollOptions,
                    ];

                    copy[index] =
                      text;

                    setPollOptions(
                      copy
                    );
                  }}
                />
              )
            )}

            <TouchableOpacity
              style={
                styles.addOptionButton
              }
              onPress={() =>
                setPollOptions([
                  ...pollOptions,
                  '',
                ])
              }
            >
              <Ionicons
                name="add"
                size={20}
                color={
                  COLORS.cyan
                }
              />

              <Text
                style={
                  styles.addOptionText
                }
              >
                Add option
              </Text>
            </TouchableOpacity>

            <View
              style={
                styles.modalActions
              }
            >
              <TouchableOpacity
                onPress={() =>
                  setShowPoll(false)
                }
              >
                <Text
                  style={
                    styles.cancelText
                  }
                >
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={
                  styles.createButton
                }
                onPress={
                  createPoll
                }
              >
                <Text
                  style={
                    styles.createButtonText
                  }
                >
                  Create
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MORE MENU */}

      <Modal
        visible={showMoreMenu}
        transparent
        animationType="fade"
        onRequestClose={() =>
          setShowMoreMenu(false)
        }
      >
        <Pressable
          style={styles.overlay}
          onPress={() =>
            setShowMoreMenu(false)
          }
        >
          <View
            style={
              styles.moreMenu
            }
          >
            <ActionItem
              label="Search in chat"
              icon="search-outline"
              onPress={() => {
                setShowMoreMenu(
                  false
                );
                setSearchVisible(
                  true
                );
              }}
            />

            <ActionItem
              label="Media, files & links"
              icon="images-outline"
              onPress={() =>
                Alert.alert(
                  'Media',
                  'Media gallery can be opened from the chat info screen.'
                )
              }
            />

            <ActionItem
              label="Mute notifications"
              icon="notifications-off-outline"
              onPress={() => {
                setShowMoreMenu(
                  false
                );
                Alert.alert(
                  'Notifications',
                  'Chat muted locally.'
                );
              }}
            />

            <ActionItem
              label="Disappearing messages"
              icon="timer-outline"
              onPress={() => {
                setShowMoreMenu(
                  false
                );
                Alert.alert(
                  'Disappearing Messages',
                  '24 hours / 7 days / 90 days can be configured in chat settings.'
                );
              }}
            />

            <ActionItem
              label="Block"
              icon="ban-outline"
              danger
              onPress={() => {
                setShowMoreMenu(
                  false
                );
                Alert.alert(
                  'Block',
                  'Block this user?'
                );
              }}
            />
          </View>
        </Pressable>
      </Modal>

      {/* FULLSCREEN MEDIA */}

      <Modal
        visible={
          !!fullScreenMedia
        }
        animationType="fade"
        transparent={false}
        onRequestClose={() =>
          setFullScreenMedia(
            null
          )
        }
      >
        <View
          style={
            styles.fullscreen
          }
        >
          <TouchableOpacity
            style={
              styles.closeFullscreen
            }
            onPress={() =>
              setFullScreenMedia(
                null
              )
            }
          >
            <Ionicons
              name="close"
              size={31}
              color="#FFF"
            />
          </TouchableOpacity>

          {fullScreenMedia?.type ===
          'video' ? (
            <Video
              source={{
                uri: fullScreenMedia.uri,
              }}
              style={
                styles.fullscreenMedia
              }
              resizeMode="contain"
              useNativeControls
              shouldPlay
            />
          ) : (
            <Image
              source={{
                uri: fullScreenMedia?.uri,
              }}
              style={
                styles.fullscreenMedia
              }
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

/* =========================================================
   ATTACHMENT ITEM
========================================================= */

function AttachmentItem({
  icon,
  label,
  color,
  onPress,
}) {
  return (
    <TouchableOpacity
      style={
        styles.attachmentItem
      }
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View
        style={[
          styles.attachmentIcon,
          {
            backgroundColor:
              color,
          },
        ]}
      >
        <Ionicons
          name={icon}
          size={27}
          color="#FFF"
        />
      </View>

      <Text
        style={
          styles.attachmentLabel
        }
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

/* =========================================================
   ACTION ITEM
========================================================= */

function ActionItem({
  label,
  icon,
  onPress,
  danger = false,
}) {
  return (
    <TouchableOpacity
      style={styles.actionItem}
      onPress={onPress}
    >
      <Text
        style={[
          styles.actionItemText,
          danger && {
            color: COLORS.danger,
          },
        ]}
      >
        {label}
      </Text>

      <Ionicons
        name={icon}
        size={20}
        color={
          danger
            ? COLORS.danger
            : COLORS.text
        }
      />
    </TouchableOpacity>
  );
}

/* =========================================================
   STYLES
========================================================= */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor:
      COLORS.bg,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor:
      COLORS.header,
    paddingHorizontal: 4,
    paddingTop:
      Platform.OS === 'ios'
        ? 8
        : 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor:
      COLORS.border,
  },

  headerButton: {
    width: 42,
    height: 42,
    justifyContent:
      'center',
    alignItems: 'center',
  },

  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    marginRight: 9,
  },

  headerInfo: {
    flex: 1,
    marginRight: 5,
  },

  headerTitle: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: '800',
  },

  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },

  onlineDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 5,
  },

  headerStatus: {
    color: COLORS.sub,
    fontSize: 12,
  },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 10,
    paddingHorizontal: 13,
    height: 45,
    borderRadius: 22,
    backgroundColor:
      COLORS.surface2,
    borderWidth: 1,
    borderColor:
      COLORS.border,
  },

  searchInput: {
    flex: 1,
    color: COLORS.text,
    fontSize: 15,
    marginLeft: 9,
  },

  uploadBanner: {
    height: 40,
    backgroundColor:
      COLORS.bubbleMe,
    flexDirection: 'row',
    justifyContent:
      'center',
    alignItems: 'center',
  },

  uploadBannerText: {
    color: '#FFF',
    marginLeft: 9,
    fontWeight: '700',
  },

  messageList: {
    paddingHorizontal: 12,
    paddingVertical: 15,
  },

  messageRow: {
    flexDirection: 'row',
    marginBottom: 14,
    position: 'relative',
  },

  messageBubble: {
    maxWidth: width * 0.82,
    minWidth: 70,
    padding: 9,
    borderRadius: 19,
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowRadius: 5,
    elevation: 2,
  },

  myBubble: {
    backgroundColor:
      COLORS.bubbleMe,
    borderBottomRightRadius: 4,
  },

  otherBubble: {
    backgroundColor:
      COLORS.bubbleOther,
    borderBottomLeftRadius: 4,
  },

  senderName: {
    color: '#56BFFF',
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 4,
  },

  messageText: {
    color: COLORS.text,
    fontSize: 16,
    lineHeight: 22,
  },

  messageFooter: {
    flexDirection: 'row',
    justifyContent:
      'flex-end',
    alignItems: 'center',
    marginTop: 5,
  },

  timeText: {
    color:
      'rgba(255,255,255,.52)',
    fontSize: 10,
  },

  editedText: {
    color:
      'rgba(255,255,255,.55)',
    fontSize: 10,
    fontStyle: 'italic',
    marginRight: 5,
  },

  deletedBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 11,
    borderRadius: 15,
    borderWidth: 1,
    borderColor:
      COLORS.border,
  },

  deletedText: {
    color: COLORS.sub,
    fontStyle: 'italic',
    marginLeft: 6,
  },

  replyInside: {
    flexDirection: 'row',
    backgroundColor:
      'rgba(0,0,0,.16)',
    padding: 7,
    borderRadius: 9,
    marginBottom: 7,
  },

  replyAccent: {
    width: 3,
    backgroundColor:
      COLORS.cyan,
    borderRadius: 2,
    marginRight: 7,
  },

  replySender: {
    color: COLORS.text,
    fontWeight: '800',
    fontSize: 11,
  },

  replyText: {
    color: COLORS.sub,
    fontSize: 11,
    marginTop: 2,
  },

  forwardedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },

  forwardedText: {
    color: COLORS.sub,
    fontSize: 11,
    marginLeft: 5,
    fontStyle: 'italic',
  },

  mediaImage: {
    width: width * 0.66,
    height: width * 0.66,
    borderRadius: 13,
    backgroundColor:
      '#000',
  },

  videoWrapper: {
    position: 'relative',
  },

  videoPlay: {
    position: 'absolute',
    left: '42%',
    top: '42%',
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor:
      'rgba(0,0,0,.62)',
    justifyContent:
      'center',
    alignItems: 'center',
  },

  viewOnceOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent:
      'center',
    alignItems: 'center',
    backgroundColor:
      'rgba(0,0,0,.55)',
  },

  viewOnceText: {
    color: '#FFF',
    fontWeight: '800',
    marginTop: 5,
  },

  reactionsBadge: {
    position: 'absolute',
    bottom: -10,
    flexDirection: 'row',
    backgroundColor:
      '#203142',
    borderRadius: 15,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor:
      COLORS.border,
  },

  reactionSmall: {
    color: COLORS.text,
    fontSize: 12,
    marginHorizontal: 2,
  },

  voiceMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    width: width * 0.58,
    minHeight: 55,
  },

  voicePlay: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor:
      'rgba(255,255,255,.16)',
    justifyContent:
      'center',
    alignItems: 'center',
    marginRight: 9,
  },

  waveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 30,
    overflow: 'hidden',
  },

  waveBar: {
    width: 3,
    borderRadius: 3,
    backgroundColor:
      'rgba(255,255,255,.8)',
    marginRight: 2,
  },

  voiceDuration: {
    color: COLORS.sub,
    fontSize: 10,
    marginTop: 1,
  },

  voiceSpeed: {
    color: COLORS.text,
    fontSize: 11,
    fontWeight: '800',
  },

  documentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    width: width * 0.68,
    padding: 10,
    backgroundColor:
      'rgba(0,0,0,.15)',
    borderRadius: 12,
  },

  documentIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor:
      COLORS.bubbleMe,
    justifyContent:
      'center',
    alignItems: 'center',
    marginRight: 10,
  },

  documentName: {
    color: COLORS.text,
    fontWeight: '700',
    fontSize: 13,
  },

  documentSize: {
    color: COLORS.sub,
    fontSize: 11,
    marginTop: 3,
  },

  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    width: width * 0.65,
  },

  locationIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor:
      COLORS.danger,
    justifyContent:
      'center',
    alignItems: 'center',
    marginRight: 10,
  },

  locationTitle: {
    color: COLORS.text,
    fontWeight: '800',
  },

  locationText: {
    color: COLORS.sub,
    fontSize: 11,
    marginTop: 3,
  },

  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    width: width * 0.63,
  },

  contactAvatar: {
    width: 45,
    height: 45,
    borderRadius: 23,
    backgroundColor:
      COLORS.cyan,
    justifyContent:
      'center',
    alignItems: 'center',
    marginRight: 10,
  },

  contactName: {
    color: COLORS.text,
    fontWeight: '800',
  },

  contactPhone: {
    color: COLORS.sub,
    fontSize: 12,
    marginTop: 3,
  },

  pollCard: {
    width: width * 0.68,
  },

  pollTitle: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 10,
  },

  pollOption: {
    height: 40,
    borderRadius: 9,
    backgroundColor:
      'rgba(0,0,0,.2)',
    marginBottom: 7,
    justifyContent:
      'center',
    overflow: 'hidden',
  },

  pollProgress: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor:
      'rgba(255,255,255,.13)',
  },

  pollOptionText: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 10,
  },

  pollPercent: {
    position: 'absolute',
    right: 9,
    color: COLORS.sub,
    fontSize: 11,
  },

  dateDivider: {
    alignSelf: 'center',
    backgroundColor:
      '#162332',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 13,
    marginVertical: 8,
  },

  dateText: {
    color: COLORS.sub,
    fontSize: 11,
    fontWeight: '700',
  },

  loadingArea: {
    flex: 1,
    justifyContent:
      'flex-end',
    padding: 18,
  },

  skeleton: {
    height: 45,
    borderRadius: 18,
    backgroundColor:
      '#111C28',
    marginBottom: 10,
  },

  emptyState: {
    flex: 1,
    minHeight: height * 0.65,
    justifyContent:
      'center',
    alignItems: 'center',
    paddingHorizontal: 45,
  },

  emptyIcon: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor:
      'rgba(50,173,230,.1)',
    justifyContent:
      'center',
    alignItems: 'center',
    marginBottom: 18,
  },

  emptyTitle: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
  },

  emptyText: {
    color: COLORS.sub,
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
  },

  newMessageButton: {
    position: 'absolute',
    right: 18,
    bottom: 85,
    minWidth: 42,
    height: 42,
    paddingHorizontal: 10,
    borderRadius: 22,
    backgroundColor:
      COLORS.bubbleMe,
    justifyContent:
      'center',
    alignItems: 'center',
    flexDirection: 'row',
    elevation: 8,
  },

  newMessageText: {
    color: '#FFF',
    fontWeight: '800',
    marginLeft: 5,
  },

  replyBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor:
      COLORS.surface,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderTopWidth: 1,
    borderColor:
      COLORS.border,
  },

  replyBarAccent: {
    width: 3,
    height: 35,
    borderRadius: 2,
    backgroundColor:
      COLORS.bubbleMe,
  },

  replyBarTitle: {
    color: COLORS.bubbleMe,
    fontWeight: '800',
    fontSize: 12,
  },

  replyBarText: {
    color: COLORS.sub,
    fontSize: 11,
    marginTop: 2,
  },

  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor:
      COLORS.bg,
    paddingHorizontal: 7,
    paddingVertical: 8,
    paddingBottom:
      Platform.OS === 'ios'
        ? 10
        : 8,
    borderTopWidth: 1,
    borderColor:
      COLORS.border,
  },

  composerButton: {
    width: 37,
    height: 44,
    justifyContent:
      'center',
    alignItems: 'center',
  },

  inputContainer: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    backgroundColor:
      COLORS.surface2,
    borderRadius: 23,
    borderWidth: 1,
    borderColor:
      COLORS.border,
    justifyContent:
      'center',
  },

  input: {
    color: COLORS.text,
    fontSize: 16,
    paddingHorizontal: 14,
    paddingVertical: 9,
    maxHeight: 115,
  },

  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor:
      COLORS.bubbleMe,
    justifyContent:
      'center',
    alignItems: 'center',
    marginLeft: 7,
  },

  emojiPanel: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor:
      COLORS.surface,
    padding: 10,
    borderTopWidth: 1,
    borderColor:
      COLORS.border,
  },

  emojiItem: {
    fontSize: 26,
    padding: 7,
  },

  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor:
      COLORS.overlay,
    zIndex: 100,
  },

  attachmentSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor:
      '#111B27',
    borderTopLeftRadius: 27,
    borderTopRightRadius: 27,
    paddingBottom: 35,
    paddingTop: 10,
  },

  sheetHandle: {
    width: 42,
    height: 5,
    borderRadius: 4,
    backgroundColor:
      'rgba(255,255,255,.18)',
    alignSelf: 'center',
    marginBottom: 14,
  },

  sheetTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 20,
  },

  attachGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent:
      'space-around',
    paddingHorizontal: 15,
  },

  attachmentItem: {
    width: '28%',
    alignItems: 'center',
    marginBottom: 20,
  },

  attachmentIcon: {
    width: 58,
    height: 58,
    borderRadius: 29,
    justifyContent:
      'center',
    alignItems: 'center',
    marginBottom: 7,
  },

  attachmentLabel: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '600',
  },

  contextMenu: {
    position: 'absolute',
    width: width * 0.82,
    alignSelf: 'center',
  },

  reactionBar: {
    flexDirection: 'row',
    justifyContent:
      'space-around',
    alignItems: 'center',
    backgroundColor:
      '#1D2B3A',
    paddingVertical: 11,
    borderRadius: 26,
    marginBottom: 10,
    elevation: 8,
  },

  reactionEmoji: {
    fontSize: 25,
  },

  actionList: {
    backgroundColor:
      '#1D2B3A',
    borderRadius: 17,
    overflow: 'hidden',
  },

  actionItem: {
    minHeight: 52,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent:
      'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderColor:
      'rgba(255,255,255,.05)',
  },

  actionItemText: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '600',
  },

  fullscreen: {
    flex: 1,
    backgroundColor:
      '#000',
    justifyContent:
      'center',
    alignItems: 'center',
  },

  fullscreenMedia: {
    width: '100%',
    height: '100%',
  },

  closeFullscreen: {
    position: 'absolute',
    right: 15,
    top: 45,
    zIndex: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor:
      'rgba(0,0,0,.55)',
    justifyContent:
      'center',
    alignItems: 'center',
  },

  modalCenter: {
    flex: 1,
    justifyContent:
      'center',
    alignItems: 'center',
    backgroundColor:
      COLORS.overlay,
    padding: 20,
  },

  modalCard: {
    width: '100%',
    backgroundColor:
      COLORS.surface,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor:
      COLORS.border,
  },

  modalTitle: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 15,
  },

  modalInput: {
    backgroundColor:
      COLORS.surface2,
    color: COLORS.text,
    borderRadius: 13,
    paddingHorizontal: 13,
    height: 47,
    marginBottom: 10,
    borderWidth: 1,
    borderColor:
      COLORS.border,
  },

  addOptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
  },

  addOptionText: {
    color: COLORS.cyan,
    fontWeight: '700',
    marginLeft: 5,
  },

  modalActions: {
    flexDirection: 'row',
    justifyContent:
      'flex-end',
    alignItems: 'center',
    marginTop: 12,
  },

  cancelText: {
    color: COLORS.sub,
    fontWeight: '700',
    marginRight: 20,
  },

  createButton: {
    backgroundColor:
      COLORS.bubbleMe,
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 20,
  },

  createButtonText: {
    color: '#FFF',
    fontWeight: '800',
  },

  moreMenu: {
    position: 'absolute',
    right: 12,
    top: 75,
    width: 260,
    backgroundColor:
      '#1D2B3A',
    borderRadius: 18,
    overflow: 'hidden',
  },

  recordingScreen: {
    flex: 1,
    justifyContent:
      'center',
    alignItems: 'center',
    padding: 30,
  },

  recordingOrb: {
    width: 105,
    height: 105,
    borderRadius: 53,
    backgroundColor:
      COLORS.danger,
    justifyContent:
      'center',
    alignItems: 'center',
    marginBottom: 25,
  },

  recordingTitle: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: '800',
  },

  recordingTimer: {
    color: COLORS.cyan,
    fontSize: 38,
    fontWeight: '800',
    marginTop: 10,
  },

  recordingWave: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 90,
    marginVertical: 35,
  },

  recordingBar: {
    width: 4,
    backgroundColor:
      COLORS.bubbleMe,
    borderRadius: 4,
    marginHorizontal: 2,
  },

  recordingActions: {
    flexDirection: 'row',
    gap: 18,
  },

  recordingAction: {
    width: 130,
    height: 52,
    borderRadius: 26,
    flexDirection: 'row',
    justifyContent:
      'center',
    alignItems: 'center',
    gap: 8,
  },

  recordingActionText: {
    color: '#FFF',
    fontWeight: '800',
  },
});
