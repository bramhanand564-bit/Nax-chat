import React, {
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  Alert,
  Modal,
  Keyboard,
  Animated,
} from 'react-native';

import {
  Ionicons,
} from '@expo/vector-icons';

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
  setDoc,
  updateDoc,
  increment,
} from 'firebase/firestore';

import { useTheme } from
  '../context/ThemeContext';


const COLORS = {
  bg: '#050A10',
  header: '#0B1824',
  mine: '#087EFF',
  other: '#172433',
  text: '#F4F7FA',
  sub: '#8FA6B9',
  border:
    'rgba(255,255,255,0.08)',
  green: '#34C759',
  danger: '#FF3B30',
};


export default function ChatRoomScreen({
  route,
  navigation,
}) {
  const { isDark } = useTheme();

  const params =
    route?.params || {};

  const chatId =
    params.chatId || '';

  const friendId =
    params.friendId || '';

  const chatTitle =
    params.chatName ||
    params.friendUsername ||
    'Chat';

  const currentUser =
    auth.currentUser;

  const [messages, setMessages] =
    useState([]);

  const [text, setText] =
    useState('');

  const [loading, setLoading] =
    useState(true);

  const [sending, setSending] =
    useState(false);

  const [replyMessage, setReplyMessage] =
    useState(null);

  const [editingMessage, setEditingMessage] =
    useState(null);

  const [selectedMessage, setSelectedMessage] =
    useState(null);

  const [showMenu, setShowMenu] =
    useState(false);

  const listRef =
    useRef(null);


  /* =========================
     THEME
  ========================= */

  const bg =
    isDark
      ? COLORS.bg
      : '#F3F7FA';

  const headerBg =
    isDark
      ? COLORS.header
      : '#FFFFFF';

  const inputBg =
    isDark
      ? '#142433'
      : '#E8EFF4';

  const textMain =
    isDark
      ? COLORS.text
      : '#142532';

  const textSub =
    isDark
      ? COLORS.sub
      : '#6C8494';


  /* =========================
     MESSAGE PATH
  ========================= */

  const getMessageCollection = () => {
    if (!chatId) {
      return null;
    }

    if (
      chatId ===
      'global_chats'
    ) {
      return collection(
        db,
        'global_chats'
      );
    }

    return collection(
      db,
      'chats',
      chatId,
      'messages'
    );
  };


  /* =========================
     REALTIME MESSAGES
  ========================= */

  useEffect(() => {
    const messageRef =
      getMessageCollection();

    if (!messageRef) {
      setMessages([]);
      setLoading(false);
      return;
    }

    const messageQuery =
      query(
        messageRef,
        orderBy(
          'createdAt',
          'desc'
        )
      );

    const unsubscribe =
      onSnapshot(
        messageQuery,
        (snapshot) => {
          const list = [];

          snapshot.forEach(
            (item) => {
              list.push({
                id: item.id,
                ...item.data(),
              });
            }
          );

          setMessages(list);
          setLoading(false);
        },
        (error) => {
          console.log(
            'Message listener:',
            error
          );

          setLoading(false);

          Alert.alert(
            'Chat Error',
            'Messages load nahi hue.'
          );
        }
      );

    return () => {
      unsubscribe();
    };
  }, [chatId]);


  /* =========================
     CLEAR UNREAD
  ========================= */

  useEffect(() => {
    if (!currentUser?.uid) {
      return;
    }

    if (!chatId) {
      return;
    }

    if (
      chatId ===
      'global_chats'
    ) {
      return;
    }

    clearUnread();
  }, [
    chatId,
    currentUser?.uid,
  ]);


  const clearUnread = async () => {
    try {
      const ref = doc(
        db,
        'users',
        currentUser.uid,
        'user_chats',
        chatId
      );

      await setDoc(
        ref,
        {
          unreadCount: 0,
          openedAt:
            serverTimestamp(),
        },
        {
          merge: true,
        }
      );
    } catch (error) {
      console.log(
        'Unread clear:',
        error
      );
    }
  };


  /* =========================
     CHAT METADATA
  ========================= */

  const updateChatMetadata =
    async (
      lastMessage,
      type = 'text'
    ) => {
      if (
        chatId ===
        'global_chats'
      ) {
        return;
      }

      if (!currentUser?.uid) {
        return;
      }

      if (!friendId) {
        return;
      }

      try {
        const time =
          serverTimestamp();

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

        const myData = {
          chatId,

          type: 'private',

          friendId,

          friendName:
            chatTitle,

          friendUsername:
            params.friendUsername ||
            '',

          friendAvatar:
            params.friendAvatar ||
            '',

          lastMessage,

          lastMessageType:
            type,

          lastMessageTime:
            time,

          updatedAt:
            time,
        };

        const friendData = {
          chatId,

          type: 'private',

          friendId:
            currentUser.uid,

          friendName:
            currentUser.displayName ||
            'User',

          lastMessage,

          lastMessageType:
            type,

          lastMessageTime:
            time,

          updatedAt:
            time,

          unreadCount:
            increment(1),
        };

        await setDoc(
          myRef,
          myData,
          {
            merge: true,
          }
        );

        await setDoc(
          friendRef,
          friendData,
          {
            merge: true,
          }
        );
      } catch (error) {
        console.log(
          'Metadata error:',
          error
        );
      }
    };


  /* =========================
     SEND TEXT
  ========================= */

  const sendMessage =
    async () => {
      const value =
        text.trim();

      if (!value) {
        return;
      }

      if (!currentUser?.uid) {
        Alert.alert(
          'Login required',
          'Pehle login karo.'
        );

        return;
      }

      const messageRef =
        getMessageCollection();

      if (!messageRef) {
        return;
      }

      setSending(true);

      try {
        const message = {
          type: 'text',

          text: value,

          senderId:
            currentUser.uid,

          senderName:
            currentUser.displayName ||
            'User',

          createdAt:
            serverTimestamp(),

          read: false,
        };

        if (replyMessage) {
          message.replyToId =
            replyMessage.id;

          message.replyToText =
            replyMessage.text ||
            'Media';

          message.replyToSender =
            replyMessage.senderName ||
            'User';
        }

        await addDoc(
          messageRef,
          message
        );

        await updateChatMetadata(
          value,
          'text'
        );

        setText('');
        setReplyMessage(null);

        setTimeout(() => {
          listRef.current?.scrollToOffset({
            offset: 0,
            animated: true,
          });
        }, 100);

      } catch (error) {
        console.log(
          'Send message:',
          error
        );

        Alert.alert(
          'Send Error',
          'Message send nahi hua.'
        );
      }

      setSending(false);
    };


  /* =========================
     EDIT MESSAGE
  ========================= */

  const startEdit =
    (message) => {
      if (
        message.senderId !==
        currentUser?.uid
      ) {
        return;
      }

      setEditingMessage(
        message
      );

      setText(
        message.text || ''
      );

      setShowMenu(false);

      setTimeout(() => {
        Keyboard.dismiss();
      }, 100);
    };


  const saveEdit =
    async () => {
      const value =
        text.trim();

      if (!value) {
        return;
      }

      if (!editingMessage) {
        return;
      }

      try {
        const ref = doc(
          db,
          chatId ===
            'global_chats'
            ? 'global_chats'
            : 'chats',
          ...(chatId ===
          'global_chats'
            ? [editingMessage.id]
            : [
                chatId,
                'messages',
                editingMessage.id,
              ])
        );

        await updateDoc(
          ref,
          {
            text: value,

            isEdited: true,

            editedAt:
              serverTimestamp(),
          }
        );

        setEditingMessage(null);
        setText('');

      } catch (error) {
        console.log(
          'Edit error:',
          error
        );

        Alert.alert(
          'Edit Error',
          'Message edit nahi hua.'
        );
      }
    };


  /* =========================
     DELETE MESSAGE
  ========================= */

  const deleteMessage =
    async () => {
      if (!selectedMessage) {
        return;
      }

      if (
        selectedMessage.senderId !==
        currentUser?.uid
      ) {
        setShowMenu(false);
        return;
      }

      try {
        const ref = getMessageRef(
          chatId,
          selectedMessage.id
        );

        await updateDoc(
          ref,
          {
            isDeleted: true,

            text: '',

            mediaUrl: '',

            deletedAt:
              serverTimestamp(),
          }
        );

        setShowMenu(false);
        setSelectedMessage(null);

      } catch (error) {
        console.log(
          'Delete error:',
          error
        );

        Alert.alert(
          'Delete Error',
          'Message delete nahi hua.'
        );
      }
    };


  /* =========================
     REPLY
  ========================= */

  const startReply =
    (message) => {
      setReplyMessage(
        message
      );

      setShowMenu(false);
      setSelectedMessage(null);
    };


  /* =========================
     REACTION
  ========================= */

  const addReaction =
    async (emoji) => {
      if (!selectedMessage) {
        return;
      }

      if (!currentUser?.uid) {
        return;
      }

      try {
        const ref =
          getMessageRef(
            chatId,
            selectedMessage.id
          );

        await updateDoc(
          ref,
          {
            [`reactions.${currentUser.uid}`]:
              emoji,
          }
        );

        setShowMenu(false);
        setSelectedMessage(null);

      } catch (error) {
        console.log(
          'Reaction error:',
          error
        );
      }
    };


  /* =========================
     LONG PRESS
  ========================= */

  const onLongPress =
    (message) => {
      setSelectedMessage(
        message
      );

      setShowMenu(true);
    };


  /* =========================
     MESSAGE REF
  ========================= */

  const getMessageRef =
    (
      roomId,
      messageId
    ) => {
      if (
        roomId ===
        'global_chats'
      ) {
        return doc(
          db,
          'global_chats',
          messageId
        );
      }

      return doc(
        db,
        'chats',
        roomId,
        'messages',
        messageId
      );
    };


  /* =========================
     MESSAGE TIME
  ========================= */

  const getTime =
    (createdAt) => {
      if (!createdAt) {
        return '';
      }

      try {
        const date =
          createdAt.toDate
            ? createdAt.toDate()
            : new Date(
                createdAt
              );

        return date.toLocaleTimeString(
          [],
          {
            hour: '2-digit',
            minute: '2-digit',
          }
        );
      } catch {
        return '';
      }
    };


  /* =========================
     MESSAGE ITEM
  ========================= */

  const renderMessage =
    ({ item }) => {
      const isMe =
        item.senderId ===
        currentUser?.uid;

      return (
        <MessageBubble
          item={item}
          isMe={isMe}
          onLongPress={
            onLongPress
          }
          getTime={getTime}
        />
      );
    };


  /* =========================
     CANCEL EDIT
  ========================= */

  const cancelEdit =
    () => {
      setEditingMessage(null);
      setText('');
    };


  /* =========================
     CANCEL REPLY
  ========================= */

  const cancelReply =
    () => {
      setReplyMessage(null);
    };


  return (
    <SafeAreaView
      style={[
        styles.container,
        {
          backgroundColor:
            bg,
        },
      ]}
    >

      {/* HEADER */}

      <View
        style={[
          styles.header,
          {
            backgroundColor:
              headerBg,
          },
        ]}
      >
        <TouchableOpacity
          style={
            styles.backButton
          }
          onPress={() =>
            navigation.goBack()
          }
        >
          <Ionicons
            name="arrow-back"
            size={24}
            color={textMain}
          />
        </TouchableOpacity>

        <View
          style={styles.headerInfo}
        >
          <Text
            style={[
              styles.headerTitle,
              {
                color:
                  textMain,
              },
            ]}
            numberOfLines={1}
          >
            {chatTitle}
          </Text>

          <Text
            style={[
              styles.headerSub,
              {
                color:
                  textSub,
              },
            ]}
          >
            {friendId
              ? 'Private chat'
              : 'Global room'}
          </Text>
        </View>

        <TouchableOpacity
          style={
            styles.headerButton
          }
          onPress={() =>
            Alert.alert(
              'Coming Soon',
              'Voice and video calling next update me connect honge.'
            )
          }
        >
          <Ionicons
            name="call-outline"
            size={21}
            color={textMain}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={
            styles.headerButton
          }
          onPress={() =>
            Alert.alert(
              'Chat',
              'Chat options next update me available honge.'
            )
          }
        >
          <Ionicons
            name="ellipsis-vertical"
            size={21}
            color={textMain}
          />
        </TouchableOpacity>
      </View>


      {/* MESSAGES */}

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={
          Platform.OS === 'ios'
            ? 'padding'
            : undefined
        }
        keyboardVerticalOffset={0}
      >
        {loading ? (
          <View
            style={styles.loading}
          >
            <Text
              style={[
                styles.loadingText,
                {
                  color:
                    textSub,
                },
              ]}
            >
              Loading messages...
            </Text>
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            inverted
            keyExtractor={(item) =>
              item.id
            }
            renderItem={
              renderMessage
            }
            contentContainerStyle={
              styles.messageList
            }
            showsVerticalScrollIndicator={
              false
            }
            keyboardShouldPersistTaps="handled"
          />
        )}


        {/* REPLY BAR */}

        {replyMessage && (
          <View
            style={[
              styles.replyBar,
              {
                backgroundColor:
                  inputBg,
              },
            ]}
          >
            <View
              style={
                styles.replyLine
              }
            />

            <View
              style={styles.replyInfo}
            >
              <Text
                style={
                  styles.replyTitle
                }
              >
                Replying to{' '}
                {replyMessage.senderName ||
                  'User'}
              </Text>

              <Text
                style={[
                  styles.replyPreview,
                  {
                    color:
                      textSub,
                  },
                ]}
                numberOfLines={1}
              >
                {replyMessage.text ||
                  'Media message'}
              </Text>
            </View>

            <TouchableOpacity
              onPress={
                cancelReply
              }
            >
              <Ionicons
                name="close-circle"
                size={23}
                color={textSub}
              />
            </TouchableOpacity>
          </View>
        )}


        {/* EDIT BAR */}

        {editingMessage && (
          <View
            style={[
              styles.editBar,
              {
                backgroundColor:
                  inputBg,
              },
            ]}
          >
            <Ionicons
              name="create-outline"
              size={20}
              color="#1687FF"
            />

            <Text
              style={[
                styles.editText,
                {
                  color:
                    textMain,
                },
              ]}
            >
              Editing message
            </Text>

            <TouchableOpacity
              onPress={
                cancelEdit
              }
            >
              <Ionicons
                name="close-circle"
                size={23}
                color={textSub}
              />
            </TouchableOpacity>
          </View>
        )}


        {/* INPUT */}

        <View
          style={[
            styles.inputArea,
            {
              backgroundColor:
                headerBg,
            },
          ]}
        >
          <TouchableOpacity
            style={
              styles.attachButton
            }
            onPress={() =>
              Alert.alert(
                'Attachments',
                'Photo, video and document upload ko next step me Firebase Storage se connect karenge.'
              )
            }
          >
            <Ionicons
              name="add-circle-outline"
              size={29}
              color={textSub}
            />
          </TouchableOpacity>

          <View
            style={[
              styles.inputBox,
              {
                backgroundColor:
                  inputBg,
              },
            ]}
          >
            <TextInput
              style={[
                styles.input,
                {
                  color:
                    textMain,
                },
              ]}
              value={text}
              onChangeText={setText}
              placeholder={
                editingMessage
                  ? 'Edit message...'
                  : 'Message'
              }
              placeholderTextColor={
                textSub
              }
              multiline
              maxLength={4000}
              returnKeyType="default"
            />

            <TouchableOpacity
              style={
                styles.emojiButton
              }
              onPress={() =>
                setText(
                  text + ' 😊'
                )
              }
            >
              <Text
                style={
                  styles.emojiText
                }
              >
                😊
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={
              styles.sendButton
            }
            onPress={
              editingMessage
                ? saveEdit
                : sendMessage
            }
            disabled={sending}
          >
            <Ionicons
              name={
                editingMessage
                  ? 'checkmark'
                  : 'send'
              }
              size={20}
              color="#FFFFFF"
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>


      {/* MESSAGE MENU */}

      <Modal
        visible={showMenu}
        transparent
        animationType="fade"
        onRequestClose={() =>
          setShowMenu(false)
        }
      >
        <TouchableOpacity
          activeOpacity={1}
          style={
            styles.menuOverlay
          }
          onPress={() =>
            setShowMenu(false)
          }
        >
          <TouchableOpacity
            activeOpacity={1}
            style={[
              styles.messageMenu,
              {
                backgroundColor:
                  isDark
                    ? '#122331'
                    : '#FFFFFF',
              },
            ]}
          >
            <Text
              style={[
                styles.menuTitle,
                {
                  color:
                    textMain,
                },
              ]}
            >
              Message
            </Text>


            {/* REACTIONS */}

            <View
              style={
                styles.reactionsRow
              }
            >
              {[
                '❤️',
                '😂',
                '👍',
                '😮',
                '😢',
                '🔥',
                '🎉',
              ].map(
                (emoji) => (
                  <TouchableOpacity
                    key={emoji}
                    style={
                      styles.reactionButton
                    }
                    onPress={() =>
                      addReaction(
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


            {/* REPLY */}

            <MenuButton
              icon="return-down-forward-outline"
              title="Reply"
              onPress={() =>
                startReply(
                  selectedMessage
                )
              }
            />


            {/* EDIT */}

            {selectedMessage
              ?.senderId ===
              currentUser?.uid && (
              <MenuButton
                icon="create-outline"
                title="Edit"
                onPress={() =>
                  startEdit(
                    selectedMessage
                  )
                }
              />
            )}


            {/* DELETE */}

            {selectedMessage
              ?.senderId ===
              currentUser?.uid && (
              <MenuButton
                icon="trash-outline"
                title="Delete"
                danger
                onPress={() =>
                  Alert.alert(
                    'Delete message?',
                    'Ye message delete ho jayega.',
                    [
                      {
                        text: 'Cancel',
                        style:
                          'cancel',
                      },
                      {
                        text: 'Delete',
                        style:
                          'destructive',
                        onPress:
                          deleteMessage,
                      },
                    ]
                  )
                }
              />
            )}


            <TouchableOpacity
              style={
                styles.cancelMenu
              }
              onPress={() =>
                setShowMenu(false)
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

          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

    </SafeAreaView>
  );
}


/* =========================
   MESSAGE BUBBLE
========================= */

function MessageBubble({
  item,
  isMe,
  onLongPress,
  getTime,
}) {
  const scale =
    useRef(
      new Animated.Value(1)
    ).current;

  const animate =
    () => {
      Animated.sequence([
        Animated.timing(
          scale,
          {
            toValue: 0.97,
            duration: 70,
            useNativeDriver:
              true,
          }
        ),

        Animated.spring(
          scale,
          {
            toValue: 1,
            friction: 5,
            useNativeDriver:
              true,
          }
        ),
      ]).start();
    };

  if (item.isDeleted) {
    return (
      <View
        style={[
          styles.messageRow,
          {
            justifyContent:
              isMe
                ? 'flex-end'
                : 'flex-start',
          },
        ]}
      >
        <View
          style={
            styles.deletedBubble
          }
        >
          <Ionicons
            name="ban-outline"
            size={16}
            color="#8FA6B9"
          />

          <Text
            style={
              styles.deletedText
            }
          >
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
          justifyContent:
            isMe
              ? 'flex-end'
              : 'flex-start',

          transform: [
            {
              scale,
            },
          ],
        },
      ]}
    >
      <TouchableOpacity
        activeOpacity={0.88}
        onPress={animate}
        onLongPress={() =>
          onLongPress(item)
        }
      >
        <View
          style={[
            styles.bubble,
            isMe
              ? styles.myBubble
              : styles.otherBubble,
          ]}
        >
          {!isMe &&
            item.senderName && (
              <Text
                style={
                  styles.senderName
                }
              >
                {item.senderName}
              </Text>
            )}


          {/* REPLY */}

          {item.replyToId && (
            <View
              style={
                styles.replyInside
              }
            >
              <View
                style={
                  styles.replyAccent
                }
              />

              <View
                style={{
                  flex: 1,
                }}
              >
                <Text
                  style={
                    styles.replySender
                  }
                >
                  {item.replyToSender ||
                    'User'}
                </Text>

                <Text
                  style={
                    styles.replyMessage
                  }
                  numberOfLines={1}
                >
                  {item.replyToText ||
                    'Message'}
                </Text>
              </View>
            </View>
          )}


          {/* TEXT */}

          {item.type === 'text' && (
            <Text
              style={[
                styles.messageText,
                isMe && {
                  color:
                    '#FFFFFF',
                },
              ]}
            >
              {item.text}
            </Text>
          )}


          {/* FOOTER */}

          <View
            style={
              styles.messageFooter
            }
          >
            {item.isEdited && (
              <Text
                style={
                  styles.edited
                }
              >
                edited
              </Text>
            )}

            <Text
              style={[
                styles.time,
                isMe && {
                  color:
                    'rgba(255,255,255,.7)',
                },
              ]}
            >
              {getTime(
                item.createdAt
              )}
            </Text>

            {isMe && (
              <Ionicons
                name="checkmark-done"
                size={15}
                color="#4FC3FF"
                style={{
                  marginLeft: 4,
                }}
              />
            )}
          </View>


          {/* REACTIONS */}

          {item.reactions &&
            Object.keys(
              item.reactions
            ).length > 0 && (
              <View
                style={
                  styles.reactionBadge
                }
              >
                {[
                  ...new Set(
                    Object.values(
                      item.reactions
                    )
                  ),
                ].map(
                  (emoji) => (
                    <Text
                      key={emoji}
                      style={
                        styles.smallEmoji
                      }
                    >
                      {emoji}
                    </Text>
                  )
                )}
              </View>
            )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}


/* =========================
   MENU BUTTON
========================= */

function MenuButton({
  icon,
  title,
  onPress,
  danger,
}) {
  return (
    <TouchableOpacity
      style={styles.menuButton}
      onPress={onPress}
    >
      <Ionicons
        name={icon}
        size={22}
        color={
          danger
            ? COLORS.danger
            : '#1687FF'
        }
      />

      <Text
        style={[
          styles.menuButtonText,
          danger && {
            color:
              COLORS.danger,
          },
        ]}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );
}


/* =========================
   STYLES
========================= */

const styles =
  StyleSheet.create({

  container: {
    flex: 1,
  },

  flex: {
    flex: 1,
  },

  header: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor:
      'rgba(255,255,255,.06)',
  },

  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent:
      'center',
  },

  headerInfo: {
    flex: 1,
    marginLeft: 3,
  },

  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
  },

  headerSub: {
    fontSize: 12,
    marginTop: 2,
  },

  headerButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent:
      'center',
  },

  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent:
      'center',
  },

  loadingText: {
    fontSize: 14,
  },

  messageList: {
    paddingHorizontal: 12,
    paddingTop: 14,
    paddingBottom: 12,
  },

  messageRow: {
    width: '100%',
    flexDirection: 'row',
    marginBottom: 8,
  },

  bubble: {
    maxWidth: '82%',
    minWidth: 70,
    paddingHorizontal: 12,
    paddingTop: 9,
    paddingBottom: 7,
    borderRadius: 18,
  },

  myBubble: {
    backgroundColor:
      COLORS.mine,
    borderBottomRightRadius: 5,
  },

  otherBubble: {
    backgroundColor:
      COLORS.other,
    borderBottomLeftRadius: 5,
  },

  senderName: {
    color: '#55B8FF',
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 4,
  },

  messageText: {
    color: COLORS.text,
    fontSize: 16,
    lineHeight: 21,
  },

  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent:
      'flex-end',
    marginTop: 4,
  },

  time: {
    color: COLORS.sub,
    fontSize: 10,
  },

  edited: {
    color: COLORS.sub,
    fontSize: 10,
    marginRight: 5,
    fontStyle: 'italic',
  },

  replyInside: {
    flexDirection: 'row',
    marginBottom: 7,
    paddingVertical: 4,
  },

  replyAccent: {
    width: 3,
    borderRadius: 2,
    backgroundColor:
      '#4FC3FF',
    marginRight: 7,
  },

  replySender: {
    color: '#55B8FF',
    fontSize: 11,
    fontWeight: '800',
  },

  replyMessage: {
    color: COLORS.sub,
    fontSize: 11,
    marginTop: 2,
  },

  reactionBadge: {
    position: 'absolute',
    bottom: -9,
    right: 8,
    minHeight: 23,
    paddingHorizontal: 5,
    borderRadius: 12,
    backgroundColor:
      '#263746',
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor:
      'rgba(255,255,255,.12)',
  },

  smallEmoji: {
    fontSize: 13,
    marginHorizontal: 1,
  },

  deletedBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor:
      '#17212B',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 15,
  },

  deletedText: {
    color: COLORS.sub,
    fontSize: 13,
    marginLeft: 6,
    fontStyle: 'italic',
  },

  replyBar: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderTopWidth: 1,
    borderTopColor:
      'rgba(255,255,255,.06)',
  },

  replyLine: {
    width: 3,
    height: 38,
    backgroundColor:
      '#1687FF',
    borderRadius: 2,
  },

  replyInfo: {
    flex: 1,
    marginLeft: 9,
  },

  replyTitle: {
    color: '#1687FF',
    fontSize: 12,
    fontWeight: '800',
  },

  replyPreview: {
    fontSize: 13,
    marginTop: 2,
  },

  editBar: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    gap: 9,
  },

  editText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
  },

  inputArea: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 9,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor:
      'rgba(255,255,255,.06)',
  },

  attachButton: {
    width: 42,
    height: 48,
    alignItems: 'center',
    justifyContent:
      'center',
  },

  inputBox: {
    flex: 1,
    minHeight: 48,
    maxHeight: 120,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 15,
    paddingRight: 7,
  },

  input: {
    flex: 1,
    fontSize: 16,
    maxHeight: 105,
    paddingTop: 11,
    paddingBottom: 10,
  },

  emojiButton: {
    width: 38,
    height: 40,
    alignItems: 'center',
    justifyContent:
      'center',
  },

  emojiText: {
    fontSize: 21,
  },

  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginLeft: 7,
    backgroundColor:
      '#1687FF',
    alignItems: 'center',
    justifyContent:
      'center',
  },

  menuOverlay: {
    flex: 1,
    backgroundColor:
      'rgba(0,0,0,.65)',
    justifyContent:
      'flex-end',
  },

  messageMenu: {
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 28,
  },

  menuTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 14,
  },

  reactionsRow: {
    flexDirection: 'row',
    justifyContent:
      'space-between',
    marginBottom: 12,
  },

  reactionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor:
      'rgba(128,150,165,.15)',
    alignItems: 'center',
    justifyContent:
      'center',
  },

  reactionEmoji: {
    fontSize: 21,
  },

  menuButton: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
  },

  menuButtonText: {
    fontSize: 16,
    color: COLORS.text,
    fontWeight: '600',
  },

  cancelMenu: {
    height: 48,
    borderRadius: 24,
    backgroundColor:
      'rgba(128,150,165,.12)',
    alignItems: 'center',
    justifyContent:
      'center',
    marginTop: 8,
  },

  cancelText: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '700',
  },

});
