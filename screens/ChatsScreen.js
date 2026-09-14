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
  onSnapshot,
  doc,
  setDoc,
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

  const [openingChat, setOpeningChat] =
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
     REALTIME PRIVATE CHATS
  ========================= */

  useEffect(() => {
    if (!currentUser?.uid) {
      setPrivateChats([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const chatsRef = collection(
      db,
      'users',
      currentUser.uid,
      'user_chats'
    );

    const chatsQuery = query(
      chatsRef,
      where(
        'type',
        '==',
        'private'
      )
    );

    const unsubscribe = onSnapshot(
      chatsQuery,
      (snapshot) => {
        const chats = [];

        snapshot.forEach((item) => {
          chats.push({
            id: item.id,
            ...item.data(),
          });
        });

        chats.sort(
          (a, b) => {
            return (
              getTime(
                b.lastMessageTime ||
                b.updatedAt
              ) -
              getTime(
                a.lastMessageTime ||
                a.updatedAt
              )
            );
          }
        );

        setPrivateChats(chats);
        setLoading(false);
      },
      (error) => {
        console.log(
          'User chats error:',
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
     NORMALIZE USERNAME
  ========================= */

  const normalizeUsername = (
    value
  ) => {
    let username =
      String(value || '')
        .trim()
        .toLowerCase();

    if (username.startsWith('@')) {
      username =
        username.substring(1);
    }

    return username;
  };


  /* =========================
     SEARCH USER
  ========================= */

  const handleSearch = async () => {
    const username =
      normalizeUsername(
        searchQuery
      );

    if (!username) {
      Alert.alert(
        'Username required',
        'Pehle @username enter karo.'
      );
      return;
    }

    if (!currentUser?.uid) {
      Alert.alert(
        'Login required',
        'Pehle login karo.'
      );
      return;
    }

    if (
      username.length < 3
    ) {
      Alert.alert(
        'Invalid username',
        'Username kam se kam 3 characters ka hona chahiye.'
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
          'usernameLower',
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
        friendId ===
        currentUser.uid
      ) {
        Alert.alert(
          'Oops!',
          'Tum khud ko chat nahi kar sakte.'
        );

        setSearching(false);
        return;
      }

      setSearchResult({
        uid: friendId,

        username:
          data.username ||
          `@${username}`,

        name:
          data.name ||
          data.displayName ||
          data.username ||
          `@${username}`,

        avatar:
          data.avatar ||
          data.photoURL ||
          '',
      });

    } catch (error) {
      console.log(
        'Search error:',
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
     CREATE PRIVATE CHAT
  ========================= */

  const createPrivateChat = async (
    friend
  ) => {
    if (
      !currentUser?.uid ||
      !friend?.uid
    ) {
      return null;
    }

    const myId =
      currentUser.uid;

    const friendId =
      friend.uid;

    const chatId =
      myId < friendId
        ? `${myId}_${friendId}`
        : `${friendId}_${myId}`;

    const myUsername =
      normalizeUsername(
        currentUser.displayName ||
        currentUser.email ||
        'user'
      );

    const myProfileRef =
      doc(
        db,
        'users',
        myId
      );

    const friendProfileRef =
      doc(
        db,
        'users',
        friendId
      );

    let myProfile = null;

    try {
      const myProfileSnap =
        await getDocs(
          query(
            collection(db, 'users'),
            where(
              'uid',
              '==',
              myId
            )
          )
        );

      if (
        !myProfileSnap.empty
      ) {
        myProfile =
          myProfileSnap.docs[0].data();
      }
    } catch (error) {
      console.log(
        'My profile lookup error:',
        error
      );
    }

    const myName =
      myProfile?.name ||
      myProfile?.displayName ||
      currentUser.displayName ||
      currentUser.email ||
      'Nax User';

    const myUsernameValue =
      myProfile?.username ||
      `@${myUsername}`;

    const myChatRef =
      doc(
        db,
        'users',
        myId,
        'user_chats',
        chatId
      );

    const friendChatRef =
      doc(
        db,
        'users',
        friendId,
        'user_chats',
        chatId
      );

    await Promise.all([
      setDoc(
        myChatRef,
        {
          chatId,
          type: 'private',

          friendId,

          friendName:
            friend.name ||
            'Nax User',

          friendUsername:
            friend.username ||
            '',

          friendAvatar:
            friend.avatar ||
            '',

          updatedAt:
            serverTimestamp(),
        },
        {
          merge: true,
        }
      ),

      setDoc(
        friendChatRef,
        {
          chatId,
          type: 'private',

          friendId: myId,

          friendName:
            myName,

          friendUsername:
            myUsernameValue,

          friendAvatar:
            myProfile?.avatar ||
            myProfile?.photoURL ||
            '',

          updatedAt:
            serverTimestamp(),
        },
        {
          merge: true,
        }
      ),
    ]);

    return chatId;
  };


  /* =========================
     OPEN SEARCH RESULT
  ========================= */

  const openNewChat = async (
    friend
  ) => {
    if (
      openingChat ||
      !currentUser?.uid ||
      !friend?.uid
    ) {
      return;
    }

    setOpeningChat(true);

    try {
      const chatId =
        await createPrivateChat(
          friend
        );

      if (!chatId) {
        throw new Error(
          'Chat ID create nahi hua.'
        );
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

          friendAvatar:
            friend.avatar,
        }
      );
    } catch (error) {
      console.log(
        'Open new chat error:',
        error
      );

      Alert.alert(
        'Chat Error',
        'Private chat start nahi ho paayi.'
      );
    }

    setOpeningChat(false);
  };


  /* =========================
     OPEN EXISTING CHAT
  ========================= */

  const openChat = (
    item
  ) => {
    const friendId =
      item.friendId ||
      item.otherUserId ||
      item.userId ||
      '';

    const chatId =
      item.chatId ||
      item.id;

    navigation.navigate(
      'ChatRoom',
      {
        chatId,

        chatName:
          item.friendName ||
          item.name ||
          item.displayName ||
          item.username ||
          'Nax User',

        friendId,

        friendUsername:
          item.friendUsername ||
          item.username ||
          '',

        friendAvatar:
          item.friendAvatar ||
          item.avatar ||
          '',
      }
    );
  };


  /* =========================
     CHAT NAME
  ========================= */

  const getChatName = (
    item
  ) => {
    return (
      item.friendName ||
      item.name ||
      item.displayName ||
      item.friendUsername ||
      item.username ||
      'Nax User'
    );
  };


  /* =========================
     LAST MESSAGE
  ========================= */

  const getLastMessage = (
    item
  ) => {
    if (
      item.lastMessage !==
      undefined
    ) {
      return (
        item.lastMessage ||
        'No messages yet'
      );
    }

    if (item.message) {
      return item.message;
    }

    if (item.lastText) {
      return item.lastText;
    }

    const username =
      item.friendUsername ||
      item.username;

    if (username) {
      return `@${normalizeUsername(username)}`;
    }

    return 'Start chatting';
  };


  /* =========================
     UNREAD
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

    if (
      typeof item.unreadCount ===
      'number'
    ) {
      return item.unreadCount;
    }

    return 0;
  };


  /* =========================
     AVATAR
  ========================= */

  const getAvatar = (
    item
  ) => {
    const avatar =
      item.friendAvatar ||
      item.avatar ||
      item.photoURL;

    if (avatar) {
      return {
        uri: avatar,
      };
    }

    const name =
      encodeURIComponent(
        getChatName(item)
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
          source={getAvatar(item)}
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
          disabled={openingChat}
        >
          <Image
            source={getAvatar({
              name:
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
              {searchResult.username
                ?.startsWith('@')
                ? searchResult.username
                : `@${searchResult.username}`}
            </Text>
          </View>

          <View
            style={styles.chatButton}
          >
            {openingChat ? (
              <ActivityIndicator
                size="small"
                color="#FFFFFF"
              />
            ) : (
              <>
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
              </>
            )}
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

    Alert.alert(
      'New Private Chat',
      'Upar @username search karo aur user ko select karo.'
    );
  };


  /* =========================
     GLOBAL CARD
  ========================= */

  const renderGlobalCard = () => {
    return (
      <TouchableOpacity
        activeOpacity={0.84}
        style={[
          styles.globalCard,
          {
            backgroundColor:
              isDark
                ? '#10362E'
                : '#EAF8F2',

            borderColor:
              isDark
                ? 'rgba(60,220,150,0.18)'
                : 'rgba(24,166,106,0.12)',
          },
        ]}
        onPress={
          openGlobalRoom
        }
      >
        <View
          style={[
            styles.globalIcon,
            {
              backgroundColor:
                '#18A66A',
            },
          ]}
        >
          <Ionicons
            name="earth"
            size={27}
            color="#FFFFFF"
          />
        </View>

        <View
          style={styles.globalInfo}
        >
          <Text
            style={[
              styles.globalTitle,
              {
                color:
                  textMain,
              },
            ]}
          >
            Global Chat
          </Text>

          <Text
            style={[
              styles.globalText,
              {
                color:
                  textSub,
              },
            ]}
            numberOfLines={2}
          >
            Chat with everyone
            on Nax Chat
          </Text>
        </View>

        <View
          style={styles.globalArrow}
        >
          <Ionicons
            name="arrow-forward"
            size={20}
            color="#18A66A"
          />
        </View>
      </TouchableOpacity>
    );
  };


  /* =========================
     EMPTY PRIVATE CHATS
  ========================= */

  const renderEmptyState = () => {
    return (
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
          Search a friend by
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
    );
  };


  /* =========================
     LIST HEADER
  ========================= */

  const renderListHeader = () => {
    return (
      <View>
        {renderSearchResult()}

        {privateChats.length > 0 && (
          <Text
            style={[
              styles.sectionTitle,
              {
                color:
                  textSub,
              },
            ]}
          >
            PRIVATE CHATS
          </Text>
        )}
      </View>
    );
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
          <View>
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

            <Text
              style={[
                styles.subtitle,
                {
                  color:
                    textSub,
                },
              ]}
            >
              Your private conversations
            </Text>
          </View>

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


        {/* USERNAME SEARCH */}

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

          {searchQuery.length > 0 && (
            <TouchableOpacity
              style={
                styles.clearButton
              }
              onPress={() => {
                setSearchQuery('');
                setSearchResult(null);
              }}
            >
              <Ionicons
                name="close-circle"
                size={20}
                color={textSub}
              />
            </TouchableOpacity>
          )}

          {searching && (
            <ActivityIndicator
              size="small"
              color={blue}
              style={
                styles.searchLoader
              }
            />
          )}
        </View>
      </View>


      {/* MAIN CONTENT */}

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
      ) : (
        <FlatList
          data={privateChats}
          keyExtractor={(item) =>
            item.id
          }
          renderItem={
            renderChatItem
          }
          ListHeaderComponent={
            renderListHeader
          }
          ListEmptyComponent={
            renderEmptyState
          }
          ListFooterComponent={
            <View
              style={
                styles.globalSection
              }
            >
              {renderGlobalCard()}
            </View>
          }
          contentContainerStyle={
            styles.chatList
          }
          showsVerticalScrollIndicator={
            false
          }
          keyboardShouldPersistTaps="handled"
        />
      )}


      {/* NEW MENU */}

      <Modal
        visible={showNewMenu}
        transparent
        animationType="slide"
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


            {/* PRIVATE */}

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
                  Global Chat
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
   DATE
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

  if (
    date.toDateString() ===
    now.toDateString()
  ) {
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

  subtitle: {
    marginTop: 2,
    fontSize: 12,
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

  clearButton: {
    padding: 4,
  },

  searchLoader: {
    marginLeft: 8,
  },

  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginTop: 3,
    marginBottom: 10,
  },

  resultBox: {
    marginBottom: 14,
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
    minWidth: 68,
    height: 38,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor:
      '#1687FF',
    paddingHorizontal: 12,
    borderRadius: 19,
  },

  chatButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },

  chatList: {
    padding: 14,
    paddingBottom: 115,
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

  globalSection: {
    marginTop: 5,
  },

  globalCard: {
    minHeight: 82,
    padding: 13,
    borderRadius: 19,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },

  globalIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },

  globalInfo: {
    flex: 1,
    marginLeft: 13,
  },

  globalTitle: {
    fontSize: 17,
    fontWeight: '800',
  },

  globalText: {
    marginTop: 4,
    fontSize: 13,
  },

  globalArrow: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor:
      'rgba(24,166,106,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
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
    minHeight: 390,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 35,
    paddingTop: 35,
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
