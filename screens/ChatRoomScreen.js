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
  PermissionsAndroid,
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
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  doc,
  setDoc,
  updateDoc,
  increment,
} from 'firebase/firestore';

import {
  RTCPeerConnection,
  RTCIceCandidate,
  RTCSessionDescription,
  RTCView,
  mediaDevices,
} from 'react-native-webrtc';

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

  /* =========================
     CALL STATE
  ========================= */

  const [callVisible, setCallVisible] =
    useState(false);

  const [callType, setCallType] =
    useState('audio');

  const [callState, setCallState] =
    useState('idle');

  const [incomingCall, setIncomingCall] =
    useState(null);

  const [localStream, setLocalStream] =
    useState(null);

  const [remoteStream, setRemoteStream] =
    useState(null);

  const [micEnabled, setMicEnabled] =
    useState(true);

  const [cameraEnabled, setCameraEnabled] =
    useState(true);

  const [speakerEnabled, setSpeakerEnabled] =
    useState(true);

  const [callError, setCallError] =
    useState('');

  const listRef =
    useRef(null);

  const peerRef =
    useRef(null);

  const localStreamRef =
    useRef(null);

  const remoteStreamRef =
    useRef(null);

  const callIdRef =
    useRef(null);

  const callListenerRef =
    useRef(null);

  const candidateListenersRef =
    useRef([]);

  const isCallerRef =
    useRef(false);


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


  const clearUnread =
    async () => {
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


  /* =====================================================
     WEBRTC CALLING
  ===================================================== */


  /* =========================
     PERMISSIONS
  ========================= */

  const requestCallPermissions =
    async (
      type
    ) => {
      if (
        Platform.OS !==
        'android'
      ) {
        return true;
      }

      try {
        const permissions = [
          PermissionsAndroid.PERMISSIONS
            .RECORD_AUDIO,
        ];

        if (
          type === 'video'
        ) {
          permissions.push(
            PermissionsAndroid
              .PERMISSIONS
              .CAMERA
          );
        }

        const result =
          await PermissionsAndroid
            .requestMultiple(
              permissions
            );

        const audioGranted =
          result[
            PermissionsAndroid
              .PERMISSIONS
              .RECORD_AUDIO
          ] ===
          PermissionsAndroid
            .RESULTS
            .GRANTED;

        const cameraGranted =
          type === 'audio' ||
          result[
            PermissionsAndroid
              .PERMISSIONS
              .CAMERA
          ] ===
          PermissionsAndroid
            .RESULTS
            .GRANTED;

        if (
          !audioGranted
        ) {
          Alert.alert(
            'Microphone permission',
            'Audio call ke liye microphone permission zaroori hai.'
          );

          return false;
        }

        if (
          type === 'video' &&
          !cameraGranted
        ) {
          Alert.alert(
            'Camera permission',
            'Video call ke liye camera permission zaroori hai.'
          );

          return false;
        }

        return true;

      } catch (error) {
        console.log(
          'Permission error:',
          error
        );

        Alert.alert(
          'Permission Error',
          'Call permissions nahi mil paayi.'
        );

        return false;
      }
    };


  /* =========================
     CREATE PEER
  ========================= */

  const createPeerConnection =
    async () => {
      const configuration = {
        iceServers: [
          {
            urls:
              'stun:stun.l.google.com:19302',
          },
          {
            urls:
              'stun:stun1.l.google.com:19302',
          },
          {
            urls:
              'stun:stun2.l.google.com:19302',
          },
        ],
      };

      const peer =
        new RTCPeerConnection(
          configuration
        );

      peer.ontrack =
        (event) => {
          if (
            event.streams &&
            event.streams[0]
          ) {
            const stream =
              event.streams[0];

            remoteStreamRef.current =
              stream;

            setRemoteStream(
              stream
            );
          }
        };

      peer.onconnectionstatechange =
        () => {
          const state =
            peer.connectionState;

          console.log(
            'WebRTC state:',
            state
          );

          if (
            state ===
            'connected'
          ) {
            setCallState(
              'connected'
            );
          }

          if (
            state ===
              'failed' ||
            state ===
              'disconnected'
          ) {
            setCallError(
              'Connection lost.'
            );
          }
        };

      peerRef.current =
        peer;

      return peer;
    };


  /* =========================
     LOCAL MEDIA
  ========================= */

  const getLocalMedia =
    async (
      type
    ) => {
      const isVideo =
        type === 'video';

      const constraints = {
        audio: true,

        video: isVideo
          ? {
              facingMode:
                'user',
              width: 640,
              height: 480,
              frameRate: 24,
            }
          : false,
      };

      const stream =
        await mediaDevices
          .getUserMedia(
            constraints
          );

      localStreamRef.current =
        stream;

      setLocalStream(
        stream
      );

      setMicEnabled(true);

      if (isVideo) {
        setCameraEnabled(
          true
        );
      }

      return stream;
    };


  /* =========================
     CANDIDATE CLEANUP
  ========================= */

  const clearCandidateListeners =
    () => {
      candidateListenersRef.current
        .forEach(
          (unsubscribe) => {
            try {
              unsubscribe();
            } catch {}
          }
        );

      candidateListenersRef.current =
        [];
    };


  /* =========================
     CALL CLEANUP
  ========================= */

  const cleanupCall =
    async (
      updateRemote = false
    ) => {
      const oldCallId =
        callIdRef.current;

      clearCandidateListeners();

      if (
        callListenerRef.current
      ) {
        try {
          callListenerRef.current();
        } catch {}

        callListenerRef.current =
          null;
      }

      if (
        localStreamRef.current
      ) {
        localStreamRef.current
          .getTracks()
          .forEach(
            (track) => {
              try {
                track.stop();
              } catch {}
            }
          );
      }

      if (
        peerRef.current
      ) {
        try {
          peerRef.current.close();
        } catch {}

        peerRef.current =
          null;
      }

      localStreamRef.current =
        null;

      remoteStreamRef.current =
        null;

      callIdRef.current =
        null;

      isCallerRef.current =
        false;

      setLocalStream(null);
      setRemoteStream(null);

      setCallVisible(false);
      setIncomingCall(null);

      setCallState('idle');
      setCallError('');

      setMicEnabled(true);
      setCameraEnabled(true);

      if (
        updateRemote &&
        oldCallId
      ) {
        try {
          await updateDoc(
            doc(
              db,
              'calls',
              oldCallId
            ),
            {
              status:
                'ended',

              endedAt:
                serverTimestamp(),
            }
          );
        } catch (error) {
          console.log(
            'Call end update:',
            error
          );
        }
      }
    };


  /* =========================
     START CALL
  ========================= */

  const startCall =
    async (
      type
    ) => {
      if (!friendId) {
        Alert.alert(
          'Calling unavailable',
          'Global Chat mein private calling available nahi hai.'
        );

        return;
      }

      if (
        callState !==
        'idle'
      ) {
        return;
      }

      const allowed =
        await requestCallPermissions(
          type
        );

      if (!allowed) {
        return;
      }

      try {
        setCallType(type);
        setCallVisible(true);
        setCallState(
          'calling'
        );
        setCallError('');

        isCallerRef.current =
          true;

        const stream =
          await getLocalMedia(
            type
          );

        const peer =
          await createPeerConnection();

        stream
          .getTracks()
          .forEach(
            (track) => {
              peer.addTrack(
                track,
                stream
              );
            }
          );

        const callRef =
          doc(
            collection(
              db,
              'calls'
            )
          );

        callIdRef.current =
          callRef.id;

        peer.onicecandidate =
          async (event) => {
            if (
              !event.candidate ||
              !callIdRef.current
            ) {
              return;
            }

            try {
              await addDoc(
                collection(
                  db,
                  'calls',
                  callIdRef.current,
                  'callerCandidates'
                ),
                event.candidate.toJSON()
              );
            } catch (error) {
              console.log(
                'Caller ICE error:',
                error
              );
            }
          };

        await setDoc(
          callRef,
          {
            callerId:
              currentUser.uid,

            receiverId:
              friendId,

            chatId,

            type,

            status:
              'ringing',

            createdAt:
              serverTimestamp(),
          }
        );

        const offer =
          await peer.createOffer({
            offerToReceiveAudio:
              true,

            offerToReceiveVideo:
              type === 'video',
          });

        await peer.setLocalDescription(
          offer
        );

        await updateDoc(
          callRef,
          {
            offer: {
              type:
                offer.type,

              sdp:
                offer.sdp,
            },
          }
        );

        /* ANSWER LISTENER */

        const answerUnsubscribe =
          onSnapshot(
            callRef,
            async (snapshot) => {
              if (
                !snapshot.exists()
              ) {
                return;
              }

              const data =
                snapshot.data();

              if (
                data.answer &&
                !peer.currentRemoteDescription
              ) {
                try {
                  await peer.setRemoteDescription(
                    new RTCSessionDescription(
                      data.answer
                    )
                  );

                  setCallState(
                    'connecting'
                  );
                } catch (error) {
                  console.log(
                    'Set answer error:',
                    error
                  );
                }
              }

              if (
                data.status ===
                'rejected'
              ) {
                Alert.alert(
                  'Call Rejected',
                  'The other user rejected the call.'
                );

                await cleanupCall(
                  false
                );
              }

              if (
                data.status ===
                'ended'
              ) {
                await cleanupCall(
                  false
                );
              }
            }
          );

        callListenerRef.current =
          answerUnsubscribe;

        /* RECEIVER ICE */

        const receiverCandidates =
          collection(
            db,
            'calls',
            callRef.id,
            'receiverCandidates'
          );

        const receiverUnsubscribe =
          onSnapshot(
            receiverCandidates,
            (snapshot) => {
              snapshot.docChanges()
                .forEach(
                  async (change) => {
                    if (
                      change.type !==
                      'added'
                    ) {
                      return;
                    }

                    try {
                      await peer.addIceCandidate(
                        new RTCIceCandidate(
                          change.doc.data()
                        )
                      );
                    } catch (error) {
                      console.log(
                        'Receiver ICE error:',
                        error
                      );
                    }
                  }
                );
            }
          );

        candidateListenersRef.current
          .push(
            receiverUnsubscribe
          );

      } catch (error) {
        console.log(
          'Start call error:',
          error
        );

        setCallError(
          error?.message ||
          'Call start nahi ho paayi.'
        );

        Alert.alert(
          'Call Error',
          error?.message ||
          'Call start nahi ho paayi.'
        );

        await cleanupCall(
          true
        );
      }
    };


  /* =========================
     INCOMING CALL LISTENER
  ========================= */

  useEffect(() => {
    if (
      !currentUser?.uid
    ) {
      return;
    }

    if (!friendId) {
      return;
    }

    if (!chatId) {
      return;
    }

    const callsRef =
      collection(
        db,
        'calls'
      );

    const callsQuery =
      query(
        callsRef,
        where(
          'receiverId',
          '==',
          currentUser.uid
        )
      );

    const unsubscribe =
      onSnapshot(
        callsQuery,
        (snapshot) => {
          snapshot.docChanges()
            .forEach(
              (change) => {
                if (
                  change.type !==
                  'added'
                ) {
                  return;
                }

                const data =
                  change.doc.data();

                if (
                  data.status !==
                  'ringing'
                ) {
                  return;
                }

                if (
                  data.callerId ===
                  currentUser.uid
                ) {
                  return;
                }

                if (
                  data.receiverId !==
                  currentUser.uid
                ) {
                  return;
                }

                if (
                  data.chatId !==
                  chatId
                ) {
                  return;
                }

                if (
                  callIdRef.current
                ) {
                  return;
                }

                setIncomingCall({
                  id:
                    change.doc.id,

                  callerId:
                    data.callerId,

                  type:
                    data.type ||
                    'audio',

                  offer:
                    data.offer ||
                    null,
                });
              }
            );
        },
        (error) => {
          console.log(
            'Incoming call listener:',
            error
          );
        }
      );

    return () => {
      unsubscribe();
    };
  }, [
    currentUser?.uid,
    friendId,
    chatId,
  ]);


  /* =========================
     ACCEPT CALL
  ========================= */

  const acceptCall =
    async () => {
      const call =
        incomingCall;

      if (
        !call?.id ||
        !call.offer
      ) {
        return;
      }

      const allowed =
        await requestCallPermissions(
          call.type
        );

      if (!allowed) {
        return;
      }

      try {
        setIncomingCall(null);

        setCallType(
          call.type
        );

        setCallVisible(true);

        setCallState(
          'connecting'
        );

        setCallError('');

        isCallerRef.current =
          false;

        callIdRef.current =
          call.id;

        const stream =
          await getLocalMedia(
            call.type
          );

        const peer =
          await createPeerConnection();

        peer.onicecandidate =
          async (event) => {
            if (
              !event.candidate ||
              !callIdRef.current
            ) {
              return;
            }

            try {
              await addDoc(
                collection(
                  db,
                  'calls',
                  call.id,
                  'receiverCandidates'
                ),
                event.candidate.toJSON()
              );
            } catch (error) {
              console.log(
                'Receiver ICE error:',
                error
              );
            }
          };

        stream
          .getTracks()
          .forEach(
            (track) => {
              peer.addTrack(
                track,
                stream
              );
            }
          );

        await peer.setRemoteDescription(
          new RTCSessionDescription(
            call.offer
          )
        );

        const answer =
          await peer.createAnswer();

        await peer.setLocalDescription(
          answer
        );

        await updateDoc(
          doc(
            db,
            'calls',
            call.id
          ),
          {
            answer: {
              type:
                answer.type,

              sdp:
                answer.sdp,
            },

            status:
              'connected',
          }
        );

        /* CALLER ICE */

        const callerCandidates =
          collection(
            db,
            'calls',
            call.id,
            'callerCandidates'
          );

        const callerUnsubscribe =
          onSnapshot(
            callerCandidates,
            (snapshot) => {
              snapshot.docChanges()
                .forEach(
                  async (change) => {
                    if (
                      change.type !==
                      'added'
                    ) {
                      return;
                    }

                    try {
                      await peer.addIceCandidate(
                        new RTCIceCandidate(
                          change.doc.data()
                        )
                      );
                    } catch (error) {
                      console.log(
                        'Caller ICE error:',
                        error
                      );
                    }
                  }
                );
            }
          );

        candidateListenersRef.current
          .push(
            callerUnsubscribe
          );

        /* CALL STATUS */

        const callStatusUnsubscribe =
          onSnapshot(
            doc(
              db,
              'calls',
              call.id
            ),
            async (snapshot) => {
              if (
                !snapshot.exists()
              ) {
                return;
              }

              const data =
                snapshot.data();

              if (
                data.status ===
                'ended'
              ) {
                await cleanupCall(
                  false
                );
              }
            }
          );

        callListenerRef.current =
          callStatusUnsubscribe;

      } catch (error) {
        console.log(
          'Accept call error:',
          error
        );

        Alert.alert(
          'Call Error',
          error?.message ||
          'Call accept nahi ho paayi.'
        );

        await cleanupCall(
          true
        );
      }
    };


  /* =========================
     REJECT CALL
  ========================= */

  const rejectCall =
    async () => {
      if (
        !incomingCall?.id
      ) {
        setIncomingCall(null);
        return;
      }

      try {
        await updateDoc(
          doc(
            db,
            'calls',
            incomingCall.id
          ),
          {
            status:
              'rejected',

            endedAt:
              serverTimestamp(),
          }
        );
      } catch (error) {
        console.log(
          'Reject call error:',
          error
        );
      }

      setIncomingCall(null);
    };


  /* =========================
     END CALL
  ========================= */

  const endCall =
    async () => {
      await cleanupCall(
        true
      );
    };


  /* =========================
     MIC
  ========================= */

  const toggleMic =
    () => {
      const stream =
        localStreamRef.current;

      if (!stream) {
        return;
      }

      const tracks =
        stream.getAudioTracks();

      tracks.forEach(
        (track) => {
          track.enabled =
            !track.enabled;
        }
      );

      if (tracks.length) {
        setMicEnabled(
          tracks[0].enabled
        );
      }
    };


  /* =========================
     CAMERA
  ========================= */

  const toggleCamera =
    () => {
      const stream =
        localStreamRef.current;

      if (!stream) {
        return;
      }

      const tracks =
        stream.getVideoTracks();

      if (!tracks.length) {
        return;
      }

      tracks.forEach(
        (track) => {
          track.enabled =
            !track.enabled;
        }
      );

      setCameraEnabled(
        tracks[0].enabled
      );
    };


  /* =========================
     SPEAKER
  ========================= */

  const toggleSpeaker =
    () => {
      const next =
        !speakerEnabled;

      setSpeakerEnabled(
        next
      );

      try {
        if (
          typeof mediaDevices
            .setAudioOutput ===
          'function'
        ) {
          mediaDevices.setAudioOutput(
            next
              ? 'speaker'
              : 'earpiece'
          );
        }
      } catch (error) {
        console.log(
          'Speaker error:',
          error
        );
      }
    };


  /* =========================
     CLEANUP ON UNMOUNT
  ========================= */

  useEffect(() => {
    return () => {
      clearCandidateListeners();

      if (
        callListenerRef.current
      ) {
        try {
          callListenerRef.current();
        } catch {}
      }

      if (
        localStreamRef.current
      ) {
        localStreamRef.current
          .getTracks()
          .forEach(
            (track) => {
              try {
                track.stop();
              } catch {}
            }
          );
      }

      if (
        peerRef.current
      ) {
        try {
          peerRef.current.close();
        } catch {}
      }
    };
  }, []);


  /* =========================
     CALL SCREEN
  ========================= */

  const renderCallScreen =
    () => {
      if (!callVisible) {
        return null;
      }

      const isVideo =
        callType ===
        'video';

      return (
        <Modal
          visible={callVisible}
          animationType="fade"
          statusBarTranslucent
          onRequestClose={
            endCall
          }
        >
          <View
            style={
              styles.callScreen
            }
          >

            {/* REMOTE VIDEO */}

            {isVideo &&
            remoteStream ? (
              <RTCView
                streamURL={
                  remoteStream.toURL()
                }
                style={
                  styles.remoteVideo
                }
                objectFit="cover"
                mirror={false}
              />
            ) : (
              <View
                style={
                  styles.audioCallBackground
                }
              >
                <View
                  style={
                    styles.callAvatar
                  }
                >
                  <Text
                    style={
                      styles.callAvatarText
                    }
                  >
                    {chatTitle
                      .charAt(0)
                      .toUpperCase()}
                  </Text>
                </View>

                <Text
                  style={
                    styles.callName
                  }
                >
                  {chatTitle}
                </Text>

                <Text
                  style={
                    styles.callStatus
                  }
                >
                  {callState ===
                  'calling'
                    ? 'Calling...'
                    : callState ===
                      'connecting'
                    ? 'Connecting...'
                    : callState ===
                      'connected'
                    ? 'Connected'
                    : 'Calling...'}
                </Text>
              </View>
            )}

            {/* LOCAL VIDEO */}

            {isVideo &&
              localStream && (
                <View
                  style={
                    styles.localVideoBox
                  }
                >
                  <RTCView
                    streamURL={
                      localStream.toURL()
                    }
                    style={
                      styles.localVideo
                    }
                    objectFit="cover"
                    mirror
                  />
                </View>
              )}

            {/* TOP BAR */}

            <View
              style={
                styles.callTopBar
              }
            >
              <TouchableOpacity
                style={
                  styles.callTopButton
                }
                onPress={
                  endCall
                }
              >
                <Ionicons
                  name="chevron-down"
                  size={25}
                  color="#FFFFFF"
                />
              </TouchableOpacity>

              <View
                style={
                  styles.callTopInfo
                }
              >
                <Text
                  style={
                    styles.callTopName
                  }
                  numberOfLines={1}
                >
                  {chatTitle}
                </Text>

                <Text
                  style={
                    styles.callTopStatus
                  }
                >
                  {callState ===
                  'connected'
                    ? 'Connected'
                    : callState ===
                      'calling'
                    ? 'Calling...'
                    : 'Connecting...'}
                </Text>
              </View>
            </View>

            {/* ERROR */}

            {!!callError && (
              <View
                style={
                  styles.callErrorBox
                }
              >
                <Text
                  style={
                    styles.callErrorText
                  }
                >
                  {callError}
                </Text>
              </View>
            )}

            {/* CONTROLS */}

            <View
              style={
                styles.callControls
              }
            >
              <CallControl
                icon={
                  micEnabled
                    ? 'mic'
                    : 'mic-off'
                }
                label={
                  micEnabled
                    ? 'Mute'
                    : 'Unmute'
                }
                active={
                  micEnabled
                }
                onPress={
                  toggleMic
                }
              />

              {isVideo && (
                <CallControl
                  icon={
                    cameraEnabled
                      ? 'videocam'
                      : 'videocam-off'
                  }
                  label={
                    cameraEnabled
                      ? 'Camera'
                      : 'Camera Off'
                  }
                  active={
                    cameraEnabled
                  }
                  onPress={
                    toggleCamera
                  }
                />
              )}

              <CallControl
                icon="volume-high"
                label="Speaker"
                active={
                  speakerEnabled
                }
                onPress={
                  toggleSpeaker
                }
              />

              <TouchableOpacity
                style={
                  styles.endCallButton
                }
                onPress={
                  endCall
                }
              >
                <Ionicons
                  name="call"
                  size={25}
                  color="#FFFFFF"
                  style={{
                    transform: [
                      {
                        rotate:
                          '135deg',
                      },
                    ],
                  }}
                />
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      );
    };


  /* =========================
     INCOMING CALL
  ========================= */

  const renderIncomingCall =
    () => {
      if (!incomingCall) {
        return null;
      }

      const isVideo =
        incomingCall.type ===
        'video';

      return (
        <Modal
          visible={true}
          transparent
          animationType="fade"
          onRequestClose={
            rejectCall
          }
        >
          <View
            style={
              styles.incomingOverlay
            }
          >
            <View
              style={[
                styles.incomingCard,
                {
                  backgroundColor:
                    isDark
                      ? '#10212D'
                      : '#FFFFFF',
                },
              ]}
            >
              <View
                style={
                  styles.incomingIcon
                }
              >
                <Ionicons
                  name={
                    isVideo
                      ? 'videocam'
                      : 'call'
                  }
                  size={30}
                  color="#FFFFFF"
                />
              </View>

              <Text
                style={[
                  styles.incomingTitle,
                  {
                    color:
                      textMain,
                  },
                ]}
              >
                Incoming{' '}
                {isVideo
                  ? 'Video'
                  : 'Audio'}{' '}
                Call
              </Text>

              <Text
                style={[
                  styles.incomingName,
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
                  styles.incomingSub,
                  {
                    color:
                      textSub,
                  },
                ]}
              >
                {isVideo
                  ? 'Video call aa rahi hai'
                  : 'Audio call aa rahi hai'}
              </Text>

              <View
                style={
                  styles.incomingButtons
                }
              >
                <TouchableOpacity
                  style={
                    styles.rejectButton
                  }
                  onPress={
                    rejectCall
                  }
                >
                  <Ionicons
                    name="close"
                    size={26}
                    color="#FFFFFF"
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  style={
                    styles.acceptButton
                  }
                  onPress={
                    acceptCall
                  }
                >
                  <Ionicons
                    name={
                      isVideo
                        ? 'videocam'
                        : 'call'
                    }
                    size={25}
                    color="#FFFFFF"
                  />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
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

        {/* AUDIO CALL */}

        <TouchableOpacity
          style={
            styles.headerButton
          }
          disabled={
            !friendId
          }
          onPress={() =>
            startCall(
              'audio'
            )
          }
        >
          <Ionicons
            name="call-outline"
            size={21}
            color={
              friendId
                ? textMain
                : textSub
            }
          />
        </TouchableOpacity>

        {/* VIDEO CALL */}

        <TouchableOpacity
          style={
            styles.headerButton
          }
          disabled={
            !friendId
          }
          onPress={() =>
            startCall(
              'video'
            )
          }
        >
          <Ionicons
            name="videocam-outline"
            size={23}
            color={
              friendId
                ? textMain
                : textSub
            }
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
                'Photo, video and document upload ko next step me connect karenge.'
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

            <MenuButton
              icon="return-down-forward-outline"
              title="Reply"
              onPress={() =>
                startReply(
                  selectedMessage
                )
              }
            />

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


      {renderIncomingCall()}
      {renderCallScreen()}

    </SafeAreaView>
  );
}


/* =========================
   CANCEL EDIT
========================= */

function cancelEditPlaceholder() {
  return null;
}


/* =========================
   CANCEL REPLY
========================= */

function cancelReplyPlaceholder() {
  return null;
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
   CALL CONTROL
========================= */

function CallControl({
  icon,
  label,
  active,
  onPress,
}) {
  return (
    <TouchableOpacity
      style={
        styles.callControl
      }
      onPress={onPress}
    >
      <View
        style={[
          styles.callControlIcon,
          {
            backgroundColor:
              active
                ? 'rgba(255,255,255,.16)'
                : '#FFFFFF',
          },
        ]}
      >
        <Ionicons
          name={icon}
          size={23}
          color={
            active
              ? '#FFFFFF'
              : '#111820'
          }
        />
      </View>

      <Text
        style={
          styles.callControlLabel
        }
      >
        {label}
      </Text>
    </TouchableOpacity>
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


/* =====================================================
   STYLES
===================================================== */

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
    paddingHorizontal: 7,
    borderBottomWidth: 1,
    borderBottomColor:
      'rgba(255,255,255,.06)',
  },

  backButton: {
    width: 42,
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
    width: 38,
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

  /* =====================
     CALL SCREEN
  ===================== */

  callScreen: {
    flex: 1,
    backgroundColor:
      '#050505',
  },

  remoteVideo: {
    ...StyleSheet.absoluteFillObject,
  },

  audioCallBackground: {
    flex: 1,
    alignItems: 'center',
    justifyContent:
      'center',
    backgroundColor:
      '#07131D',
  },

  callAvatar: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor:
      '#1687FF',
    alignItems: 'center',
    justifyContent:
      'center',
  },

  callAvatarText: {
    color: '#FFFFFF',
    fontSize: 45,
    fontWeight: '800',
  },

  callName: {
    color: '#FFFFFF',
    fontSize: 23,
    fontWeight: '800',
    marginTop: 20,
  },

  callStatus: {
    color: '#AFC1CE',
    fontSize: 15,
    marginTop: 7,
  },

  localVideoBox: {
    position: 'absolute',
    top: 75,
    right: 16,
    width: 112,
    height: 158,
    borderRadius: 15,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor:
      'rgba(255,255,255,.6)',
  },

  localVideo: {
    flex: 1,
  },

  callTopBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingTop: 12,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },

  callTopButton: {
    width: 45,
    height: 45,
    borderRadius: 23,
    backgroundColor:
      'rgba(0,0,0,.38)',
    alignItems: 'center',
    justifyContent:
      'center',
  },

  callTopInfo: {
    flex: 1,
    alignItems: 'center',
    marginRight: 45,
  },

  callTopName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },

  callTopStatus: {
    color: '#C5D3DC',
    fontSize: 12,
    marginTop: 2,
  },

  callErrorBox: {
    position: 'absolute',
    top: 145,
    left: 25,
    right: 25,
    padding: 12,
    borderRadius: 12,
    backgroundColor:
      'rgba(255,59,48,.85)',
  },

  callErrorText: {
    color: '#FFFFFF',
    textAlign: 'center',
    fontSize: 13,
  },

  callControls: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 35,
    minHeight: 100,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent:
      'center',
    gap: 15,
  },

  callControl: {
    alignItems: 'center',
    width: 62,
  },

  callControlIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent:
      'center',
  },

  callControlLabel: {
    color: '#FFFFFF',
    fontSize: 10,
    marginTop: 5,
  },

  endCallButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor:
      '#FF3B30',
    alignItems: 'center',
    justifyContent:
      'center',
    marginLeft: 4,
  },

  /* =====================
     INCOMING CALL
  ===================== */

  incomingOverlay: {
    flex: 1,
    backgroundColor:
      'rgba(0,0,0,.72)',
    alignItems: 'center',
    justifyContent:
      'center',
    padding: 25,
  },

  incomingCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 28,
    padding: 28,
    alignItems: 'center',
  },

  incomingIcon: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor:
      '#1687FF',
    alignItems: 'center',
    justifyContent:
      'center',
    marginBottom: 18,
  },

  incomingTitle: {
    fontSize: 20,
    fontWeight: '800',
  },

  incomingName: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 8,
  },

  incomingSub: {
    fontSize: 13,
    marginTop: 5,
  },

  incomingButtons: {
    flexDirection: 'row',
    marginTop: 28,
    gap: 35,
  },

  rejectButton: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor:
      '#FF3B30',
    alignItems: 'center',
    justifyContent:
      'center',
  },

  acceptButton: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor:
      '#34C759',
    alignItems: 'center',
    justifyContent:
      'center',
  },

  /* =====================
     MESSAGE MENU
  ===================== */

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
