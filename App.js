import React, {
  useEffect,
  useRef,
  useState
} from 'react';

import {
  AppState,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator
} from 'react-native';

import {
  NavigationContainer,
  createNavigationContainerRef
} from '@react-navigation/native';

import {
  createNativeStackNavigator
} from '@react-navigation/native-stack';

import {
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
  addDoc
} from 'firebase/firestore';

import {
  onAuthStateChanged
} from 'firebase/auth';

import {
  ThemeProvider,
  useTheme
} from './context/ThemeContext';

import {
  auth,
  db
} from './firebaseConfig';

import {
  acceptP2PTransfer,
  attachFileReceiver,
  saveReceivedFile,
  markP2PTransferFailed,
  markP2PTransferCompleted
} from './utils/webrtcFileTransfer';

// --- EXISTING SCREENS ---
import ChatsScreen from './screens/ChatsScreen';
import MomentsScreen from './screens/MomentsScreen';
import WalletScreen from './screens/WalletScreen';
import ChatRoomScreen from './screens/ChatRoomScreen';
import AuthScreen from './screens/AuthScreen';
import TicTacToeScreen from './screens/TicTacToeScreen';
import NaxStudioScreen from './screens/NaxStudioScreen';
import BotChatScreen from './screens/BotChatScreen';
import BotCreateScreen from './screens/BotCreateScreen';
import CallScreen from './screens/CallScreen';
// import PortalsScreen from './screens/PortalsScreen'; // (Replaced by PortalHome below)

// --- NEW PHASE 4, 5, 6 SCREENS ---
import PortalHome from './portal/PortalHome';
import PortalSearch from './portal/PortalSearch';
import PortalCategories from './portal/PortalCategories';
import PortalFeatured from './portal/PortalFeatured';
import PortalTrending from './portal/PortalTrending';

import MiniAppHome from './mini-apps/MiniAppHome';
import MiniAppViewer from './mini-apps/MiniAppViewer';
import MiniAppInstall from './mini-apps/MiniAppInstall';

import StudioHome from './studio/StudioHome';
import StudioPrompt from './studio/StudioPrompt';
import StudioGenerator from './studio/StudioGenerator';
import StudioPreview from './studio/StudioPreview';
import StudioTester from './studio/StudioTester';
import StudioPublisher from './studio/StudioPublisher';


const Stack = createNativeStackNavigator();

const navigationRef =
  createNavigationContainerRef();

/* ---------------------------------- */
/* MAIN TABS */
/* ---------------------------------- */

function MainAppTabs({ navigation }) {
  const [activeTab, setActiveTab] =
    useState('Chats');

  const { isDark } = useTheme();

  const renderScreen = () => {
    if (activeTab === 'Chats') {
      return (
        <ChatsScreen
          navigation={navigation}
        />
      );
    }

    if (activeTab === 'Portals') {
      // 🚀 INTEGRATION: Now directly rendering the new Portal ecosystem
      return (
        <PortalHome
          navigation={navigation}
        />
      );
    }

    if (activeTab === 'Moments') {
      return <MomentsScreen />;
    }

    if (activeTab === 'Settings') {
      return <WalletScreen />;
    }

    return null;
  };

  return (
    <SafeAreaView
      style={[
        styles.container,
        {
          backgroundColor: isDark
            ? '#121212'
            : '#F5F5F7'
        }
      ]}
    >
      <View style={styles.content}>
        {renderScreen()}
      </View>

      <View
        style={[
          styles.glassNavBar,
          {
            backgroundColor: isDark
              ? 'rgba(30,30,30,0.85)'
              : 'rgba(255,255,255,0.85)',

            borderColor: isDark
              ? 'rgba(255,255,255,0.1)'
              : 'rgba(0,0,0,0.05)'
          }
        ]}
      >
        {[
          'Chats',
          'Portals',
          'Moments',
          'Settings'
        ].map((tab) => (
          <TouchableOpacity
            key={tab}
            onPress={() =>
              setActiveTab(tab)
            }
            style={styles.navItem}
          >
            <Text
              style={[
                styles.navText,
                {
                  color:
                    activeTab === tab
                      ? isDark
                        ? '#FFFFFF'
                        : '#000000'
                      : '#888888'
                },
                activeTab === tab &&
                  styles.activeText
              ]}
            >
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}

/* ---------------------------------- */
/* PRESENCE (Unchanged) */
/* ---------------------------------- */

function PresenceManager({ user }) {
  const appState =
    useRef(AppState.currentState);

  useEffect(() => {
    if (!user?.uid) {
      return undefined;
    }

    const userRef = doc(
      db,
      'users',
      user.uid
    );

    const setOnline = async () => {
      try {
        await setDoc(
          userRef,
          {
            online: true,
            lastSeen: serverTimestamp()
          },
          {
            merge: true
          }
        );
      } catch (error) {
        console.log(
          'Presence online error:',
          error
        );
      }
    };

    const setOffline = async () => {
      try {
        await setDoc(
          userRef,
          {
            online: false,
            lastSeen: serverTimestamp()
          },
          {
            merge: true
          }
        );
      } catch (error) {
        console.log(
          'Presence offline error:',
          error
        );
      }
    };

    setOnline();

    const subscription =
      AppState.addEventListener(
        'change',
        async (nextState) => {
          const previousState =
            appState.current;

          appState.current = nextState;

          const wasInactive =
            previousState === 'inactive' ||
            previousState === 'background';

          const isActive =
            nextState === 'active';

          if (
            isActive &&
            wasInactive
          ) {
            await setOnline();
          }

          if (
            nextState === 'inactive' ||
            nextState === 'background'
          ) {
            await setOffline();
          }
        }
      );

    return () => {
      subscription.remove();
      setOffline();
    };
  }, [user]);

  return null;
}

/* ---------------------------------- */
/* INCOMING P2P FILES (Unchanged) */
/* ---------------------------------- */

function IncomingP2PTransferManager({
  user
}) {
  const activeTransfers =
    useRef(new Set());

  useEffect(() => {
    if (!user?.uid) {
      return undefined;
    }

    const transfersQuery = query(
      collection(db, 'file_transfers'),
      where(
        'receiverId',
        '==',
        user.uid
      ),
      where(
        'status',
        'in',
        [
          'offering',
          'waiting_for_answer'
        ]
      )
    );

    const unsubscribe = onSnapshot(
      transfersQuery,
      (snapshot) => {
        snapshot.docChanges().forEach(
          async (change) => {
            if (
              change.type !== 'added'
            ) {
              return;
            }

            const transferId =
              change.doc.id;

            if (
              activeTransfers.current.has(
                transferId
              )
            ) {
              return;
            }

            activeTransfers.current.add(
              transferId
            );

            try {
              const transfer =
                change.doc.data();

              const connection =
                await acceptP2PTransfer({
                  transferId,
                  receiverId: user.uid
                });

              let receiverCleanup =
                null;

              receiverCleanup =
                attachFileReceiver({
                  dataChannel:
                    connection.dataChannel,

                  onStart: (fileInfo) => {
                    console.log(
                      'Receiving P2P file:',
                      fileInfo.fileName
                    );
                  },

                  onProgress: (progress) => {
                    console.log(
                      'P2P receive progress:',
                      Math.round(
                        progress * 100
                      ),
                      '%'
                    );
                  },

                  onComplete:
                    async (result) => {
                      try {
                        const fileUri =
                          await saveReceivedFile({
                            base64:
                              result.base64,

                            fileName:
                              result.fileName
                          });

                        await addDoc(
                          collection(
                            db,
                            'chats',
                            transfer.chatId,
                            'messages'
                          ),
                          {
                            senderId:
                              transfer.senderId,

                            receiverId:
                              transfer.receiverId,

                            text: '',

                            type: 'file',

                            fileName:
                              result.fileName,

                            mimeType:
                              result.mimeType,

                            fileSize:
                              result.fileSize,

                            fileUri,

                            storage: 'p2p',

                            transferId,

                            createdAt:
                              serverTimestamp(),

                            read: false
                          }
                        );

                        await markP2PTransferCompleted(
                          transferId
                        );

                        if (
                          receiverCleanup
                        ) {
                          receiverCleanup();
                        }

                        connection.cleanup();

                        console.log(
                          'P2P file received:',
                          fileUri
                        );
                      } catch (error) {
                        console.log(
                          'P2P file save error:',
                          error
                        );

                        await markP2PTransferFailed(
                          transferId,
                          error?.message ||
                            'Failed to save received file'
                        );

                        connection.cleanup();
                      }
                    },

                  onError:
                    async (error) => {
                      await markP2PTransferFailed(
                        transferId,
                        error?.message ||
                          'P2P receiver error'
                      );

                      connection.cleanup();
                    }
                });
            } catch (error) {
              console.log(
                'Incoming P2P transfer error:',
                error
              );

              await markP2PTransferFailed(
                transferId,
                error?.message ||
                  'Unable to accept P2P transfer'
              );
            }
          }
        );
      },
      (error) => {
        console.log(
          'P2P transfer listener error:',
          error
        );
      }
    );

    return () => {
      unsubscribe();
    };
  }, [user]);

  return null;
}

/* ---------------------------------- */
/* INCOMING CALLS (Unchanged) */
/* ---------------------------------- */

function IncomingCallManager({ user }) {
  const handledCalls =
    useRef(new Set());

  useEffect(() => {
    if (!user?.uid) {
      return undefined;
    }

    const callsQuery = query(
      collection(db, 'calls'),
      where(
        'receiverId',
        '==',
        user.uid
      )
    );

    const unsubscribe = onSnapshot(
      callsQuery,
      (snapshot) => {
        snapshot.docChanges().forEach(
          (change) => {
            if (
              change.type !== 'added' &&
              change.type !== 'modified'
            ) {
              return;
            }

            const callId =
              change.doc.id;

            const call =
              change.doc.data();

            if (
              call.status !== 'ringing'
            ) {
              return;
            }

            if (
              handledCalls.current.has(
                callId
              )
            ) {
              return;
            }

            handledCalls.current.add(
              callId
            );

            const openCall = () => {
              if (
                !navigationRef.isReady()
              ) {
                handledCalls.current.delete(
                  callId
                );

                return;
              }

              const currentRoute =
                navigationRef.getCurrentRoute();

              if (
                currentRoute?.name ===
                'Call'
              ) {
                console.log(
                  'Already inside a call.'
                );

                return;
              }

              navigationRef.navigate(
                'Call',
                {
                  callId,
                  type:
                    call.type ||
                    'voice',

                  name:
                    call.callerName ||
                    'Nax User',

                  friendId:
                    call.callerId ||
                    null,

                  isCaller: false
                }
              );
            };

            if (
              navigationRef.isReady()
            ) {
              openCall();
            } else {
              setTimeout(
                openCall,
                700
              );
            }
          }
        );
      },
      (error) => {
        console.log(
          'Incoming call listener error:',
          error
        );
      }
    );

    return () => {
      unsubscribe();
    };
  }, [user]);

  return null;
}

/* ---------------------------------- */
/* APP NAVIGATOR */
/* ---------------------------------- */

function AppNavigator() {
  const [user, setUser] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const { isDark } = useTheme();

  useEffect(() => {
    const unsubscribe =
      onAuthStateChanged(
        auth,
        (currentUser) => {
          setUser(currentUser);
          setLoading(false);
        }
      );

    return unsubscribe;
  }, []);

  if (loading) {
    return (
      <View
        style={[
          styles.container,
          {
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: isDark
              ? '#121212'
              : '#F5F5F7'
          }
        ]}
      >
        <ActivityIndicator
          size="large"
          color="#007AFF"
        />
      </View>
    );
  }

  return (
    <>
      {user && (
        <>
          <PresenceManager
            user={user}
          />

          <IncomingP2PTransferManager
            user={user}
          />

          <IncomingCallManager
            user={user}
          />
        </>
      )}

      <NavigationContainer
        ref={navigationRef}
      >
        <Stack.Navigator
          screenOptions={{
            headerShown: false
          }}
        >
          {user ? (
            <>
              {/* EXISTING SCREENS */}
              <Stack.Screen name="HomeTabs" component={MainAppTabs} />
              <Stack.Screen name="ChatRoom" component={ChatRoomScreen} />
              <Stack.Screen name="TicTacToe" component={TicTacToeScreen} />
              <Stack.Screen name="NaxStudio" component={NaxStudioScreen} />
              <Stack.Screen name="BotChat" component={BotChatScreen} />
              <Stack.Screen name="BotCreate" component={BotCreateScreen} />
              <Stack.Screen name="Call" component={CallScreen} />

              {/* NEW PORTAL SCREENS */}
              <Stack.Screen name="PortalHome" component={PortalHome} />
              <Stack.Screen name="PortalSearch" component={PortalSearch} />
              <Stack.Screen name="PortalCategories" component={PortalCategories} />
              <Stack.Screen name="PortalFeatured" component={PortalFeatured} />
              <Stack.Screen name="PortalTrending" component={PortalTrending} />

              {/* NEW MINI APPS SCREENS */}
              <Stack.Screen name="MiniAppHome" component={MiniAppHome} />
              <Stack.Screen name="MiniAppViewer" component={MiniAppViewer} />
              <Stack.Screen name="MiniAppInstall" component={MiniAppInstall} />

              {/* NEW NAX STUDIO SCREENS */}
              <Stack.Screen name="StudioHome" component={StudioHome} />
              <Stack.Screen name="StudioPrompt" component={StudioPrompt} />
              <Stack.Screen name="StudioGenerator" component={StudioGenerator} />
              <Stack.Screen name="StudioPreview" component={StudioPreview} />
              <Stack.Screen name="StudioTester" component={StudioTester} />
              <Stack.Screen name="StudioPublisher" component={StudioPublisher} />
            </>
          ) : (
            <Stack.Screen
              name="Auth"
              component={AuthScreen}
            />
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </>
  );
}

/* ---------------------------------- */
/* APP */
/* ---------------------------------- */

export default function App() {
  return (
    <ThemeProvider>
      <AppNavigator />
    </ThemeProvider>
  );
}

/* ---------------------------------- */
/* STYLES */
/* ---------------------------------- */

const styles = StyleSheet.create({
  container: {
    flex: 1
  },

  content: {
    flex: 1
  },

  glassNavBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    height: 65,
    borderRadius: 20,
    borderWidth: 1,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 5
    },
    shadowOpacity: 0.1,
    shadowRadius: 10
  },

  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },

  navText: {
    fontSize: 15,
    fontWeight: '500'
  },

  activeText: {
    fontWeight: 'bold'
  }
});
