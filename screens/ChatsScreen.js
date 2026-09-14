import React, {
  useEffect,
  useState,
} from 'react';

import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  Modal,
  Keyboard,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { useTheme } from
  '../context/ThemeContext';

import {
  db,
  auth,
} from '../firebaseConfig';

import {
  collection,
  query,
  where,
  getDocs,
  doc,
  setDoc,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';


export default function ChatsScreen({
  navigation,
}) {
  const { isDark } = useTheme();

  const [searchQuery, setSearchQuery] =
    useState('');

  const [privateChats, setPrivateChats] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [searching, setSearching] =
    useState(false);

  const [searchResult, setSearchResult] =
    useState(null);

  const [showNewMenu, setShowNewMenu] =
    useState(false);

  const currentUser = auth.currentUser;


  /* =========================
     COLORS
  ========================= */

  const bg = isDark
    ? '#071521'
    : '#F3F7FA';

  const headerBg = isDark
    ? '#0D2635'
    : '#FFFFFF';

  const cardBg = isDark
    ? '#132B3B'
    : '#FFFFFF';

  const inputBg = isDark
    ? '#1A3447'
    : '#EEF3F7';

  const textMain = isDark
    ? '#F5F9FC'
    : '#142532';

  const textSub = isDark
    ? '#8EAABD'
    : '#6C8494';

  const border = isDark
    ? 'rgba(255,255,255,0.08)'
    : 'rgba(0,0,0,0.06)';

  const blue = '#1687FF';


  /* =========================
     FIREBASE REALTIME CHATS
  ========================= */

  useEffect(() => {
    if (!currentUser?.uid) {
      setPrivateChats([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const chatsRef =
      collection(db, 'chats');

    const chatsQuery = query(
      chatsRef,
      where(
        'participants',
        'array-contains',
        currentUser.uid
      )
    );

    const unsubscribe =
      onSnapshot(
        chatsQuery,
        (snapshot) => {
          const chats = [];

          snapshot.forEach((item) => {
            const data = item.data();

            chats.push({
              id: item.id,
              ...data,
            });
          });

          chats.sort(
            (a, b) => {
              const aTime =
                getTime(
                  a.lastMessageTime
                );

              const bTime =
                getTime(
                  b.lastMessageTime
                );

              return bTime - aTime;
            }
          );

          setPrivateChats(chats);
          setLoading(false);
        },
        (error) => {
          console.log(
            'Chats listener error:',
            error
          );

          setLoading(false);

          Alert.alert(
            'Chat Error',
            'Chat list load nahi ho paayi.'
          );
        }
      );

    return () => {
      unsubscribe();
    };
  }, [currentUser?.uid]);


  /* =========================
     USER SEARCH
  ========================= */

  const handleSearch = async () => {
    let username =
      searchQuery
        .trim()
        .toLowerCase();

    if (!username) {
      Alert.alert(
        'Username required',
        'Pehle @username enter karo.'
      );

      return;
    }

    if (username.startsWith('@')) {
      username =
        username.substring(1);
    }

    if (!currentUser?.uid) {
      Alert.alert(
        'Login required',
        'Pehle login karo.'
      );

      return;
    }

    Keyboard.dismiss();

    setSearching(true);
    setSearchResult(null);

    try {
      const usersRef =
        collection(db, 'users');

      const userQuery = query(
        usersRef,
        where(
          'username',
          '==',
          username
        )
      );

      const snapshot =
        await getDocs(userQuery);

      if (snapshot.empty) {
        Alert.alert(
          'User Not Found',
          `@${username} nahi mila.`
        );

        setSearching(false);
        return;
      }

      const userDoc =
        snapshot.docs[0];

      const data =
        userDoc.data();

      const friendId =
        data.uid || userDoc.id;

      if (
        friendId === currentUser.uid
      ) {
        Alert.alert(
          'Oops!',
          'Tum khud ko chat nahi kar sakte.'
        );

        setSearching(false);
        return;
      }

      const friend = {
        uid: friendId,

        username:
          data.username ||
          username,

        name:
          data.name ||
          data.displayName ||
          data.username ||
          username,

        avatar:
          data.avatar ||
          data.photoURL ||
          '',
      };

      setSearchResult(friend);

    } catch (error) {
      console.log(
        'User search error:',
        error
      );

      Alert.alert(
        'Search Error',
        'User search nahi ho paayi.'
      );
    }

    setSearching(false);
  };


  /* =========================
     CHAT ID
  ========================= */

  const getChatId = (
    friendId
  ) => {
    const myId =
      currentUser.uid;

    if (myId < friendId) {
      return `${myId}_${friendId}`;
    }

    return `${friendId}_${myId}`;
  };


  /* =========================
     CREATE / SAVE CHAT
  ========================= */

  const createChat = async (
    friend
  ) => {
    if (!currentUser?.uid) {
      return null;
    }

    const chatId =
      getChatId(friend.uid);

    const chatRef =
      doc(db, 'chats', chatId);

    try {
      await setDoc(
        chatRef,
        {
          chatId,

          participants: [
            currentUser.uid,
            friend.uid,
          ],

          participantIds: [
            currentUser.uid,
            friend.uid,
          ],

          users: {
            [currentUser.uid]: {
              name:
                currentUser.displayName ||
                'Nax User',

              uid:
                currentUser.uid,
            },

            [friend.uid]: {
              name:
                friend.name,

              username:
                friend.username,

              avatar:
                friend.avatar,

              uid:
                friend.uid,
            },
          },

          updatedAt:
            serverTimestamp(),
        },
        {
          merge: true,
        }
      );

      return chatId;

    } catch (error) {
      console.log(
        'Create chat error:',
        error
      );

      Alert.alert(
        'Chat Error',
        'Chat create nahi ho paayi.'
      );

      return null;
    }
  };


  /* =========================
     OPEN NEW CHAT
  ========================= */

  const openNewChat = async (
    friend
  ) => {
    const chatId =
      await createChat(friend);

    if (!chatId) {
      return;
    }

    setSearchResult(null);
    setSearchQuery('');
    setShowNewMenu(false);

    navigation.navigate(
      'ChatRoom',
      {
        chatId,

        chatName:
          friend.name,

        friendId:
          friend.uid,

        friendUsername:
          friend.username,
      }
    );
  };


  /* =========================
     OPEN EXISTING CHAT
  ========================= */

  const openChat = (
    item
  ) => {
    const myId =
      currentUser?.uid;

    const participants =
      item.participants || [];

    let friendId =
      item.friendId || '';

    if (!friendId) {
      friendId =
        participants.find(
          (id) => id !== myId
        ) || '';
    }

    let friendName =
      item.friendName ||
      item.name ||
      'Nax User';

    let friendUsername =
      item.friendUsername ||
      item.username ||
      '';

    let friendAvatar =
      item.friendAvatar ||
      item.avatar ||
      '';

    if (
      item.users &&
      friendId &&
      item.users[friendId]
    ) {
      const friend =
        item.users[friendId];

      friendName =
        friend.name ||
        friendName;

      friendUsername =
        friend.username ||
        friendUsername;

      friendAvatar =
        friend.avatar ||
        friendAvatar;
    }

    navigation.navigate(
      'ChatRoom',
      {
        chatId:
          item.chatId ||
          item.id,

        chatName:
          friendName,

        friendId,

        friendUsername,

        friendAvatar,
      }
    );
  };


  /* =========================
     AVATAR
  ========================= */

  const getAvatar = (
    item
  ) => {
    if (item.avatar) {
      return {
        uri: item.avatar,
      };
    }

    if (item.friendAvatar) {
      return {
        uri: item.friendAvatar,
      };
    }

    const name =
      encodeURIComponent(
        item.friendName ||
        item.name ||
        'Nax User'
      );

    return {
      uri:
        'https://ui-avatars.com/api/' +
        `?name=${name}` +
        '&background=1687FF' +
        '&color=ffffff',
    };
  };


  /* =========================
     CHAT NAME
  ========================= */

  const getChatName = (
    item
  ) => {
    if (item.friendName) {
      return item.friendName;
    }

    if (item.name) {
      return item.name;
    }

    const myId =
      currentUser?.uid;

    const participants =
      item.participants || [];

    const friendId =
      participants.find(
        (id) => id !== myId
      );

    if (
      item.users &&
      friendId &&
      item.users[friendId]
    ) {
      return (
        item.users[friendId].name ||
        item.users[friendId].username ||
        'Nax User'
      );
    }

    return 'Nax User';
  };


  /* =========================
     CHAT USERNAME
  ========================= */

  const getUsername = (
    item
  ) => {
    if (item.friendUsername) {
      return item.friendUsername;
    }

    if (item.username) {
      return item.username;
    }

    const myId =
      currentUser?.uid;

    const participants =
      item.participants || [];

    const friendId =
      participants.find(
        (id) => id !== myId
      );

    if (
      item.users &&
      friendId &&
      item.users[friendId]
    ) {
      return (
        item.users[friendId]
          .username || ''
      );
    }

    return '';
  };


  /* =========================
     LAST MESSAGE
  ========================= */

  const getLastMessage = (
    item
  ) => {
    if (
      item.lastMessage !==
      undefined &&
      item.lastMessage !== null
    ) {
      if (
        item.lastMessage === ''
      ) {
        return 'No messages yet';
      }

      return item.lastMessage;
    }

    if (item.message) {
      return item.message;
    }

    if (item.lastText) {
      return item.lastText;
    }

    const username =
      getUsername(item);

    if (username) {
      return `@${username}`;
    }

    return 'Start chatting';
  };


  /* =========================
     UNREAD COUNT
  ========================= */

  const getUnread = (
    item
  ) => {
    if (
      item.unread &&
      typeof item.unread ===
        'object'
    ) {
      return (
        item.unread[
          currentUser?.uid
        ] || 0
      );
    }

    if (
      item.unreadCount &&
      typeof item.unreadCount ===
        'object'
    ) {
      return (
        item.unreadCount[
          currentUser?.uid
        ] || 0
      );
    }

    if (
      typeof item.unread ===
        'number'
    ) {
      return item.unread;
    }

    return 0;
  };


  /* =========================
     CHAT ITEM
  ========================= */

  const renderChatItem = ({
    item,
  }) => {
    const chatName =
      getChatName(item);

    const lastMessage =
      getLastMessage(item);

    const unread =
      getUnread(item);

    return (
      <TouchableOpacity
        activeOpacity={0.82}
        style={[
          styles.chatCard,
          {
            backgroundColor:
              cardBg,
            borderColor:
              border,
          },
        ]}
        onPress={() =>
          openChat(item)
        }
      >
        <Image
          source={getAvatar({
            ...item,
            friendName:
              chatName,
          })}
          style={styles.avatar}
        />

        <View
          style={styles.chatInfo}
        >
          <View
            style={styles.chatTop}
          >
            <Text
              style={[
                styles.chatName,
                {
                  color:
                    textMain,
                },
              ]}
              numberOfLines={1}
            >
              {chatName}
            </Text>

            <Text
              style={[
                styles.chatTime,
                {
                  color:
                    textSub,
                },
              ]}
            >
              {formatDate(
                item.lastMessageTime ||
                item.updatedAt
              )}
            </Text>
          </View>

          <View
            style={styles.chatBottom}
          >
            <Text
              style={[
                styles.chatMessage,
                {
                  color:
                    textSub,
                },
              ]}
              numberOfLines={1}
            >
              {lastMessage}
            </Text>

            {unread > 0 && (
              <View
                style={styles.unread}
              >
                <Text
                  style={
                    styles.unreadText
                  }
                >
                  {unread > 99
                    ? '99+'
                    : unread}
                </Text>
              </View>
            )}
          </View>
        </View>

        <Ionicons
          name="chevron-forward"
          size={18}
          color={textSub}
        />
      </TouchableOpacity>
    );
  };


  /* =========================
     SEARCH RESULT
  ========================= */

  const renderSearchResult = () => {
    if (!searchResult) {
      return null;
    }

    return (
      <View
        style={[
          styles.resultBox,
          {
            backgroundColor:
              cardBg,
            borderColor:
              border,
          },
        ]}
      >
        <View
          style={styles.resultHeader}
        >
          <Text
            style={[
              styles.resultTitle,
              {
                color:
                  textMain,
              },
            ]}
          >
            User Found
          </Text>

          <TouchableOpacity
            onPress={() =>
              setSearchResult(null)
            }
          >
            <Ionicons
              name="close"
              size={22}
              color={textSub}
            />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          activeOpacity={0.8}
          style={styles.resultUser}
          onPress={() =>
            openNewChat(
              searchResult
            )
          }
        >
          <Image
            source={getAvatar({
              friendName:
                searchResult.name,

              avatar:
                searchResult.avatar,
            })}
            style={
              styles.resultAvatar
            }
          />

          <View
            style={styles.resultInfo}
          >
            <Text
              style={[
                styles.resultName,
                {
                  color:
                    textMain,
                },
              ]}
              numberOfLines={1}
            >
              {searchResult.name}
            </Text>

            <Text
              style={[
                styles.resultUsername,
                {
                  color:
                    blue,
                },
              ]}
            >
              @{searchResult.username}
            </Text>
          </View>

          <View
            style={styles.chatButton}
          >
            <Ionicons
              name="chatbubble"
              size={17}
              color="#FFFFFF"
            />

            <Text
              style={
                styles.chatButtonText
              }
            >
              Chat
            </Text>
          </View>
        </TouchableOpacity>
      </View>
    );
  };


  /* =========================
     GLOBAL ROOM
  ========================= */

  const openGlobalRoom = () => {
    setShowNewMenu(false);

    navigation.navigate(
      'ChatRoom',
      {
        chatId:
          'global_chats',

        chatName:
          'Global Room',
      }
    );
  };


  /* =========================
     NEW PRIVATE CHAT
  ========================= */

  const startNewChat = () => {
    setShowNewMenu(false);

    setTimeout(() => {
      Alert.alert(
        'New Private Chat',
        'Upar @username search karo.'
      );
    }, 200);
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

            borderBottomColor:
              border,
          },
        ]}
      >
        <View
          style={styles.titleRow}
        >
          <Text
            style={[
              styles.title,
              {
                color:
                  textMain,
              },
            ]}
          >
            Chats
          </Text>

          <TouchableOpacity
            activeOpacity={0.8}
            style={
              styles.newButton
            }
            onPress={() =>
              setShowNewMenu(true)
            }
          >
            <Ionicons
              name="add"
              size={21}
              color="#FFFFFF"
            />

            <Text
              style={styles.newText}
            >
              New
            </Text>
          </TouchableOpacity>
        </View>


        {/* SEARCH */}

        <View
          style={[
            styles.searchBox,
            {
              backgroundColor:
                inputBg,
            },
          ]}
        >
          <Ionicons
            name="search"
            size={21}
            color={textSub}
          />

          <TextInput
            style={[
              styles.searchInput,
              {
                color:
                  textMain,
              },
            ]}
            placeholder=
              "@username search..."
            placeholderTextColor={
              textSub
            }
            value={searchQuery}
            onChangeText={(text) => {
              setSearchQuery(text);
              setSearchResult(null);
            }}
            onSubmitEditing={
              handleSearch
            }
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />

          {searching ? (
            <ActivityIndicator
              size="small"
              color={blue}
            />
          ) : (
            <TouchableOpacity
              style={
                styles.findButton
              }
              onPress={
                handleSearch
              }
            >
              <Text
                style={[
                  styles.findText,
                  {
                    color:
                      blue,
                  },
                ]}
              >
                Find
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>


      {/* SEARCH RESULT */}

      {renderSearchResult()}


      {/* CHAT LIST */}

      {loading ? (
        <View
          style={styles.loading}
        >
          <ActivityIndicator
            size="large"
            color={blue}
          />

          <Text
            style={[
              styles.loadingText,
              {
                color:
                  textSub,
              },
            ]}
          >
            Loading chats...
          </Text>
        </View>
      ) : privateChats.length === 0 ? (
        <View
          style={styles.emptyState}
        >
          <View
            style={[
              styles.emptyIcon,
              {
                backgroundColor:
                  isDark
                    ? '#122B3B'
                    : '#E5F1FB',
              },
            ]}
          >
            <Ionicons
              name="chatbubbles-outline"
              size={52}
              color={blue}
            />
          </View>

          <Text
            style={[
              styles.emptyTitle,
              {
                color:
                  textMain,
              },
            ]}
          >
            No Private Chats Yet
          </Text>

          <Text
            style={[
              styles.emptyText,
              {
                color:
                  textSub,
              },
            ]}
          >
            Find a friend by
            @username and start
            chatting.
          </Text>

          <TouchableOpacity
            activeOpacity={0.8}
            style={
              styles.emptyButton
            }
            onPress={() =>
              setShowNewMenu(true)
            }
          >
            <Ionicons
              name="add"
              size={20}
              color="#FFFFFF"
            />

            <Text
              style={
                styles.emptyButtonText
              }
            >
              Start New Chat
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={privateChats}
          keyExtractor={(item) =>
            item.id
          }
          renderItem={
            renderChatItem
          }
          contentContainerStyle={
            styles.chatList
          }
          showsVerticalScrollIndicator={
            false
          }
        />
      )}


      {/* GLOBAL ROOM */}

      <TouchableOpacity
        activeOpacity={0.85}
        style={styles.fab}
        onPress={
          openGlobalRoom
        }
      >
        <Ionicons
          name="earth"
          size={27}
          color="#FFFFFF"
        />
      </TouchableOpacity>


      {/* NEW MENU */}

      <Modal
        visible={showNewMenu}
        transparent
        animationType="fade"
        onRequestClose={() =>
          setShowNewMenu(false)
        }
      >
        <TouchableOpacity
          activeOpacity={1}
          style={
            styles.modalOverlay
          }
          onPress={() =>
            setShowNewMenu(false)
          }
        >
          <TouchableOpacity
            activeOpacity={1}
            style={[
              styles.newMenu,
              {
                backgroundColor:
                  cardBg,
              },
            ]}
          >
            <View
              style={
                styles.menuHandle
              }
            />

            <Text
              style={[
                styles.menuTitle,
                {
                  color:
                    textMain,
                },
              ]}
            >
              New
            </Text>

            <Text
              style={[
                styles.menuSubtitle,
                {
                  color:
                    textSub,
                },
              ]}
            >
              Start something new
            </Text>


            {/* PRIVATE CHAT */}

            <TouchableOpacity
              activeOpacity={0.8}
              style={
                styles.menuItem
              }
              onPress={
                startNewChat
              }
            >
              <View
                style={[
                  styles.menuIcon,
                  {
                    backgroundColor:
                      '#1687FF',
                  },
                ]}
              >
                <Ionicons
                  name="person"
                  size={22}
                  color="#FFFFFF"
                />
              </View>

              <View
                style={
                  styles.menuInfo
                }
              >
                <Text
                  style={[
                    styles.menuItemTitle,
                    {
                      color:
                        textMain,
                    },
                  ]}
                >
                  New Private Chat
                </Text>

                <Text
                  style={[
                    styles.menuItemText,
                    {
                      color:
                        textSub,
                    },
                  ]}
                >
                  Find someone by
                  @username
                </Text>
              </View>

              <Ionicons
                name="chevron-forward"
                size={20}
                color={textSub}
              />
            </TouchableOpacity>


            {/* GLOBAL */}

            <TouchableOpacity
              activeOpacity={0.8}
              style={
                styles.menuItem
              }
              onPress={
                openGlobalRoom
              }
            >
              <View
                style={[
                  styles.menuIcon,
                  {
                    backgroundColor:
                      '#18A66A',
                  },
                ]}
              >
                <Ionicons
                  name="earth"
                  size={22}
                  color="#FFFFFF"
                />
              </View>

              <View
                style={
                  styles.menuInfo
                }
              >
                <Text
                  style={[
                    styles.menuItemTitle,
                    {
                      color:
                        textMain,
                    },
                  ]}
                >
                  Global Room
                </Text>

                <Text
                  style={[
                    styles.menuItemText,
                    {
                      color:
                        textSub,
                    },
                  ]}
                >
                  Chat with everyone
                </Text>
              </View>

              <Ionicons
                name="chevron-forward"
                size={20}
                color={textSub}
              />
            </TouchableOpacity>


            {/* CANCEL */}

            <TouchableOpacity
              activeOpacity={0.8}
              style={[
                styles.cancelButton,
                {
                  borderColor:
                    border,
                },
              ]}
              onPress={() =>
                setShowNewMenu(false)
              }
            >
              <Text
                style={[
                  styles.cancelText,
                  {
                    color:
                      textMain,
                  },
                ]}
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
   FIREBASE TIME
========================= */

function getTime(value) {
  if (!value) {
    return 0;
  }

  if (
    typeof value.toMillis ===
    'function'
  ) {
    return value.toMillis();
  }

  if (
    typeof value.seconds ===
    'number'
  ) {
    return value.seconds * 1000;
  }

  if (
    typeof value === 'number'
  ) {
    return value;
  }

  return 0;
}


/* =========================
   DATE FORMAT
========================= */

function formatDate(value) {
  const time =
    getTime(value);

  if (!time) {
    return '';
  }

  const date =
    new Date(time);

  const now =
    new Date();

  const sameDay =
    date.toDateString() ===
    now.toDateString();

  if (sameDay) {
    return date.toLocaleTimeString(
      [],
      {
        hour: '2-digit',
        minute: '2-digit',
      }
    );
  }

  return date.toLocaleDateString(
    [],
    {
      day: 'numeric',
      month: 'short',
    }
  );
}


/* =========================
   STYLES
========================= */

const styles = StyleSheet.create({

  container: {
    flex: 1,
  },

  header: {
    paddingTop: 18,
    paddingHorizontal: 18,
    paddingBottom: 15,
    borderBottomWidth: 1,
  },

  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent:
      'space-between',
    marginBottom: 16,
  },

  title: {
    fontSize: 30,
    fontWeight: '800',
  },

  newButton: {
    height: 42,
    paddingHorizontal: 14,
    borderRadius: 21,
    backgroundColor:
      '#1687FF',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },

  newText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },

  searchBox: {
    height: 50,
    borderRadius: 15,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },

  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: 16,
    marginLeft: 10,
  },

  findButton: {
    paddingLeft: 8,
    paddingVertical: 8,
  },

  findText: {
    fontSize: 15,
    fontWeight: '800',
  },

  resultBox: {
    margin: 14,
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
  },

  resultHeader: {
    flexDirection: 'row',
    justifyContent:
      'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },

  resultTitle: {
    fontSize: 15,
    fontWeight: '800',
  },

  resultUser: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  resultAvatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
  },

  resultInfo: {
    flex: 1,
    marginLeft: 12,
  },

  resultName: {
    fontSize: 16,
    fontWeight: '800',
  },

  resultUsername: {
    marginTop: 3,
    fontSize: 14,
    fontWeight: '600',
  },

  chatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor:
      '#1687FF',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 18,
  },

  chatButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },

  chatList: {
    padding: 14,
    paddingBottom: 110,
  },

  chatCard: {
    minHeight: 76,
    padding: 12,
    borderRadius: 17,
    borderWidth: 1,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },

  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },

  chatInfo: {
    flex: 1,
    marginLeft: 13,
    marginRight: 8,
  },

  chatTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  chatName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '800',
  },

  chatTime: {
    fontSize: 11,
    marginLeft: 6,
  },

  chatBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },

  chatMessage: {
    flex: 1,
    fontSize: 14,
  },

  unread: {
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    borderRadius: 10,
    backgroundColor:
      '#1687FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },

  unreadText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },

  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  loadingText: {
    marginTop: 10,
    fontSize: 14,
  },

  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 35,
    paddingBottom: 50,
  },

  emptyIcon: {
    width: 92,
    height: 92,
    borderRadius: 46,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },

  emptyTitle: {
    fontSize: 21,
    fontWeight: '800',
    textAlign: 'center',
  },

  emptyText: {
    marginTop: 9,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },

  emptyButton: {
    marginTop: 22,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor:
      '#1687FF',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 23,
  },

  emptyButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },

  fab: {
    position: 'absolute',
    right: 22,
    bottom: 28,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor:
      '#1687FF',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 7,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor:
      'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },

  newMenu: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 30,
  },

  menuHandle: {
    width: 42,
    height: 5,
    borderRadius: 3,
    backgroundColor:
      '#71808A',
    alignSelf: 'center',
    marginBottom: 18,
  },

  menuTitle: {
    fontSize: 24,
    fontWeight: '800',
  },

  menuSubtitle: {
    marginTop: 4,
    marginBottom: 18,
    fontSize: 14,
  },

  menuItem: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
  },

  menuIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },

  menuInfo: {
    flex: 1,
    marginLeft: 13,
  },

  menuItemTitle: {
    fontSize: 16,
    fontWeight: '800',
  },

  menuItemText: {
    marginTop: 4,
    fontSize: 13,
  },

  cancelButton: {
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },

  cancelText: {
    fontSize: 15,
    fontWeight: '700',
  },

});
